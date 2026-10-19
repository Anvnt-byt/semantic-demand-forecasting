import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme/ThemeContext';
import { useLicenseStore } from '../store/useLicenseStore';
import { SetupLicenseScreen } from '../screens/SetupLicenseScreen';
import { IngestionAuditScreen } from '../screens/IngestionAuditScreen';
import { AnalyticsDashboardScreen } from '../screens/AnalyticsDashboardScreen';
import { AppHeader } from '../components/common/AppHeader';
import { RootTabParamList } from './types';
import { typography, touchTarget } from '../theme/theme';

const Tab = createBottomTabNavigator<RootTabParamList>();

export const RootNavigator: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { isVerified } = useLicenseStore();

  return (
    <View style={[styles.rootContainer, { backgroundColor: colors.background }]}>
      <AppHeader />
      <Tab.Navigator
        initialRouteName={isVerified ? 'AnalyticsDashboard' : 'SetupLicense'}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accentPrimary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.surfaceBorder,
            borderTopWidth: 1.5,
            minHeight: touchTarget.minHeight + 12,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.bold,
            fontFamily: typography.fontFamilyMono,
            letterSpacing: 0.5,
          },
        }}
      >
        <Tab.Screen
          name="SetupLicense"
          component={SetupLicenseScreen}
          options={{
            tabBarLabel: '1. LICENCIA & EULA',
            tabBarIcon: () => null,
          }}
        />
        <Tab.Screen
          name="IngestionAudit"
          component={IngestionAuditScreen}
          options={{
            tabBarLabel: '2. INGESTA & AUDITORÍA',
            tabBarIcon: () => null,
          }}
        />
        <Tab.Screen
          name="AnalyticsDashboard"
          component={AnalyticsDashboardScreen}
          options={{
            tabBarLabel: '3. TABLERO ANALÍTICO',
            tabBarIcon: () => null,
          }}
        />
      </Tab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
});
