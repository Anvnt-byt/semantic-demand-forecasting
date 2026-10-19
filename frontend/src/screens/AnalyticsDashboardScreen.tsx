import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useLicenseStore } from '../store/useLicenseStore';
import {
  getKpisApi,
  getTemporalComparisonApi,
  getInventoryTurnoverApi,
  getSellersApi,
  predictDemandApi,
  exportExcelApi,
  exportPdfApi,
} from '../api/endpoints/analyticsApi';
import {
  KpiMetrics,
  TemporalComparisonResponse,
  TemporalGranularity,
  InventoryItemPareto,
  SellerPerformance,
  PredictDemandResponse,
} from '../types/analytics.types';
import { typography } from '../theme/theme';
import { TactileCard } from '../components/common/TactileCard';
import { TactileButton } from '../components/common/TactileButton';
import { MetricBadge } from '../components/common/MetricBadge';
import { ErrorBanner, BannerMessage } from '../components/common/ErrorBanner';
import { DemandForecastSvgChart } from '../components/charts/DemandForecastSvgChart';
import { TemporalComparisonChart } from '../components/charts/TemporalComparisonChart';
import { ParetoTable } from '../components/tables/ParetoTable';
import { SellersTable } from '../components/tables/SellersTable';
import { IconFileExcel, IconFilePdf } from '../components/common/SvgIcons';
import { downloadRealExcel, downloadRealPdf } from '../utils/fileDownloader';

