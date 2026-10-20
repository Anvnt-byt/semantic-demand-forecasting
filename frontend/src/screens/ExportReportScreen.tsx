import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/theme';
import { TactileCard } from '../components/common/TactileCard';
import { TactileButton } from '../components/common/TactileButton';
import { MetricBadge } from '../components/common/MetricBadge';
import { InfoTooltip } from '../components/common/InfoTooltip';
import { useToast } from '../context/ToastContext';
import { useLicenseStore } from '../store/useLicenseStore';
import { useConfigStore } from '../store/useConfigStore';
import { downloadRealExcel, downloadRealPdf } from '../utils/fileDownloader';
import { IconFilePdf, IconFileExcel } from '../components/common/SvgIcons';
import { ExportAudiencePreset, ExportReportConfig } from '../types/analytics.types';

export const ExportReportScreen: React.FC = () => {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { hasModule } = useLicenseStore();
  const { resetDemoPipeline, setPipelineStep, completeDemoPipeline } = useConfigStore();

  const [loadingExport, setLoadingExport] = useState<'pdf' | 'excel' | null>(null);
  const [resetting, setResetting] = useState(false);

  // Estados del Configurador Modular
  const [preset, setPreset] = useState<ExportAudiencePreset>('data_science');
  const [incluirKpis, setIncluirKpis] = useState(true);
  const [incluirAbc, setIncluirAbc] = useState(true);
  const [incluirVendedores, setIncluirVendedores] = useState(false);
  const [incluirProyeccion, setIncluirProyeccion] = useState(true);
  const [incluirDiagnostico, setIncluirDiagnostico] = useState(true);
  const [incluirLinaje, setIncluirLinaje] = useState(true);

  // Dictamen y Anotaciones del Analista
  const [notasAnalista, setNotasAnalista] = useState(
    'Auditoría completada satisfactoriamente. Se identificó concentración del 80% de ventas en SKUs Clase A (cervezas y lácteos). Se recomienda reorden inmediato para SKU-CERV-01 por cercanía al ROP (Lead time 3 días). Inferencia local validada con 0 KB de telemetría cloud.'
  );
  const [autorAnalista, setAutorAnalista] = useState('Lic. Alejandro Silva');
  const [cargoAnalista, setCargoAnalista] = useState('Especialista en Cadena de Suministro');

  const isExcelAllowed = hasModule('export_excel');
  const isPdfAllowed = hasModule('export_pdf');

  const applyPreset = (newPreset: ExportAudiencePreset) => {
    setPreset(newPreset);
    if (newPreset === 'executive') {
      setIncluirKpis(true);
      setIncluirAbc(true);
      setIncluirVendedores(true);
      setIncluirProyeccion(false);
      setIncluirDiagnostico(false);
      setIncluirLinaje(false);
    } else if (newPreset === 'data_science') {
      setIncluirKpis(true);
      setIncluirAbc(true);
      setIncluirVendedores(false);
      setIncluirProyeccion(true);
      setIncluirDiagnostico(true);
      setIncluirLinaje(true);
    }
  };

  const handleGenerateAssistantDraft = () => {
    setNotasAnalista(
      'Dictamen Técnico: Se procesó lote de ventas con saneamiento de valores nulos e imputación por mediana. El modelo LightGBM conformal presenta un WAPE out-of-sample óptimo (<12%). Se detecta riesgo de desabastecimiento en 2 SKUs críticos clase A. Se aconseja adelantar compra con 3 días de holgura. Certificación on-premise íntegra.'
    );
    showToast('Borrador analítico asistido insertado en el editor.', { type: 'info' });
  };

  const getCurrentConfig = (): ExportReportConfig => ({
    preset,
    incluirKpis,
    incluirAbc,
    incluirVendedores,
    incluirProyeccion,
    incluirDiagnostico,
    incluirLinaje,
    notasAnalista,
    autorAnalista,
    cargoAnalista,
  });

  const handleDownloadPdf = async () => {
    if (!isPdfAllowed) {
      showToast('Acceso Denegado: La generación de informes PDF ejecutivos requiere Plan Pro.', {
        type: 'error',
      });
      return;
    }

    setLoadingExport('pdf');
    try {
      const filename = await downloadRealPdf(getCurrentConfig());
      showToast(`Informe PDF ejecutivo generado exitosamente: ${filename}`, {
        type: 'success',
        durationMs: 4000,
      });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      showToast(errorObj.message || 'Error al generar el informe PDF.', { type: 'error' });
    } finally {
      setLoadingExport(null);
    }
  };

  const handleDownloadExcel = async () => {
    if (!isExcelAllowed) {
      showToast('Acceso Denegado: La exportación de datos estructurados para Power BI requiere Plan Pro.', {
        type: 'error',
      });
      return;
    }

    setLoadingExport('excel');
    try {
      const filename = await downloadRealExcel(getCurrentConfig());
      showToast(`Libro Excel estructurado generado exitosamente: ${filename}`, {
        type: 'success',
        durationMs: 4000,
      });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      showToast(errorObj.message || 'Error al exportar libro Excel.', { type: 'error' });
    } finally {
      setLoadingExport(null);
    }
  };

  const handleResetForNextEvaluator = async () => {
    setResetting(true);
    try {
      await resetDemoPipeline();
      showToast('Demostración restablecida: Base de datos limpia con 16,679 ventas y 28 SKUs.', {
        type: 'success',
        durationMs: 4000,
      });
    } catch {
      setPipelineStep(1);
    } finally {
      setResetting(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Encabezado */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              AUDITORÍA & EXPORTACIÓN EJECUTIVA
            </Text>
            <MetricBadge type="plan_pro" label="FASE FINAL • CIERRE DE DEMO" />
          </View>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Configurador modular de reportes, dictamen del analista y entrega de artefactos analíticos de alta fidelidad.
          </Text>
        </View>
      </View>

      {/* 1. Selector de Presets de Audiencia */}
      <TactileCard>
        <Text style={[styles.cardTitle, { color: colors.accentPrimary }]}>
          PERFIL DE AUDIENCIA DEL REPORTE (PRESETS RÁPIDOS)
        </Text>
        <Text style={[styles.cardHelp, { color: colors.textSecondary }]}>
          Selecciona la plantilla sugerida o personaliza las secciones que se incluirán en el informe final:
        </Text>

        <View style={styles.presetRow}>
          <TouchableOpacity
            onPress={() => applyPreset('data_science')}
            style={[
              styles.presetChip,
              {
                borderColor: preset === 'data_science' ? colors.accentPrimary : colors.surfaceBorder,
                backgroundColor: preset === 'data_science' ? 'rgba(59, 130, 246, 0.12)' : colors.surfaceSecondary,
              },
            ]}
          >
            <Text
              style={[
                styles.presetChipText,
                { color: preset === 'data_science' ? colors.accentPrimary : colors.textMuted },
              ]}
            >
              [Científico de Datos / Auditoría]
            </Text>
            <Text style={[styles.presetChipSub, { color: colors.textSecondary }]}>
              Linaje + WAPE/RMSE + ML Conformal
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => applyPreset('executive')}
            style={[
              styles.presetChip,
              {
                borderColor: preset === 'executive' ? colors.accentPrimary : colors.surfaceBorder,
                backgroundColor: preset === 'executive' ? 'rgba(59, 130, 246, 0.12)' : colors.surfaceSecondary,
              },
            ]}
          >
            <Text
              style={[
                styles.presetChipText,
                { color: preset === 'executive' ? colors.accentPrimary : colors.textMuted },
              ]}
            >
              [Directivo / Operaciones]
            </Text>
            <Text style={[styles.presetChipSub, { color: colors.textSecondary }]}>
              KPIs Macro + Pareto ABC + Vendedores
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPreset('custom')}
            style={[
              styles.presetChip,
              {
                borderColor: preset === 'custom' ? colors.accentPrimary : colors.surfaceBorder,
                backgroundColor: preset === 'custom' ? 'rgba(59, 130, 246, 0.12)' : colors.surfaceSecondary,
              },
            ]}
          >
            <Text
              style={[
                styles.presetChipText,
                { color: preset === 'custom' ? colors.accentPrimary : colors.textMuted },
              ]}
            >
              [Personalizado]
            </Text>
            <Text style={[styles.presetChipSub, { color: colors.textSecondary }]}>
              Selección manual de módulos
            </Text>
          </TouchableOpacity>
        </View>

        {/* 2. Matriz de Switches de Sección */}
        <View style={[styles.switchesContainer, { borderTopColor: colors.surfaceBorder }]}>
          <Text style={[styles.switchesTitle, { color: colors.textPrimary }]}>
            SECCIONES MODULARES A INCLUIR EN EL DOCUMENTO
          </Text>

          <View style={styles.switchesGrid}>
            <TouchableOpacity
              onPress={() => {
                setPreset('custom');
                setIncluirKpis(!incluirKpis);
              }}
              style={[styles.switchItem, { borderColor: colors.surfaceBorder }]}
            >
              <View
                style={[
                  styles.checkboxBox,
                  { borderColor: colors.accentPrimary, backgroundColor: incluirKpis ? colors.accentPrimary : 'transparent' },
                ]}
              >
                {incluirKpis && <View style={styles.checkboxDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Métricas Clave de Negocio (KPIs)</Text>
                <Text style={[styles.switchHelp, { color: colors.textMuted }]}>Ventas totales, transacciones, ticket promedio</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setPreset('custom');
                setIncluirAbc(!incluirAbc);
              }}
              style={[styles.switchItem, { borderColor: colors.surfaceBorder }]}
            >
              <View
                style={[
                  styles.checkboxBox,
                  { borderColor: colors.accentPrimary, backgroundColor: incluirAbc ? colors.accentPrimary : 'transparent' },
                ]}
              >
                {incluirAbc && <View style={styles.checkboxDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Concentración Pareto ABC & Lorenz</Text>
                <Text style={[styles.switchHelp, { color: colors.textMuted }]}>Clasificación 80/20 y top SKUs de facturación</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setPreset('custom');
                setIncluirVendedores(!incluirVendedores);
              }}
              style={[styles.switchItem, { borderColor: colors.surfaceBorder }]}
            >
              <View
                style={[
                  styles.checkboxBox,
                  { borderColor: colors.accentPrimary, backgroundColor: incluirVendedores ? colors.accentPrimary : 'transparent' },
                ]}
              >
                {incluirVendedores && <View style={styles.checkboxDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Desempeño Comercial por Vendedor</Text>
                <Text style={[styles.switchHelp, { color: colors.textMuted }]}>Volumen de ventas y contribución por empleado</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setPreset('custom');
                setIncluirProyeccion(!incluirProyeccion);
              }}
              style={[styles.switchItem, { borderColor: colors.surfaceBorder }]}
            >
              <View
                style={[
                  styles.checkboxBox,
                  { borderColor: colors.accentPrimary, backgroundColor: incluirProyeccion ? colors.accentPrimary : 'transparent' },
                ]}
              >
                {incluirProyeccion && <View style={styles.checkboxDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Proyección Predictiva de Demanda (ML)</Text>
                <Text style={[styles.switchHelp, { color: colors.textMuted }]}>Serie diaria a 14 días con bandas conformales p10-p90</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setPreset('custom');
                setIncluirDiagnostico(!incluirDiagnostico);
              }}
              style={[styles.switchItem, { borderColor: colors.surfaceBorder }]}
            >
              <View
                style={[
                  styles.checkboxBox,
                  { borderColor: colors.accentPrimary, backgroundColor: incluirDiagnostico ? colors.accentPrimary : 'transparent' },
                ]}
              >
                {incluirDiagnostico && <View style={styles.checkboxDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Diagnóstico Estadístico & Stock (ROP)</Text>
                <Text style={[styles.switchHelp, { color: colors.textMuted }]}>WAPE, RMSE, CV, stock de seguridad y punto de reorden</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setPreset('custom');
                setIncluirLinaje(!incluirLinaje);
              }}
              style={[styles.switchItem, { borderColor: colors.surfaceBorder }]}
            >
              <View
                style={[
                  styles.checkboxBox,
                  { borderColor: colors.accentPrimary, backgroundColor: incluirLinaje ? colors.accentPrimary : 'transparent' },
                ]}
              >
                {incluirLinaje && <View style={styles.checkboxDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Linaje de Datos & Gobierno On-Premise</Text>
                <Text style={[styles.switchHelp, { color: colors.textMuted }]}>Auditoría de 16,679 ventas y 0 KB de telemetría externa</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </TactileCard>

      {/* 3. Dictamen y Anotaciones del Analista de Datos */}
      <TactileCard style={{ marginTop: 14 }}>
        <View style={styles.analystHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.accentPrimary }]}>
              DICTAMEN Y RECOMENDACIONES DEL ANALISTA DE DATOS
            </Text>
            <Text style={[styles.cardHelp, { color: colors.textSecondary }]}>
              Incrusta conclusiones ejecutivas, explicaciones de anomalías y sugerencias de compra en el PDF y Excel:
            </Text>
          </View>

          <TactileButton
            title="Generar Borrador Asistido"
            variant="outline"
            onPress={handleGenerateAssistantDraft}
            style={{ minHeight: 34, paddingHorizontal: 10, borderColor: colors.accentPrimary }}
          />
        </View>

        <TextInput
          value={notasAnalista}
          onChangeText={setNotasAnalista}
          placeholder="Escribe aquí las conclusiones, observaciones cualitativas y recomendaciones de compra para la gerencia..."
          placeholderTextColor={colors.textMuted}
          multiline={true}
          numberOfLines={4}
          style={[
            styles.analystInput,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.surfaceBorder,
              color: colors.textPrimary,
            },
          ]}
        />

        <View style={styles.metaRow}>
          <View style={styles.metaInputGroup}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>RESPONSABLE / AUTOR:</Text>
            <TextInput
              value={autorAnalista}
              onChangeText={setAutorAnalista}
              style={[
                styles.metaInput,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.surfaceBorder,
                  color: colors.textPrimary,
                },
              ]}
            />
          </View>

          <View style={styles.metaInputGroup}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>CARGO / ESPECIALIDAD:</Text>
            <TextInput
              value={cargoAnalista}
              onChangeText={setCargoAnalista}
              style={[
                styles.metaInput,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.surfaceBorder,
                  color: colors.textPrimary,
                },
              ]}
            />
          </View>
        </View>
      </TactileCard>

      {/* 4. Artefactos de Exportación */}
      <View style={styles.exportCardsRow}>
        {/* Tarjeta 1: Informe PDF Ejecutivo */}
        <View style={[styles.exportCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <View style={styles.exportHeader}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
              <IconFilePdf size={24} color="#EF4444" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.exportTitle, { color: colors.textPrimary }]}>
                Informe Ejecutivo Gerencial (PDF)
              </Text>
              <Text style={[styles.exportBadge, { color: colors.textMuted }]}>
                Formato Impreso • ReportLab Engine
              </Text>
            </View>
          </View>

          <Text style={[styles.exportDesc, { color: colors.textSecondary }]}>
            Documento estructurado con portada formal, callout con dictamen del analista, KPIs seleccionados,
            rotación ABC y métricas diagnósticas locales.
          </Text>

          <View style={styles.featureList}>
            <Text style={[styles.featureItem, { color: colors.textMuted }]}>• Dictamen firmado por el analista incrustado</Text>
            <Text style={[styles.featureItem, { color: colors.textMuted }]}>• Secciones condicionales según preset elegido</Text>
            <Text style={[styles.featureItem, { color: colors.textMuted }]}>• Código hash de certificación de auditoría local</Text>
          </View>

          <TactileButton
            title={loadingExport === 'pdf' ? 'Generando PDF...' : 'Descargar Informe PDF Certificado'}
            variant="primary"
            loading={loadingExport === 'pdf'}
            onPress={handleDownloadPdf}
            style={{ marginTop: 14 }}
          />
        </View>

        {/* Tarjeta 2: Libro Excel Tidy Data */}
        <View style={[styles.exportCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <View style={styles.exportHeader}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <IconFileExcel size={24} color="#10B981" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.exportTitle, { color: colors.textPrimary }]}>
                Dataset Estructurado Power BI (Excel)
              </Text>
              <Text style={[styles.exportBadge, { color: colors.textMuted }]}>
                Multi-Pestaña • Tidy Data Standard
              </Text>
            </View>
          </View>

          <Text style={[styles.exportDesc, { color: colors.textSecondary }]}>
            Libro de cálculo normalizado con notas del analista en portada, hojas seleccionadas (Ventas, Rotación ABC,
            Pronóstico ML) y datos compatibles con Power BI.
          </Text>

          <View style={styles.featureList}>
            <Text style={[styles.featureItem, { color: colors.textMuted }]}>• Pestaña normalizada 'PowerBI_Tidy_Data'</Text>
            <Text style={[styles.featureItem, { color: colors.textMuted }]}>• Registro de anotaciones en 'KPIs Ejecutivos'</Text>
            <Text style={[styles.featureItem, { color: colors.textMuted }]}>• Registro reproducible de transformaciones</Text>
          </View>

          <TactileButton
            title={loadingExport === 'excel' ? 'Generando Excel...' : 'Descargar Dataset Tidy Data (.xlsx)'}
            variant="primary"
            loading={loadingExport === 'excel'}
            onPress={handleDownloadExcel}
            style={{ marginTop: 14 }}
          />
        </View>
      </View>

      {/* 5. Tarjeta de Culminación de Demostración */}
      <TactileCard style={{ marginTop: 16, borderColor: colors.confidenceHigh, borderWidth: 1.5 }}>
        <View style={styles.resetHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 }}>
              <MetricBadge type="alta_ml" label="CIERRE DE EVALUACIÓN" />
              <Text style={[styles.resetTitle, { color: colors.confidenceHigh }]}>
                CULMINACIÓN DE CICLO DE DEMOSTRACIÓN
              </Text>
            </View>
            <Text style={[styles.resetDesc, { color: colors.textSecondary }]}>
              Al pulsar el botón principal, el ciclo se certifica exitosamente y serás transferido de inmediato al Dashboard Operativo de KPIs (Paso 4), donde se exhibirá la insignia de certificación y la terminal quedará en estado óptimo para el siguiente espectador.
            </Text>
          </View>
        </View>

        <TactileButton
          title="Concluir Demostración y Volver al Dashboard de Control ->"
          variant="primary"
          onPress={() => {
            completeDemoPipeline();
            showToast('Demostración completada: Visualizando Dashboard de Control en vivo.', {
              type: 'success',
              durationMs: 4000,
            });
          }}
          style={{ marginTop: 14 }}
        />

        <TactileButton
          title={resetting ? 'Restableciendo Base de Datos...' : 'Restablecer Todo para Siguiente Evaluador'}
          variant="outline"
          loading={resetting}
          onPress={handleResetForNextEvaluator}
          style={{ marginTop: 10, borderColor: colors.surfaceBorder }}
        />
      </TactileCard>
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
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.heavy,
    fontFamily: typography.fontFamilyMono,
  },
  subtitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    marginTop: 2,
  },
  cardTitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.6,
  },
  cardHelp: {
    fontSize: typography.fontSize.xs,
    marginTop: 2,
    marginBottom: 12,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  presetChip: {
    borderWidth: 1.5,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 180,
  },
  presetChipText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  presetChipSub: {
    fontSize: 10,
    marginTop: 2,
  },
  switchesContainer: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 6,
  },
  switchesTitle: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  switchesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  switchItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '48%',
    minWidth: 260,
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    gap: 8,
  },
  checkboxBox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxDot: {
    width: 6,
    height: 6,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  switchLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  switchHelp: {
    fontSize: 10,
    marginTop: 1,
  },
  analystHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  analystInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    textAlignVertical: 'top',
    minHeight: 80,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaInputGroup: {
    flex: 1,
    minWidth: 200,
  },
  metaLabel: {
    fontSize: 9,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 4,
  },
  metaInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
  },
  exportCardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 14,
  },
  exportCard: {
    flex: 1,
    minWidth: 320,
    padding: 18,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  exportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
  },
  exportBadge: {
    fontSize: 11,
    fontFamily: typography.fontFamilyMono,
    marginTop: 2,
  },
  exportDesc: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
    marginBottom: 12,
  },
  featureList: {
    gap: 4,
    marginBottom: 14,
  },
  featureItem: {
    fontSize: 12,
    fontFamily: typography.fontFamilyMono,
  },
  resetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resetTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.6,
  },
  resetDesc: {
    fontSize: typography.fontSize.xs,
    lineHeight: 18,
  },
});
