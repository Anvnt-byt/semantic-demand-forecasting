import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useConfigStore } from '../../store/useConfigStore';
import { useLicenseStore } from '../../store/useLicenseStore';
import { pingBackend } from '../../api/client';
import { typography } from '../../theme/theme';
import { MetricBadge } from './MetricBadge';
import { TactileButton } from './TactileButton';

export const AppHeader: React.FC = () => {
  const { colors, mode, toggleTheme } = useTheme();
  const { backendHost, backendPort, useMocks, isOnline, lastPingMs, setBackendConfig, setUseMocks } =
    useConfigStore();
  const { plan, isVerified, daysRemaining } = useLicenseStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [tempHost, setTempHost] = useState(backendHost);
  const [tempPort, setTempPort] = useState(backendPort.toString());
  const [pingStatus, setPingStatus] = useState<string | null>(null);
  const [pinging, setPinging] = useState(false);

  const handleTestConnection = async () => {
    setPinging(true);
    setPingStatus('Probando conexión LAN...');
    const result = await pingBackend();
    setPingStatus(result.message);
    setPinging(false);
  };

  const handleSaveConfig = async () => {
    const portNum = parseInt(tempPort, 10) || 8000;
    await setBackendConfig(tempHost, portNum);
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
              {useMocks ? 'SIMULACIÓN (MOCK)' : isOnline ? `LAN ${lastPingMs}ms` : 'DESCONECTADO'}
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
              },
            ]}
          >
            <Text style={[styles.themeButtonText, { color: colors.accentPrimary }]}>
              {mode === 'dark' ? '☀️ CLARO' : '🌙 OSCURO'}
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
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Configuración de Terminal LAN
            </Text>
            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
              Ajuste el Host y Puerto del backend FastAPI local que atiende en su red de terminales.
            </Text>

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
          </View>
        </View>
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
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 6,
  },
  modalDescription: {
    fontSize: typography.fontSize.sm,
    marginBottom: 16,
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
});
