import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useConfigStore } from '../store/useConfigStore';
import { SetupLicenseScreen } from '../screens/SetupLicenseScreen';
import { IngestionAuditScreen } from '../screens/IngestionAuditScreen';
import { AnalyticsDashboardScreen } from '../screens/AnalyticsDashboardScreen';
import { AppHeader } from '../components/common/AppHeader';

export const RootNavigator: React.FC = () => {
  const { colors } = useTheme();
  const { onboardingStep, setOnboardingStep, activeSection, setActiveSection } = useConfigStore();

  const renderActiveScreen = () => {
    // 1. Initial Step-by-Step Onboarding Guard
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

    // 2. Completed State: Analytics Dashboard is the primary screen
    if (activeSection === 'license') {
      return <SetupLicenseScreen onSuccess={() => setActiveSection('dashboard')} />;
    }

    if (activeSection === 'ingestion') {
      return <IngestionAuditScreen onComplete={() => setActiveSection('dashboard')} />;
    }

    return <AnalyticsDashboardScreen />;
  };

  return (
    <View style={[styles.rootContainer, { backgroundColor: colors.background }]}>
      <AppHeader />
      <View style={styles.screenWrapper}>{renderActiveScreen()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  screenWrapper: {
    flex: 1,
  },
});
