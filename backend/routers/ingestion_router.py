import os
import json
import logging
from tempfile import NamedTemporaryFile
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Request, status, Query
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from database.connection import get_db
from schemas.ingestion import (
    TargetEntity,
    SourceType,
    POSConnectionConfig,
    POSSyncRequest,
    POSDBType,
    AuditReport,
    IngestionStatusResponse
)
from ingestion.file_parser import FileParser
from ingestion.normalizer import DeterministicNormalizer
from ingestion.cleaning_pipeline import CleaningPipeline
from ingestion.auditor import IngestionAuditor
from connectors import get_pos_connector, SecurityViolationError

MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB
CHUNK_SIZE_BYTES = 1024 * 1024  # 1 MB

router = APIRouter(prefix="/ingest", tags=["Ingesta y Conectores POS"])
limiter = Limiter(key_func=get_remote_address)

@router.post("/file", response_model=IngestionStatusResponse)
@limiter.limit("10/minute")
def ingest_file(
    request: Request,
    file: UploadFile = File(..., description="Archivo de datos tabular (.csv o .xlsx)"),
    entity: TargetEntity = Form(TargetEntity.VENTAS, description="Entidad destino: 'ventas' o 'inventario'"),
    column_mapping_override: Optional[str] = Form(None, description="Mapeo manual en formato JSON opcional"),
    db: Session = Depends(get_db)
):
    """
    Endpoint multipart/form-data para carga, validación, normalización semántica determinista,
    limpieza y persistencia de archivos CSV y Excel (.xlsx) en PostgreSQL local.
    """
    filename_lower = (file.filename or "").lower()
    if not (filename_lower.endswith(".csv") or filename_lower.endswith(".xlsx") or filename_lower.endswith(".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de archivo no soportado. Se requiere un archivo .csv o .xlsx."
        )

    override_dict = None
    if column_mapping_override:
        try:
            override_dict = json.loads(column_mapping_override)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El parámetro 'column_mapping_override' debe ser un JSON válido."
            )

    suffix = ".xlsx" if filename_lower.endswith((".xlsx", ".xls")) else ".csv"
    temp_path = None
    total_bytes = 0

    try:
        with NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_path = temp_file.name
            while True:
                chunk = file.file.read(CHUNK_SIZE_BYTES)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > MAX_UPLOAD_SIZE_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="El archivo excede el tamaño máximo permitido de 50 MB."
                    )
                temp_file.write(chunk)

        logging.info("Archivo cargado para ingesta: %s (%d bytes). Entidad: %s", file.filename, total_bytes, entity.value)

        # 1. Parseo y Normalización Determinista (CERO LLM)
        source_type = SourceType.EXCEL if suffix == ".xlsx" else SourceType.CSV
        df_normalized = FileParser.parse_and_normalize(
            temp_path, 
            entity=entity, 
            manual_override=override_dict
        )

        # 2. Pipeline de Limpieza, Deduplicación y Auditoría
        valid_records, audit_report = CleaningPipeline.clean_and_audit(
            df_normalized,
            entity=entity,
            source=source_type
        )

        # 3. Persistencia Atómica en PostgreSQL Interno
        IngestionAuditor.persist_records(db, valid_records, entity, audit_report)

        return IngestionStatusResponse(
            success=True,
            message=f"Ingesta completada. {audit_report.registros_validos} registros válidos persistidos, {audit_report.registros_descartados} descartados.",
            audit=audit_report
        )

    except HTTPException:
        raise
    except Exception as e:
        logging.error("Error durante la ingesta de archivo: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fallo durante la ingesta del archivo: {str(e)}"
        )
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError as err:
                logging.warning("No se pudo eliminar archivo temporal de ingesta: %s", err)
        import gc
        gc.collect()

@router.post("/pos/test-connection")
def test_pos_connection(pos_config: POSConnectionConfig):
    """
    Verifica la conectividad con una base de datos externa POS (MySQL o PostgreSQL)
    y certifica que los parámetros de transacción operen en modo SOLO LECTURA (READ-ONLY).
    """
    try:
        connector = get_pos_connector(pos_config)
        with connector:
            connector.test_connection()
        return {
            "success": True,
            "message": f"Conexión exitosa con {pos_config.db_type.value.upper()}. Modo transaccional certificado como READ-ONLY."
        }
    except SecurityViolationError as sve:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Violación de Seguridad: {str(sve)}"
        )
    except Exception as e:
        logging.error("Error al probar conexión con base de datos POS: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se pudo establecer conexión con el servidor POS: {str(e)}"
        )

@router.post("/pos/sync", response_model=IngestionStatusResponse)
@limiter.limit("5/minute")
def sync_pos_data(
    request: Request,
    sync_request: POSSyncRequest,
    db: Session = Depends(get_db)
):
    """
    Sincroniza y extrae datos desde un sistema POS relacional externo (MySQL / PostgreSQL)
    en modo estrictamente READ-ONLY (SELECT únicamente). Aplica normalización semántica,
    auditoría de tipos, deduplicación y almacenamiento en PostgreSQL local.
    """
    pos_config = sync_request.pos_config
    target_entity = sync_request.target_entity

    try:
        connector = get_pos_connector(pos_config)
        with connector:
            # 1. Extracción segura en streaming por bloques
            df_raw = connector.fetch_dataframe()

        if df_raw.is_empty():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La consulta sobre la base de datos POS no retornó ningún registro."
            )

        # 2. Normalización Determinista de Columnas
        df_normalized = DeterministicNormalizer.normalize_polars_df(
            df_raw,
            entity=target_entity,
            manual_override=sync_request.column_mapping_override
        )

        # 3. Pipeline de Limpieza, Deduplicación y Auditoría
        source_type = SourceType.POS_MYSQL if pos_config.db_type == POSDBType.MYSQL else SourceType.POS_POSTGRES
        valid_records, audit_report = CleaningPipeline.clean_and_audit(
            df_normalized,
            entity=target_entity,
            source=source_type
        )

        # 4. Persistencia Atómica en PostgreSQL Interno
        IngestionAuditor.persist_records(db, valid_records, target_entity, audit_report)

        return IngestionStatusResponse(
            success=True,
            message=f"Sincronización POS completada. {audit_report.registros_validos} registros válidos persistidos.",
            audit=audit_report
        )

    except SecurityViolationError as sve:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Violación de política de solo lectura: {str(sve)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logging.error("Error durante sincronización POS: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fallo durante la sincronización POS: {str(e)}"
        )
    finally:
        import gc
        gc.collect()

@router.get("/audit/{batch_id}", response_model=AuditReport)
def get_audit_record(batch_id: str, db: Session = Depends(get_db)):
    """Obtiene el reporte de auditoría y métricas de calidad de un lote por su batch_id."""
    audit = IngestionAuditor.get_audit_by_id(db, batch_id)
    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró ningún reporte de auditoría con el batch_id '{batch_id}'."
        )
    return audit

@router.get("/audit", response_model=List[AuditReport])
def list_recent_audits(limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    """Lista el historial de reportes de auditoría recientes."""
    return IngestionAuditor.list_recent_audits(db, limit=limit)
