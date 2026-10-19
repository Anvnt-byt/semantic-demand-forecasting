import { apiClient } from '../client';
import { useConfigStore } from '../../store/useConfigStore';
import {
  DatabaseConnectionParams,
  IngestionStatusResponse,
} from '../../types/ingestion.types';
import { MOCK_INGESTION_STATUS } from '../mockData';

export const testDatabaseConnectionApi = async (
  params: DatabaseConnectionParams
): Promise<{ success: boolean; message: string; rowsDetected?: number }> => {
  const { useMocks } = useConfigStore.getState();

  if (useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      success: true,
      message: `Conexión verificada en modo SOLO LECTURA a ${params.engine.toUpperCase()} (${params.database})`,
      rowsDetected: 14820,
    };
  }

  const response = await apiClient.post<{ success: boolean; message: string; rows_detected?: number }>(
    '/api/ingestion/test-db',
    params
  );
  return {
    success: response.data.success,
    message: response.data.message,
    rowsDetected: response.data.rows_detected,
  };
};

export const triggerDatabaseIngestionApi = async (
  params: DatabaseConnectionParams
): Promise<IngestionStatusResponse> => {
  const { useMocks } = useConfigStore.getState();

  if (useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return {
      ...MOCK_INGESTION_STATUS,
      origen: 'base_relacional',
      mensaje: `Sincronización completada desde ${params.engine.toUpperCase()} (${params.database}).`,
    };
  }

  const response = await apiClient.post<IngestionStatusResponse>(
    '/api/ingestion/sync-db',
    params
  );
  return response.data;
};

export const uploadDataFileApi = async (file: {
  uri: string;
  name: string;
  type: string;
  size?: number;
}): Promise<IngestionStatusResponse> => {
  const { useMocks } = useConfigStore.getState();

  // Strict OWASP / Performance validation: Max size 50 MB
  const MAX_BYTES = 50 * 1024 * 1024;
  if (file.size && file.size > MAX_BYTES) {
    throw new Error('El archivo excede el límite de 50 MB permitido para procesamiento local.');
  }

  if (useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 1100));
    return {
      ...MOCK_INGESTION_STATUS,
      origen: 'archivo_local',
      mensaje: `Archivo '${file.name}' procesado y saneado exitosamente.`,
    };
  }

  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type || 'text/csv',
  } as unknown as Blob);

  const response = await apiClient.post<IngestionStatusResponse>('/predict-demand/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getIngestionStatusApi = async (): Promise<IngestionStatusResponse> => {
  const { useMocks } = useConfigStore.getState();

  if (useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return MOCK_INGESTION_STATUS;
  }

  const response = await apiClient.get<IngestionStatusResponse>('/api/ingestion/status');
  return response.data;
};
