import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/theme';
import { useDataWranglerStore, isMissingOrNull } from '../store/useDataWranglerStore';
import { useConfigStore } from '../store/useConfigStore';
import { ColumnProfiler } from '../components/studio/ColumnProfiler';
import { CleaningToolbar } from '../components/studio/CleaningToolbar';
import { RecipeHistoryPanel } from '../components/studio/RecipeHistoryPanel';
import { useToast } from '../context/ToastContext';
import {
  fetchDirtyDemoBatchApi,
  fetchRecentTransactionsApi,
  commitCuratedDataApi,
  resetDemoDatabaseApi,
} from '../api/endpoints/curationApi';
import { MOCK_DIRTY_DEMO_RECORDS } from '../api/mockData';

const getDataTypeBadge = (type?: string) => {
  if (!type) return 'ABC';
  if (type === 'numeric') return '#';
  if (type === 'date') return 'FCH';
  if (type === 'boolean') return '0/1';
  return 'ABC';
};

const SAMPLE_VENTAS_DATA = MOCK_DIRTY_DEMO_RECORDS;

export const DataStudioScreen: React.FC = () => {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { setPipelineStep } = useConfigStore();
  const {
    activeDataset,
    columns,
    selectedColumn,
    selectColumn,
    columnProfiles,
    loadDataset,
    datasetName,
    recipe,
  } = useDataWranglerStore();

  const [loadingAction, setLoadingAction] = useState(false);
  const [consolidatedInfo, setConsolidatedInfo] = useState<{ message: string; skus: string[] } | null>(null);

  useEffect(() => {
    if (activeDataset.length === 0) {
      loadDataset('Lote_Cierre_POS_Con_Anomalias', SAMPLE_VENTAS_DATA);
    }
  }, []);

  const handleLoadDirtyDemo = async () => {
    setLoadingAction(true);
    try {
      const res = await fetchDirtyDemoBatchApi();
      loadDataset(res.dataset_name, res.records);
      setConsolidatedInfo(null);
      showToast(`Lote con anomalías cargado: ${res.records.length} registros listos para saneamiento.`, { type: 'info' });
    } catch (err: any) {
      loadDataset('Lote_Cierre_POS_Con_Anomalias', SAMPLE_VENTAS_DATA);
      showToast('Lote de contingencia cargado en memoria.', { type: 'info' });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleLoadRecentPOS = async () => {
    setLoadingAction(true);
    try {
      const res = await fetchRecentTransactionsApi(100);
      if (res.records.length === 0) {
        showToast('No hay transacciones previas en base de datos. Cargando lote demo...', { type: 'warning' });
        handleLoadDirtyDemo();
        return;
      }
      loadDataset(res.dataset_name, res.records);
      setConsolidatedInfo(null);
      showToast(`${res.records.length} transacciones recientes cargadas desde base local.`, { type: 'success' });
    } catch (err: any) {
      showToast(err.message || 'Error al conectar con la base de datos', { type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleResetDemo = async () => {
    setLoadingAction(true);
    try {
      const res = await resetDemoDatabaseApi();
      showToast(res.message, { type: 'success' });
      handleLoadDirtyDemo();
    } catch (err: any) {
      showToast(err.message || 'Error restableciendo estado demo', { type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleConsolidate = async () => {
    if (activeDataset.length === 0) return;
    setLoadingAction(true);
    try {
      const res = await commitCuratedDataApi({
        dataset_name: datasetName,
        records: activeDataset,
        recipe_summary: recipe.map(r => ({ step: r.name, target: r.targetColumn })),
      });
      setConsolidatedInfo({
        message: res.message,
        skus: res.skus_afectados,
      });
      showToast(res.message, { type: 'success' });
    } catch (err: any) {
      showToast(err.message || 'Error al consolidar la receta', { type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  const currentProfile = selectedColumn ? columnProfiles[selectedColumn] || null : null;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Header del Studio */}
      <View style={styles.headerRow}>
        <View>
          <View style={styles.titleBadgeRow}>
            <Text style={[styles.mainTitle, { color: colors.textPrimary }]}>PREPARACIÓN & CALIDAD DE DATOS</Text>
            <View style={[styles.proBadge, { backgroundColor: colors.accentPrimaryGlow }]}>
              <Text style={[styles.proBadgeText, { color: colors.accentPrimary }]}>AUDITORÍA & SANEAMIENTO</Text>
            </View>
          </View>
          <Text style={[styles.subTitle, { color: colors.textMuted }]}>
            Auditoría de anomalías IQR, imputación de nulos y receta reproducible no destructiva antes del modelado predictivo.
          </Text>
        </View>

        <TouchableOpacity onPress={handleConsolidate} style={[styles.consolidateBtn, { backgroundColor: colors.confidenceHigh }]}>
          <Text style={styles.consolidateBtnText}>Consolidar Cambios (SQLite)</Text>
        </TouchableOpacity>
      </View>

      {/* Selector y Botones de Origen de Datos */}
      <View style={[styles.datasetBar, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <View style={styles.datasetInfoGroup}>
          <Text style={[styles.datasetLabel, { color: colors.textMuted }]}>DATASET ACTIVO:</Text>
          <Text style={[styles.datasetName, { color: colors.accentPrimary }]}>[{datasetName}]</Text>
          <Text style={[styles.datasetMeta, { color: colors.textSecondary }]}>
            • {activeDataset.length} filas • {columns.length} atributos • {recipe.length} pasos aplicados
          </Text>
        </View>

        <View style={styles.datasetActionsGroup}>
          <TouchableOpacity
            onPress={handleLoadDirtyDemo}
            disabled={loadingAction}
            style={[styles.sourceActionBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.surfaceBorder }]}
          >
            <Text style={[styles.sourceActionBtnText, { color: colors.accentPrimary }]}>
              Lote con Anomalías (Demo)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLoadRecentPOS}
            disabled={loadingAction}
            style={[styles.sourceActionBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.surfaceBorder }]}
          >
            <Text style={[styles.sourceActionBtnText, { color: colors.textPrimary }]}>
              Transacciones POS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleResetDemo}
            disabled={loadingAction}
            style={[styles.sourceActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
          >
            <Text style={[styles.sourceActionBtnText, { color: colors.alertCritical }]}>
              Restablecer Demo
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Banner de Impacto de Consolidación */}
      {consolidatedInfo && (
        <View style={[styles.successBanner, { borderColor: colors.confidenceHigh }]}>
          <Text style={[styles.successBannerTitle, { color: colors.confidenceHigh }]}>
            Consolidación Exitosa: {consolidatedInfo.message}
          </Text>
          <Text style={[styles.successBannerDesc, { color: colors.textSecondary }]}>
            Los datos saneados han sido persistidos en la base local para los SKUs: {consolidatedInfo.skus.join(', ')}. Los pronósticos de demanda y stock de seguridad ya reflejan los registros limpios.
          </Text>
          <TouchableOpacity
            onPress={() => setPipelineStep(4)}
            style={[styles.consolidateBtn, { backgroundColor: colors.accentPrimary, marginTop: 10, alignSelf: 'flex-start' }]}
          >
            <Text style={styles.consolidateBtnText}>Alimentar Modelos Predictivos y Avanzar a Analítica</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Layout Tri-Panel (Izquierda: Herramientas | Centro: Canvas | Derecha: Receta) */}
      <View style={styles.triPanelRow}>
        {/* Columna Izquierda: Herramientas */}
        <View style={styles.leftColumn}>
          <CleaningToolbar />
        </View>

        {/* Columna Central: Perfilador + Grid Tabular */}
        <View style={styles.centerColumn}>
          <ColumnProfiler profile={currentProfile} />

          <View style={[styles.gridContainer, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <View style={styles.gridHeaderRow}>
              <Text style={[styles.gridTitle, { color: colors.textPrimary }]}>
                VISTA PREVIA TABULAR ({activeDataset.length} transacciones cargadas)
              </Text>
              <Text style={[styles.gridHelp, { color: colors.textMuted }]}>
                Columna activa: <Text style={{ color: colors.accentPrimary, fontWeight: 'bold' }}>{selectedColumn || 'Ninguna'}</Text>
              </Text>
            </View>

            <ScrollView horizontal nestedScrollEnabled style={styles.horizontalScroll}>
              <View>
                {/* Cabecera de columnas */}
                <View style={[styles.tableRow, styles.tableHeaderRow, { borderBottomColor: colors.surfaceBorder }]}>
                  {columns.map(col => {
                    const isSelected = col === selectedColumn;
                    const p = columnProfiles[col];
                    const hasOutliers = p && p.outlierCount > 0;
                    const hasNulls = p && p.nullCount > 0;

                    return (
                      <TouchableOpacity
                        key={col}
                        onPress={() => selectColumn(col)}
                        style={[
                          styles.thCell,
                          isSelected && { backgroundColor: colors.surfaceHighlight, borderBottomWidth: 2.5, borderBottomColor: colors.accentPrimary },
                        ]}
                      >
                        <View style={styles.thContent}>
                          <Text style={[styles.thText, { color: isSelected ? colors.accentPrimary : colors.textPrimary }]}>
                            {col}
                          </Text>
                          {p && (
                            <View style={[styles.thTypeBadge, { backgroundColor: colors.surfaceSecondary, borderColor: colors.surfaceBorder }]}>
                              <Text style={[styles.thType, { color: colors.accentPrimary }]}>
                                {getDataTypeBadge(p.dataType)}
                              </Text>
                            </View>
                          )}
                        </View>
                        {hasNulls && (
                          <View style={[styles.headerAlertPill, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                            <Text style={[styles.headerAlertText, { color: colors.alertCritical }]}>[{p.nullCount} vacíos]</Text>
                          </View>
                        )}
                        {hasOutliers && (
                          <View style={[styles.headerAlertPill, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                            <Text style={[styles.headerAlertText, { color: colors.alertWarning }]}>[{p.outlierCount} outliers]</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Filas de datos */}
                <ScrollView style={styles.tableBodyScroll} nestedScrollEnabled>
                  {activeDataset.slice(0, 100).map((row, rIdx) => (
                    <View
                      key={rIdx}
                      style={[
                        styles.tableRow,
                        { borderBottomColor: colors.surfaceBorder },
                        rIdx % 2 === 0 ? { backgroundColor: colors.surface } : { backgroundColor: colors.surfaceSecondary },
                      ]}
                    >
                      {columns.map(col => {
                        const isSelected = col === selectedColumn;
                        const val = row[col];
                        const isNull = isMissingOrNull(val);
                        const isNegative = typeof val === 'number' && val < 0;

                        return (
                          <View
                            key={col}
                            style={[
                              styles.tdCell,
                              isSelected && { backgroundColor: 'rgba(6, 182, 212, 0.06)' },
                            ]}
                          >
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.tdText,
                                {
                                  color: isNull
                                    ? colors.alertCritical
                                    : isNegative
                                    ? colors.alertWarning
                                    : colors.textSecondary,
                                },
                                isNull && { fontStyle: 'italic', fontWeight: 'bold' },
                                isNegative && { fontWeight: 'bold' },
                              ]}
                            >
                              {isNull ? '<NULL>' : String(val)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Columna Derecha: Receta de Transformación & Consolidación */}
        <View style={styles.rightColumn}>
          <RecipeHistoryPanel
            onConsolidate={handleConsolidate}
            loadingConsolidate={loadingAction}
          />
        </View>
      </View>
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
    maxWidth: 1440,
    alignSelf: 'center',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.heavy,
    fontFamily: typography.fontFamilyMono,
    marginRight: 8,
  },
  proBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyMono,
  },
  subTitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    marginTop: 4,
  },
  consolidateBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 6,
  },
  consolidateBtnText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  datasetBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  datasetInfoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  datasetActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  sourceActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    borderWidth: 1,
  },
  sourceActionBtnText: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  successBanner: {
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  successBannerTitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 2,
  },
  successBannerDesc: {
    fontSize: 11,
    fontFamily: typography.fontFamilyMono,
    lineHeight: 16,
  },
  datasetLabel: {
    fontSize: 11,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    marginRight: 6,
  },
  datasetName: {
    fontSize: 11,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    marginRight: 8,
  },
  datasetMeta: {
    fontSize: 11,
    fontFamily: typography.fontFamilyMono,
  },
  triPanelRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  leftColumn: {
    width: 250,
  },
  centerColumn: {
    flex: 1,
    minWidth: 540,
  },
  rightColumn: {
    width: 280,
  },
  gridContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  gridHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridTitle: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.5,
  },
  gridHelp: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMono,
  },
  horizontalScroll: {
    borderRadius: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tableHeaderRow: {
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  thCell: {
    width: 140,
    padding: 8,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.04)',
  },
  thContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  thTypeBadge: {
    marginLeft: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
  },
  thType: {
    fontSize: 9,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  warningDot: {
    fontSize: 10,
  },
  dangerDot: {
    fontSize: 10,
  },
  tableBodyScroll: {
    maxHeight: 460,
  },
  tdCell: {
    width: 140,
    padding: 8,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.03)',
  },
  tdText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
  },
  headerAlertPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginTop: 3,
    alignSelf: 'flex-start',
  },
  headerAlertText: {
    fontSize: 9,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
});
