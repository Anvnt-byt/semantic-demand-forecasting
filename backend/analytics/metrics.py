import logging
from datetime import datetime, timedelta
from typing import Optional, Literal, Dict
import polars as pl

from schemas.analytics import (
    KPIsSummaryResponse,
    TemporalComparisonResponse,
    TemporalComparisonItem,
    ProductsTurnoverResponse,
    ProductTurnoverItem,
    SellersPerformanceResponse,
    SellerPerformanceItem
)
from analytics.db import query_to_polars

logger = logging.getLogger(__name__)

def calculate_kpis_summary(target_date: Optional[datetime] = None) -> KPIsSummaryResponse:
    """
    Calcula los KPIs ejecutivos principales: ventas totales, transacciones,
    ticket promedio y variaciones temporales (día, mes, año).
    """
    if target_date is None:
        target_date = datetime.utcnow()
    
    fecha_hoy = target_date.date()
    fecha_ayer = fecha_hoy - timedelta(days=1)
    
    # Rango para mes actual vs mes previo
    inicio_mes_actual = fecha_hoy.replace(day=1)
    # Mes anterior
    fin_mes_anterior = inicio_mes_actual - timedelta(days=1)
    inicio_mes_anterior = fin_mes_anterior.replace(day=1)
    
    # Mismo periodo año anterior
    try:
        inicio_ano_anterior = inicio_mes_actual.replace(year=inicio_mes_actual.year - 1)
        fin_ano_anterior = fin_mes_anterior.replace(year=fin_mes_anterior.year - 1)
    except ValueError:
        # Manejo de años bisiestos
        inicio_ano_anterior = inicio_mes_actual - timedelta(days=365)
        fin_ano_anterior = fin_mes_anterior - timedelta(days=365)

    sql = """
    SELECT 
        DATE(fecha) AS dia,
        COALESCE(SUM(total), 0) AS total_ventas,
        COUNT(DISTINCT id_venta) AS num_transacciones
    FROM ventas
    WHERE fecha >= :fecha_corte
    GROUP BY DATE(fecha)
    """
    params = {"fecha_corte": inicio_ano_anterior}
    
    df = query_to_polars(sql, params)
    
    if df.is_empty():
        return KPIsSummaryResponse(
            ventas_totales=0.0,
            total_transacciones=0,
            ticket_promedio=0.0,
            crecimiento_dia_pct=None,
            crecimiento_mes_pct=None,
            crecimiento_ano_pct=None,
            fecha_corte=target_date
        )

    # Convertir dia a tipo Date en caso de string
    if df["dia"].dtype == pl.Utf8:
        df = df.with_columns(pl.col("dia").str.to_date())

    # Ventas de hoy
    df_hoy = df.filter(pl.col("dia") == fecha_hoy)
    ventas_hoy = float(df_hoy["total_ventas"].sum()) if not df_hoy.is_empty() else 0.0
    trans_hoy = int(df_hoy["num_transacciones"].sum()) if not df_hoy.is_empty() else 0

    # Ventas de ayer
    df_ayer = df.filter(pl.col("dia") == fecha_ayer)
    ventas_ayer = float(df_ayer["total_ventas"].sum()) if not df_ayer.is_empty() else 0.0

    # Crecimiento día
    crecimiento_dia = None
    if ventas_ayer > 0:
        crecimiento_dia = round(((ventas_hoy - ventas_ayer) / ventas_ayer) * 100, 2)

    # Ventas mes actual
    df_mes_actual = df.filter((pl.col("dia") >= inicio_mes_actual) & (pl.col("dia") <= fecha_hoy))
    ventas_mes_actual = float(df_mes_actual["total_ventas"].sum()) if not df_mes_actual.is_empty() else 0.0
    trans_mes_actual = int(df_mes_actual["num_transacciones"].sum()) if not df_mes_actual.is_empty() else 0

    # Ventas mes anterior (hasta el mismo día equivalente)
    dia_del_mes = min(fecha_hoy.day, fin_mes_anterior.day)
    corte_mes_anterior = inicio_mes_anterior.replace(day=dia_del_mes)
    df_mes_anterior = df.filter((pl.col("dia") >= inicio_mes_anterior) & (pl.col("dia") <= corte_mes_anterior))
    ventas_mes_anterior = float(df_mes_anterior["total_ventas"].sum()) if not df_mes_anterior.is_empty() else 0.0

    crecimiento_mes = None
    if ventas_mes_anterior > 0:
        crecimiento_mes = round(((ventas_mes_actual - ventas_mes_anterior) / ventas_mes_anterior) * 100, 2)

    # Ventas año anterior
    df_ano_anterior = df.filter((pl.col("dia") >= inicio_ano_anterior) & (pl.col("dia") <= fin_ano_anterior))
    ventas_ano_anterior = float(df_ano_anterior["total_ventas"].sum()) if not df_ano_anterior.is_empty() else 0.0
    
    crecimiento_ano = None
    if ventas_ano_anterior > 0:
        crecimiento_ano = round(((ventas_mes_actual - ventas_ano_anterior) / ventas_ano_anterior) * 100, 2)

    ticket_prom = round(ventas_mes_actual / trans_mes_actual, 2) if trans_mes_actual > 0 else 0.0

    return KPIsSummaryResponse(
        ventas_totales=round(ventas_mes_actual, 2),
        total_transacciones=trans_mes_actual,
        ticket_promedio=ticket_prom,
        crecimiento_dia_pct=crecimiento_dia,
        crecimiento_mes_pct=crecimiento_mes,
        crecimiento_ano_pct=crecimiento_ano,
        fecha_corte=target_date
    )

