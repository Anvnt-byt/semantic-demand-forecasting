import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/theme';
import { TactileCard } from '../components/common/TactileCard';
import { ParetoTable } from '../components/tables/ParetoTable';
import { LorenzCurveChart } from '../components/charts/LorenzCurveChart';
import { getInventoryTurnoverApi } from '../api/endpoints/analyticsApi';
import { InventoryItemPareto } from '../types/analytics.types';
import { useConfigStore } from '../store/useConfigStore';

export const InventoryAnalyticsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { useMocks } = useConfigStore();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItemPareto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState<'ALL' | 'A' | 'B' | 'C' | 'REORDER' | 'DEAD'>('ALL');

  useEffect(() => {
    loadInventory();
  }, [useMocks]);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const res = await getInventoryTurnoverApi();
      setItems(res);
    } catch (err) {
      console.error('Error cargando rotación de inventario:', err);
    } finally {
      setLoading(false);
    }
  };

  const resumenAbc = {
    A: items.filter(i => i.clasificacion_abc === 'A').length,
    B: items.filter(i => i.clasificacion_abc === 'B').length,
    C: items.filter(i => i.clasificacion_abc === 'C').length,
  };

  const filteredProducts = items.filter(item => {
    // Filtro por texto
    const term = searchTerm.toLowerCase();
    const matchesSearch = item.sku.toLowerCase().includes(term) || item.nombre.toLowerCase().includes(term);
    if (!matchesSearch) return false;

    // Filtro por clase o alerta
    if (filterClass === 'A') return item.clasificacion_abc === 'A';
    if (filterClass === 'B') return item.clasificacion_abc === 'B';
    if (filterClass === 'C') return item.clasificacion_abc === 'C';
    if (filterClass === 'REORDER') return item.alerta_reorden || item.stock_actual <= item.stock_minimo;
    if (filterClass === 'DEAD') return item.es_stock_estancado || (item.dias_sin_venta || 0) > 10;
    return true;
  });

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Encabezado */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            INVENTARIO & CURVA DE LORENZ (PARETO ABC)
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Clasificación cuantitativa estricta con corrección de desplazamiento y alertas tempranas de reposición.
          </Text>
        </View>

        <TouchableOpacity onPress={loadInventory} style={[styles.refreshBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.refreshText, { color: colors.accentPrimary }]}>Actualizar Datos</Text>
        </TouchableOpacity>
      </View>

      {/* Resumen de Categorías ABC */}
      {items.length > 0 && (
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.summaryLabel, { color: colors.confidenceHigh }]}>CLASE A (80% FACTURACIÓN)</Text>
            <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>{resumenAbc.A} SKUs</Text>
            <Text style={[styles.summaryHelp, { color: colors.textMuted }]}>Artículos de mayor impacto en facturación</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.summaryLabel, { color: colors.accentPrimary }]}>CLASE B (15% FACTURACIÓN)</Text>
            <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>{resumenAbc.B} SKUs</Text>
            <Text style={[styles.summaryHelp, { color: colors.textMuted }]}>Artículos de rotación intermedia</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.summaryLabel, { color: colors.confidenceHeuristic }]}>CLASE C (5% FACTURACIÓN)</Text>
            <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>{resumenAbc.C} SKUs</Text>
            <Text style={[styles.summaryHelp, { color: colors.textMuted }]}>Artículos de baja rotación relativa</Text>
          </View>
        </View>
      )}

      {/* Visualización Cuantitativa: Curva de Lorenz Acumulada */}
      {items.length > 0 && (
        <TactileCard>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            CURVA DE LORENZ & COEFICIENTE DE GINI (CONCENTRACIÓN DE FACTURACIÓN)
          </Text>
          <Text style={[styles.cardHelp, { color: colors.textMuted }]}>
            Análisis econométrico de concentración del portafolio: % acumulado de catálogo vs. % acumulado de ingresos.
          </Text>
          <LorenzCurveChart items={items} />
        </TactileCard>
      )}

      {/* Buscador y Píldoras de Filtro */}
      <TactileCard>
        <View style={styles.filtersBar}>
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Buscar por SKU o descripción..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary }]}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
            {(['ALL', 'A', 'B', 'C', 'REORDER', 'DEAD'] as const).map(f => {
              const isActive = filterClass === f;
              const labels = {
                ALL: 'Todos los SKUs',
                A: 'Solo Clase A',
                B: 'Solo Clase B',
                C: 'Solo Clase C',
                REORDER: 'En Quiebre de Stock',
                DEAD: 'Sin Movimiento (>10d)',
              };

              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilterClass(f)}
                  style={[
                    styles.pillBtn,
                    { backgroundColor: isActive ? colors.accentPrimary : colors.surfaceSecondary, borderColor: colors.surfaceBorder },
                  ]}
                >
                  <Text style={[styles.pillText, { color: isActive ? '#FFFFFF' : colors.textSecondary }]}>
                    {labels[f]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accentPrimary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Calculando rotación y curva de Lorenz...</Text>
          </View>
        ) : (
          <ParetoTable data={filteredProducts} />
        )}
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
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.heavy,
    fontFamily: typography.fontFamilyMono,
  },
  subtitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    marginTop: 2,
  },
  cardTitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.6,
  },
  cardHelp: {
    fontSize: typography.fontSize.xs,
    marginTop: 2,
    marginBottom: 8,
  },
  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  refreshText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  summaryCard: {
    width: '32%',
    minWidth: 160,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 9,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  summaryVal: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.heavy,
    marginVertical: 4,
  },
  summaryHelp: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMono,
  },
  filtersBar: {
    marginBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    marginBottom: 10,
  },
  pillsScroll: {
    flexDirection: 'row',
  },
  pillBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 6,
  },
  pillText: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    marginTop: 8,
  },
});
