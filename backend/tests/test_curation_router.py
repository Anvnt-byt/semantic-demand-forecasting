import pytest
from fastapi.testclient import TestClient
from main import app
from database.connection import init_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

def test_curation_get_dirty_demo_batch():
    response = client.get("/api/curation/dirty-demo")
    assert response.status_code == 200
    data = response.json()
    assert "records" in data
    assert len(data["records"]) >= 50
    assert any(r["sku"] == "SKU-OUTLIER" for r in data["records"])

def test_curation_preview_dataset():
    response = client.get("/api/curation/preview-dataset")
    assert response.status_code == 200
    data = response.json()
    assert "records" in data
    assert isinstance(data["records"], list)

def test_curation_commit_records():
    payload = {
        "dataset_name": "Lote_Curado_Prueba",
        "records": [
            {
                "id_venta": "CUR-TEST-01",
                "fecha": "2026-10-18",
                "sku": "SKU-CERV-01",
                "descripcion": "Cerveza Six-Pack 355ml",
                "cantidad": 10.0,
                "precio_unitario": 145.0,
                "total": 1450.0,
                "vendedor": "Tester"
            }
        ],
        "recipe_summary": [
            {"step": "Trimming IQR", "target": "cantidad"}
        ]
    }
    response = client.post("/api/curation/commit", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["registros_insertados"] == 1
    assert "SKU-CERV-01" in data["skus_afectados"]

def test_curation_reset_demo():
    response = client.post("/api/curation/reset-demo")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["summary"]["dias_generados"] == 90
