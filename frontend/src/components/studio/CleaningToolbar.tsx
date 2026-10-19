import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/theme';
import { useDataWranglerStore } from '../../store/useDataWranglerStore';

export const CleaningToolbar: React.FC = () => {
  const { colors } = useTheme();
  const {
    selectedColumn,
    columnProfiles,
    applyOutlierTreatment,
    applyImputation,
    applyTextNormalization,
    applyDerivedColumn,
    applyFilter,
    undo,
    redo,
    historyPast,
    historyFuture,
  } = useDataWranglerStore();

  const [activeTool, setActiveTool] = useState<'outlier' | 'impute' | 'text' | 'derive' | 'filter' | null>(null);
  const [filterOp, setFilterOp] = useState<'>' | '<' | '==' | '!='>('>');
  const [filterVal, setFilterVal] = useState('');
  const [deriveName, setDeriveName] = useState('margen_unitario');
  const [deriveFormula, setDeriveFormula] = useState<'margin' | 'revenue' | 'day_of_week' | 'is_weekend'>('margin');

  const profile = selectedColumn ? columnProfiles[selectedColumn] : null;
  const isNumeric = profile?.dataType === 'numeric';

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      {/* Barra superior de herramientas de saneamiento */}
      <View style={styles.buttonsBar}>
        <TouchableOpacity
          onPress={() => setActiveTool(activeTool === 'outlier' ? null : 'outlier')}
          disabled={!isNumeric}
          style={[
            styles.toolBtn,
            { backgroundColor: activeTool === 'outlier' ? colors.accentPrimary : colors.surfaceSecondary, borderColor: colors.surfaceBorder },
            !isNumeric && styles.btnDisabled,
          ]}
        >
          <Text style={[styles.toolBtnText, { color: activeTool === 'outlier' ? '#FFFFFF' : colors.textPrimary }]}>
            Tratar Valores Atípicos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTool(activeTool === 'impute' ? null : 'impute')}
          disabled={!selectedColumn}
          style={[
            styles.toolBtn,
            { backgroundColor: activeTool === 'impute' ? colors.accentPrimary : colors.surfaceSecondary, borderColor: colors.surfaceBorder },
            !selectedColumn && styles.btnDisabled,
          ]}
        >
          <Text style={[styles.toolBtnText, { color: activeTool === 'impute' ? '#FFFFFF' : colors.textPrimary }]}>
            Imputar Valores Vacíos
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
      {activeTool === 'outlier' && isNumeric && (
        <View style={[styles.actionPanel, { backgroundColor: colors.surfaceHighlight }]}>
          <Text style={[styles.actionPrompt, { color: colors.textPrimary }]}>
            Tratamiento de Outliers en [{selectedColumn}]:
          </Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => {
                applyOutlierTreatment(selectedColumn!, 'iqr', 'clip');
                setActiveTool(null);
              }}
              style={[styles.actionOptionBtn, { backgroundColor: colors.surfaceSecondary }]}
            >
              <Text style={[styles.actionOptionText, { color: colors.accentPrimary }]}>Recortar IQR (1.5x)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                applyOutlierTreatment(selectedColumn!, 'iqr', 'median');
                setActiveTool(null);
              }}
              style={[styles.actionOptionBtn, { backgroundColor: colors.surfaceSecondary }]}
            >
              <Text style={[styles.actionOptionText, { color: colors.confidenceHigh }]}>Imputar Mediana IQR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                applyOutlierTreatment(selectedColumn!, 'zscore', 'clip');
                setActiveTool(null);
              }}
              style={[styles.actionOptionBtn, { backgroundColor: colors.surfaceSecondary }]}
            >
              <Text style={[styles.actionOptionText, { color: colors.accentPrimary }]}>Recortar Z-Score (3σ)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                applyOutlierTreatment(selectedColumn!, 'iqr', 'remove');
                setActiveTool(null);
              }}
              style={[styles.actionOptionBtn, { backgroundColor: colors.surfaceSecondary }]}
            >
              <Text style={[styles.actionOptionText, { color: colors.alertCritical }]}>Remover Filas Extremas</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {activeTool === 'impute' && selectedColumn && (
        <View style={[styles.actionPanel, { backgroundColor: colors.surfaceHighlight }]}>
          <Text style={[styles.actionPrompt, { color: colors.textPrimary }]}>
            Estrategia de Imputación para [{selectedColumn}]:
          </Text>
          <View style={styles.actionRow}>
            {isNumeric && (
              <>
                <TouchableOpacity
                  onPress={() => {
                    applyImputation(selectedColumn, 'median');
                    setActiveTool(null);
                  }}
                  style={[styles.actionOptionBtn, { backgroundColor: colors.surfaceSecondary }]}
                >
                  <Text style={[styles.actionOptionText, { color: colors.confidenceHigh }]}>Rellenar con Mediana</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    applyImputation(selectedColumn, 'mean');
                    setActiveTool(null);
                  }}
                  style={[styles.actionOptionBtn, { backgroundColor: colors.surfaceSecondary }]}
                >
                  <Text style={[styles.actionOptionText, { color: colors.accentPrimary }]}>Rellenar con Media (μ)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    applyImputation(selectedColumn, 'zero');
                    setActiveTool(null);
                  }}
                  style={[styles.actionOptionBtn, { backgroundColor: colors.surfaceSecondary }]}
                >
                  <Text style={[styles.actionOptionText, { color: colors.textPrimary }]}>Rellenar con Cero (0)</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              onPress={() => {
                applyImputation(selectedColumn, 'ffill');
                setActiveTool(null);
              }}
              style={[styles.actionOptionBtn, { backgroundColor: colors.surfaceSecondary }]}
            >
              <Text style={[styles.actionOptionText, { color: colors.confidenceHeuristic }]}>Interpolación (FFill)</Text>
            </TouchableOpacity>
          </View>
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
              onPress={() => setDeriveFormula('margin')}
              style={[styles.formulaBtn, deriveFormula === 'margin' && { backgroundColor: colors.accentPrimary }]}
            >
              <Text style={[styles.formulaText, { color: deriveFormula === 'margin' ? '#FFF' : colors.textPrimary }]}>Margen (P - C)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setDeriveFormula('revenue')}
              style={[styles.formulaBtn, deriveFormula === 'revenue' && { backgroundColor: colors.accentPrimary }]}
            >
              <Text style={[styles.formulaText, { color: deriveFormula === 'revenue' ? '#FFF' : colors.textPrimary }]}>Ingreso (Q * P)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setDeriveFormula('day_of_week')}
              style={[styles.formulaBtn, deriveFormula === 'day_of_week' && { backgroundColor: colors.accentPrimary }]}
            >
              <Text style={[styles.formulaText, { color: deriveFormula === 'day_of_week' ? '#FFF' : colors.textPrimary }]}>Día Semana</Text>
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
    padding: 8,
    marginBottom: 10,
  },
  buttonsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 6,
    marginBottom: 4,
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
    marginLeft: 'auto',
    marginBottom: 4,
  },
  historyBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    marginLeft: 4,
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
});
