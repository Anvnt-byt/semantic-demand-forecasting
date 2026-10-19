import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/theme';
import { useDataWranglerStore } from '../../store/useDataWranglerStore';

interface RecipeHistoryPanelProps {
  onConsolidate?: () => void;
  loadingConsolidate?: boolean;
}

export const RecipeHistoryPanel: React.FC<RecipeHistoryPanelProps> = ({
  onConsolidate,
  loadingConsolidate,
}) => {
  const { colors } = useTheme();
  const { recipe, toggleRecipeStep, resetAll, activeDataset, rawDataset } = useDataWranglerStore();

  const totalAffected = recipe.reduce((acc, s) => acc + s.affectedRows, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            RECETA DE TRANSFORMACIÓN ({recipe.length} PASOS)
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Pasos no destructivos • {totalAffected} modificaciones acumuladas
          </Text>
        </View>

        {recipe.length > 0 && (
          <TouchableOpacity onPress={resetAll} style={[styles.resetBtn, { backgroundColor: colors.alertCriticalBg }]}>
            <Text style={[styles.resetText, { color: colors.alertCritical }]}>Restablecer</Text>
          </TouchableOpacity>
        )}
      </View>

      {recipe.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Aún no se han aplicado reglas. Selecciona una columna y usa las herramientas de saneamiento para construir la receta.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.stepsList} nestedScrollEnabled>
          {recipe.map((step, idx) => (
            <View
              key={step.id}
              style={[
                styles.stepCard,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.surfaceBorder },
                !step.enabled && { opacity: 0.5 },
              ]}
            >
              <View style={styles.stepHeader}>
                <View style={styles.stepNumBox}>
                  <Text style={[styles.stepNum, { color: colors.accentPrimary }]}>#{idx + 1}</Text>
                  <Text style={[styles.stepName, { color: colors.textPrimary }]}>{step.name}</Text>
                </View>

                <TouchableOpacity
                  onPress={() => toggleRecipeStep(step.id)}
                  style={[styles.toggleBtn, { backgroundColor: step.enabled ? colors.confidenceHighBg : colors.surfaceHighlight }]}
                >
                  <Text style={[styles.toggleText, { color: step.enabled ? colors.confidenceHigh : colors.textMuted }]}>
                    {step.enabled ? 'ACTIVO' : 'PAUSA'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.stepDetails, { color: colors.textSecondary }]}>{step.details}</Text>

              <View style={styles.stepFooter}>
                <Text style={[styles.targetCol, { color: colors.textMuted }]}>
                  Columna: <Text style={{ color: colors.accentPrimary }}>{step.targetColumn}</Text>
                </Text>
                <Text style={[styles.affectedText, { color: colors.alertWarning }]}>
                  {step.affectedRows} filas afectadas
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Resumen del dataset */}
      <View style={[styles.summaryFooter, { borderTopColor: colors.surfaceBorder }]}>
        <Text style={[styles.summaryText, { color: colors.textMuted }]}>
          {`Filas originales: ${rawDataset.length.toLocaleString()} -> Limpias: `}<Text style={{ color: colors.confidenceHigh, fontWeight: 'bold' }}>{activeDataset.length.toLocaleString()}</Text>
        </Text>
      </View>

      {onConsolidate && (
        <TouchableOpacity
          onPress={onConsolidate}
          disabled={loadingConsolidate || activeDataset.length === 0}
          style={[
            styles.consolidateBtn,
            { backgroundColor: colors.confidenceHigh },
            (loadingConsolidate || activeDataset.length === 0) && { opacity: 0.5 },
          ]}
        >
          <Text style={styles.consolidateBtnText}>
            {loadingConsolidate ? 'Consolidando...' : 'Consolidar en SQLite'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.6,
  },
  subtitle: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMono,
    marginTop: 2,
  },
  resetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  resetText: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  emptyBox: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    textAlign: 'center',
    lineHeight: 18,
  },
  stepsList: {
    maxHeight: 340,
  },
  stepCard: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepNumBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepNum: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    marginRight: 6,
  },
  stepName: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  toggleBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  toggleText: {
    fontSize: 9,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  stepDetails: {
    fontSize: 11,
    fontFamily: typography.fontFamilyMono,
    lineHeight: 15,
    marginBottom: 4,
  },
  stepFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  targetCol: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMono,
  },
  affectedText: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  summaryFooter: {
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 6,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 11,
    fontFamily: typography.fontFamilyMono,
  },
  consolidateBtn: {
    marginTop: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  consolidateBtnText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.5,
  },
});
