from datetime import datetime
from typing import List, Optional, Dict, Literal
from pydantic import BaseModel, Field

# --- 1. Resumen Ejecutivo (KPIs) ---

class KPIsSummaryResponse(BaseModel):
    ventas_totales: float = Field(..., description="Monto total acumulado de ventas en el periodo")
    total_transacciones: int = Field(..., description="Cantidad total de tickets o facturas emitidas")
    ticket_promedio: float = Field(..., description="Promedio de venta por transacción")
    crecimiento_dia_pct: Optional[float] = Field(None, description="Variación porcentual respecto al día anterior")
    crecimiento_mes_pct: Optional[float] = Field(None, description="Variación porcentual respecto al mes anterior")
    crecimiento_ano_pct: Optional[float] = Field(None, description="Variación porcentual respecto al mismo periodo del año anterior")
    fecha_corte: datetime = Field(default_factory=datetime.utcnow, description="Fecha y hora de generación de métricas")


# --- 2. Comparativas Temporales ---

class TemporalComparisonItem(BaseModel):
    periodo: str = Field(..., description="Etiqueta del periodo (ej. '2026-10-18', 'Semana 41', 'Octubre 2026')")
    ventas_actual: float = Field(..., description="Monto de ventas en el periodo actual")
    ventas_anterior: float = Field(..., description="Monto de ventas en el periodo base de comparación")
    variacion_pct: float = Field(..., description="Variación porcentual entre ambos periodos")
    transacciones_actual: int = Field(..., description="Transacciones en el periodo actual")
    transacciones_anterior: int = Field(..., description="Transacciones en el periodo base")

class TemporalComparisonResponse(BaseModel):
    tipo_comparativa: Literal["dia", "semana", "mes", "ano"] = Field(..., description="Granularidad de la comparación")
    datos: List[TemporalComparisonItem] = Field(..., description="Lista de puntos cronológicos de comparación")


# --- 3. Rotación de Inventario y Clasificación ABC ---

class ProductTurnoverItem(BaseModel):
    sku: str = Field(..., description="Identificador único del producto o SKU")
    descripcion: str = Field(..., description="Descripción o nombre del producto")
    unidades_vendidas: float = Field(..., description="Unidades totales vendidas en la ventana de análisis")
    ingresos: float = Field(..., description="Ingresos monetarios generados por el producto")
    stock_actual: float = Field(..., description="Existencia actual en inventario según el POS")
    dias_inventario: Optional[float] = Field(None, description="Días estimados de inventario restante a la velocidad actual de venta")
    clasificacion_abc: Literal["A", "B", "C"] = Field(..., description="Categorización ABC por volumen de facturación (A: 80%, B: 15%, C: 5%)")
    alerta_reorden: bool = Field(..., description="Indica si el stock actual está por debajo del punto de reorden sugerido")

class ProductsTurnoverResponse(BaseModel):
    total_skus_analizados: int = Field(..., description="Número total de productos únicos procesados")
    resumen_abc: Dict[str, int] = Field(..., description="Conteo de productos por categoría A, B y C")
    productos: List[ProductTurnoverItem] = Field(..., description="Listado detallado de rotación por SKU")


# --- 4. Rendimiento por Vendedor (Descriptivo) ---

class SellerPerformanceItem(BaseModel):
    id_vendedor: str = Field(..., description="Identificador o código del vendedor en el POS")
    nombre: str = Field(..., description="Nombre del vendedor")
    total_ventas: float = Field(..., description="Monto total vendido por el vendedor en el periodo")
    numero_transacciones: int = Field(..., description="Tickets cerrados por el vendedor")
    ticket_promedio: float = Field(..., description="Promedio facturado por transacción")
    porcentaje_contribucion: float = Field(..., description="Porcentaje de aporte respecto a las ventas totales de la tienda")

class SellersPerformanceResponse(BaseModel):
    vendedores: List[SellerPerformanceItem] = Field(..., description="Desempeño descriptivo por vendedor")


# --- 5. Pronóstico de Demanda y Métricas Predictivas ---

class ForecastPoint(BaseModel):
    ds: str = Field(..., description="Fecha o marca temporal proyectada (ISO format)")
    pronostico: float = Field(..., ge=0, description="Demanda proyectada (no negativa)")
    p10: float = Field(..., ge=0, description="Límite inferior del intervalo de confianza al 80%")
    p90: float = Field(..., ge=0, description="Límite superior del intervalo de confianza al 80%")

class ProductForecastItem(BaseModel):
    sku: str = Field(..., description="Identificador único del producto o SKU")
    horizonte_dias: int = Field(..., description="Días hacia el futuro proyectados")
    frecuencia_detectada: str = Field(..., description="Frecuencia temporal detectada ('D', 'W', 'H', etc.)")
    lead_time_aplicado: int = Field(default=0, description="Días de tiempo de entrega utilizados para el cálculo")
    nivel_confianza: Literal["alta_ml", "fase_aprendizaje_heuristica"] = Field(
        default="alta_ml",
        description="Nivel de madurez de la serie y algoritmo utilizado"
    )
    stock_seguridad_sugerido: Optional[float] = Field(None, ge=0, description="Stock de seguridad calculado para el tiempo de entrega")
    punto_reorden_sugerido: Optional[float] = Field(None, ge=0, description="Punto de reorden (ROP) sugerido")
    predicciones: List[ForecastPoint] = Field(..., description="Puntos de pronóstico temporal")

class DemandForecastResponse(BaseModel):
    productos: List[ProductForecastItem] = Field(..., description="Series pronosticadas por producto")
    disclaimer: str = Field(
        default="Los pronósticos generados son estimaciones estadísticas referenciales y no garantizan resultados financieros o comerciales específicos.",
        description="Aviso legal de responsabilidad algorítmica"
    )


# --- 6. Verificación de Licencia SaaS ---

class LicenseVerifyRequest(BaseModel):
    license_key: str = Field(..., min_length=8, description="Clave de activación de la suscripción SaaS")
    pos_identifier: str = Field(..., description="Identificador único del punto de venta o terminal")

class LicenseVerifyResponse(BaseModel):
    valid: bool = Field(..., description="Indica si la licencia es válida y se encuentra activa")
    plan: Literal["starter", "pro", "enterprise"] = Field(..., description="Nivel de suscripción contratado")
    empresa: Optional[str] = Field(None, description="Razón social o nombre comercial asignado a la licencia")
    expires_at: Optional[datetime] = Field(None, description="Fecha de expiración de la suscripción")
    dias_restantes: Optional[int] = Field(None, description="Días de vigencia restantes")
    features_habilitadas: List[str] = Field(default_factory=list, description="Lista de módulos y funciones activas para el plan")
