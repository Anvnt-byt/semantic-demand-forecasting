import os
import gc
import hashlib
from typing import List
import polars as pl
from pydantic import BaseModel, Field
from ingestion.normalizer import clean_header, VENTAS_SYNONYMS

pl.Config.set_tbl_rows(8)
os.environ["POLARS_MAX_THREADS"] = "6"

class ColumnaMapeada(BaseModel):
    nombre_original: str
    tipo_inferido: str = Field(description="""
        DEBE ser uno de los siguientes:
        - TIMESTAMP: Fechas o tiempos que indican cuando ocurrio la transaccion.
        - ITEM_ID: Identificador unico del producto o SKU.
        - LOCATION_ID: Identificador de la tienda, sucursal, almacen o ubicacion fisica.
        - TARGET_METRIC: La cantidad numerica a predecir (ventas, volumen, demanda). NUNCA puede ser texto.
        - COVARIATE: Variables estaticas o dinamicas que ayudan a predecir (promociones, dias festivos, categorias, descripciones, precios).
        - IGNORED: Columnas que no aportan valor predictivo (IDs secuenciales, hashes vacios).
    """)
    razonamiento: str
    confianza: float

class ResultadoMapeo(BaseModel):
    columnas: List[ColumnaMapeada]

LOCATION_KEYWORDS = ["tienda", "store", "sucursal", "almacen", "branch", "location", "pos_id"]
IGNORED_KEYWORDS = ["hash", "id_linea", "uuid", "row_id", "index", "id_transaccion"]

def clasificar_columnas_determinista(df: pl.DataFrame) -> ResultadoMapeo:
    """Clasifica ontológicamente las columnas para pronóstico de demanda de forma determinista (CERO LLM)."""
    columnas = []
    has_timestamp = False
    has_target = False
    has_item = False
    has_location = False

    for col in df.columns:
        col_clean = clean_header(col)
        schema_type = str(df.schema[col]).lower()
        is_string = "str" in schema_type or "string" in schema_type

        # 1. TIMESTAMP (fechas)
        if not has_timestamp and any(syn in col_clean for syn in VENTAS_SYNONYMS["fecha"]):
            columnas.append(ColumnaMapeada(
                nombre_original=col,
                tipo_inferido="TIMESTAMP",
                razonamiento="Detectado como campo temporal por reglas deterministas.",
                confianza=1.0
            ))
            has_timestamp = True
            continue

        # 2. TARGET_METRIC (cantidad/volumen numérico a predecir)
        if not has_target and any(syn == col_clean or col_clean.startswith(syn) for syn in VENTAS_SYNONYMS["cantidad"]):
            columnas.append(ColumnaMapeada(
                nombre_original=col,
                tipo_inferido="TARGET_METRIC",
                razonamiento="Detectado como volumen de venta/demanda numérico.",
                confianza=1.0
            ))
            has_target = True
            continue

        # 3. ITEM_ID (SKU / código producto)
        if not has_item and any(syn == col_clean or col_clean.startswith(syn) for syn in VENTAS_SYNONYMS["sku"]):
            columnas.append(ColumnaMapeada(
                nombre_original=col,
                tipo_inferido="ITEM_ID",
                razonamiento="Identificador único de SKU/artículo.",
                confianza=1.0
            ))
            has_item = True
            continue

        # 4. LOCATION_ID (sucursal/tienda)
        if not has_location and any(loc in col_clean for loc in LOCATION_KEYWORDS):
            columnas.append(ColumnaMapeada(
                nombre_original=col,
                tipo_inferido="LOCATION_ID",
                razonamiento="Identificador de ubicación física/sucursal.",
                confianza=0.95
            ))
            has_location = True
            continue

        # 5. IGNORED (hashes o llaves puras secundarias)
        if any(ign in col_clean for ign in IGNORED_KEYWORDS):
            columnas.append(ColumnaMapeada(
                nombre_original=col,
                tipo_inferido="IGNORED",
                razonamiento="Columna de llave secundaria o hash sin valor predictivo.",
                confianza=0.9
            ))
            continue

        # 6. COVARIATE por defecto para las demás columnas
        columnas.append(ColumnaMapeada(
            nombre_original=col,
            tipo_inferido="COVARIATE",
            razonamiento="Covariable explicativa categórica o numérica.",
            confianza=0.85
        ))

    # Asegurar que al menos tengamos TIMESTAMP y TARGET_METRIC
    if not has_timestamp or not has_target:
        # Fallback de emergencia si no coincidió por nombre
        for c in columnas:
            if not has_timestamp and c.tipo_inferido == "COVARIATE":
                c.tipo_inferido = "TIMESTAMP"
                has_timestamp = True
                break
        for c in columnas:
            if not has_target and c.tipo_inferido == "COVARIATE":
                c.tipo_inferido = "TARGET_METRIC"
                has_target = True
                break

    return ResultadoMapeo(columnas=columnas)

