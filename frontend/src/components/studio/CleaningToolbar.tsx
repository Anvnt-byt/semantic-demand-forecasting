import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { typography } from '../../theme/theme';
import { useDataWranglerStore } from '../../store/useDataWranglerStore';

export const CleaningToolbar: React.FC = () => {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const {
    columns,
    selectedColumn,
    selectColumn,
    columnProfiles,
    applyOutlierTreatment,
    applyImputation,
    applyBatchAutoImpute,
    applyTextNormalization,
    applyDerivedColumn,
    applyFilter,
    applySeparateRefunds,
    undo,
    redo,
    historyPast,
    historyFuture,
  } = useDataWranglerStore();

  const [activeTool, setActiveTool] = useState<'outlier' | 'impute' | 'text' | 'derive' | 'filter' | null>(null);
  const [filterOp, setFilterOp] = useState<'>' | '<' | '==' | '!='>('>');
  const [filterVal, setFilterVal] = useState('');
  const [deriveName, setDeriveName] = useState('subtotal_venta');
  const [deriveFormula, setDeriveFormula] = useState<'revenue' | 'day_of_week' | 'is_weekend' | 'margin'>('revenue');

  const profile = selectedColumn ? columnProfiles[selectedColumn] : null;
  const isNumeric = profile?.dataType === 'numeric';

  const handleOpenImpute = () => {
    if (activeTool === 'impute') {
      setActiveTool(null);
      return;
    }
    // Si la columna actual no tiene nulos, auto-seleccionar la primera que sí tenga
    if (!profile || profile.nullCount === 0) {
      const colWithNulls = columns.find(c => (columnProfiles[c]?.nullCount ?? 0) > 0);
      if (colWithNulls) {
        selectColumn(colWithNulls);
      }
    }
    setActiveTool('impute');
  };

  const handleOpenOutliers = () => {
    if (activeTool === 'outlier') {
      setActiveTool(null);
      return;
    }
    if (!isNumeric) {
      const numCol = columns.find(c => columnProfiles[c]?.dataType === 'numeric');
      if (numCol) {
        selectColumn(numCol);
      }
    }
    setActiveTool('outlier');
  };

  const handleBatchAutoImpute = () => {
    const res = applyBatchAutoImpute();
    if (res.affectedRows > 0) {
      showToast(`Auto-imputación exitosa: ${res.affectedRows} celdas corregidas en [${res.affectedCols.join(', ')}].`, { type: 'success' });
      setActiveTool(null);
    } else {
      showToast('No se detectaron valores nulos o vacíos en el dataset activo.', { type: 'info' });
    }
  };

  const handleSingleImpute = (strategy: 'median' | 'mean' | 'zero' | 'ffill') => {
    if (!selectedColumn) return;
    const res = applyImputation(selectedColumn, strategy);
    if (res.affected > 0) {
      showToast(`Imputados ${res.affected} nulos en [${selectedColumn}] con estrategia ${strategy}.`, { type: 'success' });
      setActiveTool(null);
    } else {
      showToast(`La columna [${selectedColumn}] no contiene celdas nulas.`, { type: 'warning' });
    }
  };

  const handleRefunds = () => {
    const res = applySeparateRefunds();
    if (res.affected > 0) {
      showToast(`Aisladas ${res.affected} devoluciones con saldo negativo del dataset.`, { type: 'success' });
    } else {
      showToast('No se encontraron transacciones con cantidad negativa en el lote actual.', { type: 'info' });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      <View style={styles.sidebarHeader}>
        <Text style={[styles.sidebarTitle, { color: colors.accentPrimary }]}>CAJA DE HERRAMIENTAS</Text>
        <Text style={[styles.sidebarSubtitle, { color: colors.textMuted }]}>
          Columna: <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>{selectedColumn || 'Sin seleccionar'}</Text>
        </Text>
      </View>

      {/* Herramientas de Calidad & Saneamiento */}
      <View style={styles.buttonsBar}>
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>CALIDAD & VALORES NULOS</Text>

        <TouchableOpacity
          onPress={handleOpenImpute}
          style={[
            styles.toolBtn,
            { backgroundColor: activeTool === 'impute' ? colors.accentPrimary : colors.surfaceSecondary, borderColor: colors.surfaceBorder },
          ]}
        >
          <Text style={[styles.toolBtnText, { color: activeTool === 'impute' ? '#FFFFFF' : colors.textPrimary }]}>
            Imputar Valores Vacíos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleBatchAutoImpute}
          style={[
            styles.toolBtn,
            { backgroundColor: colors.surfaceSecondary, borderColor: colors.surfaceBorder },
          ]}
        >
          <Text style={[styles.toolBtnText, { color: colors.confidenceHigh }]}>
            Auto-Saneamiento (1 Clic)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleRefunds}
          style={[
            styles.toolBtn,
            { backgroundColor: colors.surfaceSecondary, borderColor: colors.surfaceBorder },
          ]}
        >
          <Text style={[styles.toolBtnText, { color: colors.alertCritical }]}>
            Aislar Devoluciones (&lt; 0)
          </Text>
        </TouchableOpacity>

        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>ANOMALÍAS & OUTLIERS</Text>

        <TouchableOpacity
          onPress={handleOpenOutliers}
          style={[
            styles.toolBtn,
            { backgroundColor: activeTool === 'outlier' ? colors.accentPrimary : colors.surfaceSecondary, borderColor: colors.surfaceBorder },
          ]}
        >
          <Text style={[styles.toolBtnText, { color: activeTool === 'outlier' ? '#FFFFFF' : colors.textPrimary }]}>
            Tratar Outliers (IQR)
          </Text>
        </TouchableOpacity>

        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>TRANSFORMACIONES</Text>

        <TouchableOpacity
          onPress={() => setActiveTool(activeTool === 'derive' ? null : 'derive')}
          style={[
            styles.toolBtn,
            { backgroundColor: activeTool === 'derive' ? colors.accentPrimary : colors.surfaceSecondary, borderColor: colors.surfaceBorder },
          ]}
        >
          <Text style={[styles.toolBtnText, { color: activeTool === 'derive' ? '#FFFFFF' : colors.textPrimary }]}>
            Derivar Columna
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTool(activeTool === 'text' ? null : 'text')}
          disabled={!selectedColumn || isNumeric}
          style={[
            styles.toolBtn,
            { backgroundColor: activeTool === 'text' ? colors.accentPrimary : colors.surfaceSecondary, borderColor: colors.surfaceBorder },
            (!selectedColumn || isNumeric) && styles.btnDisabled,
          ]}
        >
          <Text style={[styles.toolBtnText, { color: activeTool === 'text' ? '#FFFFFF' : colors.textPrimary }]}>
            Normalizar Cadenas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTool(activeTool === 'filter' ? null : 'filter')}
          disabled={!selectedColumn}
          style={[
            styles.toolBtn,
            { backgroundColor: activeTool === 'filter' ? colors.accentPrimary : colors.surfaceSecondary, borderColor: colors.surfaceBorder },
            !selectedColumn && styles.btnDisabled,
          ]}
        >
          <Text style={[styles.toolBtnText, { color: activeTool === 'filter' ? '#FFFFFF' : colors.textPrimary }]}>
            Filtrar Registros
          </Text>
        </TouchableOpacity>

        {/* Undo / Redo */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>HISTORIAL RÁPIDO</Text>
        <View style={styles.historyGroup}>
          <TouchableOpacity
            onPress={undo}
            disabled={historyPast.length === 0}
            style={[styles.historyBtn, { borderColor: colors.surfaceBorder }, historyPast.length === 0 && styles.btnDisabled]}
          >
            <Text style={[styles.historyText, { color: colors.textPrimary }]}>Deshacer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={redo}
            disabled={historyFuture.length === 0}
            style={[styles.historyBtn, { borderColor: colors.surfaceBorder }, historyFuture.length === 0 && styles.btnDisabled]}
          >
            <Text style={[styles.historyText, { color: colors.textPrimary }]}>Rehacer</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Subpanel de configuración según herramienta activa */}
      {activeTool === 'outlier' && (
        <View style={[styles.actionPanel, { backgroundColor: colors.surfaceHighlight }]}>
          <Text style={[styles.actionPrompt, { color: colors.textPrimary }]}>
            Tratamiento de Outliers (Seleccione columna numérica):
          </Text>
          {/* Selector de columna numérica */}
          <View style={styles.columnChipsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginVertical: 4 }}>
              {columns
                .filter(col => columnProfiles[col]?.dataType === 'numeric')
                .map(col => {
                  const p = columnProfiles[col];
                  const outliers = p?.outlierCount ?? 0;
                  const isColSelected = col === selectedColumn;
                  return (
                    <TouchableOpacity
                      key={col}
                      onPress={() => selectColumn(col)}
                      style={[
                        styles.colChip,
                        { backgroundColor: isColSelected ? colors.accentPrimary : colors.surfaceSecondary, borderColor: colors.surfaceBorder },
                        outliers > 0 && !isColSelected && { borderColor: colors.alertCritical, borderWidth: 1.5 }
                      ]}
                    >
                      <Text style={[styles.colChipText, { color: isColSelected ? '#FFFFFF' : colors.textPrimary }]}>
                        {col} {outliers > 0 ? `[${outliers} outliers]` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => {
                if (selectedColumn) applyOutlierTreatment(selectedColumn, 'iqr', 'clip');
                setActiveTool(null);
              }}
              style={[styles.actionOptionBtn, { backgroundColor: colors.surfaceSecondary }]}
            >
              <Text style={[styles.actionOptionText, { color: colors.accentPrimary }]}>Recortar IQR (1.5x)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (selectedColumn) applyOutlierTreatment(selectedColumn, 'iqr', 'median');
                setActiveTool(null);
              }}
              style={[styles.actionOptionBtn, { backgroundColor: colors.surfaceSecondary }]}
            >
              <Text style={[styles.actionOptionText, { color: colors.confidenceHigh }]}>Imputar Mediana IQR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (selectedColumn) applyOutlierTreatment(selectedColumn, 'zscore', 'clip');
                setActiveTool(null);
              }}
              style={[styles.actionOptionBtn, { backgroundColor: colors.surfaceSecondary }]}
            >
              <Text style={[styles.actionOptionText, { color: colors.accentPrimary }]}>Recortar Z-Score (3σ)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (selectedColumn) applyOutlierTreatment(selectedColumn, 'iqr', 'remove');
                setActiveTool(null);
              }}
              style={[styles.actionOptionBtn, { backgroundColor: colors.surfaceSecondary }]}
            >
              <Text style={[styles.actionOptionText, { color: colors.alertCritical }]}>Remover Filas Extremas</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {activeTool === 'impute' && (
        <View style={[styles.actionPanel, { backgroundColor: colors.surfaceHighlight }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={[styles.actionPrompt, { color: colors.textPrimary, marginBottom: 0 }]}>
              Saneamiento de Valores Nulos / Vacíos:
            </Text>
            <TouchableOpacity
              onPress={handleBatchAutoImpute}
              style={[styles.actionOptionBtn, { backgroundColor: colors.confidenceHigh, borderColor: colors.confidenceHigh }]}
            >
              <Text style={[styles.actionOptionText, { color: '#FFFFFF' }]}>
                Auto-Imputar Todos los Nulos (Lote Completo)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Selector de columna para imputación individual */}
          <Text style={[styles.chipsLabel, { color: colors.textMuted }]}>
            O seleccione columna individual para aplicar estrategia manual:
          </Text>
          <View style={styles.columnChipsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginVertical: 4 }}>
              {columns.map(col => {
                const p = columnProfiles[col];
                const nulls = p?.nullCount ?? 0;
                const isColSelected = col === selectedColumn;
                return (
                  <TouchableOpacity
                    key={col}
                    onPress={() => selectColumn(col)}
                    style={[
                      styles.colChip,
                      { backgroundColor: isColSelected ? colors.accentPrimary : colors.surfaceSecondary, borderColor: colors.surfaceBorder },
                      nulls > 0 && !isColSelected && { borderColor: colors.alertCritical, borderWidth: 1.5 }
                    ]}
                  >
                    <Text style={[styles.colChipText, { color: isColSelected ? '#FFFFFF' : colors.textPrimary }]}>
                      {col} {nulls > 0 ? `[${nulls} vacíos]` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {selectedColumn && (
            <View style={styles.actionRow}>
              {isNumeric && (
                <>
                  <TouchableOpacity
                    onPress={() => handleSingleImpute('median')}
                    style={[styles.actionOptionBtn, { backgroundColor: colors.surfaceSecondary }]}
                  >
                    <Text style={[styles.actionOptionText, { color: colors.confidenceHigh }]}>Rellenar con Mediana</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleSingleImpute('mean')}
                    style={[styles.actionOptionBtn, { backgroundColor: colors.surfaceSecondary }]}
                  >
                    <Text style={[styles.actionOptionText, { color: colors.accentPrimary }]}>Rellenar con Media (μ)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleSingleImpute('zero')}
                    style={[styles.actionOptionBtn, { backgroundColor: colors.surfaceSecondary }]}
                  >
                    <Text style={[styles.actionOptionText, { color: colors.textPrimary }]}>Rellenar con Cero (0)</Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                onPress={() => handleSingleImpute('ffill')}
                style={[styles.actionOptionBtn, { backgroundColor: colors.surfaceSecondary }]}
              >
                <Text style={[styles.actionOptionText, { color: colors.confidenceHeuristic }]}>Interpolación (FFill)</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {activeTool === 'text' && selectedColumn && (
        <View style={[styles.actionPanel, { backgroundColor: colors.surfaceHighlight }]}>
          <Text style={[styles.actionPrompt, { color: colors.textPrimary }]}>
            Limpieza de Cadenas en [{selectedColumn}]:
          </Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => {
                applyTextNormalization(selectedColumn, 'trim');
                setActiveTool(null);
              }}
              style={[styles.actionOptionBtn, { backgroundColor: colors.surfaceSecondary }]}
            >
              <Text style={[styles.actionOptionText, { color: colors.accentPrimary }]}>Trim Espacios</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                applyTextNormalization(selectedColumn, 'upper');
                setActiveTool(null);
              }}
              style={[styles.actionOptionBtn, { backgroundColor: colors.surfaceSecondary }]}
            >
              <Text style={[styles.actionOptionText, { color: colors.textPrimary }]}>MAYÚSCULAS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                applyTextNormalization(selectedColumn, 'lower');
                setActiveTool(null);
              }}
              style={[styles.actionOptionBtn, { backgroundColor: colors.surfaceSecondary }]}
            >
              <Text style={[styles.actionOptionText, { color: colors.textPrimary }]}>minúsculas</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                applyTextNormalization(selectedColumn, 'clean_special');
                setActiveTool(null);
              }}
              style={[styles.actionOptionBtn, { backgroundColor: colors.surfaceSecondary }]}
            >
              <Text style={[styles.actionOptionText, { color: colors.alertWarning }]}>Quitar Caracteres Raros</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {activeTool === 'derive' && (
        <View style={[styles.actionPanel, { backgroundColor: colors.surfaceHighlight }]}>
          <Text style={[styles.actionPrompt, { color: colors.textPrimary }]}>Generar Métrica Derivada:</Text>
          <View style={styles.actionRow}>
            <TextInput
              value={deriveName}
              onChangeText={setDeriveName}
              placeholder="Nombre de la nueva columna"
              placeholderTextColor={colors.textMuted}
              style={[styles.inputField, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary }]}
            />
            <TouchableOpacity
              onPress={() => setDeriveFormula('revenue')}
              style={[styles.formulaBtn, deriveFormula === 'revenue' && { backgroundColor: colors.accentPrimary }]}
            >
              <Text style={[styles.formulaText, { color: deriveFormula === 'revenue' ? '#FFF' : colors.textPrimary }]}>Subtotal (Q * P)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setDeriveFormula('day_of_week')}
              style={[styles.formulaBtn, deriveFormula === 'day_of_week' && { backgroundColor: colors.accentPrimary }]}
            >
              <Text style={[styles.formulaText, { color: deriveFormula === 'day_of_week' ? '#FFF' : colors.textPrimary }]}>Día Semana</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setDeriveFormula('is_weekend')}
              style={[styles.formulaBtn, deriveFormula === 'is_weekend' && { backgroundColor: colors.accentPrimary }]}
            >
              <Text style={[styles.formulaText, { color: deriveFormula === 'is_weekend' ? '#FFF' : colors.textPrimary }]}>Fin de Semana</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                applyDerivedColumn(deriveName.trim(), deriveFormula);
                setActiveTool(null);
              }}
              style={[styles.applyBtn, { backgroundColor: colors.confidenceHigh }]}
            >
              <Text style={styles.applyBtnText}>Crear</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {activeTool === 'filter' && selectedColumn && (
        <View style={[styles.actionPanel, { backgroundColor: colors.surfaceHighlight }]}>
          <Text style={[styles.actionPrompt, { color: colors.textPrimary }]}>Filtrar Filas donde [{selectedColumn}]:</Text>
          <View style={styles.actionRow}>
            <View style={styles.opGroup}>
              {(['>', '<', '==', '!='] as const).map(op => (
                <TouchableOpacity
                  key={op}
                  onPress={() => setFilterOp(op)}
                  style={[styles.opBtn, filterOp === op && { backgroundColor: colors.accentPrimary }]}
                >
                  <Text style={[styles.opText, { color: filterOp === op ? '#FFF' : colors.textPrimary }]}>{op}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={filterVal}
              onChangeText={setFilterVal}
              placeholder="Valor umbral"
              placeholderTextColor={colors.textMuted}
              style={[styles.inputField, { width: 120, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary }]}
            />
            <TouchableOpacity
              onPress={() => {
                if (filterVal) {
                  applyFilter(selectedColumn, filterOp, filterVal);
                  setActiveTool(null);
                }
              }}
              style={[styles.applyBtn, { backgroundColor: colors.confidenceHigh }]}
            >
              <Text style={styles.applyBtnText}>Aplicar Filtro</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  sidebarHeader: {
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  sidebarTitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.heavy,
    letterSpacing: 0.6,
  },
  sidebarSubtitle: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMono,
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 9,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 4,
  },
  buttonsBar: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  toolBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 5,
    width: '100%',
  },
  toolBtnText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  btnDisabled: {
    opacity: 0.35,
  },
  historyGroup: {
    flexDirection: 'row',
    marginTop: 4,
    width: '100%',
    justifyContent: 'space-between',
  },
  historyBtn: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  historyText: {
    fontSize: 11,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  actionPanel: {
    marginTop: 8,
    padding: 10,
    borderRadius: 6,
  },
  actionPrompt: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 6,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  actionOptionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  actionOptionText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  inputField: {
    height: 32,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    marginRight: 8,
  },
  formulaBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 6,
  },
  formulaText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  applyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 4,
    marginLeft: 6,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  opGroup: {
    flexDirection: 'row',
    marginRight: 8,
  },
  opBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 4,
  },
  opText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  columnChipsContainer: {
    marginBottom: 6,
  },
  chipsLabel: {
    fontSize: 11,
    fontFamily: typography.fontFamilyMono,
    marginBottom: 3,
  },
  colChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 6,
  },
  colChipText: {
    fontSize: 11,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
});