def calculate_temporal_comparison(
    tipo: Literal["dia", "semana", "mes", "ano"] = "mes",
    limit: int = 12
) -> TemporalComparisonResponse:
    """
    Genera comparativas cronológicas entre periodos consecutivos.
    """
    trunc_map = {
        "dia": "day",
        "semana": "week",
        "mes": "month",
        "ano": "year"
    }
    date_trunc = trunc_map.get(tipo, "month")

    sql = f"""
    SELECT 
        DATE_TRUNC('{date_trunc}', fecha)::DATE AS periodo,
        COALESCE(SUM(total), 0) AS ventas,
        COUNT(DISTINCT id_venta) AS transacciones
    FROM ventas
    GROUP BY DATE_TRUNC('{date_trunc}', fecha)
    ORDER BY periodo DESC
    LIMIT :limit
    """
    df = query_to_polars(sql, {"limit": limit + 1})

    if df.is_empty():
        return TemporalComparisonResponse(tipo_comparativa=tipo, datos=[])

    if df["periodo"].dtype == pl.Utf8:
        df = df.with_columns(pl.col("periodo").str.to_date())

    df = df.sort("periodo", descending=False)

    items = []
    # Usar ventanas consecutivas para comparar cada periodo con el anterior
    rows = df.to_dicts()
    for i in range(1, len(rows)):
        act = rows[i]
        ant = rows[i - 1]
        
        v_act = float(act["ventas"])
        v_ant = float(ant["ventas"])
        var_pct = round(((v_act - v_ant) / v_ant) * 100, 2) if v_ant > 0 else 0.0

        items.append(
            TemporalComparisonItem(
                periodo=str(act["periodo"]),
                ventas_actual=round(v_act, 2),
                ventas_anterior=round(v_ant, 2),
                variacion_pct=var_pct,
                transacciones_actual=int(act["transacciones"]),
                transacciones_anterior=int(ant["transacciones"])
            )
        )

    return TemporalComparisonResponse(tipo_comparativa=tipo, datos=items)

