import React from 'react';
import { View, Text, StyleSheet, DimensionValue } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/theme';
import { ColumnProfile } from '../../store/useDataWranglerStore';

interface ColumnProfilerProps {
  profile: ColumnProfile | null;
}

export const ColumnProfiler: React.FC<ColumnProfilerProps> = ({ profile }) => {
  const { colors } = useTheme();

  if (!profile) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surfaceSecondary, borderColor: colors.surfaceBorder }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Selecciona una columna de la tabla para ver su diagnóstico estadístico y perfil de calidad.
        </Text>
      </View>
    );
  }

  const validPct = profile.totalCount > 0 ? ((profile.validCount / profile.totalCount) * 100).toFixed(0) : '0';
  const nullPct = profile.totalCount > 0 ? ((profile.nullCount / profile.totalCount) * 100).toFixed(0) : '0';
  const outlierPct = profile.validCount > 0 ? ((profile.outlierCount / profile.validCount) * 100).toFixed(1) : '0';

  // Histograma SVG
  const maxHistCount = profile.histogram.length > 0 ? Math.max(...profile.histogram.map(h => h.count), 1) : 1;
  const histWidth = 260;
  const histHeight = 55;
  const barWidth = 38;

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceSecondary, borderColor: colors.surfaceBorder }]}>
      {/* Header de columna y tipo de dato */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Text style={[styles.columnName, { color: colors.textPrimary }]}>{profile.column}</Text>
          <View style={[styles.typeBadge, { backgroundColor: colors.surfaceHighlight }]}>
            <Text style={[styles.typeText, { color: colors.accentPrimary }]}>{profile.dataType.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={[styles.rowCount, { color: colors.textMuted }]}>
          {profile.totalCount.toLocaleString()} registros
        </Text>
      </View>

      {/* Barra de Calidad de Datos (Data Health Bar) */}
      <View style={styles.healthSection}>
        <View style={styles.healthLabelRow}>
          <Text style={[styles.healthLabel, { color: colors.textMuted }]}>SALUD DEL DATO:</Text>
          <Text style={[styles.healthSummary, { color: colors.textSecondary }]}>
            {validPct}% Válido • {nullPct}% Vacío • {outlierPct}% Atípico
          </Text>
        </View>
        <View style={[styles.healthBarTrack, { backgroundColor: colors.inputBackground }]}>
          <View style={[styles.healthBarSegment, { width: `${Math.max(0, Number(validPct) - Number(outlierPct))}%` as DimensionValue, backgroundColor: colors.confidenceHigh }]} />
          <View style={[styles.healthBarSegment, { width: `${outlierPct}%` as DimensionValue, backgroundColor: colors.alertWarning }]} />
          <View style={[styles.healthBarSegment, { width: `${nullPct}%` as DimensionValue, backgroundColor: colors.alertCritical }]} />
        </View>
      </View>

      {/* Estadísticas Descriptivas (Solo numéricas) */}
      {profile.dataType === 'numeric' && profile.mean !== null && (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>MEDIA (μ)</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{profile.mean}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>MEDIANA</Text>
            <Text style={[styles.statValue, { color: colors.accentPrimary }]}>{profile.median}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>DESV. (σ)</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{profile.std}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>IQR</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{profile.iqr}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>MÍN / MÁX</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{profile.min} .. {profile.max}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>OUTLIERS</Text>
            <Text style={[styles.statValue, { color: profile.outlierCount > 0 ? colors.alertCritical : colors.confidenceHigh }]}>
              {profile.outlierCount}
            </Text>
          </View>
        </View>
      )}

      {/* Mini Histograma de Distribución */}
      {profile.dataType === 'numeric' && profile.histogram.length > 0 && (
        <View style={styles.histSection}>
          <Text style={[styles.histTitle, { color: colors.textMuted }]}>DISTRIBUCIÓN DE FRECUENCIA:</Text>
          <Svg width={histWidth} height={histHeight} style={styles.histSvg}>
            <Line x1="0" y1={histHeight - 15} x2={histWidth} y2={histHeight - 15} stroke={colors.surfaceBorder} strokeWidth="1" />
            {profile.histogram.map((item, idx) => {
              const barH = (item.count / maxHistCount) * (histHeight - 20);
              const x = idx * (barWidth + 12) + 8;
              const y = histHeight - 15 - barH;
              return (
                <React.Fragment key={idx}>
                  <Rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(barH, 2)}
                    fill={colors.accentPrimary}
                    opacity={0.85}
                    rx={2}
                  />
                  <SvgText
                    x={x + barWidth / 2}
                    y={histHeight - 3}
                    fontSize="9"
                    fill={colors.textMuted}
                    textAnchor="middle"
                    fontFamily={typography.fontFamilyMono}
                  >
                    {item.bucket.split('-')[0]}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  emptyContainer: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  columnName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyMono,
    marginRight: 8,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyMono,
  },
  rowCount: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
  },
  healthSection: {
    marginBottom: 10,
  },
  healthLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  healthLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  healthSummary: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMono,
  },
  healthBarTrack: {
    height: 6,
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  healthBarSegment: {
    height: '100%',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 8,
  },
  statBox: {
    width: '16%',
    minWidth: 55,
  },
  statLabel: {
    fontSize: 9,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  statValue: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    marginTop: 2,
  },
  histSection: {
    marginTop: 4,
  },
  histTitle: {
    fontSize: 9,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 4,
  },
  histSvg: {
    alignSelf: 'center',
  },
});
