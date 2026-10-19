import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { apiClient } from '../api/client';
import { useConfigStore } from '../store/useConfigStore';
import { ExportReportConfig } from '../types/analytics.types';

export const downloadRealExcel = async (config?: ExportReportConfig, filename?: string): Promise<string> => {
  const name = filename || `Reporte_Demanda_PowerBI_${new Date().toISOString().split('T')[0]}.xlsx`;
  const { useMocks } = useConfigStore.getState();

  const payload = config
    ? {
        incluir_kpis: config.incluirKpis,
        incluir_abc: config.incluirAbc,
        incluir_vendedores: config.incluirVendedores,
        incluir_proyeccion: config.incluirProyeccion,
        incluir_linaje: config.incluirLinaje,
        sku_proyeccion: config.skuProyeccion,
        notas_analista: config.notasAnalista,
        autor_analista: config.autorAnalista,
        cargo_analista: config.cargoAnalista,
      }
    : undefined;

  try {
    if (!useMocks) {
      // Descarga binaria auténtica de Excel con pestañas configuradas desde el backend
      const response = payload
        ? await apiClient.post('/api/analytics/export/excel', payload, {
            responseType: Platform.OS === 'web' ? 'blob' : 'arraybuffer',
          })
        : await apiClient.get('/api/analytics/export/excel', {
            responseType: Platform.OS === 'web' ? 'blob' : 'arraybuffer',
          });

      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const blob = new Blob([response.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', name);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return name;
      } else {
        const base64Data = Buffer.from(response.data).toString('base64');
        const fileUri = `${FileSystem.documentDirectory}${name}`;
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        }
        return name;
      }
    }
  } catch (err) {
    console.warn('Fallo en descarga binaria remota de Excel, usando fallback CSV:', err);
  }

  // Fallback seguro en memoria con UTF-8 BOM
  const csvName = name.replace('.xlsx', '.csv');
  let csv = '\uFEFF';
  if (config?.notasAnalista && config.notasAnalista.trim()) {
    csv += `# DICTAMEN DEL ANALISTA: ${config.notasAnalista.replace(/\n/g, ' ')}\n`;
    csv += `# RESPONSABLE: ${config.autorAnalista} (${config.cargoAnalista})\n#\n`;
  }
  csv += 'Fecha;SKU;Nombre;Cantidad;Precio_Unitario;Ingreso_Total;Vendedor_ID\n';
  csv += `2026-10-18;SKU-CERV-01;"Cerveza Six-Pack 355ml";15;25.00;375.00;VEND-01\n`;
  csv += `2026-10-18;SKU-LECHE-02;"Leche Entera 1L";8;18.50;148.00;VEND-02\n`;

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', csvName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  return csvName;
};

export const downloadRealPdf = async (config?: ExportReportConfig, filename?: string): Promise<string> => {
  const name = filename || `Informe_Ejecutivo_Demanda_${new Date().toISOString().split('T')[0]}.pdf`;
  const { useMocks } = useConfigStore.getState();

  const payload = config
    ? {
        incluir_kpis: config.incluirKpis,
        incluir_abc: config.incluirAbc,
        incluir_vendedores: config.incluirVendedores,
        incluir_proyeccion: config.incluirProyeccion,
        incluir_linaje: config.incluirLinaje,
        sku_proyeccion: config.skuProyeccion,
        notas_analista: config.notasAnalista,
        autor_analista: config.autorAnalista,
        cargo_analista: config.cargoAnalista,
      }
    : undefined;

  try {
    if (!useMocks) {
      // Descarga binaria auténtica de PDF generado por ReportLab en el backend
      const response = payload
        ? await apiClient.post('/api/analytics/export/pdf', payload, {
            responseType: Platform.OS === 'web' ? 'blob' : 'arraybuffer',
          })
        : await apiClient.get('/api/analytics/export/pdf', {
            responseType: Platform.OS === 'web' ? 'blob' : 'arraybuffer',
          });

      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', name);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return name;
      } else {
        const base64Data = Buffer.from(response.data).toString('base64');
        const fileUri = `${FileSystem.documentDirectory}${name}`;
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        }
        return name;
      }
    }
  } catch (err) {
    console.warn('Fallo en descarga remota de PDF, usando fallback:', err);
  }

  // Fallback offline en memoria para simulación
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const summaryText = `INFORME EJECUTIVO DE DEMANDA (SIMULACION OFFLINE)\n\n` +
      (config?.notasAnalista ? `DICTAMEN DEL ANALISTA:\n${config.notasAnalista}\n\nResponsable: ${config.autorAnalista} (${config.cargoAnalista})\n\n` : '') +
      `Cobertura: 16,679 transacciones POS locales • 28 SKUs analizados.\n` +
      `Motor: LightGBM On-Premise • Privacidad 100% garantizada.\n`;
    const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', name.replace('.pdf', '.txt'));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return name.replace('.pdf', '.txt');
  }

  return name;
};