def calculate_products_turnover(window_days: int = 30) -> ProductsTurnoverResponse:
    """
    Calcula rotación de inventario, clasificación ABC y alertas de reorden por SKU.
    """
    sql = """
    SELECT 
        v.sku,
        COALESCE(MAX(v.descripcion), v.sku) AS descripcion,
        COALESCE(SUM(v.cantidad), 0) AS unidades_vendidas,
        COALESCE(SUM(v.total), 0) AS ingresos,
        COALESCE(MAX(i.stock_actual), 0) AS stock_actual,
        COALESCE(MAX(i.stock_minimo), 0) AS stock_minimo
    FROM ventas v
    LEFT JOIN inventario i ON v.sku = i.sku
    WHERE v.fecha >= NOW() - MAKE_INTERVAL(days => :dias)
    GROUP BY v.sku
    ORDER BY ingresos DESC
    """
    df = query_to_polars(sql, {"dias": window_days})

    if df.is_empty():
        return ProductsTurnoverResponse(
            total_skus_analizados=0,
            resumen_abc={"A": 0, "B": 0, "C": 0},
            productos=[]
        )

    # Calcular porcentaje acumulado para clasificación ABC
    total_ingresos = float(df["ingresos"].sum())
    if total_ingresos <= 0:
        total_ingresos = 1.0

    df = df.with_columns([
        (pl.col("ingresos") / total_ingresos).alias("pct_ingreso"),
        (pl.col("unidades_vendidas") / window_days).alias("velocidad_diaria")
    ])

    df = df.with_columns(
        pl.col("pct_ingreso").cum_sum().alias("pct_acumulado")
    )

    # Asignación ABC: A <= 80%, B <= 95%, C > 95%
    df = df.with_columns(
        pl.when(pl.col("pct_acumulado") <= 0.80)
        .then(pl.lit("A"))
        .when(pl.col("pct_acumulado") <= 0.95)
        .then(pl.lit("B"))
        .otherwise(pl.lit("C"))
        .alias("clasificacion_abc")
    )

    # Días de inventario: stock_actual / velocidad_diaria
    df = df.with_columns(
        pl.when(pl.col("velocidad_diaria") > 0)
        .then((pl.col("stock_actual") / pl.col("velocidad_diaria")).round(1))
        .otherwise(None)
        .alias("dias_inventario")
    )

    # Alerta de reorden: si dias_inventario <= 7 o stock_actual <= stock_minimo
    df = df.with_columns(
        (
            (pl.col("dias_inventario").is_not_null() & (pl.col("dias_inventario") <= 7)) |
            (pl.col("stock_actual") <= pl.col("stock_minimo"))
        ).alias("alerta_reorden")
    )

    abc_counts = df["clasificacion_abc"].value_counts().to_dicts()
    resumen_abc = {"A": 0, "B": 0, "C": 0}
    for item in abc_counts:
        resumen_abc[item["clasificacion_abc"]] = item["count"]

    productos = []
    for row in df.to_dicts():
        productos.append(
            ProductTurnoverItem(
                sku=str(row["sku"]),
                descripcion=str(row["descripcion"]),
                unidades_vendidas=float(row["unidades_vendidas"]),
                ingresos=round(float(row["ingresos"]), 2),
                stock_actual=float(row["stock_actual"]),
                dias_inventario=float(row["dias_inventario"]) if row["dias_inventario"] is not None else None,
                clasificacion_abc=row["clasificacion_abc"],
                alerta_reorden=bool(row["alerta_reorden"])
            )
        )

    return ProductsTurnoverResponse(
        total_skus_analizados=len(productos),
        resumen_abc=resumen_abc,
        productos=productos
    )

def calculate_sellers_performance(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> SellersPerformanceResponse:
    """
    Calcula métricas descriptivas y agregadas de desempeño por vendedor.
    (Excluye explícitamente evaluaciones o predicciones individuales).
    """
    if end_date is None:
        end_date = datetime.utcnow()
    if start_date is None:
        start_date = end_date - timedelta(days=30)

    sql = """
    SELECT 
        v.id_vendedor,
        COALESCE(MAX(v.nombre_vendedor), v.id_vendedor) AS nombre,
        COALESCE(SUM(v.total), 0) AS total_ventas,
        COUNT(DISTINCT v.id_venta) AS transacciones
    FROM ventas v
    WHERE v.fecha BETWEEN :start_date AND :end_date
      AND v.id_vendedor IS NOT NULL
    GROUP BY v.id_vendedor
    ORDER BY total_ventas DESC
    """
    params = {"start_date": start_date, "end_date": end_date}
    df = query_to_polars(sql, params)

    if df.is_empty():
        return SellersPerformanceResponse(vendedores=[])

    total_general = float(df["total_ventas"].sum())
    if total_general <= 0:
        total_general = 1.0

    vendedores = []
    for row in df.to_dicts():
        ventas_vendedor = float(row["total_ventas"])
        tx = int(row["transacciones"])
        ticket_prom = round(ventas_vendedor / tx, 2) if tx > 0 else 0.0
        contribucion_pct = round((ventas_vendedor / total_general) * 100, 2)

        vendedores.append(
            SellerPerformanceItem(
                id_vendedor=str(row["id_vendedor"]),
                nombre=str(row["nombre"]),
                total_ventas=round(ventas_vendedor, 2),
                numero_transacciones=tx,
                ticket_promedio=ticket_prom,
                porcentaje_contribucion=contribucion_pct
            )
        )

    return SellersPerformanceResponse(vendedores=vendedores)
