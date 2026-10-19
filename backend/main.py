import os
import sys
import shutil
import logging
import threading
from tempfile import NamedTemporaryFile
from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Request, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pipeline_semantico import procesar_csv_a_parquet
from entrenar_modelo import generar_pronostico
from database.connection import init_db
from routers.ingestion_router import router as ingestion_router
from routers.curation_router import router as curation_router
from analytics.router import analytics_router, license_router
from fastapi.staticfiles import StaticFiles
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB
CHUNK_SIZE_BYTES = 1024 * 1024  # 1 MB
MAX_CONCURRENT_TRAININGS = 2
CONCURRENCY_SEMAPHORE = threading.BoundedSemaphore(MAX_CONCURRENT_TRAININGS)
API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)
EXPECTED_API_KEY = os.getenv("API_KEY", "").strip()
IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() == "production"

limiter = Limiter(key_func=get_remote_address)

def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": "Demasiadas solicitudes. Por favor intente más tarde."}
    )

app = FastAPI(
    title="Demand Forecasting API",
    description="API RESTful para previsión de demanda, ingesta de datos y auditoría.",
    version="1.2.0",
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, custom_rate_limit_handler)

@app.on_event("startup")
def on_startup():
    try:
        init_db()
        logging.info("Esquemas de base de datos relacional inicializados.")
    except Exception as e:
        logging.warning("Base de datos interna PostgreSQL no disponible en startup: %s", e)

app.include_router(ingestion_router)

allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_env:
    origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
else:
    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:19006",
        "http://127.0.0.1:19006",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(analytics_router)
app.include_router(curation_router)
app.include_router(license_router)

def verify_api_key(api_key: str = Security(API_KEY_HEADER)):
    if EXPECTED_API_KEY:
        if not api_key or api_key != EXPECTED_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Clave de API inválida o ausente en el encabezado 'X-API-Key'."
            )
    return api_key

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "pos-analytics-api"}

# Montaje de Frontend React Native Web estático (Zero-Node.js para Desktop)
possible_dist_paths = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")),
    os.path.abspath(os.path.join(getattr(sys, "_MEIPASS", ""), "frontend", "dist")),
    os.path.abspath(os.path.join(os.path.dirname(sys.executable), "frontend", "dist")),
    os.path.abspath(os.path.join(os.path.dirname(sys.executable), "_internal", "frontend", "dist")),
]
FRONTEND_DIST = next((p for p in possible_dist_paths if os.path.exists(os.path.join(p, "index.html"))), None)
if FRONTEND_DIST:
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
