export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceBorder: string;
  surfaceHighlight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentPrimary: string;
  accentPrimaryGlow: string;
  accentSecondary: string;
  confidenceHigh: string;      // Green ML LightGBM
  confidenceHighBg: string;
  confidenceHeuristic: string; // Amber EMA
  confidenceHeuristicBg: string;
  alertCritical: string;       // Red stock critical / reorder
  alertCriticalBg: string;
  alertWarning: string;
  alertWarningBg: string;
  gridLine: string;
  cardGlow: string;
  inputBackground: string;
  inputBorder: string;
  chartAreaBand: string;
  chartPredictionLine: string;
}

export const darkTheme: ThemeColors = {
  background: '#0B0F19',           // Obsidian deep industrial
  surface: '#111827',              // Slate charcoal
  surfaceSecondary: '#1F2937',     // Elevated card
  surfaceBorder: '#283548',        // Crisp border
  surfaceHighlight: '#1E293B',
  textPrimary: '#F9FAFB',          // Crisp white
  textSecondary: '#D1D5DB',        // High-contrast silver (WCAG AAA)
  textMuted: '#9CA3AF',
  accentPrimary: '#06B6D4',        // Electric Cyan
  accentPrimaryGlow: 'rgba(6, 182, 212, 0.25)',
  accentSecondary: '#3B82F6',      // Cobalt blue
  confidenceHigh: '#10B981',       // Emerald green
  confidenceHighBg: 'rgba(16, 185, 129, 0.15)',
  confidenceHeuristic: '#F59E0B',  // Tactical amber
  confidenceHeuristicBg: 'rgba(245, 158, 11, 0.15)',
  alertCritical: '#EF4444',        // Crimson red
  alertCriticalBg: 'rgba(239, 68, 68, 0.18)',
  alertWarning: '#F97316',
  alertWarningBg: 'rgba(249, 115, 22, 0.15)',
  gridLine: '#1E293B',
  cardGlow: 'rgba(6, 182, 212, 0.08)',
  inputBackground: '#0D131F',
  inputBorder: '#374151',
  chartAreaBand: 'rgba(6, 182, 212, 0.16)',
  chartPredictionLine: '#06B6D4',
};

export const lightTheme: ThemeColors = {
  background: '#F1F5F9',           // Crisp cool grey
  surface: '#FFFFFF',              // Pure white card
  surfaceSecondary: '#F8FAFC',     // Elevated soft card
  surfaceBorder: '#CBD5E1',        // Defined tactical border
  surfaceHighlight: '#E2E8F0',
  textPrimary: '#0F172A',          // Deep slate black (WCAG AAA)
  textSecondary: '#334155',        // High-contrast slate
  textMuted: '#64748B',
  accentPrimary: '#0284C7',        // Industrial Sky/Cyan
  accentPrimaryGlow: 'rgba(2, 132, 199, 0.20)',
  accentSecondary: '#2563EB',      // Blue
  confidenceHigh: '#059669',       // Deep emerald
  confidenceHighBg: 'rgba(5, 150, 105, 0.12)',
  confidenceHeuristic: '#D97706',  // Amber
  confidenceHeuristicBg: 'rgba(217, 119, 6, 0.12)',
  alertCritical: '#DC2626',        // Deep red
  alertCriticalBg: 'rgba(220, 38, 38, 0.12)',
  alertWarning: '#EA580C',
  alertWarningBg: 'rgba(234, 88, 12, 0.12)',
  gridLine: '#E2E8F0',
  cardGlow: 'rgba(2, 132, 199, 0.06)',
  inputBackground: '#F8FAFC',
  inputBorder: '#94A3B8',
  chartAreaBand: 'rgba(2, 132, 199, 0.18)',
  chartPredictionLine: '#0284C7',
};

export const typography = {
  fontFamilyMono: 'monospace',
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    metric: 34,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const touchTarget = {
  minWidth: 48,
  minHeight: 48,
};
