import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useConfigStore } from '../../store/useConfigStore';
import { useLicenseStore } from '../../store/useLicenseStore';
import { pingBackend } from '../../api/client';
import { typography } from '../../theme/theme';
import { MetricBadge } from './MetricBadge';
import { TactileButton } from './TactileButton';
import {
  IconSettings,
  IconSun,
  IconMoon,
  IconClose,
  IconDashboard,
  IconIngestion,
  IconLicense,
} from './SvgIcons';

export const AppHeader: React.FC = () => {
  const { colors, mode, toggleTheme } = useTheme();
  const {
    backendHost,
    backendPort,
    useMocks,
    isOnline,
    lastPingMs,
    onboardingStep,
    activeSection,
    setActiveSection,
    setBackendConfig,
    setUseMocks,
    resetDemoPipeline,
  } = useConfigStore();
  const { plan, isVerified, daysRemaining } = useLicenseStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [tempHost, setTempHost] = useState(backendHost);
  const [tempPort, setTempPort] = useState(backendPort.toString());
  const [pingStatus, setPingStatus] = useState<string | null>(null);
  const [pinging, setPinging] = useState(false);

  const handleResetDemo = async () => {
    try {
      await resetDemoPipeline();
    } catch {
      //
    }
  };

  const handleTestConnection = async () => {
    setPinging(true);
    setPingStatus('Probando conexión LAN...');
    const portNum = parseInt(tempPort, 10) || 8000;
    const result = await pingBackend(tempHost, portNum);
    setPingStatus(result.message);
    setPinging(false);
  };

  const handleSaveConfig = async () => {
    const portNum = parseInt(tempPort, 10) || 8000;
    await setBackendConfig(tempHost, portNum);
    setModalVisible(false);
  };

  const navigateToSection = (section: 'dashboard' | 'license' | 'ingestion') => {
    setActiveSection(section);
    setModalVisible(false);
  };

  return (
    <>
      <View
        style={[
          styles.headerContainer,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.surfaceBorder,
          },
        ]}
      >
        {/* Brand & Terminal ID */}
        <View style={styles.brandContainer}>
          <Text style={[styles.brandTitle, { color: colors.accentPrimary }]}>POSBUDDY</Text>
          <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
            DEMAND INTELLIGENCE
          </Text>
        </View>

        {/* Status Indicators & Actions */}
        <View style={styles.actionsContainer}>
          {/* License Badge */}
          {isVerified ? (
            <MetricBadge
              type={plan === 'pro' ? 'plan_pro' : 'plan_starter'}
              label={`${plan.toUpperCase()} • ${daysRemaining}d`}
              style={styles.pillMargin}
            />
          ) : (
            <MetricBadge
              type="alerta_reorden"
              label="SIN ACTIVAR"
              style={styles.pillMargin}
            />
          )}

          {/* Network / LAN status pill */}
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={[
              styles.networkPill,
              {
                backgroundColor: useMocks
                  ? colors.surfaceSecondary
                  : isOnline
                  ? colors.confidenceHighBg
                  : colors.alertCriticalBg,
                borderColor: useMocks
                  ? colors.surfaceBorder
                  : isOnline
                  ? colors.confidenceHigh
                  : colors.alertCritical,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: useMocks
                    ? colors.accentPrimary
                    : isOnline
                    ? colors.confidenceHigh
                    : colors.alertCritical,
                },
              ]}
            />
            <Text style={[styles.networkText, { color: colors.textPrimary }]}>
              {useMocks ? 'SIMULACIÓN' : isOnline ? `LAN ${lastPingMs}ms` : 'DESCONECTADO'}
            </Text>
          </TouchableOpacity>

          {/* Persistent Reset Demo Button */}
          <TouchableOpacity
            onPress={handleResetDemo}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Reiniciar flujo de demostración"
            style={[
              styles.themeButton,
              {
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                borderColor: 'rgba(239, 68, 68, 0.35)',
                marginRight: 8,
                flexDirection: 'row',
                alignItems: 'center',
              },
            ]}
          >
            <Text style={[styles.themeButtonText, { color: colors.alertCritical }]}>
              REINICIAR DEMO
            </Text>
          </TouchableOpacity>

          {/* Configuration Button */}
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Abrir panel de configuración"
            style={[
              styles.themeButton,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.surfaceBorder,
                marginRight: 8,
                flexDirection: 'row',
                alignItems: 'center',
              },
            ]}
          >
            <IconSettings size={15} color={colors.accentPrimary} />
            <Text style={[styles.themeButtonText, { color: colors.accentPrimary, marginLeft: 6 }]}>
              CONFIG
            </Text>
          </TouchableOpacity>

          {/* Theme Toggle (Dark / Light) */}
          <TouchableOpacity
            onPress={toggleTheme}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Cambiar a modo ${mode === 'dark' ? 'claro' : 'oscuro'}`}
            style={[
              styles.themeButton,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.surfaceBorder,
                flexDirection: 'row',
                alignItems: 'center',
              },
            ]}
          >
            {mode === 'dark' ? (
              <IconSun size={15} color={colors.accentPrimary} />
            ) : (
              <IconMoon size={15} color={colors.accentPrimary} />
            )}
            <Text style={[styles.themeButtonText, { color: colors.accentPrimary, marginLeft: 6 }]}>
              {mode === 'dark' ? 'CLARO' : 'OSCURO'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* LAN Configuration Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
            ]}
          >
            {/* Modal Header with Close Button X */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Configuración & Gestión POS
                </Text>
                <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                  Gestione los módulos del sistema y el Host/Puerto del backend FastAPI local.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                accessibilityLabel="Cerrar modal"
                accessibilityRole="button"
                style={[styles.closeModalBtn, { borderColor: colors.surfaceBorder }]}
              >
                <IconClose size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {onboardingStep === 'completed' && (
              <View style={styles.navSection}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                  MÓDULOS DE LA TERMINAL
                </Text>
                <TactileButton
                  title="Tablero Analítico (Principal)"
                  icon={<IconDashboard size={16} color={activeSection === 'dashboard' ? '#FFFFFF' : colors.textPrimary} />}
                  variant={activeSection === 'dashboard' ? 'primary' : 'outline'}
                  onPress={() => navigateToSection('dashboard')}
                  style={{ marginBottom: 8 }}
                />
                <TactileButton
                  title="Monitor de Ingesta & Auditoría"
                  icon={<IconIngestion size={16} color={activeSection === 'ingestion' ? '#FFFFFF' : colors.textPrimary} />}
                  variant={activeSection === 'ingestion' ? 'primary' : 'outline'}
                  onPress={() => navigateToSection('ingestion')}
                  style={{ marginBottom: 8 }}
                />
                <TactileButton
                  title="Gestión de Licencia & EULA"
                  icon={<IconLicense size={16} color={activeSection === 'license' ? '#FFFFFF' : colors.textPrimary} />}
                  variant={activeSection === 'license' ? 'primary' : 'outline'}
                  onPress={() => navigateToSection('license')}
                  style={{ marginBottom: 14 }}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>HOST / IP LOCAL</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.inputBorder,
                    color: colors.textPrimary,
                  },
                ]}
                value={tempHost}
                onChangeText={setTempHost}
                placeholder="http://localhost o http://192.168.1.X"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>PUERTO</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.inputBorder,
                    color: colors.textPrimary,
                  },
                ]}
                value={tempPort}
                onChangeText={setTempPort}
                keyboardType="numeric"
                placeholder="8000"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Toggle Mock vs Live */}
            <TouchableOpacity
              onPress={() => setUseMocks(!useMocks)}
              style={[
                styles.mockToggleRow,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.surfaceBorder,
                },
              ]}
            >
              <View>
                <Text style={[styles.mockToggleTitle, { color: colors.textPrimary }]}>
                  Modo Simulación Offline (Mocks)
                </Text>
                <Text style={[styles.mockToggleSubtitle, { color: colors.textMuted }]}>
                  Desactívelo para enviar peticiones al backend FastAPI real.
                </Text>
              </View>
              <Text
                style={[
                  styles.toggleStateText,
                  { color: useMocks ? colors.accentPrimary : colors.textMuted },
                ]}
              >
                {useMocks ? '[ACTIVO]' : '[INACTIVO]'}
              </Text>
            </TouchableOpacity>

            {pingStatus && (
              <Text style={[styles.pingStatusText, { color: colors.accentPrimary }]}>
                {pingStatus}
              </Text>
            )}

            <View style={styles.modalButtonsRow}>
              <TactileButton
                title="Probar Conexión LAN"
                variant="outline"
                loading={pinging}
                onPress={handleTestConnection}
                style={{ flex: 1, marginRight: 8 }}
              />
              <TactileButton
                title="Guardar"
                variant="primary"
                onPress={handleSaveConfig}
                style={{ flex: 1 }}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1.5,
  },
  brandContainer: {
    flexDirection: 'column',
  },
  brandTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.heavy,
    fontFamily: typography.fontFamilyMono,
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    letterSpacing: 0.8,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillMargin: {
    marginRight: 8,
  },
  networkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  networkText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  themeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeButtonText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyMono,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  closeModalBtn: {
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 12,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 4,
  },
  modalDescription: {
    fontSize: typography.fontSize.sm,
    marginBottom: 12,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1.2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamilyMono,
  },
  mockToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 12,
  },
  mockToggleTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  mockToggleSubtitle: {
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },
  toggleStateText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  pingStatusText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  navSection: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 12,
  },
});
