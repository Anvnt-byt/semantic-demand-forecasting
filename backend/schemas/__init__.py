from schemas.models_schema import VentaRecord, InventarioRecord, VendedorRecord, LineaVentaRecord
from schemas.ingestion import (
    TargetEntity,
    SourceType,
    POSDBType,
    POSConnectionConfig,
    POSSyncRequest,
    AuditReport,
    ErrorDetail,
    IngestionStatusResponse
)

__all__ = [
    "VentaRecord",
    "InventarioRecord",
    "VendedorRecord",
    "LineaVentaRecord",
    "TargetEntity",
    "SourceType",
    "POSDBType",
    "POSConnectionConfig",
    "POSSyncRequest",
    "AuditReport",
    "ErrorDetail",
    "IngestionStatusResponse"
]
