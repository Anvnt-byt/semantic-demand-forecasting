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
  getInventoryTurnoverApi,
  getSellersApi,
} from '../api/endpoints/analyticsApi';
import {
  KpiMetrics,
  TemporalComparisonResponse,
  TemporalGranularity,
  InventoryItemPareto,
  SellerPerformance,
} from '../types/analytics.types';
import { typography } from '../theme/theme';
import { TactileCard } from '../components/common/TactileCard';
import { TactileButton } from '../components/common/TactileButton';
import { MetricBadge } from '../components/common/MetricBadge';
import { ErrorBanner, BannerMessage } from '../components/common/ErrorBanner';
import { TemporalComparisonChart } from '../components/charts/TemporalComparisonChart';
import { CategoryBreakdownTable } from '../components/tables/CategoryBreakdownTable';
import { SellersTable } from '../components/tables/SellersTable';
import { InfoTooltip } from '../components/common/InfoTooltip';
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
  const { setActiveSection, setPipelineStep, demoCompleted, resetDemoPipeline } = useConfigStore();

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
      const [kpisRes, tempRes, invRes] = await Promise.all([
        getKpisApi(),
        getTemporalComparisonApi(granularity),
        getInventoryTurnoverApi(),
      ]);

      setKpis(kpisRes);
      setTemporalData(tempRes);

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
      showToast('Acceso Denegado: La exportación PowerBI / Excel requiere Plan Pro.', {
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
      showToast('Acceso Denegado: La exportación de informe PDF requiere Plan Pro.', {
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
            Panel de Control del Negocio (Resumen Gerencial)
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Monitoreo ejecutivo de ventas en tienda, clientes atendidos, rotación y colaboradores en caja.
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

      {/* Banner de Certificación de Demostración Exitosa */}
      {demoCompleted && (
        <View style={[styles.certBanner, { backgroundColor: 'rgba(16, 185, 129, 0.10)', borderColor: colors.confidenceHigh }]}>
          <View style={{ flex: 1 }}>
            <View style={styles.certBadgeRow}>
              <MetricBadge type="alta_ml" label="FASE 5 FINALIZADA" />
              <Text style={[styles.certTitle, { color: colors.confidenceHigh }]}>
                DEMOSTRACIÓN DE CICLO COMPLETO CERTIFICADA
              </Text>
            </View>
            <Text style={[styles.certDesc, { color: colors.textSecondary }]}>
              Se auditaron y procesaron 16,679 transacciones POS. El motor predictivo local LightGBM se encuentra operativo y los artefactos de exportación fueron emitidos localmente.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => resetDemoPipeline()}
            style={[styles.certNewDemoBtn, { borderColor: colors.confidenceHigh, backgroundColor: colors.surface }]}
          >
            <Text style={[styles.certNewDemoText, { color: colors.confidenceHigh }]}>
              INICIAR NUEVA EVALUACIÓN
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 1. KPIs Ejecutivos Principales en Lenguaje de Negocio */}
      {kpis && (
        <View style={styles.kpiGrid}>
          <TactileCard style={styles.kpiCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>INGRESOS DEL MES</Text>
              <InfoTooltip
                technicalTitle="Facturación Bruta Mensual"
                technicalDescription="Suma neta de ventas registradas en caja durante el mes actual: SUM(cantidad * precio_unitario). Compara contra el mismo día del período previo."
              />
            </View>
            <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>
              ${kpis.ventas_mes.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </Text>
            <View style={styles.kpiDeltaRow}>
              <Text style={[styles.kpiDelta, { color: colors.confidenceHigh }]}>
                +{kpis.crecimiento_mensual_pct}% vs mes anterior
              </Text>
            </View>
            <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 4 }}>
              Total de dinero cobrado en caja
            </Text>
          </TactileCard>

          <TactileCard style={styles.kpiCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>CLIENTES ATENDIDOS</Text>
              <InfoTooltip
                technicalTitle="Conteo de Transacciones POS"
                technicalDescription="Conteo único de tickets / facturas cerradas en el período: COUNT(DISTINCT id_venta). Mide tráfico y afluencia real de compradores."
              />
            </View>
            <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>
              {kpis.total_transacciones.toLocaleString()} tickets
            </Text>
            <View style={styles.kpiDeltaRow}>
              <Text style={[styles.kpiDelta, { color: colors.confidenceHigh }]}>
                +{kpis.crecimiento_diario_pct}% ritmo de cobro
              </Text>
            </View>
            <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 4 }}>
              Notas de venta procesadas
            </Text>
          </TactileCard>

          <TactileCard style={styles.kpiCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>COMPRA PROMEDIO</Text>
              <InfoTooltip
                technicalTitle="Ticket Medio (AOV - Average Order Value)"
                technicalDescription="Cociente de rendimiento transaccional: Total_Ingresos / Total_Tickets. Refleja la profundidad de canasta y efectividad de venta cruzada."
              />
            </View>
            <Text style={[styles.kpiValue, { color: colors.accentPrimary }]}>
              ${kpis.ticket_promedio.toFixed(2)}
            </Text>
            <View style={styles.kpiDeltaRow}>
              <Text style={[styles.kpiSub, { color: colors.textMuted }]}>Por cliente en caja</Text>
            </View>
            <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 4 }}>
              Gasto típico por cada visita
            </Text>
          </TactileCard>
        </View>
      )}

      {/* 2. Estado Operativo Consolidado */}
      <TactileCard>
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.accentPrimary }]}>
              SEMÁFORO DE SALUD DE INVENTARIO Y RESURTIDO
            </Text>
            <Text style={[styles.cardHelp, { color: colors.textSecondary }]}>
              Catálogo activo: {inventorySummary.totalSkus} productos en tienda | {inventorySummary.reorderCount} artículos con existencias bajas que requieren pedido al proveedor.
            </Text>
          </View>
          <MetricBadge
            type={inventorySummary.reorderCount > 0 ? 'alerta_reorden' : 'alta_ml'}
            label={inventorySummary.reorderCount > 0 ? `${inventorySummary.reorderCount} EN REORDEN` : 'INVENTARIO ÓPTIMO'}
          />
        </View>
      </TactileCard>

      {/* 3. Comparativas Temporales con Selector de Granularidad */}
      <TactileCard>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              TENDENCIA Y EVOLUCIÓN HISTÓRICA DE VENTAS
            </Text>
            <Text style={[styles.cardHelp, { color: colors.textSecondary }]}>
              Compare si la tienda está vendiendo más o menos que en el período anterior para detectar alzas o bajas.
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

      {/* 4. Distribución y Aporte por Categoría de Producto */}
      <TactileCard>
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                VENTAS POR DEPARTAMENTO COMERCIAL
              </Text>
              <InfoTooltip
                technicalTitle="Contribución por Categoría"
                technicalDescription="Agregación de ingresos brutos y cálculo de margen comercial estimado (Gross Margin %) por departamento en catálogo."
              />
            </View>
            <Text style={[styles.cardHelp, { color: colors.textSecondary }]}>
              ¿Cuáles áreas de tu tienda dejan más dinero y cuál es su porcentaje de ganancia estimado?
            </Text>
          </View>
        </View>

        <CategoryBreakdownTable />
      </TactileCard>

      {/* 5. Desempeño Histórico de Colaboradores y Cajas */}
      <TactileCard>
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                DESEMPEÑO HISTÓRICO DE COLABORADORES Y PUNTOS DE COBRO
              </Text>
              <InfoTooltip
                technicalTitle="Auditoría de Productividad POS"
                technicalDescription="Registro histórico 100% transaccional de ventas por cajero/terminal. Mide volumen monetario, notas cerradas y ticket promedio individual. Cero previsión estadística aplicada (estricto reporte histórico)."
              />
            </View>
            <Text style={[styles.cardHelp, { color: colors.textSecondary }]}>
              Productividad en caja: tickets cobrados, porcentaje aportado a las ventas de la tienda y compra promedio por colaborador.
            </Text>
          </View>
        </View>

        <SellersTable data={sellers} />
      </TactileCard>

      {/* Botón de Flujo: Paso Siguiente */}
      <TactileButton
        title="Continuar a Auditoría & Exportación Ejecutiva ->"
        variant="primary"
        onPress={() => setPipelineStep(5)}
        style={{ marginTop: 14 }}
      />
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
    maxWidth: 1200,
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
  certBanner: {
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  certBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  certTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.heavy,
    fontFamily: typography.fontFamilyMono,
  },
  certDesc: {
    fontSize: typography.fontSize.xs,
    lineHeight: 16,
    maxWidth: 700,
  },
  certNewDemoBtn: {
    borderWidth: 1.5,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'center',
  },
  certNewDemoText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyMono,
  },
});
