import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { InventoryItemPareto } from '../../types/analytics.types';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/theme';
import { MetricBadge } from '../common/MetricBadge';

interface ParetoTableProps {
  data: InventoryItemPareto[];
}

export const ParetoTable: React.FC<ParetoTableProps> = ({ data }) => {
  const { colors } = useTheme();

  const renderHeader = () => (
    <View style={[styles.headerRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.surfaceBorder }]}>
      <View style={styles.colSku}>
        <Text style={[styles.headerText, { color: colors.textMuted }]}>SKU / PRODUCTO</Text>
      </View>
      <View style={styles.colClass}>
        <Text style={[styles.headerText, styles.textCenter, { color: colors.textMuted }]}>ABC</Text>
      </View>
      <View style={styles.colMetric}>
        <Text style={[styles.headerText, styles.textRight, { color: colors.textMuted }]}>% APORTE</Text>
      </View>
      <View style={styles.colStock}>
        <Text style={[styles.headerText, styles.textRight, { color: colors.textMuted }]}>STOCK</Text>
      </View>
      <View style={styles.colAlerts}>
        <Text style={[styles.headerText, styles.textRight, { color: colors.textMuted }]}>ESTADO</Text>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: InventoryItemPareto }) => (
    <View style={[styles.row, { borderColor: colors.surfaceBorder }]}>
      <View style={styles.colSku}>
        <Text style={[styles.skuCode, { color: colors.accentPrimary }]}>{item.sku}</Text>
        <Text style={[styles.productName, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.nombre}
        </Text>
      </View>

      <View style={styles.colClass}>
        <MetricBadge
          type={item.clasificacion_abc === 'A' ? 'pareto_a' : item.clasificacion_abc === 'B' ? 'pareto_b' : 'pareto_c'}
          label={item.clasificacion_abc}
        />
      </View>

      <View style={styles.colMetric}>
        <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
          {item.pct_contribucion.toFixed(1)}%
        </Text>
        <Text style={[styles.subMetric, { color: colors.textMuted }]}>
          Acum: {item.pct_acumulado.toFixed(1)}%
        </Text>
      </View>

      <View style={styles.colStock}>
        <Text
          style={[
            styles.metricValue,
            { color: item.alerta_reorden ? colors.alertCritical : colors.textPrimary },
          ]}
        >
          {item.stock_actual} / {item.stock_minimo}
        </Text>
        <Text style={[styles.subMetric, { color: colors.textMuted }]}>
          {item.dias_sin_venta}d s/venta
        </Text>
      </View>

      <View style={styles.colAlerts}>
        {item.alerta_reorden && (
          <MetricBadge type="alerta_reorden" label="REORDEN" />
        )}
        {item.es_stock_estancado && (
          <MetricBadge type="stock_estancado" label="ESTANCADO" />
        )}
        {!item.alerta_reorden && !item.es_stock_estancado && (
          <Text style={[styles.normalStatus, { color: colors.confidenceHigh }]}>Óptimo</Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.sku}
        ListHeaderComponent={renderHeader}
        renderItem={renderItem}
        scrollEnabled={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
    alignItems: 'center',
  },
  headerText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyMono,
    letterSpacing: 0.5,
  },
  textCenter: {
    textAlign: 'center',
    width: '100%',
  },
  textRight: {
    textAlign: 'right',
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  // Precise column sizing preventing any crowding or overlap
  colSku: {
    flex: 2.8,
    paddingRight: 8,
  },
  colClass: {
    flex: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colMetric: {
    flex: 1.5,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 8,
  },
  colStock: {
    flex: 1.8,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 16,
  },
  colAlerts: {
    flex: 1.8,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  skuCode: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  productName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  metricValue: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  subMetric: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
  },
  normalStatus: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.semibold,
  },
});
