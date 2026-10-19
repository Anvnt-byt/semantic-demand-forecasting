"""Módulo de esquemas de validación y contratos Pydantic."""

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
from schemas.analytics import (
    GranularityEnum,
    KPIResponse,
    TemporalComparisonItem,
    TemporalComparisonResponse,
    TurnoverItem,
    TurnoverResponse,
    SellerItem,
    SellerPerformanceResponse,
    ForecastRequest,
    DailyForecastPoint,
    ProductForecastResponse,
    LicenseVerifyRequest,
    LicenseVerifyResponse
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
    "IngestionStatusResponse",
    "GranularityEnum",
    "KPIResponse",
    "TemporalComparisonItem",
    "TemporalComparisonResponse",
    "TurnoverItem",
    "TurnoverResponse",
    "SellerItem",
    "SellerPerformanceResponse",
    "ForecastRequest",
    "DailyForecastPoint",
    "ProductForecastResponse",
    "LicenseVerifyRequest",
    "LicenseVerifyResponse"
]
