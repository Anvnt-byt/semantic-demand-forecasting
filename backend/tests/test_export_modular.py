import pytest
from fastapi.testclient import TestClient
from main import app
from database.connection import init_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

def test_export_excel_default():
    response = client.get("/api/analytics/export/excel")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert len(response.content) > 1000

def test_export_pdf_default():
    response = client.get("/api/analytics/export/pdf")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content[:4] == b"%PDF"

def test_export_modular_excel_with_notes():
    payload = {
        "incluir_kpis": True,
        "incluir_abc": True,
        "incluir_vendedores": False,
        "incluir_proyeccion": False,
        "incluir_linaje": True,
        "notas_analista": "Recomendación operativa: Priorizar compra de SKU-CERV-01.",
        "autor_analista": "Ing. Carlos Mendoza",
        "cargo_analista": "Director de Supply Chain"
    }
    response = client.post("/api/analytics/export/excel", json=payload)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert len(response.content) > 1000

def test_export_modular_pdf_with_notes():
    payload = {
        "incluir_kpis": True,
        "incluir_abc": False,
        "incluir_vendedores": False,
        "incluir_proyeccion": False,
        "incluir_linaje": True,
        "notas_analista": "Auditoría completada satisfactoriamente con 0 incidencias críticas.",
        "autor_analista": "Lic. Ana Gómez",
        "cargo_analista": "Auditora de Datos"
    }
    response = client.post("/api/analytics/export/pdf", json=payload)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content[:4] == b"%PDF"
