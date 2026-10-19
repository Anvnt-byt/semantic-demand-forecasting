import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, HTTPException, Depends, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import Venta, LineaVenta, Inventario
from data.seed_demo_data import get_dirty_demo_batch, seed_demo_database

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/curation", tags=["Curaduría de Datos POS"])

class CurationCommitRequest(BaseModel):
    dataset_name: str = Field(..., description="Nombre identificador del lote curado")
    records: List[Dict[str, Any]] = Field(..., description="Registros saneados listos para persistir")
    recipe_summary: Optional[List[Dict[str, Any]]] = Field(default=[], description="Pasos de la receta aplicados")

class CurationCommitResponse(BaseModel):
    success: bool
    message: str
    registros_insertados: int
    skus_afectados: List[str]
    timestamp: datetime = Field(default_factory=datetime.utcnow)

@router.get("/dirty-demo")
def get_dirty_batch():
    """
    Retorna el lote de retail con anomalías de prueba (outliers, nulos, devoluciones)
    para el Acto 2 de la demostración en vivo de Curaduría de Datos.
    """
    records = get_dirty_demo_batch()
    return {
        "dataset_name": "Lote_Cierre_POS_Con_Anomalias",
        "total_records": len(records),
        "records": records
    }

@router.get("/preview-dataset")
def preview_recent_transactions(limit: int = 100, db: Session = Depends(get_db)):
    """
    Obtiene las transacciones más recientes almacenadas en el sistema para cargarlas
    directamente en la Estación de Curaduría.
    """
    ventas = db.query(Venta).order_by(Venta.fecha.desc()).limit(limit).all()
    records = []
    for v in ventas:
        records.append({
            "id_venta": v.id_venta,
            "fecha": v.fecha.strftime("%Y-%m-%d") if v.fecha else None,
            "sku": v.sku,
            "descripcion": v.descripcion or "",
            "cantidad": float(v.cantidad) if v.cantidad is not None else None,
            "precio_unitario": float(v.precio_unitario) if v.precio_unitario is not None else None,
            "total": float(v.total) if v.total is not None else None,
            "vendedor": v.nombre_vendedor or "Desconocido",
        })
    return {
        "dataset_name": "Transacciones_Recientes_POS",
        "total_records": len(records),
        "records": records
    }

@router.post("/commit", response_model=CurationCommitResponse)
def commit_curated_data(payload: CurationCommitRequest, db: Session = Depends(get_db)):
    """
    Persiste atómicamente los registros saneados en la base de datos local
    para alimentar de inmediato los modelos de forecasting y KPIs de inventario.
    """
    if not payload.records:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El conjunto de registros curados está vacío."
        )

    skus_afectados = set()
    insert_count = 0

    try:
        for row in payload.records:
            sku = str(row.get("sku", "")).strip()
            if not sku:
                continue

            id_venta = str(row.get("id_venta") or f"CUR-{datetime.utcnow().strftime('%H%M%S%f')[:10]}")
            
            # Fecha
            raw_fecha = row.get("fecha")
            fecha_val = datetime.utcnow()
            if raw_fecha:
                try:
                    fecha_val = datetime.strptime(str(raw_fecha)[:10], "%Y-%m-%d")
                except Exception:
                    pass

            # Cantidad y precio
            raw_cant = row.get("cantidad")
            cant_val = Decimal(str(raw_cant)) if raw_cant is not None else Decimal("0.0")

            raw_precio = row.get("precio_unitario")
            precio_val = Decimal(str(raw_precio)) if raw_precio is not None else Decimal("0.0")

            raw_total = row.get("total")
            total_val = Decimal(str(raw_total)) if raw_total is not None else (cant_val * precio_val)

            desc = str(row.get("descripcion", "")).strip()
            vend = str(row.get("vendedor", "Cajero POS")).strip()

            venta_obj = Venta(
                id_venta=id_venta,
                fecha=fecha_val,
                sku=sku,
                descripcion=desc,
                cantidad=cant_val,
                precio_unitario=precio_val,
                total=total_val,
                id_vendedor="VEND-CUR",
                nombre_vendedor=vend,
            )
            db.add(venta_obj)

            linea_obj = LineaVenta(
                id_venta=id_venta,
                sku=sku,
                descripcion=desc,
                cantidad=cant_val,
                precio_unitario=precio_val,
                total=total_val,
            )
            db.add(linea_obj)

            skus_afectados.add(sku)
            insert_count += 1

        db.commit()

        logger.info(
            "Receta de curaduría consolidada: %d registros insertados para SKUs %s",
            insert_count, list(skus_afectados)
        )

        return CurationCommitResponse(
            success=True,
            message=f"Consolidación exitosa. {insert_count} registros saneados aplicados a la base de datos.",
            registros_insertados=insert_count,
            skus_afectados=list(skus_afectados),
        )

    except Exception as e:
        db.rollback()
        logger.error("Error al persistir lote curado: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fallo durante la consolidación de curaduría: {str(e)}"
        )

@router.post("/reset-demo")
def reset_demo_database():
    """
    Restaura la base de datos local a los 90 días óptimos de historial retail.
    Botón de contingencia para repetir la demostración en vivo.
    """
    try:
        summary = seed_demo_database(days=90)
        return {
            "success": True,
            "message": "Base de datos restaurada al estado demo inicial de 90 días.",
            "summary": summary
        }
    except Exception as e:
        logger.error("Error al restaurar demo: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error restaurando datos demo: {str(e)}"
        )
