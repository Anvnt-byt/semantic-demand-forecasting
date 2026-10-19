import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../context/ToastContext';
import { typography } from '../theme/theme';
import { TactileCard } from '../components/common/TactileCard';
import {
  testDatabaseConnectionApi,
  triggerDatabaseIngestionApi,
  uploadDataFileApi,
} from '../api/endpoints/ingestionApi';
import { DatabaseConnectionParams, IngestionStatusResponse } from '../types/ingestion.types';
import { useDataWranglerStore } from '../store/useDataWranglerStore';

interface IngestionAuditScreenProps {
  onComplete?: () => void;
  onNavigateToStudio?: () => void;
}

export const IngestionAuditScreen: React.FC<IngestionAuditScreenProps> = ({ onComplete, onNavigateToStudio }) => {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { loadDataset } = useDataWranglerStore();

  const [activeTab, setActiveTab] = useState<'pos' | 'file'>('pos');
  const [loading, setLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<IngestionStatusResponse | null>(null);

  // Formulario POS
  const [engine, setEngine] = useState<'mysql' | 'postgresql'>('mysql');
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('3306');
  const [database, setDatabase] = useState('pos_store_db');
  const [user, setUser] = useState('pos_readonly');
  const [password, setPassword] = useState('');

  // Formulario Archivo
  const [entity, setEntity] = useState<'ventas' | 'inventario'>('ventas');
  const [dummyFileName, setDummyFileName] = useState('ventas_octubre_2026.csv');

  const handleTestConnection = async () => {
    setLoading(true);
    try {
      const params: DatabaseConnectionParams = {
        engine,
        host,
        port: parseInt(port, 10) || 3306,
        database,
        username: user,
        password,
      };
      const res = await testDatabaseConnectionApi(params);
      if (res.success) {
        showToast(res.message, { type: 'success' });
      } else {
        showToast(res.message, { type: 'error' });
      }
    } catch (err: any) {
      showToast(err.message || 'No se pudo conectar al servidor POS', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncPOS = async () => {
    setLoading(true);
    try {
      const params: DatabaseConnectionParams = {
        engine,
        host,
        port: parseInt(port, 10) || 3306,
        database,
        username: user,
        password,
      };
      const res = await triggerDatabaseIngestionApi(params);
      setAuditResult(res);
      showToast(`${res.audit.registros_validos} registros persistidos atómicamente.`, { type: 'success' });
      if (onComplete) onComplete();
    } catch (err: any) {
      showToast(err.message || 'Error procesando datos del POS', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFile = async () => {
    setLoading(true);
    try {
      const fileMock = {
        uri: 'file://mock/path/' + dummyFileName,
        name: dummyFileName,
        type: dummyFileName.endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv',
        size: 1024 * 50,
      };
      const res = await uploadDataFileApi(fileMock, entity);
      setAuditResult(res);
      showToast(`${res.audit.registros_validos} registros saneados y guardados en PostgreSQL.`, { type: 'success' });
      if (onComplete) onComplete();
    } catch (err: any) {
      showToast(err.message || 'Fallo al procesar archivo', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Encabezado */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>CENTRO DE INGESTA & AUDITORÍA</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Conectores en solo lectura estricta (SELECT exclusivo) y carga de contingencia con saneamiento atómico.
          </Text>
        </View>
      </View>

      {/* Selector de Pestaña: POS vs Archivo */}
      <View style={styles.tabSelector}>
        <TouchableOpacity
          onPress={() => {
            setActiveTab('pos');
            if (engine === 'mysql') setPort('3306');
            else setPort('5432');
          }}
          style={[
            styles.tabBtn,
            { backgroundColor: activeTab === 'pos' ? colors.accentPrimary : colors.surfaceSecondary, borderColor: colors.surfaceBorder },
          ]}
        >
          <Text style={[styles.tabBtnText, { color: activeTab === 'pos' ? '#FFFFFF' : colors.textSecondary }]}>
            Conexión Directa POS (MySQL / PostgreSQL)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('file')}
          style={[
            styles.tabBtn,
            { backgroundColor: activeTab === 'file' ? colors.accentPrimary : colors.surfaceSecondary, borderColor: colors.surfaceBorder },
          ]}
        >
          <Text style={[styles.tabBtnText, { color: activeTab === 'file' ? '#FFFFFF' : colors.textSecondary }]}>
            Importación de Archivo (CSV / Excel)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenido según pestaña */}
      {activeTab === 'pos' ? (
        <TactileCard>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            CONEXIÓN NO INVASIVA A TERMINAL POS EXTERNO (SOLO LECTURA)
          </Text>
          <Text style={[styles.cardHelp, { color: colors.textMuted }]}>
            El sistema ejecuta consultas SELECT exclusivas. Prohibido ejecutar DDL o DML en la base origen del cliente.
          </Text>

          {/* Selector de Motor */}
          <View style={styles.engineRow}>
            <TouchableOpacity
              onPress={() => { setEngine('mysql'); setPort('3306'); }}
              style={[styles.engineBtn, engine === 'mysql' && { backgroundColor: colors.accentPrimary }]}
            >
              <Text style={[styles.engineText, { color: engine === 'mysql' ? '#FFF' : colors.textPrimary }]}>MySQL</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setEngine('postgresql'); setPort('5432'); }}
              style={[styles.engineBtn, engine === 'postgresql' && { backgroundColor: colors.accentPrimary }]}
            >
              <Text style={[styles.engineText, { color: engine === 'postgresql' ? '#FFF' : colors.textPrimary }]}>PostgreSQL</Text>
            </TouchableOpacity>
          </View>

          {/* Campos de Conexión */}
          <View style={styles.formGrid}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>HOST / IP LOCAL:</Text>
              <TextInput
                value={host}
                onChangeText={setHost}
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary }]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>PUERTO:</Text>
              <TextInput
                value={port}
                onChangeText={setPort}
                keyboardType="numeric"
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary }]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>BASE DE DATOS:</Text>
              <TextInput
                value={database}
                onChangeText={setDatabase}
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary }]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>USUARIO (READ-ONLY):</Text>
              <TextInput
                value={user}
                onChangeText={setUser}
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary }]}
              />
            </View>

            <View style={[styles.inputGroup, { width: '100%' }]}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>CONTRASEÑA:</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Contraseña del usuario read-only"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary }]}
              />
            </View>
          </View>

          {/* Botones de Acción */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={handleTestConnection}
              disabled={loading}
              style={[styles.actionBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.surfaceBorder }]}
            >
              <Text style={[styles.actionBtnText, { color: colors.accentPrimary }]}>Verificar Conexión (Read-Only)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSyncPOS}
              disabled={loading}
              style={[styles.actionBtn, { backgroundColor: colors.confidenceHigh }]}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.syncBtnText}>Sincronizar y Extraer Registros</Text>
              )}
            </TouchableOpacity>
          </View>
        </TactileCard>
      ) : (
        <TactileCard>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            CARGA MANUAL DE ARCHIVO LOCAL (.CSV O .XLSX)
          </Text>
          <Text style={[styles.cardHelp, { color: colors.textMuted }]}>
            Parseo y normalización determinista. Si el inventario incluye lead_time_dias, se calculará el ROP automáticamente.
          </Text>

          {/* Selector de Entidad */}
          <View style={styles.entitySelector}>
            <Text style={[styles.inputLabel, { color: colors.textMuted, marginRight: 10 }]}>ENTIDAD DESTINO:</Text>
            <TouchableOpacity
              onPress={() => { setEntity('ventas'); setDummyFileName('ventas_octubre_2026.csv'); }}
              style={[styles.entityBtn, entity === 'ventas' && { backgroundColor: colors.accentPrimary }]}
            >
              <Text style={[styles.entityText, { color: entity === 'ventas' ? '#FFF' : colors.textPrimary }]}>Ventas</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setEntity('inventario'); setDummyFileName('catalogo_inventario_lead_time.xlsx'); }}
              style={[styles.entityBtn, entity === 'inventario' && { backgroundColor: colors.accentPrimary }]}
            >
              <Text style={[styles.entityText, { color: entity === 'inventario' ? '#FFF' : colors.textPrimary }]}>Inventario (Lead Time)</Text>
            </TouchableOpacity>
          </View>

          {/* Nombre simulado de archivo o selector */}
          <View style={styles.fileDropZone}>
            <Text style={[styles.dropTitle, { color: colors.textPrimary }]}>ARCHIVO SELECCIONADO:</Text>
            <Text style={[styles.dropName, { color: colors.accentPrimary }]}>{dummyFileName}</Text>
            <Text style={[styles.dropHelp, { color: colors.textMuted }]}>
              {dummyFileName.endsWith('.xlsx') ? 'Formato Excel Libro Abierto' : 'Archivo Tabular con Delimitador Coma'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleUploadFile}
            disabled={loading}
            style={[styles.uploadBtn, { backgroundColor: colors.confidenceHigh }]}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.syncBtnText}>Procesar e Ingestar en PostgreSQL</Text>
            )}
          </TouchableOpacity>
        </TactileCard>
      )}

      {/* Consola de Auditoría de Calidad en Vivo */}
      {auditResult && (
        <TactileCard>
          <View style={styles.auditHeader}>
            <Text style={[styles.auditTitle, { color: colors.textPrimary }]}>
              CONSOLA DE AUDITORÍA ATÓMICA DE CALIDAD
            </Text>
            <View style={[styles.auditBadge, { backgroundColor: colors.confidenceHighBg }]}>
              <Text style={[styles.auditBadgeText, { color: colors.confidenceHigh }]}>BATCH ID: {auditResult.audit.batch_id}</Text>
            </View>
          </View>

          <View style={styles.auditGrid}>
            <View style={[styles.auditStat, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.auditStatLabel, { color: colors.textMuted }]}>TOTAL PROCESADOS</Text>
              <Text style={[styles.auditStatVal, { color: colors.textPrimary }]}>{auditResult.audit.total_registros.toLocaleString()}</Text>
            </View>

            <View style={[styles.auditStat, { backgroundColor: colors.confidenceHighBg }]}>
              <Text style={[styles.auditStatLabel, { color: colors.confidenceHigh }]}>REGISTROS VÁLIDOS</Text>
              <Text style={[styles.auditStatVal, { color: colors.confidenceHigh }]}>{auditResult.audit.registros_validos.toLocaleString()}</Text>
            </View>

            <View style={[styles.auditStat, { backgroundColor: colors.alertCriticalBg }]}>
              <Text style={[styles.auditStatLabel, { color: colors.alertCritical }]}>DESCARTADOS</Text>
              <Text style={[styles.auditStatVal, { color: colors.alertCritical }]}>{auditResult.audit.registros_descartados}</Text>
            </View>

            <View style={[styles.auditStat, { backgroundColor: colors.alertWarningBg }]}>
              <Text style={[styles.auditStatLabel, { color: colors.alertWarning }]}>DUPLICADOS ELIMINADOS</Text>
              <Text style={[styles.auditStatVal, { color: colors.alertWarning }]}>{auditResult.audit.duplicados_detectados}</Text>
            </View>
          </View>

          {auditResult.audit.errores_muestra && auditResult.audit.errores_muestra.length > 0 && (
            <View style={styles.errorsContainer}>
              <Text style={[styles.errorTitle, { color: colors.alertCritical }]}>MUESTRA DE ANOMALÍAS DETECTADAS:</Text>
              {auditResult.audit.errores_muestra.slice(0, 5).map((err, idx) => (
                <Text key={idx} style={[styles.errorItem, { color: colors.textMuted }]}>
                  • Fila {err.row_number}: {err.reason}
                </Text>
              ))}
            </View>
          )}
        </TactileCard>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 1040,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.heavy,
    fontFamily: typography.fontFamilyMono,
  },
  subtitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    marginTop: 2,
  },
  tabSelector: {
    flexDirection: 'row',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 6,
  },
  tabBtnText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  cardTitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.6,
  },
  cardHelp: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    marginTop: 2,
    marginBottom: 10,
  },
  engineRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  engineBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 8,
  },
  engineText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  inputGroup: {
    width: '48%',
    minWidth: 150,
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 4,
  },
  input: {
    height: 36,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    flexWrap: 'wrap',
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 8,
    marginTop: 6,
  },
  actionBtnText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  syncBtnText: {
    color: '#FFF',
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  entitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  entityBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 6,
  },
  entityText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  fileDropZone: {
    padding: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 14,
  },
  dropTitle: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  dropName: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    marginVertical: 4,
  },
  dropHelp: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMono,
  },
  uploadBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  auditTitle: {
    fontSize: 11,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  auditBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  auditBadgeText: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  auditGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  auditStat: {
    width: '24%',
    minWidth: 100,
    padding: 10,
    borderRadius: 6,
    marginBottom: 6,
  },
  auditStatLabel: {
    fontSize: 9,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  auditStatVal: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.heavy,
    marginTop: 2,
  },
  errorsContainer: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  errorTitle: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 4,
  },
  errorItem: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMono,
    marginBottom: 2,
  },
});
