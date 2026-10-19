import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { ToastProvider } from './src/context/ToastContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useConfigStore } from './src/store/useConfigStore';
import { useLicenseStore } from './src/store/useLicenseStore';

const AppContent: React.FC = () => {
  const { isDark } = useTheme();
  const loadConfig = useConfigStore((state) => state.loadConfig);
  const loadLicense = useLicenseStore((state) => state.loadLicense);

  useEffect(() => {
    loadConfig();
    loadLicense();
  }, [loadConfig, loadLicense]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
