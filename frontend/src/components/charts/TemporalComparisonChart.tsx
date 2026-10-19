import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import { TemporalDataPoint } from '../../types/analytics.types';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/theme';

interface TemporalComparisonChartProps {
  data: TemporalDataPoint[];
  height?: number;
}

export const TemporalComparisonChart: React.FC<TemporalComparisonChartProps> = ({
  data,
  height = 180,
}) => {
  const { colors } = useTheme();
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = Math.min(screenWidth - 56, 840);

  if (!data || data.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={{ color: colors.textMuted }}>Sin datos comparativos</Text>
      </View>
    );
  }

  const paddingLeft = 30;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 30;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;

  let maxVal = 0;
  data.forEach((d) => {
    if (d.actual > maxVal) maxVal = d.actual;
    if (d.anterior > maxVal) maxVal = d.anterior;
  });
  maxVal = maxVal * 1.15 || 100;

  const barGroupWidth = innerWidth / data.length;
  const singleBarWidth = Math.max(6, Math.min(22, (barGroupWidth - 12) / 2));

  return (
    <View style={styles.container}>
      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendIndicator, { backgroundColor: colors.accentPrimary }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Período Actual</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendIndicator, { backgroundColor: colors.textMuted }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Período Anterior</Text>
        </View>
      </View>

      <Svg width={chartWidth} height={height}>
        {/* Baseline */}
        <Line
          x1={paddingLeft}
          y1={paddingTop + innerHeight}
          x2={chartWidth - paddingRight}
          y2={paddingTop + innerHeight}
          stroke={colors.gridLine}
          strokeWidth={1}
        />

        {data.map((d, i) => {
          const groupX = paddingLeft + i * barGroupWidth + (barGroupWidth - singleBarWidth * 2 - 4) / 2;
          const actualHeight = (d.actual / maxVal) * innerHeight;
          const anteriorHeight = (d.anterior / maxVal) * innerHeight;

          const yActual = paddingTop + innerHeight - actualHeight;
          const yAnterior = paddingTop + innerHeight - anteriorHeight;

          return (
            <React.Fragment key={`bar-group-${i}`}>
              {/* Anterior Bar */}
              <Rect
                x={groupX}
                y={yAnterior}
                width={singleBarWidth}
                height={anteriorHeight}
                rx={3}
                fill={colors.textMuted}
                opacity={0.4}
              />
              {/* Actual Bar */}
              <Rect
                x={groupX + singleBarWidth + 4}
                y={yActual}
                width={singleBarWidth}
                height={actualHeight}
                rx={3}
                fill={colors.accentPrimary}
              />
            </React.Fragment>
          );
        })}
      </Svg>

      {/* X Labels */}
      <View style={[styles.xLabelsRow, { paddingLeft, paddingRight }]}>
        {data.map((d, i) => (
          <View key={`lbl-${i}`} style={{ width: barGroupWidth, alignItems: 'center' }}>
            <Text style={[styles.label, { color: colors.textMuted }]}>{d.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 14,
  },
  legendIndicator: {
    width: 10,
    height: 10,
    borderRadius: 2,
    marginRight: 6,
  },
  legendText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
  },
  xLabelsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  label: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
  },
});
