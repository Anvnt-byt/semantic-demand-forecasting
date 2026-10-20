import re
import unicodedata
from difflib import SequenceMatcher
from typing import Dict, List, Optional, Tuple, Set
import polars as pl
from schemas.ingestion import TargetEntity

def clean_header(name: str) -> str:
    """Sanitiza y normaliza un encabezado de columna eliminando diacríticos, símbolos y espacios."""
    if not isinstance(name, str):
        name = str(name)
    nfkd = unicodedata.normalize("NFKD", name)
    sin_tildes = "".join([c for c in nfkd if not unicodedata.combining(c)])
    limpio = re.sub(r"[^a-zA-Z0-9_]", "_", sin_tildes.lower().strip())
    limpio = re.sub(r"_+", "_", limpio).strip("_")
    return limpio

VENTAS_SYNONYMS: Dict[str, List[str]] = {
    "id_venta": [
        "id_venta", "idventa", "id_ticket", "ticket", "folio", "factura", 
        "id_factura", "nro_factura", "order_id", "sale_id", "transaccion", 
        "id_transaccion", "invoice_id", "recibo", "num_ticket", "no_ticket", "pedido"
    ],
    "fecha": [
        "fecha", "date", "datetime", "timestamp", "created_at", "fecha_venta", 
        "fec_fac", "fecha_hora", "dia", "time", "trans_date", "fechahora", "fecha_emision"
    ],
    "sku": [
        "sku", "codigo", "cod_producto", "item_id", "product_id", "articulo", 
        "cve_art", "id_producto", "codigo_producto", "barcode", "codigo_barras", 
        "item_code", "prod_code", "clave_articulo", "referencia"
    ],
    "descripcion": [
        "descripcion", "description", "producto", "nombre_producto", "articulo_desc", 
        "item_name", "product_name", "desc_producto", "detalle", "concepto", "nom_prod"
    ],
    "cantidad": [
        "cantidad", "cant", "qty", "quantity", "unidades", "volumen", 
        "piezas", "cnt", "unidades_vendidas", "sales_volume", "total_unidades", "pzas"
    ],
    "precio_unitario": [
        "precio_unitario", "precio", "unit_price", "pvp", "precio_venta", 
        "precio_unit", "costo_unit", "val_unit", "price", "p_unit", "pu"
    ],
    "total": [
        "total", "monto_total", "importe", "subtotal", "total_venta", 
        "importe_total", "neto", "sale_amount", "revenue", "monto", "total_linea"
    ],
    "id_vendedor": [
        "id_vendedor", "cod_vendedor", "vendedor_id", "seller_id", 
        "salesperson_id", "cajero_id", "empleado_id", "user_id", "cve_vendedor",
        "caja", "caja_id", "num_caja", "terminal", "tpv", "pos_id", "estacion", "servicio_id", "modulo_id"
    ],
    "nombre_vendedor": [
        "nombre_vendedor", "vendedor", "salesperson", "cajero", "seller_name", 
        "empleado", "nom_vendedor", "nom_cajero", "nombre_caja", "num_caja", "mostrador", "servicio", "punto_cobro", "modulo"
    ],
}

INVENTARIO_SYNONYMS: Dict[str, List[str]] = {
    "sku": [
        "sku", "codigo", "cod_producto", "item_id", "product_id", "articulo", 
        "cve_art", "id_producto", "codigo_barras", "item_code", "referencia",
        "num_parte", "numero_parte", "no_parte", "part_number", "refaccion"
    ],
    "stock_actual": [
        "stock_actual", "stock", "existencia", "existencias", "inventario", 
        "qty_on_hand", "current_stock", "unidades_stock", "on_hand", "balance", "cant_stock"
    ],
    "stock_minimo": [
        "stock_minimo", "min_stock", "stock_seguridad", "safety_stock", 
        "pto_reorden", "minimo", "reorder_point", "stock_min"
    ],
    "lead_time_dias": [
        "lead_time_dias", "lead_time", "tiempo_reposicion", "dias_entrega", 
        "tiempo_entrega", "lead_time_days", "dias_reposicion", "leadtime", 
        "delivery_days", "tiempo_reabastecimiento"
    ],
}

