import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/theme';

export type BadgeType =
  | 'alta_ml'
  | 'fase_aprendizaje_heuristica'
  | 'alerta_reorden'
  | 'stock_estancado'
  | 'pareto_a'
  | 'pareto_b'
  | 'pareto_c'
  | 'plan_pro'
  | 'plan_starter'
  | 'custom';

interface MetricBadgeProps {
  type?: BadgeType;
  label?: string;
  style?: ViewStyle;
}

export const MetricBadge: React.FC<MetricBadgeProps> = ({ type = 'custom', label, style }) => {
  const { colors } = useTheme();

  const getBadgeConfig = () => {
    switch (type) {
      case 'alta_ml':
        return {
          text: label || 'ALTA CERTEZA (LightGBM ≥30d)',
          bg: colors.confidenceHighBg,
          color: colors.confidenceHigh,
          border: colors.confidenceHigh,
        };
      case 'fase_aprendizaje_heuristica':
        return {
          text: label || 'FASE HEURÍSTICA (EMA)',
          bg: colors.confidenceHeuristicBg,
          color: colors.confidenceHeuristic,
          border: colors.confidenceHeuristic,
        };
      case 'alerta_reorden':
        return {
          text: label || 'REORDEN CRÍTICO',
          bg: colors.alertCriticalBg,
          color: colors.alertCritical,
          border: colors.alertCritical,
        };
      case 'stock_estancado':
        return {
          text: label || 'STOCK ESTANCADO',
          bg: colors.alertWarningBg,
          color: colors.alertWarning,
          border: colors.alertWarning,
        };
      case 'pareto_a':
        return {
          text: label || 'CLASE A (80%)',
          bg: colors.confidenceHighBg,
          color: colors.confidenceHigh,
          border: colors.confidenceHigh,
        };
      case 'pareto_b':
        return {
          text: label || 'CLASE B (15%)',
          bg: colors.accentPrimaryGlow,
          color: colors.accentPrimary,
          border: colors.accentPrimary,
        };
      case 'pareto_c':
        return {
          text: label || 'CLASE C (5%)',
          bg: 'rgba(156, 163, 175, 0.15)',
          color: colors.textMuted,
          border: colors.textMuted,
        };
      case 'plan_pro':
        return {
          text: label || 'PLAN PRO (8 MÓDULOS)',
          bg: colors.accentPrimaryGlow,
          color: colors.accentPrimary,
          border: colors.accentPrimary,
        };
      case 'plan_starter':
        return {
          text: label || 'PLAN STARTER (4 MÓDULOS)',
          bg: 'rgba(156, 163, 175, 0.15)',
          color: colors.textSecondary,
          border: colors.surfaceBorder,
        };
      default:
        return {
          text: label || '',
          bg: colors.surfaceSecondary,
          color: colors.textSecondary,
          border: colors.surfaceBorder,
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color: config.color }]}>{config.text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.5,
    fontFamily: typography.fontFamilyMono,
  },
});
