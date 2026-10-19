import os
import io
from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import openpyxl

from database.models import Base
from database.connection import get_db, get_engine
from main import app

# Configuración de base de datos de prueba en memoria SQLite compartida
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

from unittest.mock import patch

@pytest.fixture(scope="module", autouse=True)
def setup_integration_db():
    Base.metadata.create_all(bind=test_engine)
    patcher_conn = patch("database.connection.get_engine", return_value=test_engine)
    patcher_analytics = patch("analytics.db.get_engine", return_value=test_engine)
    patcher_conn.start()
    patcher_analytics.start()
    app.dependency_overrides[get_db] = override_get_db
    yield
    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides.clear()
    patcher_conn.stop()
    patcher_analytics.stop()

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

client = TestClient(app)

def test_health_check():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_full_pipeline_ingest_and_analytics_flow():
    """
    Prueba integral end-to-end:
    1. Ingesta CSV de ventas con historial representativo (30 días).
    2. Ingesta Excel de catálogo de inventario con lead_time_dias.
    3. Consulta de KPIs en tiempo real.
    4. Consulta de rotación y clasificación Pareto ABC.
    5. Consulta de desempeño descriptivo de vendedores.
    6. Generación de pronóstico predictivo LightGBM / heurístico con WAPE y ROP.
    7. Exportación en memoria a Excel (verificando PowerBI_Tidy_Data) y PDF.
    8. Verificación de licencia SaaS offline.
    """
    # 1. Preparar dataset de ventas de 35 días para garantizar historial de ML
    hoy = datetime.utcnow()
    filas_csv = ["id_venta,fecha,sku,descripcion,cantidad,precio_unitario,total,id_vendedor,nombre_vendedor"]
    
    # Simular 35 días de ventas para 3 SKUs
    for day_offset in range(35, 0, -1):
        fecha_str = (hoy - timedelta(days=day_offset)).strftime("%Y-%m-%d %H:%M:%S")
        ticket_id = f"TICK-{day_offset}"
        
        # SKU-01: Producto estrella (Alta rotación)
        filas_csv.append(f"{ticket_id}-1,{fecha_str},SKU-CERV-01,Cerveza Six-Pack,10,25.0,250.0,VEND-01,Carlos Mendez")
        # SKU-02: Producto medio
        filas_csv.append(f"{ticket_id}-2,{fecha_str},SKU-LECHE-02,Leche Entera 1L,5,18.0,90.0,VEND-02,Ana Martinez")
        # SKU-03: Producto bajo (solo cada 3 días)
        if day_offset % 3 == 0:
            filas_csv.append(f"{ticket_id}-3,{fecha_str},SKU-BATT-03,Baterias AA 4pk,2,45.0,90.0,VEND-01,Carlos Mendez")

    csv_data = "\n".join(filas_csv).encode("utf-8")
    files = {"file": ("ventas_historicas.csv", io.BytesIO(csv_data), "text/csv")}
    data = {"entity": "ventas"}

    res_ingest_ventas = client.post("/ingest/file", files=files, data=data)
    assert res_ingest_ventas.status_code == 200
    audit_ventas = res_ingest_ventas.json()["audit"]
    assert audit_ventas["registros_validos"] > 0
    assert audit_ventas["registros_descartados"] == 0

    # 2. Ingestar catálogo de inventario con lead_time_dias
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Inventario"
    ws.append(["sku", "stock_actual", "stock_minimo", "lead_time_dias"])
    ws.append(["SKU-CERV-01", 15.0, 30.0, 3.0])   # Stock por debajo del mínimo -> alerta_reorden: True
    ws.append(["SKU-LECHE-02", 50.0, 20.0, 2.0])  # Stock saludable -> alerta_reorden: False
    ws.append(["SKU-BATT-03", 5.0, 10.0, 14.0])   # Stock bajo con lead time largo -> alerta_reorden: True
    
    excel_buf = io.BytesIO()
    wb.save(excel_buf)
    excel_buf.seek(0)

    files_inv = {"file": ("inventario.xlsx", excel_buf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    data_inv = {"entity": "inventario"}

    res_ingest_inv = client.post("/ingest/file", files=files_inv, data=data_inv)
    assert res_ingest_inv.status_code == 200
    assert res_ingest_inv.json()["audit"]["registros_validos"] == 3

    # 3. Validar KPIs en tiempo real
    res_kpis = client.get(f"/api/analytics/kpis?fecha_corte={hoy.strftime('%Y-%m-%d')}")
    assert res_kpis.status_code == 200
    kpis = res_kpis.json()
    assert kpis["ventas_totales"] > 0
    assert kpis["total_transacciones"] > 0
    assert kpis["ticket_promedio"] > 0

    # 4. Validar rotación de inventario y Pareto ABC
    res_turnover = client.get("/api/analytics/inventory-turnover?window_days=30")
    assert res_turnover.status_code == 200
    turnover = res_turnover.json()
    assert turnover["total_skus_analizados"] >= 3
    # Comprobar que los productos clasificados incluyen A y B/C
    assert "A" in turnover["resumen_abc"]
    # Comprobar detección de alerta de reposición
    prod_cerv = next(p for p in turnover["productos"] if p["sku"] == "SKU-CERV-01")
    assert prod_cerv["clasificacion_abc"] == "A"
    assert prod_cerv["alerta_reorden"] is True

    # 5. Validar desempeño de vendedores
    res_sellers = client.get("/api/analytics/sellers")
    assert res_sellers.status_code == 200
    sellers = res_sellers.json()["vendedores"]
    assert len(sellers) >= 2
    # Carlos Mendez debe ser el de mayor venta por volumen de cerveza y baterias
    assert sellers[0]["nombre"] == "Carlos Mendez"
    assert sellers[0]["porcentaje_contribucion"] > 50.0

    # 6. Validar motor predictivo
    req_forecast = {"dias_a_futuro": 7, "force_retrain": True}
    res_forecast = client.post("/api/analytics/predict-demand", json=req_forecast)
    assert res_forecast.status_code == 200
    forecast_data = res_forecast.json()
    assert len(forecast_data["productos"]) >= 2
    
    # Comprobar que las predicciones respetan no negatividad e intervalos
    for prod in forecast_data["productos"]:
        assert prod["lead_time_aplicado"] >= 0
        assert prod["nivel_confianza"] in ["alta_ml", "fase_aprendizaje_heuristica"]
        assert len(prod["predicciones"]) == 7
        for pt in prod["predicciones"]:
            assert pt["pronostico"] >= 0
            assert pt["p10"] <= pt["pronostico"] <= pt["p90"]

    # 7. Validar exportables en memoria
    # Excel con pestaña PowerBI_Tidy_Data
    res_excel = client.get("/api/analytics/export/excel")
    assert res_excel.status_code == 200
    assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in res_excel.headers["content-type"]
    wb_read = openpyxl.load_workbook(io.BytesIO(res_excel.content))
    assert "PowerBI_Tidy_Data" in wb_read.sheetnames
    assert "KPIs Ejecutivos" in wb_read.sheetnames
    assert "Rotación y Stock" in wb_read.sheetnames

    # PDF ejecutivo
    res_pdf = client.get("/api/analytics/export/pdf")
    assert res_pdf.status_code == 200
    assert "application/pdf" in res_pdf.headers["content-type"]
    assert len(res_pdf.content) > 1000

    # 8. Validar licenciamiento SaaS offline
    res_lic_pro = client.post("/api/license/verify", json={
        "license_key": "TC-PRO-DEMO-2027",
        "pos_identifier": "TERM-POS-01"
    })
    assert res_lic_pro.status_code == 200
    assert res_lic_pro.json()["valid"] is True
    assert res_lic_pro.json()["plan"] == "pro"
