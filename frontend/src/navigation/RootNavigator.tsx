import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useConfigStore } from '../store/useConfigStore';
import { SetupLicenseScreen } from '../screens/SetupLicenseScreen';
import { IngestionAuditScreen } from '../screens/IngestionAuditScreen';
import { AnalyticsDashboardScreen } from '../screens/AnalyticsDashboardScreen';
import { AppHeader } from '../components/common/AppHeader';
import { IconDashboard, IconLicense, IconIngestion } from '../components/common/SvgIcons';
import { typography } from '../theme/theme';

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

    // 2. Completed State: Analytics Dashboard is the primary screen,
    // with free instant navigation to License or Ingestion configuration
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

      {/* Navigation Bar between modules once onboarding is completed */}
      {onboardingStep === 'completed' && (
        <View
          style={[
            styles.subNavBar,
            { backgroundColor: colors.surface, borderBottomColor: colors.surfaceBorder },
          ]}
        >
          <TouchableOpacity
            onPress={() => setActiveSection('dashboard')}
            style={[
              styles.subNavBtn,
              activeSection === 'dashboard' && {
                borderBottomColor: colors.accentPrimary,
                borderBottomWidth: 2.5,
              },
            ]}
          >
            <IconDashboard
              size={15}
              color={activeSection === 'dashboard' ? colors.accentPrimary : colors.textMuted}
            />
            <Text
              style={[
                styles.subNavText,
                { color: activeSection === 'dashboard' ? colors.accentPrimary : colors.textMuted },
              ]}
            >
              Tablero Analítico
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveSection('license')}
            style={[
              styles.subNavBtn,
              activeSection === 'license' && {
                borderBottomColor: colors.accentPrimary,
                borderBottomWidth: 2.5,
              },
            ]}
          >
            <IconLicense
              size={15}
              color={activeSection === 'license' ? colors.accentPrimary : colors.textMuted}
            />
            <Text
              style={[
                styles.subNavText,
                { color: activeSection === 'license' ? colors.accentPrimary : colors.textMuted },
              ]}
            >
              Licencia & EULA
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveSection('ingestion')}
            style={[
              styles.subNavBtn,
              activeSection === 'ingestion' && {
                borderBottomColor: colors.accentPrimary,
                borderBottomWidth: 2.5,
              },
            ]}
          >
            <IconIngestion
              size={15}
              color={activeSection === 'ingestion' ? colors.accentPrimary : colors.textMuted}
            />
            <Text
              style={[
                styles.subNavText,
                { color: activeSection === 'ingestion' ? colors.accentPrimary : colors.textMuted },
              ]}
            >
              Ingesta & Auditoría
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.screenWrapper}>{renderActiveScreen()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  subNavBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  subNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
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
