import pytest
from datetime import datetime
import polars as pl
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from database.models import Base, Venta, Inventario, AuditoriaIngesta
from schemas.ingestion import TargetEntity, SourceType
from ingestion.cleaning_pipeline import CleaningPipeline, parse_flexible_datetime, parse_numeric
from ingestion.auditor import IngestionAuditor

@pytest.fixture
def memory_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_parse_flexible_datetime():
    dt1 = parse_flexible_datetime("2026-10-18 15:30:00")
    assert dt1 == datetime(2026, 10, 18, 15, 30, 0)

    dt2 = parse_flexible_datetime("18/10/2026")
    assert dt2 == datetime(2026, 10, 18, 0, 0, 0)

    dt3 = parse_flexible_datetime("2026-10-18T10:00:00")
    assert dt3 == datetime(2026, 10, 18, 10, 0, 0)

    assert parse_flexible_datetime("not-a-date") is None
    assert parse_flexible_datetime(None) is None

def test_parse_numeric():
    assert parse_numeric("$1,250.50") == 1250.50
    assert parse_numeric("1.250,50 €") == 1250.50
    assert parse_numeric("45,75") == 45.75
    assert parse_numeric(100) == 100.0
    assert parse_numeric("invalid") is None
    assert parse_numeric(None) is None

def test_cleaning_pipeline_ventas_validation_and_deduplication():
    data = {
        "id_venta": ["T-01", "T-02", "T-03", "T-04", "T-01"], # T-01 duplicado
        "fecha": ["2026-10-18", "fecha-invalida", "2026-10-18", "2026-10-18", "2026-10-18"],
        "sku": ["SKU-A", "SKU-B", None, "SKU-D", "SKU-A"], # T-03 sin SKU
        "cantidad": ["5", "10", "15", "invalido", "5"], # T-04 cantidad no numérica
        "precio_unitario": ["10.5", "20.0", "15.0", "30.0", "10.5"],
        "total": ["52.5", "200.0", "225.0", "0.0", "52.5"]
    }
    df = pl.DataFrame(data)
    valid_records, report = CleaningPipeline.clean_and_audit(
        df,
        entity=TargetEntity.VENTAS,
        source=SourceType.CSV,
        batch_id="BATCH-TEST-01"
    )

    # De 5 registros:
    # Fila 1 (T-01): Válida
    # Fila 2 (T-02): Fecha inválida -> descartada
    # Fila 3 (T-03): SKU nulo -> descartada
    # Fila 4 (T-04): Cantidad inválida -> descartada
    # Fila 5 (T-01): Duplicado exacto de Fila 1 -> descartada
    assert report.total_registros == 5
    assert report.registros_validos == 1
    assert report.registros_descartados == 4
    assert report.duplicados_detectados == 1
    assert len(valid_records) == 1
    assert valid_records[0]["id_venta"] == "T-01"
    assert valid_records[0]["sku"] == "SKU-A"
    assert valid_records[0]["cantidad"] == 5.0

def test_cleaning_pipeline_inventario_lead_time():
    data = {
        "sku": ["SKU-1", "SKU-2", "SKU-1", ""],
        "stock_actual": ["100", "50", "100", "30"],
        "stock_minimo": ["20", "10", "20", "5"],
        "lead_time_dias": ["7.5", "14", "7.5", "3"]
    }
    df = pl.DataFrame(data)
    valid_records, report = CleaningPipeline.clean_and_audit(
        df,
        entity=TargetEntity.INVENTARIO,
        source=SourceType.EXCEL,
        batch_id="BATCH-TEST-02"
    )

    # 4 filas:
    # Fila 1: Válida (lead_time = 7.5)
    # Fila 2: Válida (lead_time = 14.0)
    # Fila 3: Duplicado SKU-1 -> descartada
    # Fila 4: SKU vacío -> descartada
    assert report.total_registros == 4
    assert report.registros_validos == 2
    assert report.registros_descartados == 2
    assert report.duplicados_detectados == 1
    assert valid_records[0]["lead_time_dias"] == 7.5
    assert valid_records[1]["lead_time_dias"] == 14.0

def test_auditor_persistence(memory_db):
    data = {
        "id_venta": ["V-100", "V-101"],
        "fecha": ["2026-10-18", "2026-10-19"],
        "sku": ["SKU-X", "SKU-Y"],
        "cantidad": ["2", "4"],
        "precio_unitario": ["15.0", "25.0"],
        "total": ["30.0", "100.0"]
    }
    df = pl.DataFrame(data)
    valid_records, report = CleaningPipeline.clean_and_audit(
        df,
        entity=TargetEntity.VENTAS,
        source=SourceType.CSV,
        batch_id="BATCH-PERSIST-01"
    )

    IngestionAuditor.persist_records(memory_db, valid_records, TargetEntity.VENTAS, report)
    memory_db.commit()

    # Verificar que se insertó en ventas
    ventas_db = memory_db.execute(select(Venta)).scalars().all()
    assert len(ventas_db) == 2
    assert ventas_db[0].sku == "SKU-X"

    # Verificar que se insertó la auditoría
    audit_rec = IngestionAuditor.get_audit_by_id(memory_db, "BATCH-PERSIST-01")
    assert audit_rec is not None
    assert audit_rec.registros_validos == 2
    assert audit_rec.registros_descartados == 0
