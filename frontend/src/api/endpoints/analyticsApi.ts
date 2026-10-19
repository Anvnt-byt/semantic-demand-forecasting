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

  const response = await apiClient.post<PredictDemandResponse>('/api/analytics/predict-demand', request);
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
