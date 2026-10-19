export type PipelineStatus = 'inactivo' | 'procesando' | 'completado' | 'error';

export type DatabaseEngine = 'mysql' | 'postgresql';

export interface DatabaseConnectionParams {
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
  engine: DatabaseEngine;
  read_only_verified?: boolean;
}

export interface FileIngestionMeta {
  fileName: string;
  fileSizeBytes: number;
  fileExtension: 'csv' | 'parquet' | 'xlsx';
  uri?: string;
}

export interface ErrorDetail {
  row_number: number;
  reason: string;
  sample_data?: Record<string, any>;
}

export interface SanitizationMetrics {
  filas_procesadas: number;
  registros_descartados: number;
  duplicados_eliminados: number;
  nulos_imputados: number;
  tasa_calidad_pct: number;
  tiempo_procesamiento_ms: number;
}

export interface AuditReport {
  batch_id: string;
  fuente: 'CSV' | 'EXCEL' | 'POS_MYSQL' | 'POS_POSTGRES';
  tipo_entidad: 'ventas' | 'inventario';
  total_registros: number;
  registros_validos: number;
  registros_descartados: number;
  duplicados_detectados: number;
  duracion_ms: number;
  errores_muestra: ErrorDetail[];
  created_at: string;
}

export interface IngestionStatusResponse {
  success: boolean;
  message: string;
  audit: AuditReport;
}

export type IngestionPhase = 'source' | 'editor' | 'audit';

export interface IngestedDataRow {
  id: string;
  fecha: string;
  sku: string;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  vendedor: string;
  metodo_pago: string;
}