class DeterministicNormalizer:
    """
    Normalizador Semántico Determinista basado en reglas y diccionarios de ontología.
    No requiere modelos LLM ni contenedores externos.
    """

    @classmethod
    def similarity(cls, a: str, b: str) -> float:
        return SequenceMatcher(None, a, b).ratio()

    @classmethod
    def match_column(cls, col_raw: str, synonyms_dict: Dict[str, List[str]], threshold: float = 0.82) -> Optional[str]:
        cleaned = clean_header(col_raw)
        
        # 1. Coincidencia exacta con nombre canónico
        if cleaned in synonyms_dict:
            return cleaned

        # 2. Coincidencia exacta con lista de sinónimos
        for canonical, syn_list in synonyms_dict.items():
            if cleaned in syn_list:
                return canonical

        # 3. Coincidencia por subcadena / token
        for canonical, syn_list in synonyms_dict.items():
            for syn in syn_list:
                if syn in cleaned or cleaned in syn:
                    # Evitar falsos positivos comunes (ej. 'precio' en 'precio_unitario')
                    if len(cleaned) >= 3 and len(syn) >= 3:
                        return canonical

        # 4. Coincidencia difusa (Levenshtein / SequenceMatcher)
        best_match = None
        highest_score = 0.0
        for canonical, syn_list in synonyms_dict.items():
            for syn in syn_list:
                score = cls.similarity(cleaned, syn)
                if score > highest_score:
                    highest_score = score
                    best_match = canonical

        if highest_score >= threshold:
            return best_match

        return None

    @classmethod
    def resolve_mapping(
        cls, 
        columns: List[str], 
        entity: TargetEntity, 
        manual_override: Optional[Dict[str, str]] = None
    ) -> Dict[str, str]:
        """
        Determina la correspondencia de columnas origen -> estándar analítico.
        """
        synonyms = VENTAS_SYNONYMS if entity == TargetEntity.VENTAS else INVENTARIO_SYNONYMS
        resolved: Dict[str, str] = {}
        assigned_canonicals: Set[str] = set()

        # Aplicar primero overrides manuales si existen
        if manual_override:
            for src, target in manual_override.items():
                if src in columns and target in synonyms:
                    resolved[src] = target
                    assigned_canonicals.add(target)

        # Mapear columnas restantes determinísticamente
        for col in columns:
            if col in resolved:
                continue
            canonical = cls.match_column(col, synonyms)
            if canonical and canonical not in assigned_canonicals:
                resolved[col] = canonical
                assigned_canonicals.add(canonical)

        return resolved

    @classmethod
    def normalize_polars_df(
        cls, 
        df: pl.DataFrame, 
        entity: TargetEntity, 
        manual_override: Optional[Dict[str, str]] = None
    ) -> pl.DataFrame:
        """
        Aplica el mapeo de columnas y reglas de negocio sobre un DataFrame de Polars.
        """
        mapping = cls.resolve_mapping(df.columns, entity, manual_override)
        df_norm = df.rename(mapping)

        if entity == TargetEntity.VENTAS:
            # Reglas de negocio para ventas
            cols = df_norm.columns

            # Si id_venta no existe, se genera un identificador sintético basado en el índice
            if "id_venta" not in cols:
                df_norm = df_norm.with_columns(
                    pl.concat_str([pl.lit("VTA-AUTO-"), pl.int_range(1, pl.len() + 1).cast(pl.String)]).alias("id_venta")
                )

            # Si descripcion no existe, se añade vacía
            if "descripcion" not in cols:
                df_norm = df_norm.with_columns(pl.lit(None, dtype=pl.String).alias("descripcion"))

            # Si precio_unitario o total faltan, aplicar derivación
            if "precio_unitario" not in cols and "total" in cols and "cantidad" in cols:
                # precio_unitario = total / cantidad
                df_norm = df_norm.with_columns(
                    (pl.col("total").cast(pl.Float64) / pl.when(pl.col("cantidad").cast(pl.Float64) != 0)
                     .then(pl.col("cantidad").cast(pl.Float64)).otherwise(1.0)).alias("precio_unitario")
                )
            elif "total" not in cols and "precio_unitario" in cols and "cantidad" in cols:
                # total = cantidad * precio_unitario
                df_norm = df_norm.with_columns(
                    (pl.col("cantidad").cast(pl.Float64) * pl.col("precio_unitario").cast(pl.Float64)).alias("total")
                )

            if "id_vendedor" not in cols:
                df_norm = df_norm.with_columns(pl.lit(None, dtype=pl.String).alias("id_vendedor"))

            if "nombre_vendedor" not in cols:
                df_norm = df_norm.with_columns(pl.lit(None, dtype=pl.String).alias("nombre_vendedor"))

        elif entity == TargetEntity.INVENTARIO:
            # Reglas de negocio para inventario
            cols = df_norm.columns

            if "stock_minimo" not in cols:
                df_norm = df_norm.with_columns(pl.lit(0.0).alias("stock_minimo"))

            # Regla crítica: lead_time_dias para cálculo de ROP
            if "lead_time_dias" not in cols:
                df_norm = df_norm.with_columns(pl.lit(0.0).alias("lead_time_dias"))

        return df_norm
