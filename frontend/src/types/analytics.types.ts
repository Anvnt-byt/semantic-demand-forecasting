export type TemporalGranularity = 'dia' | 'semana' | 'mes' | 'ano';

export type ModelMaturityLevel = 'alta_ml' | 'fase_aprendizaje_heuristica';

export interface KpiMetrics {
  fecha_corte: string;
  ventas_mes: number;
  total_transacciones: number;
  ticket_promedio: number;
  crecimiento_diario_pct: number;
  crecimiento_mensual_pct: number;
}

export interface TemporalDataPoint {
  label: string;
  actual: number;
  anterior: number;
}

export interface TemporalComparisonResponse {
  granularidad: TemporalGranularity;
  puntos: TemporalDataPoint[];
  crecimiento_periodo_pct: number;
  total_actual: number;
  total_anterior: number;
}

export interface InventoryItemPareto {
  sku: string;
  nombre: string;
  clasificacion_abc: 'A' | 'B' | 'C';
  pct_contribucion: number;
  pct_acumulado: number;
  stock_actual: number;
  stock_minimo: number;
  alerta_reorden: boolean;
  dias_sin_venta: number;
  es_stock_estancado: boolean;
}

export interface SellerPerformance {
  vendedor_id: string;
  nombre: string;
  pct_aporte_tienda: number;
  tickets_cerrados: number;
  ticket_promedio: number;
  posicion: number;
}

export interface PredictDemandRequest {
  dias_a_futuro: number;
  sku?: string;
}

export interface ForecastPoint {
  fecha: string;
  prediccion: number;
  limite_inferior_p10: number;
  limite_superior_p90: number;
}

export interface DiagnosticMetrics {
  wape: number;
  rmse: number;
  cv: number;
  stock_seguridad: number;
  punto_reorden: number;
  lead_time_aplicado: number;
}

export interface PredictDemandResponse {
  nivel_confianza: ModelMaturityLevel;
  horizonte_dias: number;
  serie_temporal: ForecastPoint[];
  historico_reciente?: ForecastPoint[];
  metricas_diagnosticas: DiagnosticMetrics;
  disclaimer: string;
  generado_el: string;
}

export type ExportAudiencePreset = 'executive' | 'data_science' | 'custom';

export interface ExportReportConfig {
  preset: ExportAudiencePreset;
  incluirKpis: boolean;
  incluirAbc: boolean;
  incluirVendedores: boolean;
  incluirProyeccion: boolean;
  incluirDiagnostico: boolean;
  incluirLinaje: boolean;
  skuProyeccion?: string;
  notasAnalista: string;
  autorAnalista: string;
  cargoAnalista: string;
}

