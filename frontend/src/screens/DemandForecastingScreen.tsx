import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/theme';
import { TactileCard } from '../components/common/TactileCard';
import { MetricBadge } from '../components/common/MetricBadge';
import { DemandForecastSvgChart } from '../components/charts/DemandForecastSvgChart';
import { predictDemandApi } from '../api/endpoints/analyticsApi';
import { PredictDemandResponse, ForecastPoint } from '../types/analytics.types';
import { useConfigStore } from '../store/useConfigStore';

export const DemandForecastingScreen: React.FC = () => {
  const { colors } = useTheme();
  const { useMocks } = useConfigStore();

  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState<PredictDemandResponse | null>(null);
  const [horizon, setHorizon] = useState<7 | 14 | 30>(14);
  const [forceRetrain, setForceRetrain] = useState(false);
  const [selectedSku, setSelectedSku] = useState('SKU-CERV-01');

  const availableSkus = [
    { sku: 'SKU-CERV-01', name: 'Cerveza Six-Pack 355ml (Maduro - LightGBM)' },
    { sku: 'SKU-LECHE-02', name: 'Leche Entera 1L (Maduro - LightGBM)' },
    { sku: 'SKU-COLA-03', name: 'Refresco Cola 600ml (Maduro - LightGBM)' },
    { sku: 'SKU-NUEVO-09', name: 'Galletas Chocolate (Nuevo - Heurístico EMA)' },
  ];

  useEffect(() => {
    runForecast();
  }, [horizon, selectedSku, useMocks]);

  const runForecast = async () => {
    setLoading(true);
    try {
      const res = await predictDemandApi({
        dias_a_futuro: horizon,
        force_retrain: forceRetrain,
      });
      setForecast(res);
    } catch (err) {
      console.error('Error calculando pronóstico predictivo:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Encabezado */}
      <View style={styles.header}>
        <View>
          <View style={styles.titleBadgeRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              PREVISIÓN DE DEMANDA & DIMENSIONAMIENTO DE STOCK
            </Text>
            {forecast && (
              <MetricBadge
                type={forecast.nivel_confianza}
                label={forecast.nivel_confianza === 'alta_ml' ? 'LIGHTGBM SUPERVISADO (≥30 DÍAS)' : 'SUAVIZADO EXPONENCIAL (<30 DÍAS)'}
              />
            )}
          </View>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Inferencia de demanda con intervalos conformales al 80% (p10 / p90) y cálculo de punto de pedido (ROP) por Lead Time.
          </Text>
        </View>
      </View>

      {/* Selector de Producto */}
      <TactileCard>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SELECCIONAR PRODUCTO A PROYECTAR:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.skuScroll}>
          {availableSkus.map(item => {
            const isSelected = item.sku === selectedSku;
            return (
              <TouchableOpacity
                key={item.sku}
                onPress={() => setSelectedSku(item.sku)}
                style={[
                  styles.skuBtn,
                  { backgroundColor: isSelected ? colors.accentPrimary : colors.surfaceSecondary, borderColor: colors.surfaceBorder },
                ]}
              >
                <Text style={[styles.skuCode, { color: isSelected ? '#FFFFFF' : colors.accentPrimary }]}>{item.sku}</Text>
                <Text style={[styles.skuName, { color: isSelected ? '#FFFFFF' : colors.textSecondary }]}>{item.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Barra de Parámetros: Horizonte y Re-entrenamiento */}
        <View style={[styles.controlsRow, { borderTopColor: colors.surfaceBorder }]}>
          <View style={styles.horizonGroup}>
            <Text style={[styles.controlLabel, { color: colors.textMuted }]}>HORIZONTE:</Text>
            {([7, 14, 30] as const).map(h => (
              <TouchableOpacity
                key={h}
                onPress={() => setHorizon(h)}
                style={[
                  styles.hBtn,
                  { backgroundColor: horizon === h ? colors.accentPrimary : colors.surfaceSecondary, borderColor: colors.surfaceBorder },
                ]}
              >
                <Text style={[styles.hText, { color: horizon === h ? '#FFFFFF' : colors.textPrimary }]}>{h} DÍAS</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => setForceRetrain(!forceRetrain)}
            style={[styles.retrainToggle, { borderColor: colors.surfaceBorder }]}
          >
            <View style={[styles.checkbox, { borderColor: colors.accentPrimary, backgroundColor: forceRetrain ? colors.accentPrimary : 'transparent' }]}>
              {forceRetrain && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <Text style={[styles.retrainLabel, { color: colors.textSecondary }]}>Re-entrenar modelo</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={runForecast} style={[styles.runBtn, { backgroundColor: colors.confidenceHigh }]}>
            <Text style={styles.runBtnText}>Calcular Proyección</Text>
          </TouchableOpacity>
        </View>
      </TactileCard>

      {/* Gráfico y Métricas Diagnósticas */}
      <TactileCard>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.accentPrimary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Ejecutando pipeline predictivo en CPU local...</Text>
          </View>
        ) : forecast ? (
          <View>
            <View style={styles.chartHeader}>
              <View>
                <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>PROYECCIÓN TEMPORAL DIARIA ({selectedSku})</Text>
                <Text style={[styles.chartHelp, { color: colors.textSecondary }]}>
                  Línea central: Pronóstico esperado • Banda sombreada: Intervalo de confianza no negativo [p10 - p90]
                </Text>
              </View>
            </View>

            <DemandForecastSvgChart data={forecast.serie_temporal} />

            {/* Panel de Métricas Diagnósticas para Analistas de Datos */}
            <View style={[styles.diagnosticsContainer, { borderTopColor: colors.surfaceBorder }]}>
              <Text style={[styles.diagTitle, { color: colors.textPrimary }]}>
                DIAGNÓSTICO ESTADÍSTICO & INVENTARIO ÓPTIMO (SUPPLY CHAIN)
              </Text>

              <View style={[styles.diagGrid, { backgroundColor: colors.surfaceSecondary }]}>
                <View style={styles.diagItem}>
                  <Text style={[styles.diagLabel, { color: colors.textMuted }]}>ERROR WAPE (OUT-OF-SAMPLE):</Text>
                  <Text style={[styles.diagVal, { color: colors.confidenceHigh }]}>
                    {forecast.metricas_diagnosticas.wape}%
                  </Text>
                </View>

                <View style={styles.diagItem}>
                  <Text style={[styles.diagLabel, { color: colors.textMuted }]}>ERROR RMSE:</Text>
                  <Text style={[styles.diagVal, { color: colors.textPrimary }]}>
                    {forecast.metricas_diagnosticas.rmse} un.
                  </Text>
                </View>

                <View style={styles.diagItem}>
                  <Text style={[styles.diagLabel, { color: colors.textMuted }]}>COEFICIENTE VARIACIÓN (CV):</Text>
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
                  <Text style={[styles.diagLabel, { color: colors.textMuted }]}>PUNTO REORDEN (ROP):</Text>
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

              {/* Descargo Legal */}
              <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
                {forecast.disclaimer}
              </Text>
            </View>
          </View>
        ) : null}
      </TactileCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 1040,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    marginBottom: 12,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.heavy,
    fontFamily: typography.fontFamilyMono,
    marginRight: 10,
  },
  subtitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 8,
  },
  skuScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  skuBtn: {
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 8,
    minWidth: 180,
  },
  skuCode: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  skuName: {
    fontSize: 11,
    fontFamily: typography.fontFamilyMono,
    marginTop: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  horizonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  controlLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    marginRight: 6,
  },
  hBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 4,
  },
  hText: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  retrainToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  checkMark: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  retrainLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
  },
  runBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    marginBottom: 6,
  },
  runBtnText: {
    color: '#FFF',
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    marginTop: 10,
  },
  chartHeader: {
    marginBottom: 10,
  },
  chartTitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  chartHelp: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMono,
    marginTop: 2,
  },
  diagnosticsContainer: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 14,
  },
  diagTitle: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 8,
  },
  diagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    borderRadius: 6,
    justifyContent: 'space-between',
  },
  diagItem: {
    width: '32%',
    minWidth: 110,
    marginBottom: 6,
  },
  diagLabel: {
    fontSize: 9,
    fontFamily: typography.fontFamilyMono,
  },
  diagVal: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    marginTop: 2,
  },
  disclaimer: {
    fontSize: 9,
    fontFamily: typography.fontFamilyMono,
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 14,
  },
});
