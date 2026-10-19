import pytest
import io
import openpyxl
from unittest.mock import patch, MagicMock
import polars as pl
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from database.models import Base
from database.connection import get_db
from main import app
from connectors.security import SecurityViolationError

# Configurar motor de prueba en memoria persistente con StaticPool
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

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

@pytest.fixture(autouse=True)
def setup_test_database():
    Base.metadata.create_all(bind=test_engine)
    app.dependency_overrides[get_db] = override_get_db
    yield
    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides.clear()

client = TestClient(app)

def test_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_ingest_file_csv_ventas():
    csv_content = (
        "id_venta,fecha,sku,descripcion,cantidad,precio_unitario,total\n"
        "VTA-01,2026-10-18,SKU-TEST-1,Lapiz Grafito,10,1.5,15.0\n"
        "VTA-02,2026-10-18,SKU-TEST-2,Cuaderno A4,5,3.0,15.0\n"
    )
    files = {"file": ("ventas.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    data = {"entity": "ventas"}

    res = client.post("/ingest/file", files=files, data=data)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["success"] is True
    audit = res_data["audit"]
    assert audit["total_registros"] == 2
    assert audit["registros_validos"] == 2
    assert audit["registros_descartados"] == 0

def test_ingest_file_excel_inventario_with_lead_time():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Codigo", "Stock_Actual", "Min_Stock", "Dias_Entrega"])
    ws.append(["SKU-EXCEL-01", 100, 20, 5.5])
    ws.append(["SKU-EXCEL-02", 250, 50, 10.0])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    files = {"file": ("inventario.xlsx", buf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    data = {"entity": "inventario"}

    res = client.post("/ingest/file", files=files, data=data)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["success"] is True
    audit = res_data["audit"]
    assert audit["registros_validos"] == 2
    batch_id = audit["batch_id"]

    # Verificar consulta de auditoría
    res_audit = client.get(f"/ingest/audit/{batch_id}")
    assert res_audit.status_code == 200
    assert res_audit.json()["batch_id"] == batch_id

def test_ingest_file_invalid_extension():
    files = {"file": ("script.py", io.BytesIO(b"print('hello')"), "text/x-python")}
    res = client.post("/ingest/file", files=files, data={"entity": "ventas"})
    assert res.status_code == 400
    assert "Formato de archivo no soportado" in res.json()["detail"]

@patch("routers.ingestion_router.get_pos_connector")
def test_pos_test_connection_success(mock_get_connector):
    mock_conn = MagicMock()
    mock_conn.test_connection.return_value = True
    mock_conn.__enter__.return_value = mock_conn
    mock_conn.__exit__.return_value = None
    mock_get_connector.return_value = mock_conn

    payload = {
        "db_type": "mysql",
        "host": "localhost",
        "port": 3306,
        "database": "pos_prod",
        "username": "ro_agent",
        "password": "secret_password",
        "query_or_table": "ventas"
    }
    res = client.post("/ingest/pos/test-connection", json=payload)
    assert res.status_code == 200
    assert res.json()["success"] is True
    assert "READ-ONLY" in res.json()["message"]

@patch("routers.ingestion_router.get_pos_connector")
def test_pos_test_connection_security_violation(mock_get_connector):
    mock_conn = MagicMock()
    mock_conn.test_connection.side_effect = SecurityViolationError("Escritura no permitida")
    mock_conn.__enter__.return_value = mock_conn
    mock_conn.__exit__.return_value = None
    mock_get_connector.return_value = mock_conn

    payload = {
        "db_type": "postgresql",
        "host": "localhost",
        "port": 5432,
        "database": "pos_prod",
        "username": "admin",
        "password": "pwd",
        "query_or_table": "ventas"
    }
    res = client.post("/ingest/pos/test-connection", json=payload)
    assert res.status_code == 403
    assert "Violación de Seguridad" in res.json()["detail"]

@patch("routers.ingestion_router.get_pos_connector")
def test_pos_sync_success(mock_get_connector):
    mock_conn = MagicMock()
    mock_df = pl.DataFrame({
        "folio": ["POS-100", "POS-101"],
        "fecha": ["2026-10-18 10:00:00", "2026-10-18 10:15:00"],
        "articulo": ["SKU-POS-1", "SKU-POS-2"],
        "unidades": [3, 4],
        "pvp": [12.0, 8.5],
        "importe": [36.0, 34.0]
    })
    mock_conn.fetch_dataframe.return_value = mock_df
    mock_conn.__enter__.return_value = mock_conn
    mock_conn.__exit__.return_value = None
    mock_get_connector.return_value = mock_conn

    payload = {
        "pos_config": {
            "db_type": "mysql",
            "host": "192.168.1.100",
            "port": 3306,
            "database": "tienda_pos",
            "username": "ro_user",
            "password": "pwd",
            "query_or_table": "SELECT * FROM tickets"
        },
        "target_entity": "ventas"
    }
    res = client.post("/ingest/pos/sync", json=payload)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["success"] is True
    audit = res_data["audit"]
    assert audit["registros_validos"] == 2
    assert audit["fuente"] == "POS_MYSQL"

def test_list_recent_audits():
    res = client.get("/ingest/audit?limit=5")
    assert res.status_code == 200
    assert isinstance(res.json(), list)
