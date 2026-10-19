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
    await new Promise((resolve) => setTimeout(resolve, 600));
    return {
      success: true,
      message: `Conexión verificada en modo SOLO LECTURA a ${params.engine.toUpperCase()} (${params.database})`,
      rowsDetected: 14820,
    };
  }

  const payload = {
    db_type: params.engine === 'postgresql' ? 'postgresql' : 'mysql',
    host: params.host,
    port: Number(params.port),
    username: params.username,
    password: params.password || '',
    database: params.database,
    query_or_table: 'ventas',
  };

  const response = await apiClient.post<{ success: boolean; message: string; rows_detected?: number }>(
    '/ingest/pos/test-connection',
    payload
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
    await new Promise((resolve) => setTimeout(resolve, 900));
    return {
      success: true,
      message: `Sincronización completada desde ${params.engine.toUpperCase()} (${params.database}).`,
      audit: {
        batch_id: `batch-${Date.now()}`,
        fuente: params.engine === 'postgresql' ? 'POS_POSTGRES' : 'POS_MYSQL',
        tipo_entidad: 'ventas',
        total_registros: 14820,
        registros_validos: 14690,
        registros_descartados: 42,
        duplicados_detectados: 88,
        duracion_ms: 1120,
        errores_muestra: [
          { row_number: 14, reason: 'Valor negativo en cantidad (-2)' },
          { row_number: 89, reason: 'Precio nulo o cero' },
        ],
        created_at: new Date().toISOString(),
      },
    };
  }

  const payload = {
    pos_config: {
      db_type: params.engine === 'postgresql' ? 'postgresql' : 'mysql',
      host: params.host,
      port: Number(params.port),
      username: params.username,
      password: params.password || '',
      database: params.database,
      query_or_table: 'ventas',
    },
    target_entity: 'ventas',
  };

  const response = await apiClient.post<IngestionStatusResponse>('/ingest/pos/sync', payload);
  return response.data;
};

export const uploadDataFileApi = async (
  file: {
    uri: string;
    name: string;
    type: string;
    size?: number;
  },
  entity: 'ventas' | 'inventario' = 'ventas'
): Promise<IngestionStatusResponse> => {
  const { useMocks } = useConfigStore.getState();

  const MAX_BYTES = 50 * 1024 * 1024;
  if (file.size && file.size > MAX_BYTES) {
    throw new Error('El archivo excede el límite de 50 MB permitido para procesamiento local.');
  }

  if (useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      success: true,
      message: `Archivo '${file.name}' procesado y saneado exitosamente.`,
      audit: {
        batch_id: `batch-${Date.now()}`,
        fuente: file.name.endsWith('.xlsx') ? 'EXCEL' : 'CSV',
        tipo_entidad: entity,
        total_registros: 12500,
        registros_validos: 12410,
        registros_descartados: 35,
        duplicados_detectados: 55,
        duracion_ms: 840,
        errores_muestra: [
          { row_number: 22, reason: 'Fecha con formato inválido' },
          { row_number: 104, reason: 'SKU ausente' },
        ],
        created_at: new Date().toISOString(),
      },
    };
  }

  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type || 'text/csv',
  } as unknown as Blob);
  formData.append('entity', entity);

  const response = await apiClient.post<IngestionStatusResponse>('/ingest/file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getIngestionStatusApi = async (): Promise<IngestionStatusResponse> => {
  const { useMocks } = useConfigStore.getState();

  if (useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return MOCK_INGESTION_STATUS;
  }

  const response = await apiClient.get<any[]>('/ingest/audit?limit=1');
  if (response.data && response.data.length > 0) {
    const audit = response.data[0];
    return {
      success: true,
      message: `Auditoría reciente: ${audit.registros_validos} registros válidos.`,
      audit: audit,
    };
  }

  return MOCK_INGESTION_STATUS;
};