export const AnalyticsDashboardScreen: React.FC = () => {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { hasModule, plan } = useLicenseStore();

  const isPredictiveAllowed = hasModule('predictive_demand');
  const isExportExcelAllowed = hasModule('export_excel');
  const isExportPdfAllowed = hasModule('export_pdf');

  // State
  const [kpis, setKpis] = useState<KpiMetrics | null>(null);
  const [granularity, setGranularity] = useState<TemporalGranularity>('mes');
  const [temporalData, setTemporalData] = useState<TemporalComparisonResponse | null>(null);
  const [inventory, setInventory] = useState<InventoryItemPareto[]>([]);
  const [sellers, setSellers] = useState<SellerPerformance[]>([]);

  // Forecast LightGBM state
  const [horizonDays, setHorizonDays] = useState<number>(14);
  const [forceRetrain, setForceRetrain] = useState<boolean>(false);
  const [forecast, setForecast] = useState<PredictDemandResponse | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(true);

  // Status & Notifications
  const [loading, setLoading] = useState<boolean>(false);
  const [predictLoading, setPredictLoading] = useState<boolean>(false);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [banner, setBanner] = useState<BannerMessage | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setBanner(null);
    try {
      const [kpisRes, tempRes, invRes, selRes] = await Promise.all([
        getKpisApi(),
        getTemporalComparisonApi(granularity),
        getInventoryTurnoverApi(),
        getSellersApi(),
      ]);

      setKpis(kpisRes);
      setTemporalData(tempRes);
      setInventory(invRes);
      setSellers(selRes);

      if (isPredictiveAllowed) {
        const predRes = await predictDemandApi({
          dias_a_futuro: horizonDays,
          force_retrain: forceRetrain,
        });
        setForecast(predRes);
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string; isRateLimited?: boolean; retryAfterSeconds?: number };
      setBanner({
        type: errorObj.isRateLimited ? 'rate_limit' : 'error',
        message: errorObj.message || 'Error al cargar métricas analíticas.',
        retryCountdown: errorObj.retryAfterSeconds,
        onRetry: loadData,
      });
    } finally {
      setLoading(false);
    }
  }, [granularity, horizonDays, forceRetrain, isPredictiveAllowed]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGranularityChange = async (g: TemporalGranularity) => {
    setGranularity(g);
    try {
      const res = await getTemporalComparisonApi(g);
      setTemporalData(res);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setBanner({ type: 'error', message: errorObj.message || 'Error al cambiar granularidad.' });
    }
  };

  const handleRunPrediction = async () => {
    if (!isPredictiveAllowed) {
      showToast('Acceso Denegado (HTTP 403): El Motor Predictivo LightGBM requiere una licencia Plan Pro.', {
        type: 'error',
      });
      return;
    }

    setPredictLoading(true);
    setBanner(null);
    try {
      const res = await predictDemandApi({
        dias_a_futuro: horizonDays,
        force_retrain: forceRetrain,
      });
      setForecast(res);
      showToast(
        `Proyección a ${horizonDays} días calculada (${res.nivel_confianza === 'alta_ml' ? 'LightGBM ML' : 'Heurística EMA'}).`,
        { type: 'success' }
      );
    } catch (err: unknown) {
      const errorObj = err as { message?: string; isRateLimited?: boolean; retryAfterSeconds?: number };
      showToast(errorObj.message || 'Error al ejecutar motor predictivo.', {
        type: errorObj.isRateLimited ? 'warning' : 'error',
      });
    } finally {
      setPredictLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (!isExportExcelAllowed) {
      showToast('Acceso Denegado (HTTP 403): La exportación PowerBI / Excel requiere Plan Pro.', {
        type: 'error',
      });
      return;
    }

    setExportLoading('excel');
    try {
      const filename = downloadRealExcel();
      showToast(`Archivo generado y descargado: ${filename}`, { type: 'success', durationMs: 4000 });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      showToast(errorObj.message || 'Error al exportar a Excel.', { type: 'error' });
    } finally {
      setExportLoading(null);
    }
  };

  const handleExportPdf = async () => {
    if (!isExportPdfAllowed) {
      showToast('Acceso Denegado (HTTP 403): La exportación de informe PDF requiere Plan Pro.', {
        type: 'error',
      });
      return;
    }

    setExportLoading('pdf');
    try {
      const filename = downloadRealPdf();
      showToast(`Informe PDF generado: ${filename}`, { type: 'success', durationMs: 4000 });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      showToast(errorObj.message || 'Error al exportar a PDF.', { type: 'error' });
    } finally {
      setExportLoading(null);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 260 }}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Tablero Analítico & Demanda Predictiva
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Inteligencia comercial y pronóstico probabilístico en terminal local (LightGBM).
          </Text>
        </View>

        {/* Action Exports Bar */}
        <View style={styles.exportBar}>
          <TactileButton
            title="Excel (PowerBI)"
            icon={<IconFileExcel size={15} color={colors.accentPrimary} />}
            variant="outline"
            loading={exportLoading === 'excel'}
            onPress={handleExportExcel}
            style={styles.exportBtn}
          />
          <TactileButton
            title="Informe PDF"
            icon={<IconFilePdf size={15} color={colors.textPrimary} />}
            variant="secondary"
            loading={exportLoading === 'pdf'}
            onPress={handleExportPdf}
            style={styles.exportBtn}
          />
        </View>
      </View>

      <ErrorBanner banner={banner} onDismiss={() => setBanner(null)} />

      {/* 1. KPIs Ejecutivos */}
      {kpis && (
        <View style={styles.kpiGrid}>
          <TactileCard style={styles.kpiCard}>
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>VENTAS DEL MES</Text>
            <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>
              ${kpis.ventas_mes.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </Text>
            <View style={styles.kpiDeltaRow}>
              <Text style={[styles.kpiDelta, { color: colors.confidenceHigh }]}>
                +{kpis.crecimiento_mensual_pct}% vs mes ant.
              </Text>
            </View>
          </TactileCard>

          <TactileCard style={styles.kpiCard}>
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>TRANSACCIONES</Text>
            <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>
              {kpis.total_transacciones.toLocaleString()}
            </Text>
            <View style={styles.kpiDeltaRow}>
              <Text style={[styles.kpiDelta, { color: colors.confidenceHigh }]}>
                +{kpis.crecimiento_diario_pct}% ritmo diario
              </Text>
            </View>
          </TactileCard>

          <TactileCard style={styles.kpiCard}>
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>TICKET PROMEDIO</Text>
            <Text style={[styles.kpiValue, { color: colors.accentPrimary }]}>
              ${kpis.ticket_promedio.toFixed(2)}
            </Text>
            <View style={styles.kpiDeltaRow}>
              <Text style={[styles.kpiSub, { color: colors.textMuted }]}>Cierre consolidado</Text>
            </View>
          </TactileCard>
        </View>
      )}

      {/* 2. Comparativas Temporales */}
      <TactileCard>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              COMPARATIVA TEMPORAL DE VENTAS
            </Text>
            <Text style={[styles.cardHelp, { color: colors.textSecondary }]}>
              Desempeño del período actual vs. período inmediato anterior.
            </Text>
          </View>

          {/* Granularity Selector */}
          <View style={[styles.granularitySelector, { backgroundColor: colors.surfaceSecondary, borderColor: colors.surfaceBorder }]}>
            {(['dia', 'semana', 'mes', 'ano'] as TemporalGranularity[]).map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() => handleGranularityChange(g)}
                style={[
                  styles.granularityBtn,
                  granularity === g && {
                    backgroundColor: colors.surface,
                    borderColor: colors.accentPrimary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.granularityText,
                    { color: granularity === g ? colors.accentPrimary : colors.textMuted },
                  ]}
                >
                  {g.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {temporalData && <TemporalComparisonChart data={temporalData.puntos} />}
      </TactileCard>

      {/* 3. Motor Predictivo de Demanda (LightGBM) */}
      <TactileCard highlight={true}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              MOTOR PREDICTIVO DE DEMANDA (LIGHTGBM)
            </Text>
            <Text style={[styles.cardHelp, { color: colors.textSecondary }]}>
              Proyección probabilística con bandas de incertidumbre P10 y P90.
            </Text>
          </View>

          {forecast && (
            <MetricBadge
              type={forecast.nivel_confianza}
              label={
                forecast.nivel_confianza === 'alta_ml'
                  ? 'MODELO ALTA CERTEZA (LightGBM)'
                  : 'FASE APRENDIZAJE HEURÍSTICA (EMA)'
              }
            />
          )}
        </View>

        {/* Prediction Controls */}
        <View style={styles.predictionControlBar}>
          <View style={styles.horizonSelector}>
            <Text style={[styles.controlLabel, { color: colors.textMuted }]}>HORIZONTE:</Text>
            {[7, 14, 30].map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() => setHorizonDays(d)}
                style={[
                  styles.horizonBtn,
                  {
                    borderColor: horizonDays === d ? colors.accentPrimary : colors.surfaceBorder,
                    backgroundColor: horizonDays === d ? colors.accentPrimaryGlow : colors.inputBackground,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.horizonText,
                    { color: horizonDays === d ? colors.accentPrimary : colors.textSecondary },
                  ]}
                >
                  {d} Días
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => setForceRetrain(!forceRetrain)}
            style={styles.retrainToggle}
          >
            <View
              style={[
                styles.retrainCheckbox,
                {
                  borderColor: forceRetrain ? colors.accentPrimary : colors.surfaceBorder,
                  backgroundColor: forceRetrain ? colors.accentPrimary : colors.inputBackground,
                },
              ]}
            >
              {forceRetrain && <Text style={{ color: '#FFFFFF', fontSize: 11 }}>✓</Text>}
            </View>
            <Text style={[styles.retrainLabel, { color: colors.textPrimary }]}>
              Reentrenar modelo
            </Text>
          </TouchableOpacity>

          <TactileButton
            title="Calcular Proyección"
            variant="primary"
            loading={predictLoading}
            onPress={handleRunPrediction}
            style={styles.calcBtn}
          />
        </View>

        {/* SVG Interactive Chart with P10/P90 Band */}
        {forecast ? (
          <DemandForecastSvgChart data={forecast.serie_temporal} />
        ) : (
          <View style={styles.chartPlaceholder}>
            <Text style={{ color: colors.textMuted }}>
              Presione "Calcular Proyección" para generar la curva de demanda.
            </Text>
          </View>
        )}

        {/* Diagnostic Metrics for Analysts */}
        {forecast && (
          <View style={styles.diagnosticsContainer}>
            <TouchableOpacity
              onPress={() => setShowDiagnostics(!showDiagnostics)}
              style={styles.diagnosticsHeader}
            >
              <Text style={[styles.diagnosticsTitle, { color: colors.accentPrimary }]}>
                {showDiagnostics ? '▼' : '►'} MÉTRICAS DIAGNÓSTICAS PARA ANALISTAS
              </Text>
            </TouchableOpacity>

            {showDiagnostics && (
              <View style={[styles.diagnosticsGrid, { backgroundColor: colors.surfaceSecondary }]}>
                <View style={styles.diagItem}>
                  <Text style={[styles.diagLabel, { color: colors.textMuted }]}>WAPE (ERROR %):</Text>
                  <Text style={[styles.diagVal, { color: colors.confidenceHigh }]}>
                    {forecast.metricas_diagnosticas.wape}%
                  </Text>
                </View>
                <View style={styles.diagItem}>
                  <Text style={[styles.diagLabel, { color: colors.textMuted }]}>RMSE:</Text>
                  <Text style={[styles.diagVal, { color: colors.textPrimary }]}>
                    {forecast.metricas_diagnosticas.rmse} un.
                  </Text>
                </View>
                <View style={styles.diagItem}>
                  <Text style={[styles.diagLabel, { color: colors.textMuted }]}>COEF. VARIACIÓN (CV):</Text>
                  <Text style={[styles.diagVal, { color: colors.textPrimary }]}>
                    {forecast.metricas_diagnosticas.cv}
                  </Text>
                </View>
                <View style={styles.diagItem}>
                  <Text style={[styles.diagLabel, { color: colors.textMuted }]}>STOCK SEGURIDAD:</Text>
                  <Text style={[styles.diagVal, { color: colors.accentPrimary }]}>
                    {forecast.metricas_diagnosticas.stock_seguridad} un.
                  </Text>
                </View>
                <View style={styles.diagItem}>
                  <Text style={[styles.diagLabel, { color: colors.textMuted }]}>PUNTO REORDEN:</Text>
                  <Text style={[styles.diagVal, { color: colors.alertCritical }]}>
                    {forecast.metricas_diagnosticas.punto_reorden} un.
                  </Text>
                </View>
                <View style={styles.diagItem}>
                  <Text style={[styles.diagLabel, { color: colors.textMuted }]}>LEAD TIME APLICADO:</Text>
                  <Text style={[styles.diagVal, { color: colors.textPrimary }]}>
                    {forecast.metricas_diagnosticas.lead_time_aplicado} días
                  </Text>
                </View>
              </View>
            )}

            {/* Legal Disclaimer */}
            <Text style={[styles.disclaimerText, { color: colors.textMuted }]}>
              {forecast.disclaimer}
            </Text>
          </View>
        )}
      </TactileCard>

      {/* 4. Rotación de Inventario y Clasificación Pareto ABC */}
      <TactileCard>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              ROTACIÓN DE INVENTARIO & CLASIFICACIÓN PARETO ABC
            </Text>
            <Text style={[styles.cardHelp, { color: colors.textSecondary }]}>
              Detección de productos de alto impacto (80/20) y alertas tempranas de desabastecimiento.
            </Text>
          </View>
          <MetricBadge type="pareto_a" label="CURVA ABC" />
        </View>

        <ParetoTable data={inventory} />
      </TactileCard>

      {/* 5. Desempeño de Vendedores */}
      <TactileCard>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              DESEMPEÑO Y PRODUCTIVIDAD DE VENDEDORES
            </Text>
            <Text style={[styles.cardHelp, { color: colors.textSecondary }]}>
              Ranking de aporte global a la facturación de la tienda y ticket promedio individual.
            </Text>
          </View>
        </View>

        <SellersTable data={sellers} />
      </TactileCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 18,
    paddingBottom: 40,
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.heavy,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    lineHeight: 18,
  },
  exportBar: {
    flexDirection: 'row',
    marginTop: 8,
  },
  exportBtn: {
    marginLeft: 8,
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  kpiCard: {
    width: '31.5%',
    minWidth: 150,
    padding: 14,
    marginBottom: 12,
  },
  kpiLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.8,
  },
  kpiValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.heavy,
    fontFamily: typography.fontFamilyMono,
    marginVertical: 4,
  },
  kpiDeltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kpiDelta: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  kpiSub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyMono,
    letterSpacing: 0.8,
  },
  cardHelp: {
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },
  granularitySelector: {
    flexDirection: 'row',
    borderRadius: 6,
    borderWidth: 1,
    padding: 2,
    marginTop: 4,
  },
  granularityBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  granularityText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  predictionControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginVertical: 10,
    justifyContent: 'space-between',
  },
  horizonSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  controlLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    marginRight: 6,
  },
  horizonBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 6,
  },
  horizonText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  retrainToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  retrainCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  retrainLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  calcBtn: {
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chartPlaceholder: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagnosticsContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 10,
  },
  diagnosticsHeader: {
    paddingVertical: 6,
  },
  diagnosticsTitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.5,
  },
  diagnosticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
    justifyContent: 'space-between',
  },
  diagItem: {
    width: '32%',
    minWidth: 110,
    marginBottom: 6,
  },
  diagLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
  },
  diagVal: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  disclaimerText: {
    fontSize: typography.fontSize.xs,
    fontStyle: 'italic',
    lineHeight: 16,
    marginTop: 10,
  },
});