def transformar_datos(df_raw: pl.LazyFrame, mapeo: ResultadoMapeo) -> pl.LazyFrame:
    cols_ignored = [c.nombre_original for c in mapeo.columnas if c.tipo_inferido == "IGNORED"]
    cols_timestamp = [c.nombre_original for c in mapeo.columnas if c.tipo_inferido == "TIMESTAMP"]
    cols_target = [c.nombre_original for c in mapeo.columnas if c.tipo_inferido == "TARGET_METRIC"]
    cols_item = [c.nombre_original for c in mapeo.columnas if c.tipo_inferido == "ITEM_ID"]
    cols_location = [c.nombre_original for c in mapeo.columnas if c.tipo_inferido == "LOCATION_ID"]
    cols_covariate = [c.nombre_original for c in mapeo.columnas if c.tipo_inferido == "COVARIATE"]

    if not cols_timestamp or not cols_target:
        raise ValueError("El esquema debe contener al menos un TIMESTAMP y un TARGET_METRIC")

    df_clean = df_raw.drop(cols_ignored)

    rename_map = {}
    if cols_timestamp:
        rename_map[cols_timestamp[0]] = "ds"
    if cols_target:
        rename_map[cols_target[0]] = "y"
    df_clean = df_clean.rename(rename_map)

    covariates_cat = [c for c in cols_covariate if df_clean.schema[c] == pl.String]
    covariates_num = [c for c in cols_covariate if df_clean.schema[c] != pl.String]

    ts_keys = []
    if cols_location: ts_keys.append(cols_location[0])
    if cols_item: ts_keys.append(cols_item[0])

    if len(ts_keys) > 1:
        df_clean = df_clean.with_columns(
            pl.concat_str([pl.col(k).cast(pl.String) for k in ts_keys], separator="_").alias("unique_id")
        )
        df_clean = df_clean.drop(cols_item + cols_location)
    elif len(ts_keys) == 1:
        if ts_keys[0] in cols_item or ts_keys[0] in cols_location:
            df_clean = df_clean.rename({ts_keys[0]: "unique_id"})
        else:
            df_clean = df_clean.with_columns(pl.col(ts_keys[0]).cast(pl.String).alias("unique_id"))
    else:
        df_clean = df_clean.with_columns(pl.lit("1").alias("unique_id"))

    df_clean = df_clean.with_columns(pl.col("unique_id").cast(pl.String))
    df_clean = df_clean.with_columns([pl.col("y").cast(pl.Float64)])

    group_cols = ["unique_id", "ds"]
    agg_exprs = [pl.col("y").sum()]
    for c in covariates_num:
        if c in df_clean.columns:
            agg_exprs.append(pl.col(c).max())
    for c in covariates_cat:
        if c in df_clean.columns:
            agg_exprs.append(pl.col(c).first())

    df_agg = df_clean.group_by(group_cols).agg(agg_exprs)

    downcast_exprs = [
        pl.col("y").cast(pl.Float32),
        pl.col("unique_id").cast(pl.Categorical)
    ]
    for c in covariates_cat:
        if c in df_clean.columns:
            downcast_exprs.append(pl.col(c).cast(pl.Categorical))
            
    for c in covariates_num:
        if c in df_clean.columns:
            downcast_exprs.append(pl.col(c).cast(pl.Float32))
            
    df_agg = df_agg.with_columns(downcast_exprs)
    df_final = df_agg.sort(["unique_id", "ds"])
    return df_final

def procesar_archivo_a_parquet(file_path: str) -> str:
    es_parquet = file_path.lower().endswith(".parquet")
    
    try:
        if es_parquet:
            lf = pl.scan_parquet(file_path)
            columnas_existentes = set(lf.collect_schema().names())
            if {"unique_id", "ds", "y"}.issubset(columnas_existentes):
                return file_path
        else:
            lf = pl.scan_csv(file_path, infer_schema_length=0, ignore_errors=True)
    except FileNotFoundError:
        raise

    df_muestra = lf.head(1000).collect()
    mapeo = clasificar_columnas_determinista(df_muestra)
    del df_muestra
    gc.collect()

    lf_transformado = transformar_datos(lf, mapeo)
    out_path = file_path if es_parquet else file_path.replace(".csv", ".parquet")
    if es_parquet and out_path == file_path:
        out_path = file_path.replace(".parquet", "_preparado.parquet")
        
    lf_transformado.collect(streaming=True).write_parquet(out_path)
    return out_path

def procesar_csv_a_parquet(file_path: str) -> str:
    return procesar_archivo_a_parquet(file_path)
