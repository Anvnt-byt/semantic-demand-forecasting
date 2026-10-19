import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SellerPerformance } from '../../types/analytics.types';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/theme';

interface SellersTableProps {
  data: SellerPerformance[];
}

export const SellersTable: React.FC<SellersTableProps> = ({ data }) => {
  const { colors } = useTheme();

  const renderHeader = () => (
    <View style={[styles.headerRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.surfaceBorder }]}>
      <View style={styles.colRank}>
        <Text style={[styles.headerText, styles.textCenter, { color: colors.textMuted }]}>POS</Text>
      </View>
      <View style={styles.colName}>
        <Text style={[styles.headerText, { color: colors.textMuted }]}>VENDEDOR</Text>
      </View>
      <View style={styles.colShare}>
        <Text style={[styles.headerText, styles.textRight, { color: colors.textMuted }]}>APORTE TIENDA</Text>
      </View>
      <View style={styles.colTickets}>
        <Text style={[styles.headerText, styles.textRight, { color: colors.textMuted }]}>TICKETS</Text>
      </View>
      <View style={styles.colAverage}>
        <Text style={[styles.headerText, styles.textRight, { color: colors.textMuted }]}>TICKET PROM.</Text>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: SellerPerformance }) => (
    <View style={[styles.row, { borderColor: colors.surfaceBorder }]}>
      <View style={styles.colRank}>
        <View
          style={[
            styles.rankBadge,
            {
              backgroundColor:
                item.posicion === 1
                  ? colors.confidenceHighBg
                  : item.posicion === 2
                  ? colors.accentPrimaryGlow
                  : colors.surfaceSecondary,
              borderColor:
                item.posicion === 1
                  ? colors.confidenceHigh
                  : item.posicion === 2
                  ? colors.accentPrimary
                  : colors.surfaceBorder,
            },
          ]}
        >
          <Text
            style={[
              styles.rankText,
              {
                color:
                  item.posicion === 1
                    ? colors.confidenceHigh
                    : item.posicion === 2
                    ? colors.accentPrimary
                    : colors.textSecondary,
              },
            ]}
          >
            #{item.posicion}
          </Text>
        </View>
      </View>

      <View style={styles.colName}>
        <Text style={[styles.sellerName, { color: colors.textPrimary }]}>{item.nombre}</Text>
        <Text style={[styles.sellerId, { color: colors.textMuted }]}>{item.vendedor_id}</Text>
      </View>

      <View style={styles.colShare}>
        <View style={styles.shareTextRow}>
          <Text style={[styles.shareValue, { color: colors.textPrimary }]}>
            {item.pct_aporte_tienda.toFixed(1)}%
          </Text>
        </View>
        <View style={[styles.progressBarTrack, { backgroundColor: colors.surfaceHighlight }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: colors.accentPrimary,
                width: `${Math.min(100, item.pct_aporte_tienda * 2.5)}%`,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.colTickets}>
        <Text style={[styles.numericValue, { color: colors.textPrimary }]}>
          {item.tickets_cerrados}
        </Text>
      </View>

      <View style={styles.colAverage}>
        <Text style={[styles.numericValue, { color: colors.confidenceHigh }]}>
          ${item.ticket_promedio.toFixed(2)}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.vendedor_id}
        ListHeaderComponent={renderHeader}
        renderItem={renderItem}
        scrollEnabled={false}
        initialNumToRender={5}
        windowSize={3}
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
  // Precise columns matching headers perfectly
  colRank: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colName: {
    flex: 2.2,
    justifyContent: 'center',
    paddingRight: 8,
  },
  colShare: {
    flex: 2.2,
    paddingRight: 14,
    justifyContent: 'center',
  },
  colTickets: {
    flex: 1.4,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 8,
  },
  colAverage: {
    flex: 1.6,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyMono,
  },
  sellerName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  sellerId: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
  },
  shareTextRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 3,
  },
  shareValue: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyMono,
  },
  progressBarTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  numericValue: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
});
