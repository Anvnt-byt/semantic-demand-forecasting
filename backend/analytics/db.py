import os
import logging
from typing import Optional
from contextlib import contextmanager
import polars as pl
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

def get_database_url() -> str:
    """Obtiene la URL de conexión a la base de datos PostgreSQL interna."""
    env_url = os.getenv("DATABASE_URL")
    if env_url:
        return env_url
    
    user = os.getenv("POSTGRES_USER", "postgres")
    password = os.getenv("POSTGRES_PASSWORD", "postgres")
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    db = os.getenv("POSTGRES_DB", "pos_analytics")
    
    return f"postgresql://{user}:{password}@{host}:{port}/{db}"

_engine: Optional[Engine] = None

def get_engine() -> Engine:
    """Devuelve una instancia singleton del motor SQLAlchemy con pool de conexiones."""
    global _engine
    if _engine is None:
        url = get_database_url()
        if url.startswith("sqlite"):
            _engine = create_engine(url, connect_args={"check_same_thread": False}, future=True)
        else:
            _engine = create_engine(
                url,
                pool_pre_ping=True,
                pool_size=5,
                max_overflow=10,
                future=True
            )
    return _engine

def query_to_polars(sql: str, params: Optional[dict] = None) -> pl.DataFrame:
    """
    Ejecuta una consulta SQL y retorna un DataFrame de Polars optimizado en memoria.
    """
    engine = get_engine()
    with engine.connect() as conn:
        result = conn.execute(text(sql), params or {})
        rows = result.fetchall()
        columns = list(result.keys())
        if not rows:
            return pl.DataFrame(schema={col: pl.Utf8 for col in columns})
        
        # Mapeo a lista de tuplas para construcción nativa de Polars
        data = {col: [row[i] for row in rows] for i, col in enumerate(columns)}
        return pl.DataFrame(data)
