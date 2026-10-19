import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useLicenseStore } from '../store/useLicenseStore';
import { useConfigStore } from '../store/useConfigStore';
import { verifyLicenseApi } from '../api/endpoints/licenseApi';
import { pingBackend } from '../api/client';
import { typography } from '../theme/theme';
import { TactileCard } from '../components/common/TactileCard';
import { TactileButton } from '../components/common/TactileButton';
import { MetricBadge } from '../components/common/MetricBadge';
import { ErrorBanner, BannerMessage } from '../components/common/ErrorBanner';

interface SetupLicenseScreenProps {
  onSuccess?: () => void;
}

export const SetupLicenseScreen: React.FC<SetupLicenseScreenProps> = ({ onSuccess }) => {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const {
    isVerified,
    licenseKey: storedKey,
    plan,
    daysRemaining,
    allowedModules,
    eulaAccepted,
    posIdentifier,
    posName,
    setLicense,
    setEulaAccepted,
    resetLicense,
  } = useLicenseStore();

  const { backendHost, backendPort, setBackendConfig, onboardingStep, setOnboardingStep } = useConfigStore();

  const [inputKey, setInputKey] = useState(storedKey || 'TC-PRO-DEMO-2027');
  const [inputPosId, setInputPosId] = useState(posIdentifier || 'POS-TERM-01');
  const [inputPosName, setInputPosName] = useState(posName || 'Caja Central Mostrador');
  const [host, setHost] = useState(backendHost);
  const [port, setPort] = useState(backendPort.toString());

  const [localEula, setLocalEula] = useState(eulaAccepted);
  const [loading, setLoading] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [banner, setBanner] = useState<BannerMessage | null>(null);

  const applyDemoKey = (key: string) => {
    setInputKey(key);
    showToast(`Clave demo cargada: ${key}. Presione "Verificar y Activar Licencia" para registrar.`, {
      type: 'info',
    });
  };

  const handleTestPing = async () => {
    setPinging(true);
    const p = parseInt(port, 10) || 8000;
    await setBackendConfig(host, p);
    const res = await pingBackend();
    if (res.ok) {
      showToast(`Conexión LAN exitosa con FastAPI (${res.latencyMs}ms)`, { type: 'success' });
    } else {
      showToast(`Sin respuesta en ${host}:${port}. Verifique el servicio o use modo Simulación (Mocks).`, {
        type: 'warning',
      });
    }
    setPinging(false);
  };

  const handleVerify = async () => {
    if (!localEula) {
      showToast('Debe aceptar el EULA y la política de solo lectura antes de continuar.', {
        type: 'error',
      });
      return;
    }

    if (!inputKey.trim()) {
      showToast('Por favor ingrese una clave de licencia válida.', { type: 'error' });
      return;
    }

    setLoading(true);
    setBanner(null);

    try {
      const p = parseInt(port, 10) || 8000;
      await setBackendConfig(host, p);

      const result = await verifyLicenseApi({
        license_key: inputKey.trim(),
        pos_identifier: inputPosId.trim(),
        pos_name: inputPosName.trim(),
      });

      if (result.valid) {
        await setEulaAccepted(true);
        await setLicense({
          licenseKey: result.license_key,
          plan: result.plan,
          daysRemaining: result.days_remaining,
          allowedModules: result.allowed_modules,
          posIdentifier: inputPosId.trim(),
          posName: inputPosName.trim(),
        });

        showToast(
          `Licencia ${result.plan.toUpperCase()} verificada con éxito. Avanzando a Ingesta...`,
          { type: 'success', durationMs: 4000 }
        );

        await setOnboardingStep('ingestion');

        if (onSuccess) {
          setTimeout(onSuccess, 800);
        }
      } else {
        showToast(result.message || 'Clave de licencia inválida o expirada.', { type: 'error' });
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string; isRateLimited?: boolean; retryAfterSeconds?: number };
      showToast(errorObj.message || 'Error al verificar la licencia.', {
        type: errorObj.isRateLimited ? 'warning' : 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        {onboardingStep !== 'completed' && (
          <View style={{ marginBottom: 8 }}>
            <MetricBadge
              type="plan_pro"
              label="PASO 1 DE 2: VALIDACIÓN LEGAL Y LICENCIA POS"
            />
          </View>
        )}
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Activación de Terminal POS & EULA
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Validación de licencia y configuración de entorno para procesamiento predictivo 100% en red local (LAN).
        </Text>
      </View>

      <ErrorBanner banner={banner} onDismiss={() => setBanner(null)} />

      {/* Current License Status Card if verified */}
      {isVerified && (
        <TactileCard highlight={true}>
          <View style={styles.statusRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                LICENCIA ACTIVA REGISTRADA
              </Text>
              <Text style={[styles.terminalLabel, { color: colors.textMuted }]}>
                Terminal: {posIdentifier} ({posName})
              </Text>
            </View>
            <MetricBadge
              type={plan === 'pro' ? 'plan_pro' : 'plan_starter'}
              label={`${plan.toUpperCase()} • ${daysRemaining} DÍAS`}
            />
          </View>
          <Text style={[styles.modulesList, { color: colors.textSecondary }]}>
            Módulos activos ({allowedModules.length}): {allowedModules.join(', ')}
          </Text>
          <TactileButton
            title="Desvincular Licencia / Cambiar Terminal"
            variant="outline"
            onPress={resetLicense}
            style={{ marginTop: 12 }}
          />
        </TactileCard>
      )}

      {/* Demo Keys Quick Picker */}
      <TactileCard>
        <Text style={[styles.sectionTitle, { color: colors.accentPrimary }]}>
          CLAVES DEMO RÁPIDAS PARA DESARROLLO
        </Text>
        <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
          Seleccione una clave preconfigurada para probar las capacidades completas o la restricción de módulos:
        </Text>
        <View style={styles.demoButtonsRow}>
          <TactileButton
            title="Plan Pro (8 Módulos)"
            variant="primary"
            onPress={() => applyDemoKey('TC-PRO-DEMO-2027')}
            style={styles.demoBtn}
          />
          <TactileButton
            title="Plan Starter (4 Módulos)"
            variant="secondary"
            onPress={() => applyDemoKey('TC-STARTER-DEMO-2027')}
            style={styles.demoBtn}
          />
        </View>
      </TactileCard>

      {/* License Credentials Form */}
      <TactileCard>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          CREDENCIALES DE LICENCIA
        </Text>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textMuted }]}>CLAVE DE LICENCIA (KEY)</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
                color: colors.textPrimary,
              },
            ]}
            value={inputKey}
            onChangeText={setInputKey}
            placeholder="TC-PRO-DEMO-2027"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.rowTwoCols}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.label, { color: colors.textMuted }]}>ID DE TERMINAL</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                  color: colors.textPrimary,
                },
              ]}
              value={inputPosId}
              onChangeText={setInputPosId}
              placeholder="POS-01"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1.5 }]}>
            <Text style={[styles.label, { color: colors.textMuted }]}>NOMBRE / CAJA</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                  color: colors.textPrimary,
                },
              ]}
              value={inputPosName}
              onChangeText={setInputPosName}
              placeholder="Caja Principal"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>
      </TactileCard>

      {/* Local LAN Connection Parameters */}
      <TactileCard>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          CONEXIÓN A BACKEND FASTAPI (RED LOCAL / LAN)
        </Text>

        <View style={styles.rowTwoCols}>
          <View style={[styles.formGroup, { flex: 2.5, marginRight: 8 }]}>
            <Text style={[styles.label, { color: colors.textMuted }]}>HOST O IP LOCAL</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                  color: colors.textPrimary,
                },
              ]}
              value={host}
              onChangeText={setHost}
              placeholder="http://localhost"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.textMuted }]}>PUERTO</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                  color: colors.textPrimary,
                },
              ]}
              value={port}
              onChangeText={setPort}
              keyboardType="numeric"
              placeholder="8000"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        <TactileButton
          title="Verificar Ping al Backend"
          variant="secondary"
          loading={pinging}
          onPress={handleTestPing}
          style={{ marginTop: 4 }}
        />
      </TactileCard>

      {/* Legal Acceptance / EULA */}
      <TactileCard>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          ACUERDO DE LICENCIA Y POLÍTICA DE PRIVACIDAD LOCAL (EULA)
        </Text>

        <View
          style={[
            styles.eulaBox,
            { backgroundColor: colors.surfaceSecondary, borderColor: colors.surfaceBorder },
          ]}
        >
          <Text style={[styles.eulaText, { color: colors.textSecondary }]}>
            1. <Text style={{ fontWeight: 'bold' }}>Procesamiento 100% Local:</Text> La aplicación y sus modelos de machine learning (LightGBM) ejecutan todo cálculo directamente en su red local. No se transmiten tickets, registros de venta ni identificadores a servidores cloud externos.
            {'\n\n'}
            2. <Text style={{ fontWeight: 'bold' }}>Política de Solo Lectura (SELECT Exclusivo):</Text> Toda conexión a bases de datos clientes (MySQL / PostgreSQL) se realiza estrictamente con permisos de lectura. La aplicación nunca ejecuta sentencias INSERT, UPDATE, DELETE o DROP en las tablas del sistema de facturación.
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setLocalEula(!localEula)}
          style={styles.checkboxRow}
          accessible={true}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: localEula }}
        >
          <View
            style={[
              styles.checkboxBox,
              {
                borderColor: localEula ? colors.accentPrimary : colors.surfaceBorder,
                backgroundColor: localEula ? colors.accentPrimary : colors.inputBackground,
              },
            ]}
          >
            {localEula && <Text style={styles.checkIcon}>✓</Text>}
          </View>
          <Text style={[styles.checkboxLabel, { color: colors.textPrimary }]}>
            He leído y acepto los términos del EULA, el procesamiento local y la política de solo lectura.
          </Text>
        </TouchableOpacity>
      </TactileCard>

      {/* Verification Submit Button */}
      <TactileButton
        title={isVerified ? 'Actualizar / Re-verificar Licencia' : 'Verificar y Activar Licencia'}
        variant="primary"
        loading={loading}
        onPress={handleVerify}
        style={styles.submitBtn}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 18,
    paddingBottom: 40,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.heavy,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyMono,
    letterSpacing: 1,
    marginBottom: 8,
  },
  terminalLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modulesList: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    marginTop: 8,
  },
  descriptionText: {
    fontSize: typography.fontSize.sm,
    marginBottom: 12,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  demoBtn: {
    flex: 1,
    minWidth: 160,
    marginRight: 8,
    marginBottom: 8,
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1.2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamilyMono,
  },
  rowTwoCols: {
    flexDirection: 'row',
  },
  eulaBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  eulaText: {
    fontSize: typography.fontSize.xs,
    lineHeight: 18,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkIcon: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  submitBtn: {
    marginVertical: 12,
  },
});
