import pytest
import os
import tempfile
import polars as pl
import openpyxl
from schemas.ingestion import TargetEntity
from ingestion.normalizer import DeterministicNormalizer, clean_header
from ingestion.file_parser import FileParser, detect_csv_separator

def test_clean_header():
    assert clean_header("Código de Producto") == "codigo_de_producto"
    assert clean_header("Precio Unitario ($)") == "precio_unitario"
    assert clean_header("  FECHA DE VENTA  ") == "fecha_de_venta"
    assert clean_header("Total_Venta___") == "total_venta"

def test_ventas_mapping_and_rules():
    raw_data = {
        "Fec_Fac": ["2026-10-01", "2026-10-02"],
        "Cve_Art": ["SKU-001", "SKU-002"],
        "Desc_Producto": ["Galletas Chocolate", "Refresco Cola"],
        "Cant": [2.0, 5.0],
        "Precio_Unit": [10.0, 15.0],
        "Vendedor": ["Juan Perez", "Maria Gomez"]
    }
    df = pl.DataFrame(raw_data)
    df_norm = DeterministicNormalizer.normalize_polars_df(df, entity=TargetEntity.VENTAS)

    cols = df_norm.columns
    assert "fecha" in cols
    assert "sku" in cols
    assert "descripcion" in cols
    assert "cantidad" in cols
    assert "precio_unitario" in cols
    assert "total" in cols # Auto-calculado: 2*10=20, 5*15=75
    assert "id_venta" in cols # Auto-generado VTA-AUTO-...
    assert "nombre_vendedor" in cols

    totals = df_norm["total"].to_list()
    assert totals[0] == 20.0
    assert totals[1] == 75.0

def test_inventario_mapping_with_lead_time():
    raw_data = {
        "Codigo": ["SKU-100", "SKU-200"],
        "Existencia": [50.0, 120.0],
        "Min_Stock": [10.0, 20.0],
        "Dias_Entrega": [5.0, 12.0]
    }
    df = pl.DataFrame(raw_data)
    df_norm = DeterministicNormalizer.normalize_polars_df(df, entity=TargetEntity.INVENTARIO)

    cols = df_norm.columns
    assert "sku" in cols
    assert "stock_actual" in cols
    assert "stock_minimo" in cols
    assert "lead_time_dias" in cols

    lead_times = df_norm["lead_time_dias"].to_list()
    assert lead_times[0] == 5.0
    assert lead_times[1] == 12.0

def test_inventario_lead_time_fallback():
    raw_data = {
        "SKU": ["SKU-X1"],
        "Stock": [10.0]
    }
    df = pl.DataFrame(raw_data)
    df_norm = DeterministicNormalizer.normalize_polars_df(df, entity=TargetEntity.INVENTARIO)

    assert "lead_time_dias" in df_norm.columns
    assert df_norm["lead_time_dias"][0] == 0.0
    assert df_norm["stock_minimo"][0] == 0.0

def test_csv_file_parser_semicolon():
    with tempfile.NamedTemporaryFile(suffix=".csv", mode="w", delete=False, encoding="utf-8") as f:
        f.write("ticket;fecha;sku;cantidad;precio\n")
        f.write("T-01;2026-10-18;SKU-99;3;25.5\n")
        temp_csv = f.name

    try:
        sep = detect_csv_separator(temp_csv)
        assert sep == ";"
        df_norm = FileParser.parse_and_normalize(temp_csv, entity=TargetEntity.VENTAS)
        assert len(df_norm) == 1
        assert df_norm["sku"][0] == "SKU-99"
        assert float(df_norm["cantidad"][0]) == 3.0
        assert float(df_norm["precio_unitario"][0]) == 25.5
        assert float(df_norm["total"][0]) == 76.5
    finally:
        if os.path.exists(temp_csv):
            os.remove(temp_csv)

def test_excel_file_parser():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Inventario"
    ws.append(["Codigo_Articulo", "Stock_Actual", "Tiempo_Reposicion"])
    ws.append(["SKU-EX-1", 100, 7])
    ws.append(["SKU-EX-2", 45, 14])

    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as f:
        temp_xlsx = f.name
    wb.save(temp_xlsx)

    try:
        df_norm = FileParser.parse_and_normalize(temp_xlsx, entity=TargetEntity.INVENTARIO)
        assert len(df_norm) == 2
        assert "sku" in df_norm.columns
        assert "stock_actual" in df_norm.columns
        assert "lead_time_dias" in df_norm.columns
        assert df_norm["sku"][0] == "SKU-EX-1"
        assert float(df_norm["lead_time_dias"][0]) == 7.0
        assert float(df_norm["lead_time_dias"][1]) == 14.0
    finally:
        if os.path.exists(temp_xlsx):
            os.remove(temp_xlsx)
