export type PipelineStatus = 'inactivo' | 'procesando' | 'completado' | 'error';

export type DatabaseEngine = 'mysql' | 'postgresql';

export interface DatabaseConnectionParams {
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
  engine: DatabaseEngine;
  read_only_verified: boolean;
}

export interface FileIngestionMeta {
  fileName: string;
  fileSizeBytes: number;
  fileExtension: 'csv' | 'parquet' | 'xlsx';
  uri?: string;
}

export interface SanitizationMetrics {
  filas_procesadas: number;
  registros_descartados: number;
  duplicados_eliminados: number;
  nulos_imputados: number;
  tasa_calidad_pct: number;
  tiempo_procesamiento_ms: number;
}

export interface IngestionStatusResponse {
  status: PipelineStatus;
  origen: 'base_relacional' | 'archivo_local';
  metricas_saneamiento: SanitizationMetrics;
  fecha_ejecucion: string;
  mensaje: string;
}
