import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/theme';
import { TactileCard } from '../components/common/TactileCard';
import { ParetoTable } from '../components/tables/ParetoTable';
import { InfoTooltip } from '../components/common/InfoTooltip';
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
            SALUD DE INVENTARIO Y PRODUCTOS MÁS VENDIDOS
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Identifica cuáles productos generan el dinero del negocio (Regla 80/20) y cuáles están en riesgo de agotarse.
          </Text>
        </View>

        <TouchableOpacity onPress={loadInventory} style={[styles.refreshBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.refreshText, { color: colors.accentPrimary }]}>Actualizar Datos</Text>
        </TouchableOpacity>
      </View>

      {/* Resumen de Categorías ABC - Grandes y Visibles */}
      {items.length > 0 && (
        <View style={{ marginBottom: 14 }}>
          {/* Banner de Clarificación Gerencial */}
          <View style={{ backgroundColor: 'rgba(56, 189, 248, 0.08)', borderWidth: 1, borderColor: colors.accentPrimary, padding: 12, borderRadius: 8, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ fontSize: typography.fontSize.xs, fontWeight: 'bold', color: colors.accentPrimary }}>
                GUÍA RÁPIDA: ¿CÓMO INTERPRETAR LA CLASIFICACIÓN A, B Y C?
              </Text>
              <InfoTooltip
                technicalTitle="Fundamento Econométrico ABC"
                technicalDescription="Metodología Pareto (80-15-5): Ordena el universo de artículos de mayor a menor contribución a los ingresos brutos. Permite concentrar el esfuerzo de inventario donde reside el valor comercial real."
              />
            </View>
            <Text style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary, lineHeight: 18 }}>
              La letra mide el <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>VOLUMEN DE VENTAS</Text>, no si tienes mucho o poco stock. Un producto <Text style={{ fontWeight: 'bold', color: colors.confidenceHigh }}>Clase A</Text> con pocas existencias es una <Text style={{ fontWeight: 'bold', color: colors.alertCritical }}>alerta roja</Text>: significa que tu artículo más vendido está a punto de agotarse.
            </Text>
          </View>

          {/* Tarjetas Grandes y Pedagógicas */}
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.confidenceHigh, borderWidth: 1.5 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.summaryLabel, { color: colors.confidenceHigh, fontSize: 11 }]}>CLASE A • PRODUCTOS ESTRELLA</Text>
                <InfoTooltip
                  technicalTitle="Clase A: Vitales"
                  technicalDescription="Acumula el 80% del valor total facturado. Requiere política estricta de stock de seguridad, revisión semanal y resurtido prioritario."
                />
              </View>
              <Text style={[styles.summaryVal, { color: colors.confidenceHigh, fontSize: typography.fontSize.xxl }]}>{resumenAbc.A} Artículos</Text>
              <Text style={[styles.summaryHelp, { color: colors.textPrimary, fontWeight: '600', marginBottom: 4 }]}>
                Aportan el 80% de tus ingresos
              </Text>
              <Text style={{ fontSize: 10, color: colors.textSecondary, lineHeight: 14 }}>
                Son los productos clave de tu tienda. Si te quedas sin ellos, pierdes clientes y ventas al instante.
              </Text>
            </View>

            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.accentPrimary, borderWidth: 1.5 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.summaryLabel, { color: colors.accentPrimary, fontSize: 11 }]}>CLASE B • VARIEDAD CONSTANTE</Text>
                <InfoTooltip
                  technicalTitle="Clase B: Intermedios"
                  technicalDescription="Acumula entre el 80% y 95% de la facturación. Demanda estable pero moderada. Se controla con pedidos estándar por lote."
                />
              </View>
              <Text style={[styles.summaryVal, { color: colors.accentPrimary, fontSize: typography.fontSize.xxl }]}>{resumenAbc.B} Artículos</Text>
              <Text style={[styles.summaryHelp, { color: colors.textPrimary, fontWeight: '600', marginBottom: 4 }]}>
                Aportan el 15% de tus ingresos
              </Text>
              <Text style={{ fontSize: 10, color: colors.textSecondary, lineHeight: 14 }}>
                Productos de venta intermedia que complementan la canasta de compra. Mantener existencias equilibradas.
              </Text>
            </View>

            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.confidenceHeuristic, borderWidth: 1.5 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.summaryLabel, { color: colors.confidenceHeuristic, fontSize: 11 }]}>CLASE C • OCASIONALES O RELLENO</Text>
                <InfoTooltip
                  technicalTitle="Clase C: Cola Larga (Long-Tail)"
                  technicalDescription="Acumula solo el 5% restante del flujo de caja. Alto riesgo de capital inmovilizado. Se recomienda compra bajo pedido (JIT) y lotes mínimos."
                />
              </View>
              <Text style={[styles.summaryVal, { color: colors.confidenceHeuristic, fontSize: typography.fontSize.xxl }]}>{resumenAbc.C} Artículos</Text>
              <Text style={[styles.summaryHelp, { color: colors.textPrimary, fontWeight: '600', marginBottom: 4 }]}>
                Aportan solo el 5% de tus ingresos
              </Text>
              <Text style={{ fontSize: 10, color: colors.textSecondary, lineHeight: 14 }}>
                Artículos de rotación baja. Cuidado con comprar de más para no congelar dinero innecesariamente en bodega.
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Visualización Cuantitativa: Curva de Lorenz Acumulada */}
      {items.length > 0 && (
        <TactileCard>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            GRÁFICA DE CONCENTRACIÓN DE VENTAS (REGLA 80/20)
          </Text>
          <Text style={[styles.cardHelp, { color: colors.textMuted }]}>
            Ilustra visualmente qué porcentaje de tus artículos concentra la mayor parte del dinero que ingresa a caja.
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
