import { apiClient } from '../client';
import { useConfigStore } from '../../store/useConfigStore';
import {
  KpiMetrics,
  TemporalComparisonResponse,
  TemporalGranularity,
  InventoryItemPareto,
  SellerPerformance,
  PredictDemandRequest,
  PredictDemandResponse,
} from '../../types/analytics.types';
import {
  MOCK_KPIS,
  MOCK_TEMPORAL_COMPARISON,
  MOCK_PARETO_INVENTORY,
  MOCK_SELLERS,
  MOCK_PREDICT_DEMAND,
} from '../mockData';

export const getKpisApi = async (fechaCorte?: string): Promise<KpiMetrics> => {
  const { useMocks } = useConfigStore.getState();

  if (useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return {
      ...MOCK_KPIS,
      fecha_corte: fechaCorte || MOCK_KPIS.fecha_corte,
    };
  }

  const response = await apiClient.get<KpiMetrics>('/api/analytics/kpis', {
    params: { fecha_corte: fechaCorte },
  });
  return response.data;
};

export const getTemporalComparisonApi = async (
  granularity: TemporalGranularity
): Promise<TemporalComparisonResponse> => {
  const { useMocks } = useConfigStore.getState();

  if (useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return MOCK_TEMPORAL_COMPARISON[granularity] || MOCK_TEMPORAL_COMPARISON.mes;
  }

  const response = await apiClient.get<TemporalComparisonResponse>(
    '/api/analytics/temporal-comparison',
    { params: { granularity } }
  );
  return response.data;
};

export const getInventoryTurnoverApi = async (): Promise<InventoryItemPareto[]> => {
  const { useMocks } = useConfigStore.getState();

  if (useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return MOCK_PARETO_INVENTORY;
  }

  const response = await apiClient.get<InventoryItemPareto[]>('/api/analytics/inventory-turnover');
  return response.data;
};

export const getSellersApi = async (): Promise<SellerPerformance[]> => {
  const { useMocks } = useConfigStore.getState();

  if (useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return MOCK_SELLERS;
  }

  const response = await apiClient.get<SellerPerformance[]>('/api/analytics/sellers');
  return response.data;
};

export const predictDemandApi = async (
  request: PredictDemandRequest
): Promise<PredictDemandResponse> => {
  const { useMocks } = useConfigStore.getState();

  if (useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 950));
    return {
      ...MOCK_PREDICT_DEMAND,
      horizonte_dias: request.dias_a_futuro,
      serie_temporal: MOCK_PREDICT_DEMAND.serie_temporal.slice(0, request.dias_a_futuro),
    };
  }

  const response = await apiClient.post<any>('/api/analytics/predict-demand', null, {
    params: {
      h: request.dias_a_futuro,
      sku: request.sku,
    },
  });

  const data = response.data;
  if (data.productos && data.productos.length > 0) {
    const prod = data.productos[0];
    return {
      nivel_confianza: prod.nivel_confianza,
      horizonte_dias: prod.horizonte_dias,
      serie_temporal: (prod.predicciones || []).map((p: any) => ({
        fecha: p.ds,
        prediccion: p.pronostico,
        limite_inferior_p10: p.p10,
        limite_superior_p90: p.p90,
      })),
      historico_reciente: (prod.historico_reciente || []).map((h: any) => ({
        fecha: h.ds,
        prediccion: h.pronostico,
        limite_inferior_p10: h.p10,
        limite_superior_p90: h.p90,
      })),
      metricas_diagnosticas: {
        wape: prod.wape ?? 7.8,
        rmse: prod.rmse ?? 3.9,
        cv: prod.coeficiente_variacion ?? 0.32,
        stock_seguridad: prod.stock_seguridad_sugerido ?? 24.0,
        punto_reorden: prod.punto_reorden_sugerido ?? 68.0,
        lead_time_aplicado: prod.lead_time_aplicado ?? 3,
      },
      disclaimer: data.disclaimer || 'Proyección probabilística supervisada LightGBM.',
      generado_el: new Date().toISOString(),
    };
  }

  return response.data;
};

export const exportExcelApi = async (): Promise<{ success: boolean; uri?: string; filename: string }> => {
  const { useMocks } = useConfigStore.getState();

  if (useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      success: true,
      filename: `Reporte_Demanda_PowerBI_${new Date().toISOString().split('T')[0]}.xlsx`,
    };
  }

  const response = await apiClient.get('/api/analytics/export/excel', {
    responseType: 'blob',
  });
  return {
    success: true,
    filename: `Reporte_Demanda_PowerBI_${new Date().toISOString().split('T')[0]}.xlsx`,
  };
};

export const exportPdfApi = async (): Promise<{ success: boolean; uri?: string; filename: string }> => {
  const { useMocks } = useConfigStore.getState();

  if (useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      success: true,
      filename: `Informe_Ejecutivo_Demanda_${new Date().toISOString().split('T')[0]}.pdf`,
    };
  }

  const response = await apiClient.get('/api/analytics/export/pdf', {
    responseType: 'blob',
  });
  return {
    success: true,
    filename: `Informe_Ejecutivo_Demanda_${new Date().toISOString().split('T')[0]}.pdf`,
  };
};
