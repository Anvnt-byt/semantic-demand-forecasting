import uuid
import time
import re
import math
from datetime import datetime, date
from typing import Dict, Any, List, Tuple, Optional, Set
import polars as pl
from schemas.ingestion import TargetEntity, SourceType, AuditReport, ErrorDetail

DATE_PATTERNS = [
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d %H:%M:%S.%f",
    "%Y-%m-%d",
    "%d/%m/%Y %H:%M:%S",
    "%d/%m/%Y",
    "%m/%d/%Y",
    "%Y/%m/%d",
    "%d-%m-%Y",
]

def parse_flexible_datetime(val: Any) -> Optional[datetime]:
    """Intenta parsear una fecha/hora proveniente de diversos formatos comunes."""
    if val is None or val == "" or val == "null" or val == "None":
        return None
    if isinstance(val, datetime):
        return val
    if isinstance(val, date):
        return datetime.combine(val, datetime.min.time())

    val_str = str(val).strip()
    # Limpiar posibles delimitadores 'T' de ISO
    val_clean = val_str.replace("T", " ")

    for fmt in DATE_PATTERNS:
        try:
            return datetime.strptime(val_clean, fmt)
        except ValueError:
            continue

    # Si es un timestamp numérico (segundos o milisegundos)
    try:
        ts = float(val_str)
        if ts > 1e11: # Milisegundos
            ts = ts / 1000.0
        return datetime.fromtimestamp(ts)
    except Exception:
        pass

    return None

def parse_numeric(val: Any) -> Optional[float]:
    """Limpia cadenas numéricas, símbolos de divisa y formatos con comas."""
    if val is None or val == "" or val == "null" or val == "None":
        return None
    if isinstance(val, (int, float)):
        if math.isnan(val) or math.isinf(val):
            return None
        return float(val)

    val_str = str(val).strip()
    # Quitar símbolos monetarios y espacios
    val_str = re.sub(r"[\$€£MXN\s]", "", val_str)

    # Si contiene comas y puntos (ej. 1,250.50 o 1.250,50)
    if "," in val_str and "." in val_str:
        if val_str.find(",") < val_str.find("."):
            # Formato estándar 1,234.56 -> remover comas
            val_str = val_str.replace(",", "")
        else:
            # Formato europeo 1.234,56 -> punto es mil, coma es decimal
            val_str = val_str.replace(".", "").replace(",", ".")
    elif "," in val_str:
        # Solo comas (ej. 25,50)
        val_str = val_str.replace(",", ".")

    try:
        num = float(val_str)
        if math.isnan(num) or math.isinf(num):
            return None
        return num
    except ValueError:
        return None

