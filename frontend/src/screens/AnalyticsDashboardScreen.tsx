import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useLicenseStore } from '../store/useLicenseStore';
import { useConfigStore } from '../store/useConfigStore';
import {
  getKpisApi,
  getTemporalComparisonApi,
  getSellersApi,
  getInventoryTurnoverApi,
} from '../api/endpoints/analyticsApi';
import {
  KpiMetrics,
  TemporalComparisonResponse,
  TemporalGranularity,
  SellerPerformance,
  InventoryItemPareto,
} from '../types/analytics.types';
import { typography } from '../theme/theme';
import { TactileCard } from '../components/common/TactileCard';
import { TactileButton } from '../components/common/TactileButton';
import { MetricBadge } from '../components/common/MetricBadge';
import { ErrorBanner, BannerMessage } from '../components/common/ErrorBanner';
import { TemporalComparisonChart } from '../components/charts/TemporalComparisonChart';
import { SellersTable } from '../components/tables/SellersTable';
import {
  IconFileExcel,
  IconFilePdf,
  IconStudio,
  IconInventory,
  IconForecasting,
} from '../components/common/SvgIcons';
import { downloadRealExcel, downloadRealPdf } from '../utils/fileDownloader';

export const AnalyticsDashboardScreen: React.FC = () => {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { hasModule } = useLicenseStore();
  const { setActiveSection } = useConfigStore();

  const isExportExcelAllowed = hasModule('export_excel');
  const isExportPdfAllowed = hasModule('export_pdf');

  // State
  const [kpis, setKpis] = useState<KpiMetrics | null>(null);
  const [granularity, setGranularity] = useState<TemporalGranularity>('mes');
  const [temporalData, setTemporalData] = useState<TemporalComparisonResponse | null>(null);
  const [sellers, setSellers] = useState<SellerPerformance[]>([]);
  const [inventorySummary, setInventorySummary] = useState<{ totalSkus: number; reorderCount: number }>({
    totalSkus: 0,
    reorderCount: 0,
  });

  // Status & Notifications
  const [loading, setLoading] = useState<boolean>(false);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [banner, setBanner] = useState<BannerMessage | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setBanner(null);
    try {
      const [kpisRes, tempRes, selRes, invRes] = await Promise.all([
        getKpisApi(),
        getTemporalComparisonApi(granularity),
        getSellersApi(),
        getInventoryTurnoverApi(),
      ]);

      setKpis(kpisRes);
      setTemporalData(tempRes);
      setSellers(selRes);

      const reorders = invRes.filter(
        (item: InventoryItemPareto) => item.alerta_reorden || item.stock_actual <= item.stock_minimo
      ).length;
      setInventorySummary({
        totalSkus: invRes.length,
        reorderCount: reorders,
      });
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
  }, [granularity]);

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
      {/* Header & Export Actions */}
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 260 }}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Tablero Analítico Ejecutivo
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Visión global del negocio, comparativas periódicas y ranking de vendedores.
          </Text>
        </View>

        {/* Action Exports Bar */}
        <View style={styles.exportBar}>
          <TactileButton
            title="Excel (Tidy Data)"
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

      {/* 1. KPIs Ejecutivos Principales */}
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

      {/* 2. Centro de Acceso Rápido a Módulos Especializados */}
      <View style={styles.hubGrid}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveSection('studio')}
          style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        >
          <View style={styles.hubHeader}>
            <View style={[styles.hubIconBg, { backgroundColor: colors.accentPrimaryGlow }]}>
              <IconStudio size={18} color={colors.accentPrimary} />
            </View>
            <MetricBadge type="plan_pro" label="DATA WRANGLER" />
          </View>
          <Text style={[styles.hubTitle, { color: colors.textPrimary }]}>Data Studio ("Photoshop")</Text>
          <Text style={[styles.hubDescription, { color: colors.textSecondary }]}>
            Perfilado estadístico de columnas, tratamiento de outliers IQR, imputación de nulos y recetas no destructivas.
          </Text>
          <Text style={[styles.hubLink, { color: colors.accentPrimary }]}>Abrir Editor de Datos →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveSection('inventory')}
          style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        >
          <View style={styles.hubHeader}>
            <View style={[styles.hubIconBg, { backgroundColor: colors.accentPrimaryGlow }]}>
              <IconInventory size={18} color={colors.accentPrimary} />
            </View>
            <MetricBadge
              type={inventorySummary.reorderCount > 0 ? 'pareto_a' : 'plan_starter'}
              label={`${inventorySummary.reorderCount} ALERTA(S)`}
            />
          </View>
          <Text style={[styles.hubTitle, { color: colors.textPrimary }]}>Inventario & Curva ABC</Text>
          <Text style={[styles.hubDescription, { color: colors.textSecondary }]}>
            Clasificación Pareto 80/20, curva de Lorenz acumulada, detección de dead stock y puntos de reorden.
          </Text>
          <Text style={[styles.hubLink, { color: colors.accentPrimary }]}>Ver Inventario Detallado →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveSection('forecasting')}
          style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        >
          <View style={styles.hubHeader}>
            <View style={[styles.hubIconBg, { backgroundColor: colors.accentPrimaryGlow }]}>
              <IconForecasting size={18} color={colors.accentPrimary} />
            </View>
            <MetricBadge type="alta_ml" label="LIGHTGBM" />
          </View>
          <Text style={[styles.hubTitle, { color: colors.textPrimary }]}>Predicción Demanda ML</Text>
          <Text style={[styles.hubDescription, { color: colors.textSecondary }]}>
            Proyecciones probabilísticas con intervalos de confianza P10/P90, métricas WAPE, RMSE y simulación ROP.
          </Text>
          <Text style={[styles.hubLink, { color: colors.accentPrimary }]}>Explorar Pronósticos ML →</Text>
        </TouchableOpacity>
      </View>

      {/* 3. Comparativas Temporales con Selector de Granularidad */}
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
          <View
            style={[
              styles.granularitySelector,
              { backgroundColor: colors.surfaceSecondary, borderColor: colors.surfaceBorder },
            ]}
          >
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

      {/* 4. Desempeño de Vendedores */}
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
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  hubCard: {
    width: '31.5%',
    minWidth: 200,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  hubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  hubIconBg: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 4,
  },
  hubDescription: {
    fontSize: typography.fontSize.xs,
    lineHeight: 16,
    marginBottom: 10,
  },
  hubLink: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
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
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyMono,
  },
});
