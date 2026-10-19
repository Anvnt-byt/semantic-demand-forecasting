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
    KPIsSummaryResponse,
    TemporalComparisonItem,
    TemporalComparisonResponse,
    ProductTurnoverItem,
    ProductsTurnoverResponse,
    SellerPerformanceItem,
    SellersPerformanceResponse,
    ForecastPoint,
    ProductForecastItem,
    DemandForecastResponse,
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
    "KPIsSummaryResponse",
    "TemporalComparisonItem",
    "TemporalComparisonResponse",
    "ProductTurnoverItem",
    "ProductsTurnoverResponse",
    "SellerPerformanceItem",
    "SellersPerformanceResponse",
    "ForecastPoint",
    "ProductForecastItem",
    "DemandForecastResponse",
    "LicenseVerifyRequest",
    "LicenseVerifyResponse"
]
