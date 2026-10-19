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
import { IconCheck } from '../components/common/SvgIcons';

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

  const {
    backendHost,
    backendPort,
    setBackendConfig,
    onboardingStep,
    setOnboardingStep,
    setPipelineStep,
  } = useConfigStore();

  const [inputKey, setInputKey] = useState(storedKey || 'POS-PRO-DEMO-2027');
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

        if (onboardingStep === 'completed') {
          showToast(`Configuración de licencia guardada correctamente.`, { type: 'success' });
          setPipelineStep(2);
          if (onSuccess) onSuccess();
        } else {
          showToast(
            `Licencia ${result.plan.toUpperCase()} verificada con éxito. Avanzando a Ingesta...`,
            { type: 'success', durationMs: 4000 }
          );

          await setOnboardingStep('ingestion');
          setPipelineStep(2);

          if (onSuccess) {
            setTimeout(onSuccess, 800);
          }
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

  const handleOneClickProDemo = async () => {
    setLoading(true);
    setBanner(null);
    try {
      const p = parseInt(port, 10) || 8000;
      await setBackendConfig(host, p);
      await setEulaAccepted(true);
      setLocalEula(true);
      setInputKey('POS-PRO-DEMO-2027');

      try {
        const result = await verifyLicenseApi({
          license_key: 'POS-PRO-DEMO-2027',
          pos_identifier: inputPosId.trim() || 'POS-TERM-01',
          pos_name: inputPosName.trim() || 'Caja Central Mostrador',
        });
        await setLicense({
          licenseKey: result.license_key,
          plan: result.plan,
          daysRemaining: result.days_remaining,
          allowedModules: result.allowed_modules,
          posIdentifier: inputPosId.trim() || 'POS-TERM-01',
          posName: inputPosName.trim() || 'Caja Central Mostrador',
        });
      } catch {
        await setLicense({
          licenseKey: 'POS-PRO-DEMO-2027',
          plan: 'pro',
          daysRemaining: 365,
          allowedModules: [
            'pos_ingestion',
            'audit_pipeline',
            'predictive_demand',
            'pareto_abc',
            'sellers_performance',
            'temporal_comparison',
            'export_excel',
            'export_pdf',
          ],
          posIdentifier: inputPosId.trim() || 'POS-TERM-01',
          posName: inputPosName.trim() || 'Caja Central Mostrador',
        });
      }

      showToast('Licencia Empresarial Pro activada exitosamente (8 módulos). Avanzando a Ingesta...', {
        type: 'success',
        durationMs: 3000,
      });
      await setOnboardingStep('ingestion');
      setPipelineStep(2);
      if (onSuccess) {
        setTimeout(onSuccess, 400);
      }
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
          ACTIVACIÓN EMPRESARIAL • EVALUACIÓN RÁPIDA
        </Text>
        <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
          Para la sesión de evaluación presencial, active la suite Pro completa con 1 solo clic:
        </Text>
        <TactileButton
          title="Activar Licencia Pro (1 Clic) y Continuar"
          variant="primary"
          loading={loading}
          onPress={handleOneClickProDemo}
          style={{ marginBottom: 12 }}
        />
        <View style={styles.demoButtonsRow}>
          <TactileButton
            title="Preconfigurar Pro (8 Módulos)"
            variant={inputKey === 'POS-PRO-DEMO-2027' ? 'primary' : 'outline'}
            onPress={() => applyDemoKey('POS-PRO-DEMO-2027')}
            style={styles.demoBtn}
          />
          <TactileButton
            title="Preconfigurar Starter (4 Módulos)"
            variant={inputKey === 'POS-STARTER-DEMO-2027' ? 'primary' : 'outline'}
            onPress={() => applyDemoKey('POS-STARTER-DEMO-2027')}
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
            1. <Text style={{ fontWeight: 'bold' }}>Concesión de Licencia Restringida (On-Premise):</Text> Se otorga una licencia intransferible, no exclusiva y revocable para uso operacional local. Prohibida su descompilación, sublicenciamiento o reventa fuera de los términos corporativos pactados.{'\n\n'}
            2. <Text style={{ fontWeight: 'bold' }}>Propiedad Intelectual (Modelos vs. Datos):</Text> La arquitectura matemática, pipelines de curaduría y ponderaciones del ensamble LightGBM son propiedad intelectual exclusiva de AnyVent / POSBuddy. Todos los datos transaccionales, catálogos y registros de inventario pertenecen 100% al cliente.{'\n\n'}
            3. <Text style={{ fontWeight: 'bold' }}>Deslinde de Responsabilidad Predictiva (Statistical Best-Effort):</Text> Las previsiones de demanda, intervalos de confianza [p10, p90] y puntos de reorden (ROP) son proyecciones estocásticas de asistencia a la toma de decisiones. El cliente mantiene el criterio final de aprovisionamiento.{'\n\n'}
            4. <Text style={{ fontWeight: 'bold' }}>Privacidad Absoluta y Cero Telemetría Cloud:</Text> El software opera íntegramente de manera local (air-gapped compatible). No se transmiten tickets, importes ni identificadores fiscales a servidores remotos ni proveedores de nube terceros.{'\n\n'}
            5. <Text style={{ fontWeight: 'bold' }}>Certificación de Solo Lectura (SELECT Exclusivo):</Text> Las conexiones a motores de bases de datos POS (MySQL / PostgreSQL / SQLite) operan estrictamente bajo permisos de lectura. El sistema garantiza la no alteración del motor de facturación en producción.
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
            {localEula && <IconCheck size={14} color="#FFFFFF" />}
          </View>
          <Text style={[styles.checkboxLabel, { color: colors.textPrimary }]}>
            He leído y acepto los términos del EULA, el procesamiento local y la política de solo lectura.
          </Text>
        </TouchableOpacity>
      </TactileCard>

      {/* Verification / Save Submit Button */}
      <TactileButton
        title={
          onboardingStep === 'completed'
            ? 'Guardar Configuración y Volver al Tablero'
            : isVerified
            ? 'Actualizar / Re-verificar Licencia'
            : 'Verificar y Activar Licencia'
        }
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
    maxWidth: 1200,
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
