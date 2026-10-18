import gc
import logging
import threading
from datetime import datetime, timedelta
from typing import List, Optional
import numpy as np
import pandas as pd
import polars as pl
from lightgbm import LGBMRegressor
from mlforecast import MLForecast
from utilsforecast.preprocessing import fill_gaps

from schemas.analytics import (
    DemandForecastResponse,
    ProductForecastItem,
    ForecastPoint
)
from analytics.db import query_to_polars

logger = logging.getLogger(__name__)

# Semáforo para limitar ejecuciones paralelas de entrenamiento y proteger RAM/CPU
MAX_CONCURRENT_TRAININGS = 2
TRAINING_SEMAPHORE = threading.BoundedSemaphore(MAX_CONCURRENT_TRAININGS)

def generate_demand_forecast(
    h: int = 7,
    lead_time: int = 0,
    sku_list: Optional[List[str]] = None,
    max_series: int = 50
) -> DemandForecastResponse:
    """
    Genera pronósticos de demanda a nivel SKU utilizando LightGBM y MLForecast
    directamente desde los registros de ventas de PostgreSQL.
    """
    acquired = TRAINING_SEMAPHORE.acquire(blocking=False)
    if not acquired:
        raise RuntimeError("El motor predictivo está operando a máxima capacidad. Intente de nuevo en unos momentos.")

    try:
        # 1. Extracción de series históricas diarias por SKU
        sql = """
        SELECT 
            v.sku AS unique_id,
            DATE(v.fecha)::TEXT AS ds,
            COALESCE(SUM(v.cantidad), 0)::FLOAT AS y
        FROM ventas v
        WHERE v.fecha >= NOW() - INTERVAL '1 year'
        """
        params = {}
        if sku_list:
            sql += " AND v.sku = ANY(:skus)"
            params["skus"] = sku_list

        sql += """
        GROUP BY v.sku, DATE(v.fecha)
        ORDER BY v.sku, ds ASC
        """

        df_polars = query_to_polars(sql, params)
        if df_polars.is_empty():
            return DemandForecastResponse(
                productos=[],
                disclaimer="Sin datos históricos suficientes en ventas para entrenar el modelo predictivo."
            )

        df = df_polars.to_pandas()
        del df_polars
        gc.collect()

        df['ds'] = pd.to_datetime(df['ds'])
        df['y'] = df['y'].astype(float)

        # Limitar número de series para mantener latencia controlada en servidor local
        top_series = df.groupby('unique_id')['y'].sum().nlargest(max_series).index
        df = df[df['unique_id'].isin(top_series)].copy()

        # Rellenar huecos cronológicos diarios por producto
        df = fill_gaps(df, id_col='unique_id', time_col='ds', freq='D')
        df['y'] = df['y'].fillna(0.0)

        # 2. Configuración de hiperparámetros adaptativos y lags
        lags = [7, 14, 28]
        min_points_req = max(lags) + 2
        series_counts = df['unique_id'].value_counts()
        series_validas = series_counts[series_counts >= min_points_req].index

        if len(series_validas) == 0:
            return DemandForecastResponse(
                productos=[],
                disclaimer="La longitud del histórico por SKU es inferior al mínimo requerido para aprendizaje supervisado (30 días)."
            )

        df_fit = df[df['unique_id'].isin(series_validas)].copy()

        n_filas = len(df_fit)
        if n_filas < 5000:
            n_est = 60
            lr = 0.05
            min_child = 5
            num_leaves = 15
        else:
            n_est = 100
            lr = 0.08
            min_child = 15
            num_leaves = 31

        model = MLForecast(
            models=[LGBMRegressor(
                n_estimators=n_est,
                learning_rate=lr,
                min_child_samples=min_child,
                num_leaves=num_leaves,
                random_state=42,
                verbosity=-1,
                n_jobs=-1
            )],
            freq='D',
            lags=lags,
            date_features=['dayofweek', 'day', 'month']
        )

        model.fit(df_fit, id_col='unique_id', time_col='ds', target_col='y')

        # 3. Inferencia de pronóstico
        preds = model.predict(h=h)
        col_pred = [c for c in preds.columns if c not in ['unique_id', 'ds']][0]

        # 4. Cálculo de residuales para bandas de incertidumbre (p10, p90)
        # Estimación de desviación estándar de residuales históricos por SKU
        residuales_std = df_fit.groupby('unique_id')['y'].std().fillna(1.0).to_dict()
        consumo_diario = df_fit.groupby('unique_id')['y'].mean().to_dict()

        # 5. Estructurar respuesta por producto
        productos_response = []
        for sku, group in preds.groupby('unique_id'):
            std_sku = residuales_std.get(sku, 1.0)
            avg_daily = consumo_diario.get(sku, 0.0)

            # Cálculo de stock de seguridad y punto de reorden si se especificó lead_time
            stock_seguridad = None
            punto_reorden = None
            if lead_time > 0:
                # Factor de servicio 95% -> z = 1.65
                stock_seguridad = round(1.65 * std_sku * np.sqrt(lead_time), 1)
                punto_reorden = round((avg_daily * lead_time) + stock_seguridad, 1)

            puntos_forecast = []
            for _, row in group.iterrows():
                val_pred = max(0.0, float(row[col_pred]))
                # Intervalo empírico al 80% (z ~ 1.28)
                p10 = max(0.0, round(val_pred - (1.28 * std_sku), 2))
                p90 = max(0.0, round(val_pred + (1.28 * std_sku), 2))

                puntos_forecast.append(
                    ForecastPoint(
                        ds=row['ds'].strftime('%Y-%m-%d'),
                        pronostico=round(val_pred, 2),
                        p10=p10,
                        p90=p90
                    )
                )

            productos_response.append(
                ProductForecastItem(
                    sku=str(sku),
                    horizonte_dias=h,
                    frecuencia_detectada="D",
                    stock_seguridad_sugerido=stock_seguridad,
                    punto_reorden_sugerido=punto_reorden,
                    predicciones=puntos_forecast
                )
            )

        return DemandForecastResponse(
            productos=productos_response,
            disclaimer="Los pronósticos generados son estimaciones estadísticas referenciales y no garantizan resultados financieros o comerciales específicos."
        )

    finally:
        TRAINING_SEMAPHORE.release()
        gc.collect()
