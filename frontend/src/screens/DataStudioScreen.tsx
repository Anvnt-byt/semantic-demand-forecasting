import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/theme';
import { useDataWranglerStore } from '../store/useDataWranglerStore';
import { ColumnProfiler } from '../components/studio/ColumnProfiler';
import { CleaningToolbar } from '../components/studio/CleaningToolbar';
import { RecipeHistoryPanel } from '../components/studio/RecipeHistoryPanel';
import { useToast } from '../context/ToastContext';

// Datos iniciales de retail para el Studio
const SAMPLE_VENTAS_DATA = [
  { id_venta: 'VTA-101', fecha: '2026-10-18', sku: 'SKU-CERV-01', descripcion: 'Cerveza Six-Pack 355ml', cantidad: 12, precio_unitario: 25.0, total: 300.0, vendedor: 'Carlos Mendez' },
  { id_venta: 'VTA-102', fecha: '2026-10-18', sku: 'SKU-LECHE-02', descripcion: 'Leche Entera 1L', cantidad: 4, precio_unitario: 18.5, total: 74.0, vendedor: 'Ana Martinez' },
  { id_venta: 'VTA-103', fecha: '2026-10-18', sku: 'SKU-COLA-03', descripcion: 'Refresco Cola 600ml', cantidad: 20, precio_unitario: 15.0, total: 300.0, vendedor: 'Carlos Mendez' },
  { id_venta: 'VTA-104', fecha: '2026-10-18', sku: 'SKU-BATT-04', descripcion: 'Baterias AA 4pk', cantidad: 2, precio_unitario: 45.0, total: 90.0, vendedor: 'Luis Rodriguez' },
  { id_venta: 'VTA-105', fecha: '2026-10-18', sku: 'SKU-PAN-05', descripcion: 'Pan Blanco Rebanado', cantidad: 6, precio_unitario: 22.0, total: 132.0, vendedor: 'Ana Martinez' },
  { id_venta: 'VTA-106', fecha: '2026-10-18', sku: 'SKU-CERV-01', descripcion: 'Cerveza Six-Pack 355ml', cantidad: 15, precio_unitario: 25.0, total: 375.0, vendedor: 'Carlos Mendez' },
  { id_venta: 'VTA-107', fecha: '2026-10-18', sku: 'SKU-ACEITE-06', descripcion: 'Aceite Vegetal 900ml', cantidad: 3, precio_unitario: 38.0, total: 114.0, vendedor: 'Luis Rodriguez' },
  { id_venta: 'VTA-108', fecha: '2026-10-18', sku: 'SKU-LECHE-02', descripcion: 'Leche Entera 1L', cantidad: null, precio_unitario: 18.5, total: null, vendedor: 'Ana Martinez' }, // Dato con nulo
  { id_venta: 'VTA-109', fecha: '2026-10-18', sku: 'SKU-OUTLIER', descripcion: 'Cargador USB Tipo C', cantidad: 120, precio_unitario: 150.0, total: 18000.0, vendedor: 'Carlos Mendez' }, // Outlier extremo
  { id_venta: 'VTA-110', fecha: '2026-10-18', sku: 'SKU-DETER-07', descripcion: '   Detergente Multiusos   ', cantidad: 5, precio_unitario: 32.5, total: 162.5, vendedor: 'Ana Martinez' }, // Cadenas con espacios
];

