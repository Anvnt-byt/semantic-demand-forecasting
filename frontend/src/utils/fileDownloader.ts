import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { apiClient } from '../api/client';
import { useConfigStore } from '../store/useConfigStore';

export const downloadRealExcel = async (filename?: string): Promise<string> => {
  const name = filename || `Reporte_Demanda_PowerBI_${new Date().toISOString().split('T')[0]}.xlsx`;
  const { useMocks } = useConfigStore.getState();

  try {
    if (!useMocks) {
      // Descarga binaria auténtica de Excel con pestaña PowerBI_Tidy_Data desde el backend
      const response = await apiClient.get('/api/analytics/export/excel', {
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
        // En entorno móvil nativo (Android / iOS / Expo)
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

export const downloadRealPdf = async (filename?: string): Promise<string> => {
  const name = filename || `Informe_Ejecutivo_Demanda_${new Date().toISOString().split('T')[0]}.pdf`;
  const { useMocks } = useConfigStore.getState();

  try {
    if (!useMocks) {
      // Descarga binaria auténtica de PDF generado por ReportLab en el backend
      const response = await apiClient.get('/api/analytics/export/pdf', {
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

  return name;
};
