import { Platform } from 'react-native';
import { MOCK_KPIS, MOCK_PARETO_INVENTORY, MOCK_PREDICT_DEMAND, MOCK_SELLERS } from '../api/mockData';

export const downloadRealExcel = (filename?: string) => {
  const name = filename || `Reporte_Demanda_PowerBI_${new Date().toISOString().split('T')[0]}.csv`;

  // Generate clean Tidy Data CSV with UTF-8 BOM for Microsoft Excel
  let csv = '\uFEFF';
  csv += 'SECCION;FECHA;SKU;PRODUCTO;CLASIFICACION_ABC;PREDICCION_UNIDADES;P10_INFERIOR;P90_SUPERIOR;VENTAS_TOTALES;TICKETS\n';

  // Include forecast data
  MOCK_PREDICT_DEMAND.serie_temporal.forEach((pt) => {
    csv += `Demanda_Predictiva;${pt.fecha};-;Proyeccion Consolidada LightGBM;-;${pt.prediccion};${pt.limite_inferior_p10};${pt.limite_superior_p90};-;\n`;
  });

  // Include Pareto inventory
  MOCK_PARETO_INVENTORY.forEach((inv) => {
    csv += `Inventario_Pareto;${new Date().toISOString().split('T')[0]};${inv.sku};"${inv.nombre}";${inv.clasificacion_abc};-;${inv.stock_actual};${inv.stock_minimo};${inv.pct_contribucion}%;\n`;
  });

  // Include Sellers
  MOCK_SELLERS.forEach((s) => {
    csv += `Desempeno_Vendedores;${new Date().toISOString().split('T')[0]};${s.vendedor_id};"${s.nombre}";-;-;-;-;${s.pct_aporte_tienda}%;${s.tickets_cerrados}\n`;
  });

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return name;
};

export const downloadRealPdf = (filename?: string) => {
  const name = filename || `Informe_Ejecutivo_Demanda_${new Date().toISOString().split('T')[0]}.pdf`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #0F172A; }
    h1 { color: #0284C7; border-bottom: 2px solid #0284C7; padding-bottom: 8px; margin-bottom: 4px; }
    .subtitle { color: #64748B; font-size: 14px; margin-bottom: 24px; }
    .kpi-row { display: flex; gap: 16px; margin-bottom: 24px; }
    .kpi-card { border: 1px solid #CBD5E1; border-radius: 8px; padding: 16px; flex: 1; background: #F8FAFC; }
    .kpi-title { font-size: 12px; font-weight: bold; color: #64748B; text-transform: uppercase; }
    .kpi-value { font-size: 24px; font-weight: bold; color: #0F172A; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
    th, td { border: 1px solid #CBD5E1; padding: 8px 12px; text-align: left; }
    th { background: #F1F5F9; font-weight: bold; }
    .badge-a { background: #DCFCE7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
    .badge-b { background: #E0F2FE; color: #075985; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
    .badge-c { background: #F1F5F9; color: #475569; padding: 2px 6px; border-radius: 4px; }
    .footer { margin-top: 40px; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 12px; }
  </style>
</head>
<body>
  <h1>POSBUDDY - INFORME EJECUTIVO DE DEMANDA PREDICTIVA</h1>
  <div class="subtitle">Generado el ${new Date().toLocaleDateString('es-MX')} • Procesamiento Local Seguro LightGBM</div>

  <div class="kpi-row">
    <div class="kpi-card">
      <div class="kpi-title">Ventas del Mes</div>
      <div class="kpi-value">$${MOCK_KPIS.ventas_mes.toLocaleString('es-MX')}</div>
      <div style="color: #059669; font-size: 12px;">+${MOCK_KPIS.crecimiento_mensual_pct}% vs mes anterior</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Total Transacciones</div>
      <div class="kpi-value">${MOCK_KPIS.total_transacciones.toLocaleString()}</div>
      <div style="color: #059669; font-size: 12px;">+${MOCK_KPIS.crecimiento_diario_pct}% diario</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Ticket Promedio</div>
      <div class="kpi-value">$${MOCK_KPIS.ticket_promedio.toFixed(2)}</div>
    </div>
  </div>

  <h2>Proyección de Demanda LightGBM (14 Días)</h2>
  <table>
    <tr><th>Fecha</th><th>Predicción (Unidades)</th><th>Límite Inferior P10</th><th>Límite Superior P90</th></tr>
    ${MOCK_PREDICT_DEMAND.serie_temporal
      .map(
        (pt) =>
          `<tr><td>${pt.fecha}</td><td><b>${pt.prediccion}</b></td><td>${pt.limite_inferior_p10}</td><td>${pt.limite_superior_p90}</td></tr>`
      )
      .join('')}
  </table>

  <h2>Inventario Pareto ABC</h2>
  <table>
    <tr><th>SKU</th><th>Producto</th><th>Clasificación</th><th>% Aporte</th><th>Stock Actual</th></tr>
    ${MOCK_PARETO_INVENTORY.map(
      (inv) =>
        `<tr><td>${inv.sku}</td><td>${inv.nombre}</td><td><span class="badge-${inv.clasificacion_abc.toLowerCase()}">${inv.clasificacion_abc}</span></td><td>${inv.pct_contribucion}%</td><td>${inv.stock_actual} / ${inv.stock_minimo}</td></tr>`
    ).join('')}
  </table>

  <div class="footer">
    ${MOCK_PREDICT_DEMAND.disclaimer}
  </div>

  <script>
    // Automatically trigger print dialog for saving as PDF
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    } else {
      // Fallback: download HTML blob
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', name.replace('.pdf', '.html'));
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  return name;
};