export const DataStudioScreen: React.FC = () => {
  const { colors } = useTheme();
  const { showToast } = useToast();
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

  const [activeTab, setActiveTab] = useState<'profile' | 'recipe'>('profile');

  useEffect(() => {
    if (activeDataset.length === 0) {
      loadDataset('Ventas_POS_Octubre', SAMPLE_VENTAS_DATA);
    }
  }, []);

  const handleConsolidate = () => {
    showToast(
      `Receta Consolidada: Se aplicaron ${recipe.length} transformaciones sobre ${activeDataset.length} registros.`,
      { type: 'success' }
    );
  };

  const currentProfile = selectedColumn ? columnProfiles[selectedColumn] || null : null;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Header del Studio */}
      <View style={styles.headerRow}>
        <View>
          <View style={styles.titleBadgeRow}>
            <Text style={[styles.mainTitle, { color: colors.textPrimary }]}>ESTACIÓN DE CURADURÍA DE DATOS</Text>
            <View style={[styles.proBadge, { backgroundColor: colors.accentPrimaryGlow }]}>
              <Text style={[styles.proBadgeText, { color: colors.accentPrimary }]}>AUDITORÍA & SANEAMIENTO</Text>
            </View>
          </View>
          <Text style={[styles.subTitle, { color: colors.textMuted }]}>
            Perfilado estadístico de atributos, tratamiento de anomalías IQR, imputación de nulos y transformaciones reproducibles.
          </Text>
        </View>

        <TouchableOpacity onPress={handleConsolidate} style={[styles.consolidateBtn, { backgroundColor: colors.confidenceHigh }]}>
          <Text style={styles.consolidateBtnText}>Consolidar y Aplicar Receta</Text>
        </TouchableOpacity>
      </View>

      {/* Selector de Dataset Activo */}
      <View style={[styles.datasetBar, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <Text style={[styles.datasetLabel, { color: colors.textMuted }]}>DATASET ACTIVO:</Text>
        <Text style={[styles.datasetName, { color: colors.accentPrimary }]}>[{datasetName}]</Text>
        <Text style={[styles.datasetMeta, { color: colors.textSecondary }]}>
          • {activeDataset.length} filas • {columns.length} atributos • {recipe.length} capas aplicadas
        </Text>
      </View>

      {/* Barra de Herramientas de Saneamiento */}
      <CleaningToolbar />

      {/* Panel Superior Dividido: Perfilador y Recetas */}
      <View style={styles.tabsHeader}>
        <TouchableOpacity
          onPress={() => setActiveTab('profile')}
          style={[
            styles.tabBtn,
            activeTab === 'profile' && { borderBottomColor: colors.accentPrimary, borderBottomWidth: 2 },
          ]}
        >
          <Text style={[styles.tabBtnText, { color: activeTab === 'profile' ? colors.accentPrimary : colors.textMuted }]}>
            Perfil Estadístico de Atributo ({selectedColumn || 'Ninguno'})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('recipe')}
          style={[
            styles.tabBtn,
            activeTab === 'recipe' && { borderBottomColor: colors.accentPrimary, borderBottomWidth: 2 },
          ]}
        >
          <Text style={[styles.tabBtnText, { color: activeTab === 'recipe' ? colors.accentPrimary : colors.textMuted }]}>
            Historial de Transformaciones ({recipe.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'profile' ? (
        <ColumnProfiler profile={currentProfile} />
      ) : (
        <RecipeHistoryPanel />
      )}

      {/* Grid de Datos Interactivo con Selección de Columna */}
      <View style={[styles.gridContainer, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <View style={styles.gridHeaderRow}>
          <Text style={[styles.gridTitle, { color: colors.textPrimary }]}>
            VISTA PREVIA TABULAR (TOCAR CABECERA PARA INSPECCIONAR ATRIBUTO)
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
                      {hasOutliers && <Text style={[styles.warningDot, { color: colors.alertWarning }]}> *</Text>}
                      {hasNulls && <Text style={[styles.dangerDot, { color: colors.alertCritical }]}> !</Text>}
                    </View>
                    {p && (
                      <Text style={[styles.thType, { color: colors.textMuted }]}>
                        {p.dataType.substring(0, 3).toUpperCase()}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Filas de datos */}
            <ScrollView style={styles.tableBodyScroll} nestedScrollEnabled>
              {activeDataset.slice(0, 50).map((row, rIdx) => (
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
                    const isNull = val === null || val === undefined;

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
                            { color: isNull ? colors.alertCritical : colors.textSecondary },
                            isNull && { fontStyle: 'italic', fontWeight: 'bold' },
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
    alignItems: 'center',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 10,
    flexWrap: 'wrap',
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
  tabsHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 10,
  },
  tabBtnText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
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
  thType: {
    fontSize: 9,
    fontFamily: typography.fontFamilyMono,
    marginTop: 2,
  },
  warningDot: {
    fontSize: 10,
  },
  dangerDot: {
    fontSize: 10,
  },
  tableBodyScroll: {
    maxHeight: 280,
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
});
