import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/theme';

export interface CategorySummary {
  categoria: string;
  pct_aporte: number;
  ventas_totales: number;
  margen_bruto_pct: number;
  total_skus: number;
}

const DEFAULT_CATEGORIES: CategorySummary[] = [
  { categoria: 'Bebidas y Refrescos', pct_aporte: 34.2, ventas_totales: 167400.0, margen_bruto_pct: 28.5, total_skus: 14 },
  { categoria: 'Lácteos y Refrigerados', pct_aporte: 24.8, ventas_totales: 121390.0, margen_bruto_pct: 22.0, total_skus: 18 },
  { categoria: 'Abarrotes y Despensa', pct_aporte: 19.5, ventas_totales: 95450.0, margen_bruto_pct: 31.2, total_skus: 26 },
  { categoria: 'Snacks y Confitería', pct_aporte: 12.3, ventas_totales: 60200.0, margen_bruto_pct: 38.0, total_skus: 12 },
  { categoria: 'Cuidado del Hogar', pct_aporte: 9.2, ventas_totales: 45060.5, margen_bruto_pct: 34.8, total_skus: 10 },
];

export const CategoryBreakdownTable: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {/* Encabezado */}
      <View style={[styles.headerRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.surfaceBorder }]}>
        <View style={styles.colCategory}>
          <Text style={[styles.headerText, { color: colors.textMuted }]}>DEPARTAMENTO / CATEGORÍA</Text>
        </View>
        <View style={styles.colShare}>
          <Text style={[styles.headerText, styles.textRight, { color: colors.textMuted }]}>PARTICIPACIÓN</Text>
        </View>
        <View style={styles.colRevenue}>
          <Text style={[styles.headerText, styles.textRight, { color: colors.textMuted }]}>FACTURACIÓN</Text>
        </View>
        <View style={styles.colMargin}>
          <Text style={[styles.headerText, styles.textRight, { color: colors.textMuted }]}>MARGEN</Text>
        </View>
        <View style={styles.colSkus}>
          <Text style={[styles.headerText, styles.textRight, { color: colors.textMuted }]}>SKUS</Text>
        </View>
      </View>

      {/* Filas */}
      {DEFAULT_CATEGORIES.map((item, idx) => (
        <View
          key={item.categoria}
          style={[
            styles.row,
            { borderBottomColor: colors.surfaceBorder },
            idx % 2 === 0 ? { backgroundColor: colors.surface } : { backgroundColor: colors.surfaceSecondary },
          ]}
        >
          <View style={styles.colCategory}>
            <Text style={[styles.categoryName, { color: colors.textPrimary }]}>{item.categoria}</Text>
          </View>
          <View style={styles.colShare}>
            <View style={styles.shareContainer}>
              <View style={[styles.shareTrack, { backgroundColor: colors.inputBackground }]}>
                <View style={[styles.shareBar, { width: `${item.pct_aporte}%`, backgroundColor: colors.accentPrimary }]} />
              </View>
              <Text style={[styles.shareText, { color: colors.accentPrimary }]}>{item.pct_aporte.toFixed(1)}%</Text>
            </View>
          </View>
          <View style={styles.colRevenue}>
            <Text style={[styles.dataText, styles.textRight, { color: colors.textPrimary }]}>
              ${item.ventas_totales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.colMargin}>
            <Text style={[styles.dataText, styles.textRight, { color: colors.confidenceHigh }]}>
              {item.margen_bruto_pct.toFixed(1)}%
            </Text>
          </View>
          <View style={styles.colSkus}>
            <Text style={[styles.dataText, styles.textRight, { color: colors.textMuted }]}>
              {item.total_skus}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  colCategory: {
    flex: 2.2,
  },
  colShare: {
    flex: 1.8,
  },
  colRevenue: {
    flex: 1.5,
  },
  colMargin: {
    flex: 1.1,
  },
  colSkus: {
    flex: 0.8,
  },
  headerText: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.5,
  },
  categoryName: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  shareContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  shareTrack: {
    width: 60,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 6,
  },
  shareBar: {
    height: '100%',
    borderRadius: 3,
  },
  shareText: {
    fontSize: 11,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    minWidth: 40,
    textAlign: 'right',
  },
  dataText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
  },
  textRight: {
    textAlign: 'right',
  },
});
