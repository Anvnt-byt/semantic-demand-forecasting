import logging
from datetime import datetime
from typing import Optional, List, Literal
from fastapi import APIRouter, Query, Request, HTTPException, status
from fastapi.responses import StreamingResponse

from schemas.analytics import (
    KPIsSummaryResponse,
    TemporalComparisonResponse,
    ProductsTurnoverResponse,
    SellersPerformanceResponse,
    DemandForecastResponse,
    LicenseVerifyRequest,
    LicenseVerifyResponse,
    ExportConfigPayload
)
from analytics.metrics import (
    calculate_kpis_summary,
    calculate_temporal_comparison,
    calculate_products_turnover,
    calculate_sellers_performance
)
from analytics.forecasting import generate_demand_forecast
from analytics.exporter import generate_excel_report, generate_pdf_report
from analytics.license import verify_license

logger = logging.getLogger(__name__)

analytics_router = APIRouter(prefix="/api/analytics", tags=["Analítica POS"])
license_router = APIRouter(prefix="/api/license", tags=["Licenciamiento SaaS"])

# --- Endpoints de Analítica ---

@analytics_router.get("/kpis", response_model=KPIsSummaryResponse)
def get_kpis(
    request: Request,
    target_date: Optional[datetime] = Query(None, description="Fecha de corte para las métricas")
):
    """
    Obtiene los KPIs ejecutivos de ventas, tickets y variaciones de crecimiento.
    """
    try:
        return calculate_kpis_summary(target_date)
    except Exception as e:
        logger.error(f"Error calculando KPIs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al procesar los KPIs ejecutivos."
        )

@analytics_router.get("/temporal-comparison", response_model=TemporalComparisonResponse)
def get_temporal_comparison(
    request: Request,
    tipo: Literal["dia", "semana", "mes", "ano"] = Query("mes", description="Granularidad de comparación"),
    limit: int = Query(12, ge=2, le=36, description="Límite de periodos")
):
    """
    Obtiene la evolución cronológica y comparativa porcentual secuencial.
    """
    try:
        return calculate_temporal_comparison(tipo=tipo, limit=limit)
    except Exception as e:
        logger.error(f"Error en comparativa temporal: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al calcular la comparativa temporal."
        )

@analytics_router.get("/inventory-turnover", response_model=ProductsTurnoverResponse)
def get_inventory_turnover(
    request: Request,
    window_days: int = Query(30, ge=7, le=365, description="Ventana de análisis en días")
):
    """
    Obtiene la rotación de inventario, clasificación Pareto (ABC) y alertas de reorden.
    """
    try:
        return calculate_products_turnover(window_days=window_days)
    except Exception as e:
        logger.error(f"Error calculando rotación de inventario: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al calcular la rotación de stock."
        )

@analytics_router.get("/sellers", response_model=SellersPerformanceResponse)
def get_sellers_performance(
    request: Request,
    start_date: Optional[datetime] = Query(None, description="Fecha inicial"),
    end_date: Optional[datetime] = Query(None, description="Fecha final")
):
    """
    Obtiene el desempeño descriptivo por vendedor (volumen de ventas y porcentaje de aporte).
    """
    try:
        return calculate_sellers_performance(start_date=start_date, end_date=end_date)
    except Exception as e:
        logger.error(f"Error calculando desempeño de vendedores: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener las ventas por vendedor."
        )

@analytics_router.post("/predict-demand", response_model=DemandForecastResponse)
def predict_demand_from_db(
    request: Request,
    h: int = Query(7, ge=1, le=90, description="Horizonte de días a pronosticar"),
    lead_time: int = Query(0, ge=0, le=180, description="Días de lead time de proveedor"),
    sku: Optional[str] = Query(None, description="SKU específico a pronosticar"),
    max_series: int = Query(50, ge=1, le=200, description="Máximo de productos simultáneos")
):
    """
    Ejecuta el pronóstico de demanda supervisado (LightGBM) a partir de los datos en base de datos.
    """
    try:
        sku_list = [sku.strip()] if sku and sku.strip() else None
        return generate_demand_forecast(h=h, lead_time=lead_time, sku_list=sku_list, max_series=max_series)
    except RuntimeError as re:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(re)
        )
    except Exception as e:
        logger.error(f"Error generando pronóstico predictivo: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al ejecutar el modelo de pronóstico."
        )

