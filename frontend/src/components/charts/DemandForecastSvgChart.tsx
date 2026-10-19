import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Svg, {
  Path,
  Line,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Rect,
} from 'react-native-svg';
import { ForecastPoint } from '../../types/analytics.types';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/theme';

interface DemandForecastSvgChartProps {
  data: ForecastPoint[];
  height?: number;
}

export const DemandForecastSvgChart: React.FC<DemandForecastSvgChartProps> = ({
  data,
  height = 240,
}) => {
  const { colors, isDark } = useTheme();
  const screenWidth = Dimensions.get('window').width;
  // Responsive chart width
  const chartWidth = Math.min(screenWidth - 48, 860);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={{ color: colors.textMuted }}>Sin datos de proyección disponibles</Text>
      </View>
    );
  }

  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;

  // Compute min and max across all series
  let minY = Infinity;
  let maxY = -Infinity;
  data.forEach((d) => {
    if (d.limite_inferior_p10 < minY) minY = d.limite_inferior_p10;
    if (d.limite_superior_p90 > maxY) maxY = d.limite_superior_p90;
    if (d.prediccion < minY) minY = d.prediccion;
    if (d.prediccion > maxY) maxY = d.prediccion;
  });

  // Add 10% breathing room on Y axis
  const yBuffer = (maxY - minY) * 0.1 || 10;
  const safeMinY = Math.max(0, Math.floor(minY - yBuffer));
  const safeMaxY = Math.ceil(maxY + yBuffer);
  const yRange = safeMaxY - safeMinY || 1;

  const getX = (index: number) => {
    if (data.length <= 1) return paddingLeft + innerWidth / 2;
    return paddingLeft + (index / (data.length - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    return paddingTop + innerHeight - ((val - safeMinY) / yRange) * innerHeight;
  };

  // Build uncertainty band polygon (P10 to P90)
  // Forward along P90, backward along P10
  let areaPath = '';
  data.forEach((d, i) => {
    const x = getX(i);
    const yP90 = getY(d.limite_superior_p90);
    if (i === 0) {
      areaPath += `M ${x} ${yP90}`;
    } else {
      areaPath += ` L ${x} ${yP90}`;
    }
  });
  for (let i = data.length - 1; i >= 0; i--) {
    const x = getX(i);
    const yP10 = getY(data[i].limite_inferior_p10);
    areaPath += ` L ${x} ${yP10}`;
  }
  areaPath += ' Z';

  // Build prediction median line path
  let linePath = '';
  data.forEach((d, i) => {
    const x = getX(i);
    const y = getY(d.prediccion);
    if (i === 0) {
      linePath += `M ${x} ${y}`;
    } else {
      linePath += ` L ${x} ${y}`;
    }
  });

  const selectedPoint = selectedIndex !== null ? data[selectedIndex] : data[data.length - 1];

  // Grid steps (4 horizontal lines)
  const gridSteps = 4;
  const gridLines = Array.from({ length: gridSteps + 1 }).map((_, idx) => {
    const val = safeMinY + (yRange / gridSteps) * idx;
    const yPos = getY(val);
    return { val: Math.round(val), yPos };
  });

  return (
    <View style={styles.container}>
      {/* Dynamic Scrubber Tooltip */}
      {selectedPoint && (
        <View
          style={[
            styles.tooltipBar,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.surfaceBorder,
            },
          ]}
        >
          <View style={styles.tooltipItem}>
            <Text style={[styles.tooltipLabel, { color: colors.textMuted }]}>FECHA</Text>
            <Text style={[styles.tooltipValue, { color: colors.textPrimary }]}>
              {selectedPoint.fecha}
            </Text>
          </View>
          <View style={styles.tooltipItem}>
            <Text style={[styles.tooltipLabel, { color: colors.accentPrimary }]}>
              PROYECCIÓN (MEDIANA)
            </Text>
            <Text style={[styles.tooltipValue, { color: colors.accentPrimary }]}>
              {selectedPoint.prediccion.toFixed(0)} un.
            </Text>
          </View>
          <View style={styles.tooltipItem}>
            <Text style={[styles.tooltipLabel, { color: colors.confidenceHigh }]}>
              BANDA INCERTIDUMBRE (P10 - P90)
            </Text>
            <Text style={[styles.tooltipValue, { color: colors.textSecondary }]}>
              {selectedPoint.limite_inferior_p10.toFixed(0)} -{' '}
              {selectedPoint.limite_superior_p90.toFixed(0)} un.
            </Text>
          </View>
        </View>
      )}

      {/* SVG Canvas */}
      <Svg width={chartWidth} height={height}>
        <Defs>
          <LinearGradient id="uncertaintyGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.accentPrimary} stopOpacity={isDark ? 0.35 : 0.25} />
            <Stop offset="100%" stopColor={colors.accentPrimary} stopOpacity={isDark ? 0.08 : 0.05} />
          </LinearGradient>
        </Defs>

        {/* Horizontal grid lines and Y labels */}
        {gridLines.map((gl, i) => (
          <React.Fragment key={`grid-${i}`}>
            <Line
              x1={paddingLeft}
              y1={gl.yPos}
              x2={chartWidth - paddingRight}
              y2={gl.yPos}
              stroke={colors.gridLine}
              strokeDasharray="4 4"
              strokeWidth={1}
            />
          </React.Fragment>
        ))}

        {/* Shaded P10-P90 Uncertainty Area */}
        <Path d={areaPath} fill="url(#uncertaintyGradient)" />

        {/* Median Prediction Line */}
        <Path
          d={linePath}
          fill="none"
          stroke={colors.chartPredictionLine}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points & Interactive trigger targets */}
        {data.map((d, i) => {
          const cx = getX(i);
          const cy = getY(d.prediccion);
          const isSelected = selectedIndex === i;

          return (
            <React.Fragment key={`point-${i}`}>
              <Circle
                cx={cx}
                cy={cy}
                r={isSelected ? 6 : 3.5}
                fill={isSelected ? colors.textPrimary : colors.chartPredictionLine}
                stroke={colors.surface}
                strokeWidth={2}
              />
              {/* Invisible touchable bar for scrubbing */}
              <Rect
                x={cx - innerWidth / (data.length * 2)}
                y={paddingTop}
                width={innerWidth / data.length}
                height={innerHeight}
                fill="transparent"
                onPress={() => setSelectedIndex(i)}
              />
            </React.Fragment>
          );
        })}
      </Svg>

      {/* X Axis Legend */}
      <View style={[styles.xAxisRow, { paddingLeft, paddingRight }]}>
        <Text style={[styles.xLegendText, { color: colors.textMuted }]}>
          {data[0]?.fecha.slice(5)}
        </Text>
        <Text style={[styles.xLegendText, { color: colors.textMuted }]}>
          {data[Math.floor(data.length / 2)]?.fecha.slice(5)}
        </Text>
        <Text style={[styles.xLegendText, { color: colors.textMuted }]}>
          {data[data.length - 1]?.fecha.slice(5)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  tooltipItem: {
    marginRight: 12,
  },
  tooltipLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.5,
    fontFamily: typography.fontFamilyMono,
  },
  tooltipValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyMono,
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  xLegendText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
  },
});
