import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useConfigStore, DemoPipelineStep, AnalyticsSubTab } from '../store/useConfigStore';
import { SetupLicenseScreen } from '../screens/SetupLicenseScreen';
import { IngestionAuditScreen } from '../screens/IngestionAuditScreen';
import { DataStudioScreen } from '../screens/DataStudioScreen';
import { AnalyticsDashboardScreen } from '../screens/AnalyticsDashboardScreen';
import { InventoryAnalyticsScreen } from '../screens/InventoryAnalyticsScreen';
import { DemandForecastingScreen } from '../screens/DemandForecastingScreen';
import { ExportReportScreen } from '../screens/ExportReportScreen';
import { AppHeader } from '../components/common/AppHeader';
import {
  IconDashboard,
  IconLicense,
  IconIngestion,
  IconStudio,
  IconInventory,
  IconForecasting,
  IconFilePdf,
} from '../components/common/SvgIcons';
import { typography } from '../theme/theme';

interface PipelineStepDef {
  step: DemoPipelineStep;
  label: string;
  sublabel: string;
  icon: (color: string) => React.ReactNode;
}

export const RootNavigator: React.FC = () => {
  const { colors } = useTheme();
  const {
    pipelineStep,
    maxStepUnlocked,
    setPipelineStep,
    analyticsSubTab,
    setAnalyticsSubTab,
  } = useConfigStore();

  const pipelineSteps: PipelineStepDef[] = [
    {
      step: 1,
      label: 'Setup & EULA',
      sublabel: 'Licencia & Red',
      icon: (c) => <IconLicense size={15} color={c} />,
    },
    {
      step: 2,
      label: 'Ingesta POS',
      sublabel: 'Conexión & Lotes',
      icon: (c) => <IconIngestion size={15} color={c} />,
    },
    {
      step: 3,
      label: 'Preparación',
      sublabel: 'Calidad & Saneamiento',
      icon: (c) => <IconStudio size={15} color={c} />,
    },
    {
      step: 4,
      label: 'Inteligencia & ML',
      sublabel: 'Lorenz & LightGBM',
      icon: (c) => <IconForecasting size={15} color={c} />,
    },
    {
      step: 5,
      label: 'Exportación',
      sublabel: 'PDF & Power BI',
      icon: (c) => <IconFilePdf size={15} color={c} />,
    },
  ];

  const analyticsSubTabs: { id: AnalyticsSubTab; label: string; icon: (c: string) => React.ReactNode }[] = [
    {
      id: 'dashboard',
      label: 'Tablero General',
      icon: (c) => <IconDashboard size={14} color={c} />,
    },
    {
      id: 'inventory',
      label: 'Rotación & Lorenz ABC',
      icon: (c) => <IconInventory size={14} color={c} />,
    },
    {
      id: 'forecasting',
      label: 'Previsión LightGBM',
      icon: (c) => <IconForecasting size={14} color={c} />,
    },
  ];

  const isStepAccessible = (step: DemoPipelineStep) => {
    // Si ya se alcanzó la fase analítica (paso 4 o 5), todos los pasos están desbloqueados para preguntas del jurado
    if (maxStepUnlocked >= 4) return true;
    return step <= maxStepUnlocked;
  };

  const renderActiveScreen = () => {
    switch (pipelineStep) {
      case 1:
        return <SetupLicenseScreen onSuccess={() => setPipelineStep(2)} />;
      case 2:
        return (
          <IngestionAuditScreen
            onComplete={() => setPipelineStep(3)}
            onNavigateToStudio={() => setPipelineStep(3)}
          />
        );
      case 3:
        return <DataStudioScreen />;
      case 4:
        if (analyticsSubTab === 'inventory') return <InventoryAnalyticsScreen />;
        if (analyticsSubTab === 'forecasting') return <DemandForecastingScreen />;
        return <AnalyticsDashboardScreen />;
      case 5:
        return <ExportReportScreen />;
      default:
        return <AnalyticsDashboardScreen />;
    }
  };

  return (
    <View style={[styles.rootContainer, { backgroundColor: colors.background }]}>
      <AppHeader />

      {/* Guided Demonstration Pipeline Progress Bar */}
      <View
        style={[
          styles.pipelineBarContainer,
          { backgroundColor: colors.surface, borderBottomColor: colors.surfaceBorder },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pipelineBarContent}
        >
          {pipelineSteps.map((item, idx) => {
            const isActive = pipelineStep === item.step;
            const isAccessible = isStepAccessible(item.step);
            const isDone = item.step < pipelineStep;
            const stepColor = isActive
              ? colors.accentPrimary
              : isAccessible
              ? colors.textPrimary
              : colors.textMuted;

            return (
              <React.Fragment key={item.step}>
                <TouchableOpacity
                  onPress={() => isAccessible && setPipelineStep(item.step)}
                  disabled={!isAccessible}
                  style={[
                    styles.stepBtn,
                    isActive && {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.accentPrimary,
                    },
                    !isAccessible && { opacity: 0.45 },
                  ]}
                >
                  {/* Step Number or Check */}
                  <View
                    style={[
                      styles.stepBadge,
                      {
                        backgroundColor: isActive
                          ? colors.accentPrimary
                          : isDone
                          ? colors.confidenceHighBg
                          : colors.surfaceBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepBadgeText,
                        {
                          color: isActive
                            ? '#FFFFFF'
                            : isDone
                            ? colors.confidenceHigh
                            : colors.textMuted,
                        },
                      ]}
                    >
                      {item.step}
                    </Text>
                  </View>

                  <View style={styles.stepTextContainer}>
                    <Text style={[styles.stepLabel, { color: stepColor }]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.stepSublabel, { color: colors.textMuted }]}>
                      {item.sublabel}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Arrow separator */}
                {idx < pipelineSteps.length - 1 && (
                  <View style={styles.arrowContainer}>
                    <Text style={[styles.arrowText, { color: colors.textMuted }]}>{'->'}</Text>
                  </View>
                )}
              </React.Fragment>
            );
          })}
        </ScrollView>
      </View>

      {/* Secondary Sub-Tabs Ribbon for Step 4 (Inteligencia & ML) */}
      {pipelineStep === 4 && (
        <View
          style={[
            styles.subRibbonContainer,
            { backgroundColor: colors.surfaceSecondary, borderBottomColor: colors.surfaceBorder },
          ]}
        >
          <View style={styles.subRibbonContent}>
            <Text style={[styles.ribbonSectionTitle, { color: colors.textMuted }]}>
              VISTAS DE INTELIGENCIA:
            </Text>
            {analyticsSubTabs.map((tab) => {
              const isActive = analyticsSubTab === tab.id;
              const tabColor = isActive ? colors.accentPrimary : colors.textSecondary;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setAnalyticsSubTab(tab.id)}
                  style={[
                    styles.subRibbonBtn,
                    isActive && {
                      backgroundColor: colors.surface,
                      borderColor: colors.accentPrimary,
                    },
                  ]}
                >
                  {tab.icon(tabColor)}
                  <Text style={[styles.subRibbonText, { color: tabColor }]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Screen Wrapper */}
      <View style={styles.screenWrapper}>{renderActiveScreen()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  pipelineBarContainer: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  pipelineBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  stepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  stepBadgeText: {
    fontSize: 12,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.heavy,
  },
  stepTextContainer: {
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  stepSublabel: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMono,
  },
  arrowContainer: {
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 13,
  },
  subRibbonContainer: {
    borderBottomWidth: 1,
    paddingVertical: 6,
  },
  subRibbonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  ribbonSectionTitle: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.5,
    marginRight: 4,
  },
  subRibbonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  subRibbonText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    marginLeft: 6,
  },
  screenWrapper: {
    flex: 1,
  },
});