def _build_excel_response(config: Optional[ExportConfigPayload] = None):
    cfg = config or ExportConfigPayload()
    kpis = calculate_kpis_summary()
    turnover = calculate_products_turnover(window_days=30)
    sellers = calculate_sellers_performance()
    forecast_data = None
    if cfg.incluir_proyeccion:
        try:
            sku_list = [cfg.sku_proyeccion.strip()] if cfg.sku_proyeccion and cfg.sku_proyeccion.strip() else None
            fc = generate_demand_forecast(h=14, lead_time=3, sku_list=sku_list, max_series=1)
            forecast_data = fc.model_dump() if hasattr(fc, "model_dump") else fc.dict()
        except Exception as fe:
            logger.warning(f"No se pudo anexar proyección a Excel: {fe}")

    excel_buffer = generate_excel_report(kpis, turnover, sellers, config=cfg, forecast_data=forecast_data)
    filename = f"reporte_pos_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

def _build_pdf_response(config: Optional[ExportConfigPayload] = None):
    cfg = config or ExportConfigPayload()
    kpis = calculate_kpis_summary()
    turnover = calculate_products_turnover(window_days=30)
    sellers = calculate_sellers_performance()
    forecast_data = None
    if cfg.incluir_proyeccion:
        try:
            sku_list = [cfg.sku_proyeccion.strip()] if cfg.sku_proyeccion and cfg.sku_proyeccion.strip() else None
            fc = generate_demand_forecast(h=14, lead_time=3, sku_list=sku_list, max_series=1)
            forecast_data = fc.model_dump() if hasattr(fc, "model_dump") else fc.dict()
        except Exception as fe:
            logger.warning(f"No se pudo anexar proyección a PDF: {fe}")

    pdf_buffer = generate_pdf_report(kpis, turnover, sellers, config=cfg, forecast_data=forecast_data)
    filename = f"reporte_ejecutivo_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@analytics_router.get("/export/excel")
def export_excel_report_get(request: Request):
    """
    Genera y descarga un reporte consolidado en formato Excel (.xlsx) por defecto.
    """
    try:
        return _build_excel_response()
    except Exception as e:
        logger.error(f"Error generando reporte Excel: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No fue posible generar el archivo Excel."
        )

@analytics_router.post("/export/excel")
def export_excel_report_post(request: Request, config: ExportConfigPayload):
    """
    Genera y descarga un reporte modular configurado en formato Excel (.xlsx).
    """
    try:
        return _build_excel_response(config)
    except Exception as e:
        logger.error(f"Error generando reporte Excel modular: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No fue posible generar el archivo Excel modular."
        )

@analytics_router.get("/export/pdf")
def export_pdf_report_get(request: Request):
    """
    Genera y descarga un reporte ejecutivo consolidado en formato PDF por defecto.
    """
    try:
        return _build_pdf_response()
    except Exception as e:
        logger.error(f"Error generando reporte PDF: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No fue posible generar el archivo PDF."
        )

@analytics_router.post("/export/pdf")
def export_pdf_report_post(request: Request, config: ExportConfigPayload):
    """
    Genera y descarga un reporte ejecutivo modular configurado en formato PDF.
    """
    try:
        return _build_pdf_response(config)
    except Exception as e:
        logger.error(f"Error generando reporte PDF modular: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No fue posible generar el archivo PDF modular."
        )

# --- Endpoint de Licencia ---

@license_router.post("/verify", response_model=LicenseVerifyResponse)
def verify_pos_license(request: Request, req: LicenseVerifyRequest):
    """
    Verifica la clave de suscripción SaaS del POS y retorna los módulos habilitados.
    """
    return verify_license(req)
