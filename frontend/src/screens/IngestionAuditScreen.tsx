import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useLicenseStore } from '../store/useLicenseStore';
import { useConfigStore } from '../store/useConfigStore';
import {
  testDatabaseConnectionApi,
  triggerDatabaseIngestionApi,
  uploadDataFileApi,
} from '../api/endpoints/ingestionApi';
import { DatabaseEngine, PipelineStatus, SanitizationMetrics, IngestionPhase } from '../types/ingestion.types';
import { typography } from '../theme/theme';
import { TactileCard } from '../components/common/TactileCard';
import { TactileButton } from '../components/common/TactileButton';
import { MetricBadge } from '../components/common/MetricBadge';
import { ErrorBanner, BannerMessage } from '../components/common/ErrorBanner';
import { IconDatabase, IconFileExcel, IconIngestion } from '../components/common/SvgIcons';
import { DataEditorView } from '../components/editor/DataEditorView';

interface IngestionAuditScreenProps {
  onComplete?: () => void;
}

export const IngestionAuditScreen: React.FC<IngestionAuditScreenProps> = ({ onComplete }) => {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { hasModule } = useLicenseStore();
  const { onboardingStep, setOnboardingStep } = useConfigStore();

  const isIngestionAllowed = hasModule('pos_ingestion');

  // Flujo de fases: source → editor → audit
  const [ingestionPhase, setIngestionPhase] = useState<IngestionPhase>('source');

  // Tab state: 'db' | 'file'
  const [activeTab, setActiveTab] = useState<'db' | 'file'>('db');

  // DB Form
  const [engine, setEngine] = useState<DatabaseEngine>('postgresql');
  const [dbHost, setDbHost] = useState('192.168.1.150');
  const [dbPort, setDbPort] = useState('5432');
  const [dbName, setDbName] = useState('pos_retail_db');
  const [dbUser, setDbUser] = useState('pos_reader');
  const [dbPassword, setDbPassword] = useState('••••••••');
  const [readOnlyVerified] = useState(true);

  // File Form
  const [selectedFileName, setSelectedFileName] = useState('ventas_historicas_terminal.csv');
  const [fileSizeMb, setFileSizeMb] = useState(14.2);

  // Pipeline execution & Audit metrics state
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>('inactivo');
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<BannerMessage | null>(null);

  const [metrics, setMetrics] = useState<SanitizationMetrics>({
    filas_procesadas: 0,
    registros_descartados: 0,
    duplicados_eliminados: 0,
    nulos_imputados: 0,
    tasa_calidad_pct: 0,
    tiempo_procesamiento_ms: 0,
  });

  const handleTestDb = async () => {
    if (!isIngestionAllowed) {
      setBanner({
        type: 'forbidden',
        message: 'Acceso Denegado (HTTP 403): El módulo de conexión directa a base de datos requiere una licencia habilitada.',
      });
      return;
    }

    setLoading(true);
    setBanner(null);
    try {
      const res = await testDatabaseConnectionApi({
        host: dbHost,
        port: parseInt(dbPort, 10) || 5432,
        database: dbName,
        username: dbUser,
        password: dbPassword,
        engine,
        read_only_verified: readOnlyVerified,
      });
      showToast(
        `${res.message} ${res.rowsDetected ? `(${res.rowsDetected} registros listos para ingesta)` : ''}`,
        { type: 'success' }
      );
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      showToast(errorObj.message || 'Fallo de conexión a la base de datos.', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncDb = async () => {
    if (!isIngestionAllowed) {
      showToast('Acceso Denegado (HTTP 403): Su plan actual no cuenta con sincronización de base de datos relacional.', {
        type: 'error',
      });
      return;
    }

    setLoading(true);
    setPipelineStatus('procesando');
    setBanner(null);

    try {
      await triggerDatabaseIngestionApi({
        host: dbHost,
        port: parseInt(dbPort, 10) || 5432,
        database: dbName,
        username: dbUser,
        password: dbPassword,
        engine,
        read_only_verified: readOnlyVerified,
      });

      setPipelineStatus('completado');
      showToast(
        'Datos cargados desde la base relacional. Revise y edite los registros antes de confirmar.',
        { type: 'success', durationMs: 4000 }
      );
      setIngestionPhase('editor');
    } catch (err: unknown) {
      setPipelineStatus('error');
      const errorObj = err as { message?: string };
      showToast(errorObj.message || 'Error durante la sincronización.', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleProcessFile = async () => {
    if (!isIngestionAllowed) {
      showToast('Acceso Denegado (HTTP 403): Ingesta de archivos no autorizada.', { type: 'error' });
      return;
    }

    setLoading(true);
    setPipelineStatus('procesando');
    setBanner(null);

    try {
      await uploadDataFileApi({
        uri: 'file://local/sample.csv',
        name: selectedFileName,
        type: 'text/csv',
        size: fileSizeMb * 1024 * 1024,
      });

      setPipelineStatus('completado');
      showToast(
        `Archivo '${selectedFileName}' cargado. Revise y edite los registros antes de confirmar.`,
        { type: 'success', durationMs: 4000 }
      );
      setIngestionPhase('editor');
    } catch (err: unknown) {
      setPipelineStatus('error');
      const errorObj = err as { message?: string };
      showToast(errorObj.message || 'Error al procesar el archivo local.', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Callback del editor: el usuario confirma y se genera la auditoría
  const handleEditorConfirm = (editorMetrics: SanitizationMetrics) => {
    setMetrics(editorMetrics);
    setPipelineStatus('completado');
    setIngestionPhase('audit');
    showToast('Saneamiento completado. Revise las métricas de calidad.', { type: 'success' });
  };

  // Confirmar auditoría y avanzar al dashboard
  const handleFinalConfirm = async () => {
    if (onboardingStep !== 'completed') {
      await setOnboardingStep('completed');
    }
    showToast('Datos verificados. Accediendo al Tablero Analítico...', { type: 'success', durationMs: 3000 });
    if (onComplete) {
      setTimeout(onComplete, 600);
    }
  };

  // ---- RENDER FASES ----

  // Fase: Editor de datos
  if (ingestionPhase === 'editor') {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.header}>
          {onboardingStep !== 'completed' && (
            <View style={{ marginBottom: 8 }}>
              <MetricBadge
                type="fase_aprendizaje_heuristica"
                label="PASO 2 DE 3: REVISIÓN Y EDICIÓN DE DATOS"
              />
            </View>
          )}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Editor de Datos Cargados
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Revise, edite, elimine o sanitice los registros antes de generar el informe de calidad.
          </Text>
        </View>

        <DataEditorView onConfirm={handleEditorConfirm} />

        <TouchableOpacity
          onPress={() => setIngestionPhase('source')}
          style={[styles.backLink]}
        >
          <Text style={[styles.backLinkText, { color: colors.textMuted }]}>
            Volver a la selección de origen de datos
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Fase: Auditoría
  if (ingestionPhase === 'audit') {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.header}>
          {onboardingStep !== 'completed' && (
            <View style={{ marginBottom: 8 }}>
              <MetricBadge
                type="alta_ml"
                label="PASO 3 DE 3: AUDITORÍA DE CALIDAD"
              />
            </View>
          )}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Auditoría de Saneamiento y Calidad de Datos
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Métricas finales del pipeline de saneamiento ejecutado sobre los datos revisados.
          </Text>
        </View>

        <TactileCard highlight={true}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              AUDITORÍA DE SANEAMIENTO Y CALIDAD DE DATOS
            </Text>
            <MetricBadge
              type={
                pipelineStatus === 'completado'
                  ? 'alta_ml'
                  : pipelineStatus === 'procesando'
                  ? 'fase_aprendizaje_heuristica'
                  : 'alerta_reorden'
              }
              label={`PIPELINE: ${pipelineStatus.toUpperCase()}`}
            />
          </View>

          <View style={styles.metricsGrid}>
            <View style={[styles.metricTile, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.tileLabel, { color: colors.textMuted }]}>PROCESADAS</Text>
              <Text style={[styles.tileNumber, { color: colors.confidenceHigh }]}>
                {metrics.filas_procesadas.toLocaleString()}
              </Text>
              <Text style={[styles.tileSub, { color: colors.textMuted }]}>Registros limpios</Text>
            </View>

            <View style={[styles.metricTile, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.tileLabel, { color: colors.textMuted }]}>DESCARTADAS</Text>
              <Text style={[styles.tileNumber, { color: colors.alertCritical }]}>
                {metrics.registros_descartados}
              </Text>
              <Text style={[styles.tileSub, { color: colors.textMuted }]}>Inconsistencias</Text>
            </View>

            <View style={[styles.metricTile, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.tileLabel, { color: colors.textMuted }]}>CAMPOS CORREGIDOS</Text>
              <Text style={[styles.tileNumber, { color: colors.alertWarning }]}>
                {metrics.nulos_imputados}
              </Text>
              <Text style={[styles.tileSub, { color: colors.textMuted }]}>Ediciones y correcciones</Text>
            </View>

            <View style={[styles.metricTile, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.tileLabel, { color: colors.textMuted }]}>CALIDAD TOTAL</Text>
              <Text style={[styles.tileNumber, { color: colors.accentPrimary }]}>
                {metrics.tasa_calidad_pct.toFixed(2)}%
              </Text>
              <Text style={[styles.tileSub, { color: colors.textMuted }]}>
                {metrics.tiempo_procesamiento_ms} ms
              </Text>
            </View>
          </View>
        </TactileCard>

        <View style={styles.auditActions}>
          <TactileButton
            title="Volver al Editor"
            variant="outline"
            onPress={() => setIngestionPhase('editor')}
            style={{ flex: 1, marginRight: 8 }}
          />
          <TactileButton
            title={onboardingStep !== 'completed' ? 'Continuar al Tablero Analítico' : 'Guardar Cambios'}
            variant="primary"
            onPress={handleFinalConfirm}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    );
  }

  // Fase: Selección de origen (source)
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        {onboardingStep !== 'completed' && (
          <View style={{ marginBottom: 8 }}>
            <MetricBadge
              type="pareto_a"
              label="PASO 2 DE 3: INGESTA DE DATOS"
            />
          </View>
        )}
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Monitor de Ingesta & Auditoría de Datos
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Conectores de datos relacionales seguros (solo lectura) y saneamiento de transacciones locales.
        </Text>
      </View>

      <ErrorBanner banner={banner} onDismiss={() => setBanner(null)} />

      {/* Tabs Selector */}
      <View style={[styles.tabBar, { backgroundColor: colors.surfaceSecondary, borderColor: colors.surfaceBorder }]}>
        <TouchableOpacity
          onPress={() => setActiveTab('db')}
          style={[
            styles.tabButton,
            { flexDirection: 'row', alignItems: 'center' },
            activeTab === 'db' && {
              backgroundColor: colors.surface,
              borderColor: colors.accentPrimary,
            },
          ]}
        >
          <IconDatabase size={15} color={activeTab === 'db' ? colors.accentPrimary : colors.textMuted} />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'db' ? colors.accentPrimary : colors.textMuted, marginLeft: 8 },
            ]}
          >
            BASE RELACIONAL (SQL)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('file')}
          style={[
            styles.tabButton,
            { flexDirection: 'row', alignItems: 'center' },
            activeTab === 'file' && {
              backgroundColor: colors.surface,
              borderColor: colors.accentPrimary,
            },
          ]}
        >
          <IconFileExcel size={15} color={activeTab === 'file' ? colors.accentPrimary : colors.textMuted} />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'file' ? colors.accentPrimary : colors.textMuted, marginLeft: 8 },
            ]}
          >
            ARCHIVO LOCAL (CSV / PARQUET)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab 1 Content: Relational DB */}
      {activeTab === 'db' ? (
        <TactileCard>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              CONECTOR DE BASE DE DATOS EXTERNA POS
            </Text>
            <MetricBadge
              type="custom"
              label={readOnlyVerified ? 'MODO SOLO LECTURA' : 'VERIFICACIÓN PENDIENTE'}
            />
          </View>
          <Text style={[styles.cardHelp, { color: colors.textSecondary }]}>
            Conéctese a la base de datos transaccional de la tienda para sincronizar el historial de tickets.
          </Text>

          {/* Engine Selector */}
          <View style={styles.engineRow}>
            <TouchableOpacity
              onPress={() => {
                setEngine('postgresql');
                setDbPort('5432');
              }}
              style={[
                styles.engineBtn,
                {
                  borderColor: engine === 'postgresql' ? colors.accentPrimary : colors.surfaceBorder,
                  backgroundColor: engine === 'postgresql' ? colors.accentPrimaryGlow : colors.inputBackground,
                },
              ]}
            >
              <Text
                style={[
                  styles.engineText,
                  { color: engine === 'postgresql' ? colors.accentPrimary : colors.textMuted },
                ]}
              >
                PostgreSQL (Puerto 5432)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setEngine('mysql');
                setDbPort('3306');
              }}
              style={[
                styles.engineBtn,
                {
                  borderColor: engine === 'mysql' ? colors.accentPrimary : colors.surfaceBorder,
                  backgroundColor: engine === 'mysql' ? colors.accentPrimaryGlow : colors.inputBackground,
                },
              ]}
            >
              <Text
                style={[
                  styles.engineText,
                  { color: engine === 'mysql' ? colors.accentPrimary : colors.textMuted },
                ]}
              >
                MySQL (Puerto 3306)
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.twoCols}>
            <View style={[styles.formField, { flex: 2, marginRight: 8 }]}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>HOST / IP SERVIDOR BD</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary },
                ]}
                value={dbHost}
                onChangeText={setDbHost}
                autoCapitalize="none"
              />
            </View>
            <View style={[styles.formField, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>PUERTO</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary },
                ]}
                value={dbPort}
                onChangeText={setDbPort}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.twoCols}>
            <View style={[styles.formField, { flex: 1.5, marginRight: 8 }]}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>NOMBRE DE BASE DE DATOS</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary },
                ]}
                value={dbName}
                onChangeText={setDbName}
                autoCapitalize="none"
              />
            </View>
            <View style={[styles.formField, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>USUARIO (READ-ONLY)</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary },
                ]}
                value={dbUser}
                onChangeText={setDbUser}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.formField}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>CONTRASEÑA</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary },
              ]}
              value={dbPassword}
              onChangeText={setDbPassword}
              secureTextEntry={true}
            />
          </View>

          <View style={styles.actionRow}>
            <TactileButton
              title="Probar Conexión (SELECT)"
              variant="outline"
              loading={loading}
              onPress={handleTestDb}
              style={{ flex: 1, marginRight: 8 }}
            />
            <TactileButton
              title="Iniciar Ingesta de BD"
              variant="primary"
              loading={loading}
              onPress={handleSyncDb}
              style={{ flex: 1 }}
            />
          </View>
        </TactileCard>
      ) : (
        /* Tab 2 Content: Local File Ingestion */
        <TactileCard>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              CARGA DE ARCHIVOS LOCALES
            </Text>
            <MetricBadge type="custom" label="MÁX. 50 MB (OWASP)" />
          </View>
          <Text style={[styles.cardHelp, { color: colors.textSecondary }]}>
            Formatos admitidos: CSV estructurado o Parquet con columnas de fecha, sku, ventas y precio.
          </Text>

          <View
            style={[
              styles.dropArea,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.accentPrimary,
              },
            ]}
          >
            <View style={{ marginBottom: 8 }}>
              <IconIngestion size={36} color={colors.accentPrimary} />
            </View>
            <Text style={[styles.dropFileName, { color: colors.textPrimary }]}>
              {selectedFileName}
            </Text>
            <Text style={[styles.dropFileSize, { color: colors.textMuted }]}>
              Tamaño actual: {fileSizeMb.toFixed(1)} MB / Límite: 50.0 MB
            </Text>
          </View>

          <View style={styles.samplePickerRow}>
            <TouchableOpacity
              onPress={() => {
                setSelectedFileName('ventas_historicas_terminal.csv');
                setFileSizeMb(14.2);
              }}
              style={[styles.sampleBtn, { borderColor: colors.surfaceBorder }]}
            >
              <Text style={[styles.sampleText, { color: colors.accentPrimary }]}>
                Cargar muestra 1 (14.2 MB)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setSelectedFileName('dataset_completo_anual.parquet');
                setFileSizeMb(38.6);
              }}
              style={[styles.sampleBtn, { borderColor: colors.surfaceBorder }]}
            >
              <Text style={[styles.sampleText, { color: colors.accentPrimary }]}>
                Cargar muestra 2 (38.6 MB)
              </Text>
            </TouchableOpacity>
          </View>

          <TactileButton
            title="Cargar y Procesar Archivo"
            variant="primary"
            loading={loading}
            onPress={handleProcessFile}
            style={{ marginTop: 12 }}
          />
        </TactileCard>
      )}
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
    marginBottom: 14,
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
  tabBar: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 4,
    marginBottom: 14,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyMono,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyMono,
    letterSpacing: 0.8,
  },
  cardHelp: {
    fontSize: typography.fontSize.xs,
    marginBottom: 12,
  },
  engineRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  engineBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    marginRight: 6,
  },
  engineText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyMono,
  },
  twoCols: {
    flexDirection: 'row',
  },
  formField: {
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1.2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamilyMono,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  dropArea: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  dropFileName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyMono,
  },
  dropFileSize: {
    fontSize: typography.fontSize.xs,
    marginTop: 4,
    fontFamily: typography.fontFamilyMono,
  },
  samplePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  sampleBtn: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  sampleText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    justifyContent: 'space-between',
  },
  metricTile: {
    width: '48.5%',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  tileLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  tileNumber: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.heavy,
    fontFamily: typography.fontFamilyMono,
    marginVertical: 2,
  },
  tileSub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
  },
  auditActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  backLink: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  backLinkText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    textDecorationLine: 'underline',
  },
});
