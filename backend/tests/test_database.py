import pytest
import os
from datetime import datetime
from decimal import Decimal
from sqlalchemy import create_engine, select
from database.models import Base, Venta, Inventario, Vendedor, LineaVenta, AuditoriaIngesta
from database.connection import get_engine, get_db_session, init_db
from schemas.models_schema import VentaRecord, InventarioRecord

@pytest.fixture
def test_db():
    test_db_url = "sqlite:///:memory:"
    engine = create_engine(test_db_url, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

def test_init_db_creates_all_tables(test_db):
    table_names = Base.metadata.tables.keys()
    assert "ventas" in table_names
    assert "inventario" in table_names
    assert "vendedores" in table_names
    assert "lineas_venta" in table_names
    assert "auditoria_ingesta" in table_names

def test_insert_venta_record(test_db):
    with get_db_session(db_url="sqlite:///:memory:") as session:
        # Usamos la sesión con el motor en memoria
        Base.metadata.create_all(bind=session.get_bind())
        venta = Venta(
            id_venta="V-1001",
            fecha=datetime(2026, 10, 18, 14, 30),
            sku="SKU-REF-01",
            descripcion="Producto de prueba A",
            cantidad=5.0,
            precio_unitario=19.99,
            total=99.95,
            id_vendedor="VEND-01",
            nombre_vendedor="Carlos Vendedor"
        )
        session.add(venta)
        session.flush()

        res = session.execute(select(Venta).filter_by(id_venta="V-1001")).scalar_one()
        assert res.sku == "SKU-REF-01"
        assert float(res.cantidad) == 5.0
        assert float(res.total) == 99.95
        assert res.nombre_vendedor == "Carlos Vendedor"

def test_insert_inventario_record_with_lead_time(test_db):
    with get_db_session(db_url="sqlite:///:memory:") as session:
        Base.metadata.create_all(bind=session.get_bind())
        inv = Inventario(
            sku="SKU-INV-99",
            stock_actual=150.0,
            stock_minimo=30.0,
            lead_time_dias=7.5
        )
        session.add(inv)
        session.flush()

        res = session.execute(select(Inventario).filter_by(sku="SKU-INV-99")).scalar_one()
        assert res.sku == "SKU-INV-99"
        assert float(res.stock_actual) == 150.0
        assert float(res.stock_minimo) == 30.0
        assert float(res.lead_time_dias) == 7.5

def test_pydantic_schema_validation():
    venta_data = {
        "id_venta": "TICKET-001",
        "fecha": "2026-10-18T10:00:00",
        "sku": "SKU-ABC",
        "descripcion": "Gaseosa Cola",
        "cantidad": 2.0,
        "precio_unitario": 1.5,
        "total": 3.0,
        "id_vendedor": "VEN-01",
        "nombre_vendedor": "Ana Lopez"
    }
    record = VentaRecord(**venta_data)
    assert record.id_venta == "TICKET-001"
    assert record.cantidad == 2.0

    inv_data = {
        "sku": "SKU-ABC",
        "stock_actual": 45.0,
        "stock_minimo": 10.0,
        "lead_time_dias": 5.0
    }
    inv_record = InventarioRecord(**inv_data)
    assert inv_record.lead_time_dias == 5.0
