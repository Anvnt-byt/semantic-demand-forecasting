import { apiClient } from '../client';
import { useConfigStore } from '../../store/useConfigStore';
import { MOCK_DIRTY_DEMO_RECORDS } from '../mockData';

export interface CurationCommitPayload {
  dataset_name: string;
  records: Record<string, any>[];
  recipe_summary?: Array<{ step: string; target: string }>;
}

export interface CurationCommitResponse {
  success: boolean;
  message: string;
  registros_insertados: number;
  skus_afectados: string[];
  timestamp: string;
}

export interface DirtyDemoResponse {
  dataset_name: string;
  total_records: number;
  records: Record<string, any>[];
}

export const fetchDirtyDemoBatchApi = async (): Promise<DirtyDemoResponse> => {
  const { useMocks } = useConfigStore.getState();
  if (useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return {
      dataset_name: 'Lote_Cierre_POS_Con_Anomalias',
      total_records: MOCK_DIRTY_DEMO_RECORDS.length,
      records: [...MOCK_DIRTY_DEMO_RECORDS],
    };
  }

  const response = await apiClient.get<DirtyDemoResponse>('/api/curation/dirty-demo');
  return response.data;
};

export const fetchRecentTransactionsApi = async (limit: number = 100): Promise<DirtyDemoResponse> => {
  const { useMocks } = useConfigStore.getState();
  if (useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const records = MOCK_DIRTY_DEMO_RECORDS.slice(0, limit);
    return {
      dataset_name: 'Transacciones_Recientes_POS',
      total_records: records.length,
      records,
    };
  }

  const response = await apiClient.get<DirtyDemoResponse>('/api/curation/preview-dataset', {
    params: { limit },
  });
  return response.data;
};

export const commitCuratedDataApi = async (
  payload: CurationCommitPayload
): Promise<CurationCommitResponse> => {
  const { useMocks } = useConfigStore.getState();
  if (useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const skus = Array.from(new Set(payload.records.map((r) => r.sku).filter(Boolean)));
    return {
      success: true,
      message: `Persistencia offline exitosa: ${payload.records.length} registros curados consolidados en memoria.`,
      registros_insertados: payload.records.length,
      skus_afectados: skus,
      timestamp: new Date().toISOString(),
    };
  }

  const response = await apiClient.post<CurationCommitResponse>('/api/curation/commit', payload);
  return response.data;
};

export const resetDemoDatabaseApi = async (): Promise<{ success: boolean; message: string }> => {
  const { useMocks } = useConfigStore.getState();
  if (useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      success: true,
      message: 'Base de datos demo restablecida exitosamente a 90 días (Modo Simulación).',
    };
  }

  const response = await apiClient.post<{ success: boolean; message: string }>('/api/curation/reset-demo');
  return response.data;
};