class CleaningPipeline:
    """Pipeline de saneamiento de tipos, validación de reglas de negocio y auditoría."""

    @classmethod
    def clean_and_audit(
        cls,
        df: pl.DataFrame,
        entity: TargetEntity,
        source: SourceType = SourceType.CSV,
        batch_id: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], AuditReport]:
        start_time = time.time()
        b_id = batch_id or str(uuid.uuid4())
        
        records = df.to_dicts()
        total_rows = len(records)
        valid_records: List[Dict[str, Any]] = []
        errors: List[ErrorDetail] = []
        duplicates_count = 0

        seen_keys: Set[str] = set()

        for idx, row in enumerate(records, start=1):
            row_errors: List[str] = []
            cleaned_row: Dict[str, Any] = {}

            if entity == TargetEntity.VENTAS:
                # 1. Campo Obligatorio: SKU
                sku_raw = row.get("sku")
                if not sku_raw or str(sku_raw).strip() == "" or str(sku_raw).lower() == "nan":
                    row_errors.append("El campo 'sku' es obligatorio y no puede ser nulo.")
                else:
                    cleaned_row["sku"] = str(sku_raw).strip()

                # 2. Campo Obligatorio: Fecha
                fecha_val = parse_flexible_datetime(row.get("fecha"))
                if fecha_val is None:
                    row_errors.append(f"El campo 'fecha' ('{row.get('fecha')}') no tiene un formato cronológico válido.")
                else:
                    cleaned_row["fecha"] = fecha_val

                # 3. Campo Obligatorio: Cantidad
                cant_val = parse_numeric(row.get("cantidad"))
                if cant_val is None:
                    row_errors.append(f"El campo 'cantidad' ('{row.get('cantidad')}') no es un número válido.")
                else:
                    cleaned_row["cantidad"] = cant_val

                # 4. id_venta
                id_venta_raw = row.get("id_venta")
                if not id_venta_raw or str(id_venta_raw).strip() == "":
                    # Clave autogenerada
                    cleaned_row["id_venta"] = f"VTA-ROW-{idx}"
                else:
                    cleaned_row["id_venta"] = str(id_venta_raw).strip()

                # 5. Precios y Totales
                pu_val = parse_numeric(row.get("precio_unitario"))
                total_val = parse_numeric(row.get("total"))

                if pu_val is not None and pu_val < 0:
                    row_errors.append("El 'precio_unitario' no puede ser negativo.")

                if total_val is None and pu_val is not None and cant_val is not None:
                    total_val = round(cant_val * pu_val, 4)

                cleaned_row["precio_unitario"] = pu_val
                cleaned_row["total"] = total_val

                # 6. Descripciones y Vendedores
                desc_raw = row.get("descripcion")
                cleaned_row["descripcion"] = str(desc_raw).strip() if desc_raw is not None else None

                id_vend_raw = row.get("id_vendedor")
                cleaned_row["id_vendedor"] = str(id_vend_raw).strip() if id_vend_raw is not None else None

                nom_vend_raw = row.get("nombre_vendedor")
                cleaned_row["nombre_vendedor"] = str(nom_vend_raw).strip() if nom_vend_raw is not None else None

                # 7. Detección de Duplicados en Ventas por (id_venta, sku, fecha)
                if not row_errors:
                    dedup_key = f"{cleaned_row['id_venta']}|{cleaned_row['sku']}|{cleaned_row['fecha'].isoformat()}"
                    if dedup_key in seen_keys:
                        duplicates_count += 1
                        row_errors.append(f"Registro duplicado detectado para ticket '{cleaned_row['id_venta']}' y SKU '{cleaned_row['sku']}'.")
                    else:
                        seen_keys.add(dedup_key)

            elif entity == TargetEntity.INVENTARIO:
                # 1. Campo Obligatorio: SKU
                sku_raw = row.get("sku")
                if not sku_raw or str(sku_raw).strip() == "" or str(sku_raw).lower() == "nan":
                    row_errors.append("El campo 'sku' es obligatorio en inventario.")
                else:
                    cleaned_row["sku"] = str(sku_raw).strip()

                # 2. Stock Actual
                stock_val = parse_numeric(row.get("stock_actual"))
                if stock_val is None:
                    row_errors.append(f"El campo 'stock_actual' ('{row.get('stock_actual')}') no es un número válido.")
                else:
                    cleaned_row["stock_actual"] = stock_val

                # 3. Stock Mínimo
                stock_min_val = parse_numeric(row.get("stock_minimo"))
                cleaned_row["stock_minimo"] = stock_min_val if stock_min_val is not None else 0.0

                # 4. Lead Time Días (Tiempo de reposición para ROP)
                lead_time_val = parse_numeric(row.get("lead_time_dias"))
                cleaned_row["lead_time_dias"] = lead_time_val if lead_time_val is not None else 0.0

                # 5. Detección de Duplicados en Inventario por SKU
                if not row_errors:
                    sku_key = cleaned_row["sku"]
                    if sku_key in seen_keys:
                        duplicates_count += 1
                        row_errors.append(f"Registro de inventario duplicado para el SKU '{sku_key}'.")
                    else:
                        seen_keys.add(sku_key)

            if row_errors:
                if len(errors) < 50: # Conservar hasta 50 errores para auditoría sin saturar memoria
                    errors.append(
                        ErrorDetail(
                            row_number=idx,
                            reason="; ".join(row_errors),
                            sample_data={k: str(v) for k, v in row.items() if v is not None}
                        )
                    )
            else:
                valid_records.append(cleaned_row)

        duration_ms = int((time.time() - start_time) * 1000)

        report = AuditReport(
            batch_id=b_id,
            fuente=source,
            tipo_entidad=entity,
            total_registros=total_rows,
            registros_validos=len(valid_records),
            registros_descartados=total_rows - len(valid_records),
            duplicados_detectados=duplicates_count,
            duracion_ms=duration_ms,
            errores_muestra=errors,
            created_at=datetime.utcnow()
        )

        return valid_records, report
