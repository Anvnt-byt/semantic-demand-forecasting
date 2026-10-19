import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useConfigStore, ActiveSection } from '../store/useConfigStore';
import { SetupLicenseScreen } from '../screens/SetupLicenseScreen';
import { IngestionAuditScreen } from '../screens/IngestionAuditScreen';
import { AnalyticsDashboardScreen } from '../screens/AnalyticsDashboardScreen';
import { DataStudioScreen } from '../screens/DataStudioScreen';
import { InventoryAnalyticsScreen } from '../screens/InventoryAnalyticsScreen';
import { DemandForecastingScreen } from '../screens/DemandForecastingScreen';
import { AppHeader } from '../components/common/AppHeader';
import {
  IconDashboard,
  IconLicense,
  IconIngestion,
  IconStudio,
  IconInventory,
  IconForecasting,
} from '../components/common/SvgIcons';
import { typography } from '../theme/theme';

interface NavTabItem {
  id: ActiveSection;
  label: string;
  icon: (color: string) => React.ReactNode;
}

export const RootNavigator: React.FC = () => {
  const { colors } = useTheme();
  const { onboardingStep, setOnboardingStep, activeSection, setActiveSection } = useConfigStore();

  const navItems: NavTabItem[] = [
    {
      id: 'dashboard',
      label: 'Tablero Analítico',
      icon: (c) => <IconDashboard size={15} color={c} />,
    },
    {
      id: 'studio',
      label: 'Data Studio (Wrangler)',
      icon: (c) => <IconStudio size={15} color={c} />,
    },
    {
      id: 'inventory',
      label: 'Inventario & ABC',
      icon: (c) => <IconInventory size={15} color={c} />,
    },
    {
      id: 'forecasting',
      label: 'Predicción Demanda ML',
      icon: (c) => <IconForecasting size={15} color={c} />,
    },
    {
      id: 'ingestion',
      label: 'Ingesta & Auditoría',
      icon: (c) => <IconIngestion size={15} color={c} />,
    },
    {
      id: 'license',
      label: 'Licencia & EULA',
      icon: (c) => <IconLicense size={15} color={c} />,
    },
  ];

  const renderActiveScreen = () => {
    // Initial Step-by-Step Onboarding Guard if not yet completed
    if (onboardingStep === 'license') {
      return (
        <SetupLicenseScreen
          onSuccess={() => {
            setOnboardingStep('ingestion');
          }}
        />
      );
    }

    if (onboardingStep === 'ingestion') {
      return (
        <IngestionAuditScreen
          onComplete={() => {
            setOnboardingStep('completed');
            setActiveSection('dashboard');
          }}
        />
      );
    }

    // Fully unlocked modular screens
    switch (activeSection) {
      case 'studio':
        return <DataStudioScreen />;
      case 'inventory':
        return <InventoryAnalyticsScreen />;
      case 'forecasting':
        return <DemandForecastingScreen />;
      case 'ingestion':
        return <IngestionAuditScreen onComplete={() => setActiveSection('dashboard')} />;
      case 'license':
        return <SetupLicenseScreen onSuccess={() => setActiveSection('dashboard')} />;
      case 'dashboard':
      default:
        return <AnalyticsDashboardScreen />;
    }
  };

  return (
    <View style={[styles.rootContainer, { backgroundColor: colors.background }]}>
      <AppHeader />

      {/* Modular Navigation Bar */}
      <View
        style={[
          styles.subNavBarContainer,
          { backgroundColor: colors.surface, borderBottomColor: colors.surfaceBorder },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subNavBarContent}
        >
          {navItems.map((tab) => {
            const isActive = activeSection === tab.id;
            const tabColor = isActive ? colors.accentPrimary : colors.textMuted;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveSection(tab.id)}
                style={[
                  styles.subNavBtn,
                  isActive && {
                    borderBottomColor: colors.accentPrimary,
                    borderBottomWidth: 2.5,
                  },
                ]}
              >
                {tab.icon(tabColor)}
                <Text style={[styles.subNavText, { color: tabColor }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.screenWrapper}>{renderActiveScreen()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  subNavBarContainer: {
    borderBottomWidth: 1,
  },
  subNavBarContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  subNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 6,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  subNavText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyMono,
    marginLeft: 8,
  },
  screenWrapper: {
    flex: 1,
  },
});
