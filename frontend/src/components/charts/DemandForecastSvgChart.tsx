import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, {
  Path,
  Line,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { ForecastPoint } from '../../types/analytics.types';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/theme';

interface DemandForecastSvgChartProps {
  data: ForecastPoint[];
  historico?: ForecastPoint[];
  height?: number;
}

interface CombinedPoint extends ForecastPoint {
  isHistorical: boolean;
}

export const DemandForecastSvgChart: React.FC<DemandForecastSvgChartProps> = ({
  data,
  historico = [],
  height = 250,
}) => {
  const { colors, isDark } = useTheme();
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = Math.min(screenWidth - 48, 920);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const histClean = historico || [];
  const predClean = data || [];

  const combined: CombinedPoint[] = [
    ...histClean.map((h) => ({ ...h, isHistorical: true })),
    ...predClean.map((p) => ({ ...p, isHistorical: false })),
  ];

  if (combined.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={{ color: colors.textMuted }}>Sin datos de proyección disponibles</Text>
      </View>
    );
  }

  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 40;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;

  // Min / Max across both historical and predictions
  let minY = Infinity;
  let maxY = -Infinity;
  combined.forEach((d) => {
    if (d.limite_inferior_p10 < minY) minY = d.limite_inferior_p10;
    if (d.limite_superior_p90 > maxY) maxY = d.limite_superior_p90;
    if (d.prediccion < minY) minY = d.prediccion;
    if (d.prediccion > maxY) maxY = d.prediccion;
  });

  const yBuffer = (maxY - minY) * 0.1 || 10;
  const safeMinY = Math.max(0, Math.floor(minY - yBuffer));
  const safeMaxY = Math.ceil(maxY + yBuffer);
  const yRange = safeMaxY - safeMinY || 1;

  const totalPoints = combined.length;
  const getX = (index: number) => {
    if (totalPoints <= 1) return paddingLeft + innerWidth / 2;
    return paddingLeft + (index / (totalPoints - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    return paddingTop + innerHeight - ((val - safeMinY) / yRange) * innerHeight;
  };

  const histCount = histClean.length;

  // Path histórico (Línea esmeralda)
  let histPath = '';
  if (histCount > 0) {
    for (let i = 0; i < histCount; i++) {
      const x = getX(i);
      const y = getY(combined[i].prediccion);
      if (i === 0) histPath += `M ${x} ${y}`;
      else histPath += ` L ${x} ${y}`;
    }
  }

  // Path predicción (Línea cyan conectada desde el último punto histórico si existe)
  let predPath = '';
  if (predClean.length > 0) {
    const startIndex = histCount > 0 ? histCount - 1 : 0;
    for (let i = startIndex; i < totalPoints; i++) {
      const x = getX(i);
      const y = getY(combined[i].prediccion);
      if (i === startIndex) predPath += `M ${x} ${y}`;
      else predPath += ` L ${x} ${y}`;
    }
  }

  // Banda de incertidumbre [P10, P90] para la parte predictiva
  let areaPath = '';
  if (predClean.length > 0) {
    for (let i = histCount; i < totalPoints; i++) {
      const x = getX(i);
      const yP90 = getY(combined[i].limite_superior_p90);
      if (i === histCount) areaPath += `M ${x} ${yP90}`;
      else areaPath += ` L ${x} ${yP90}`;
    }
    for (let i = totalPoints - 1; i >= histCount; i--) {
      const x = getX(i);
      const yP10 = getY(combined[i].limite_inferior_p10);
      areaPath += ` L ${x} ${yP10}`;
    }
    areaPath += ' Z';
  }

  // Separador vertical "HOY"
  const sepX = histCount > 0 && predClean.length > 0
    ? (getX(histCount - 1) + getX(histCount)) / 2
    : null;

  // Punto seleccionado para tooltip (por defecto el primer punto predictivo)
  const defaultIdx = histCount < totalPoints ? histCount : totalPoints - 1;
  const activeIdx = selectedIndex !== null ? selectedIndex : defaultIdx;
  const selectedPoint = combined[activeIdx] || combined[combined.length - 1];

  // Cuadrícula horizontal
  const gridSteps = 4;
  const gridLines = Array.from({ length: gridSteps + 1 }).map((_, idx) => {
    const val = safeMinY + (yRange / gridSteps) * idx;
    const yPos = getY(val);
    return { val: Math.round(val), yPos };
  });

  return (
    <View style={styles.container}>
      {/* Tooltip Dinámico */}
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
            <Text style={[styles.tooltipLabel, { color: colors.textMuted }]}>
              {selectedPoint.isHistorical ? 'TIPO' : 'MODELO'}
            </Text>
            <Text
              style={[
                styles.tooltipValue,
                { color: selectedPoint.isHistorical ? colors.confidenceHigh : colors.accentPrimary },
              ]}
            >
              {selectedPoint.isHistorical ? 'HISTÓRICO REAL' : 'LIGHTGBM ML'}
            </Text>
          </View>

          <View style={styles.tooltipItem}>
            <Text style={[styles.tooltipLabel, { color: colors.textMuted }]}>FECHA</Text>
            <Text style={[styles.tooltipValue, { color: colors.textPrimary }]}>
              {selectedPoint.fecha}
            </Text>
          </View>

          <View style={styles.tooltipItem}>
            <Text
              style={[
                styles.tooltipLabel,
                { color: selectedPoint.isHistorical ? colors.confidenceHigh : colors.accentPrimary },
              ]}
            >
              {selectedPoint.isHistorical ? 'VENTA REGISTRADA' : 'DEMANDA ESPERADA'}
            </Text>
            <Text
              style={[
                styles.tooltipValue,
                { color: selectedPoint.isHistorical ? colors.confidenceHigh : colors.accentPrimary },
              ]}
            >
              {selectedPoint.prediccion.toFixed(0)} un.
            </Text>
          </View>

          {!selectedPoint.isHistorical && (
            <View style={styles.tooltipItem}>
              <Text style={[styles.tooltipLabel, { color: colors.confidenceHeuristic }]}>
                INTERVALO CONFORMAL (P10 - P90)
              </Text>
              <Text style={[styles.tooltipValue, { color: colors.textSecondary }]}>
                {selectedPoint.limite_inferior_p10.toFixed(0)} - {selectedPoint.limite_superior_p90.toFixed(0)} un.
              </Text>
            </View>
          )}
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

        {/* Líneas horizontales de cuadrícula */}
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
            <SvgText
              x={paddingLeft - 8}
              y={gl.yPos + 4}
              fill={colors.textMuted}
              fontSize={10}
              textAnchor="end"
              fontFamily={typography.fontFamilyMono}
            >
              {gl.val}
            </SvgText>
          </React.Fragment>
        ))}

        {/* Banda de incertidumbre */}
        {areaPath ? <Path d={areaPath} fill="url(#uncertaintyGradient)" /> : null}

        {/* Separador vertical "HOY" */}
        {sepX !== null && (
          <React.Fragment>
            <Line
              x1={sepX}
              y1={paddingTop - 10}
              x2={sepX}
              y2={paddingTop + innerHeight}
              stroke={colors.textMuted}
              strokeDasharray="3 3"
              strokeWidth={1.2}
            />
            <SvgText
              x={sepX}
              y={paddingTop - 12}
              fill={colors.textMuted}
              fontSize={9}
              textAnchor="middle"
              fontFamily={typography.fontFamilyMono}
              fontWeight="bold"
            >
              {'HOY ->'}
            </SvgText>
          </React.Fragment>
        )}

        {/* Línea histórica real (Esmeralda) */}
        {histPath ? (
          <Path
            d={histPath}
            fill="none"
            stroke={colors.confidenceHigh}
            strokeWidth={2.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {/* Línea de predicción (Cyan) */}
        {predPath ? (
          <Path
            d={predPath}
            fill="none"
            stroke={colors.chartPredictionLine}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {/* Puntos interactivos y scrubbing */}
        {combined.map((d, i) => {
          const cx = getX(i);
          const cy = getY(d.prediccion);
          const isSelected = activeIdx === i;
          const ptColor = d.isHistorical ? colors.confidenceHigh : colors.chartPredictionLine;

          return (
            <React.Fragment key={`pt-${i}`}>
              <Circle
                cx={cx}
                cy={cy}
                r={isSelected ? 6 : 3.5}
                fill={isSelected ? colors.textPrimary : ptColor}
                stroke={colors.surface}
                strokeWidth={2}
              />
              <Rect
                x={cx - innerWidth / (totalPoints * 2)}
                y={paddingTop}
                width={innerWidth / totalPoints}
                height={innerHeight}
                fill="transparent"
                onPress={() => setSelectedIndex(i)}
              />
            </React.Fragment>
          );
        })}
      </Svg>

      {/* Leyenda */}
      <View style={styles.legendContainer}>
        {histCount > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendIndicator, { backgroundColor: colors.confidenceHigh }]} />
            <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
              Ventas Reales ({histCount}d)
            </Text>
          </View>
        )}

        <View style={styles.legendItem}>
          <View style={[styles.legendIndicator, { backgroundColor: colors.chartPredictionLine }]} />
          <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
            Demanda Proyectada LightGBM
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendAreaIndicator, { backgroundColor: colors.accentPrimaryGlow }]} />
          <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
            Banda Incertidumbre [P10, P90]
          </Text>
        </View>
      </View>

      {/* Etiquetas X */}
      <View style={[styles.xAxisRow, { paddingLeft, paddingRight }]}>
        <Text style={[styles.xLegendText, { color: colors.textMuted }]}>
          {combined[0]?.fecha}
        </Text>
        {sepX !== null && (
          <Text style={[styles.xLegendText, { color: colors.accentPrimary, fontWeight: 'bold' }]}>
            {combined[histCount]?.fecha}
          </Text>
        )}
        <Text style={[styles.xLegendText, { color: colors.textMuted }]}>
          {combined[combined.length - 1]?.fecha}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
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
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.5,
    fontFamily: typography.fontFamilyMono,
  },
  tooltipValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyMono,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendIndicator: {
    width: 14,
    height: 3,
    borderRadius: 2,
    marginRight: 6,
  },
  legendAreaIndicator: {
    width: 14,
    height: 10,
    borderRadius: 2,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 11,
    fontFamily: typography.fontFamilyMono,
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  xLegendText: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMono,
  },
});
