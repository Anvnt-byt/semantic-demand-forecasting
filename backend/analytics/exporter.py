import io
import logging
from datetime import datetime
from typing import Optional
import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle
)

from schemas.analytics import (
    KPIsSummaryResponse,
    ProductsTurnoverResponse,
    SellersPerformanceResponse,
    ExportConfigPayload
)

logger = logging.getLogger(__name__)

def generate_excel_report(
    kpis: KPIsSummaryResponse,
    turnover: ProductsTurnoverResponse,
    sellers: SellersPerformanceResponse,
    config: Optional[ExportConfigPayload] = None,
    forecast_data: Optional[dict] = None
) -> io.BytesIO:
    """
    Genera un archivo Excel (.xlsx) estructurado en memoria con pestañas dedicadas
    para KPIs Ejecutivos, Rotación de Stock (ABC), Desempeño de Vendedores,
    Pronóstico ML y Auditoría según la configuración modular solicitada.
    """
    cfg = config or ExportConfigPayload()
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        # Pestaña 1: Resumen de KPIs & Anotaciones del Analista
        kpis_data = []
        if cfg.notas_analista and cfg.notas_analista.strip():
            kpis_data.append({"Métrica": "DICTAMEN DEL ANALISTA", "Valor": cfg.notas_analista.strip()})
            kpis_data.append({"Métrica": "RESPONSABLE", "Valor": f"{cfg.autor_analista} ({cfg.cargo_analista})"})
            kpis_data.append({"Métrica": "FECHA DICTAMEN", "Valor": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")})
            kpis_data.append({"Métrica": "---", "Valor": "---"})
        
        if cfg.incluir_kpis:
            kpis_data.extend([
                {"Métrica": "Ventas Totales", "Valor": f"${kpis.ventas_totales:,.2f}"},
                {"Métrica": "Total de Transacciones", "Valor": f"{kpis.total_transacciones:,}"},
                {"Métrica": "Ticket Promedio", "Valor": f"${kpis.ticket_promedio:,.2f}"},
                {"Métrica": "Crecimiento vs Día Anterior", "Valor": f"{kpis.crecimiento_dia_pct}%" if kpis.crecimiento_dia_pct is not None else "N/A"},
                {"Métrica": "Crecimiento vs Mes Anterior", "Valor": f"{kpis.crecimiento_mes_pct}%" if kpis.crecimiento_mes_pct is not None else "N/A"},
                {"Métrica": "Crecimiento vs Año Anterior", "Valor": f"{kpis.crecimiento_ano_pct}%" if kpis.crecimiento_ano_pct is not None else "N/A"},
                {"Métrica": "Fecha de Corte", "Valor": kpis.fecha_corte.strftime("%Y-%m-%d %H:%M:%S")},
            ])
        
        if kpis_data:
            df_kpis = pd.DataFrame(kpis_data)
            df_kpis.to_excel(writer, sheet_name="KPIs Ejecutivos", index=False)

        # Pestaña 2: Rotación de Productos (Clasificación ABC)
        if cfg.incluir_abc:
            turnover_rows = []
            for p in turnover.productos:
                turnover_rows.append({
                    "SKU": p.sku,
                    "Descripción": p.descripcion,
                    "Unidades Vendidas": p.unidades_vendidas,
                    "Ingresos Generados": p.ingresos,
                    "Contribución %": f"{p.pct_contribucion}%",
                    "Acumulado % (Lorenz)": f"{p.pct_acumulado}%",
                    "Stock Actual": p.stock_actual,
                    "Días Estimados Inventario": p.dias_inventario if p.dias_inventario is not None else "Sin rotación",
                    "Días Sin Venta": p.dias_sin_venta if p.dias_sin_venta is not None else "N/A",
                    "Clasificación ABC": p.clasificacion_abc,
                    "Alerta de Reorden": "SÍ" if p.alerta_reorden else "NO"
                })
            df_turnover = pd.DataFrame(turnover_rows)
            if df_turnover.empty:
                df_turnover = pd.DataFrame(columns=[
                    "SKU", "Descripción", "Unidades Vendidas", "Ingresos Generados",
                    "Contribución %", "Acumulado % (Lorenz)", "Stock Actual",
                    "Días Estimados Inventario", "Días Sin Venta", "Clasificación ABC", "Alerta de Reorden"
                ])
            df_turnover.to_excel(writer, sheet_name="Rotación y Stock", index=False)

        # Pestaña 3: Rendimiento por Vendedor
        if cfg.incluir_vendedores:
            sellers_rows = []
            for s in sellers.vendedores:
                sellers_rows.append({
                    "ID Vendedor": s.id_vendedor,
                    "Nombre": s.nombre,
                    "Total Ventas": s.total_ventas,
                    "Transacciones": s.numero_transacciones,
                    "Ticket Promedio": s.ticket_promedio,
                    "Contribución %": f"{s.porcentaje_contribucion}%"
                })
            df_sellers = pd.DataFrame(sellers_rows)
            if df_sellers.empty:
                df_sellers = pd.DataFrame(columns=[
                    "ID Vendedor", "Nombre", "Total Ventas", "Transacciones", "Ticket Promedio", "Contribución %"
                ])
            df_sellers.to_excel(writer, sheet_name="Vendedores", index=False)

        # Pestaña 4: Pronóstico ML (si se incluye)
        if cfg.incluir_proyeccion and forecast_data:
            serie = forecast_data.get("serie_temporal", [])
            fc_rows = []
            for pt in serie:
                fc_rows.append({
                    "Fecha": pt.get("fecha"),
                    "Demanda Predicha": pt.get("prediccion"),
                    "Banda Conformal p10": pt.get("p10"),
                    "Banda Conformal p90": pt.get("p90")
                })
            df_fc = pd.DataFrame(fc_rows)
            if not df_fc.empty:
                df_fc.to_excel(writer, sheet_name="Pronostico_ML", index=False)

        # Pestaña 5: Auditoría y Linaje de Datos
        if cfg.incluir_linaje:
            linaje_rows = [
                {"Parámetro": "Transacciones Auditadas", "Detalle": f"{kpis.total_transacciones:,} operaciones POS"},
                {"Parámetro": "SKUs Analizados", "Detalle": f"{turnover.total_skus_analizados} productos comerciales"},
                {"Parámetro": "Motor Predictivo", "Detalle": "LightGBM + Inferencia Conformal Local"},
                {"Parámetro": "Almacenamiento y Cómputo", "Detalle": "SQLite / PostgreSQL On-Premise"},
                {"Parámetro": "Telemetría Cloud Externa", "Detalle": "0 KB (100% Aislado y Seguro)"},
            ]
            df_linaje = pd.DataFrame(linaje_rows)
            df_linaje.to_excel(writer, sheet_name="Auditoria_Linaje", index=False)

        # Pestaña 6: Datos Normalizados Planos (Aptos para Power BI, Tableau, Pandas)
        tidy_rows = []
        corte_iso = kpis.fecha_corte.strftime("%Y-%m-%d")
        for p in turnover.productos:
            tidy_rows.append({
                "fecha_corte": corte_iso,
                "sku": p.sku,
                "descripcion": p.descripcion,
                "unidades_vendidas": p.unidades_vendidas,
                "ingresos_totales": p.ingresos,
                "pct_contribucion_ingresos": p.pct_contribucion,
                "pct_acumulado_lorenz": p.pct_acumulado,
                "stock_actual": p.stock_actual,
                "dias_inventario_restante": p.dias_inventario,
                "dias_sin_venta": p.dias_sin_venta,
                "clasificacion_abc": p.clasificacion_abc,
                "alerta_reorden": 1 if p.alerta_reorden else 0
            })
        df_tidy = pd.DataFrame(tidy_rows)
        if df_tidy.empty:
            df_tidy = pd.DataFrame(columns=[
                "fecha_corte", "sku", "descripcion", "unidades_vendidas", "ingresos_totales",
                "pct_contribucion_ingresos", "pct_acumulado_lorenz", "stock_actual",
                "dias_inventario_restante", "dias_sin_venta", "clasificacion_abc", "alerta_reorden"
            ])
        df_tidy.to_excel(writer, sheet_name="PowerBI_Tidy_Data", index=False)

    output.seek(0)
    return output

def generate_pdf_report(
    kpis: KPIsSummaryResponse,
    turnover: ProductsTurnoverResponse,
    sellers: SellersPerformanceResponse,
    config: Optional[ExportConfigPayload] = None,
    forecast_data: Optional[dict] = None
) -> io.BytesIO:
    """
    Genera un informe ejecutivo consolidado en PDF en memoria según la configuración modular.
    """
    cfg = config or ExportConfigPayload()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#1A365D"),
        spaceAfter=8
    )
    section_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontSize=12,
        leading=15,
        textColor=colors.HexColor("#2B6CB0"),
        spaceBefore=12,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#2D3748")
    )
    analyst_header_style = ParagraphStyle(
        'AnalystHeader',
        parent=styles['Heading3'],
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#1A365D"),
        spaceAfter=3
    )
    analyst_meta_style = ParagraphStyle(
        'AnalystMeta',
        parent=styles['Italic'],
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#4A5568"),
        spaceAfter=6
    )
    analyst_text_style = ParagraphStyle(
        'AnalystText',
        parent=styles['Normal'],
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1A202C")
    )
    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        parent=styles['Italic'],
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#718096"),
        spaceBefore=14
    )

    elements = []

    # Encabezado
    elements.append(Paragraph("Reporte Ejecutivo de Rendimiento y Rotación", title_style))
    elements.append(Paragraph(f"Fecha de corte: {kpis.fecha_corte.strftime('%d/%m/%Y %H:%M:%S')} | Herramienta de Análisis POS On-Premise", body_style))
    elements.append(Spacer(1, 8))

    # Anotaciones / Dictamen del Analista (Callout Box)
    if cfg.notas_analista and cfg.notas_analista.strip():
        callout_content = [
            Paragraph("DICTAMEN Y RECOMENDACIONES DEL ANALISTA DE DATOS", analyst_header_style),
            Paragraph(f"Responsable: {cfg.autor_analista} | Cargo: {cfg.cargo_analista} | Fecha: {datetime.utcnow().strftime('%d/%m/%Y')}", analyst_meta_style),
            Paragraph(cfg.notas_analista.strip().replace("\n", "<br/>"), analyst_text_style)
        ]
        t_callout = Table([[callout_content]], colWidths=[530])
        t_callout.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F7FAFC")),
            ('BOX', (0, 0), (-1, -1), 1.2, colors.HexColor("#2B6CB0")),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ]))
        elements.append(t_callout)
        elements.append(Spacer(1, 8))

    # Sección 1: KPIs
    if cfg.incluir_kpis:
        elements.append(Paragraph("1. Métricas Clave de Negocio (KPIs)", section_style))
        kpi_table_data = [
            ["Métrica", "Valor", "Métrica", "Valor"],
            ["Ventas Totales:", f"${kpis.ventas_totales:,.2f}", "Transacciones:", f"{kpis.total_transacciones:,}"],
            ["Ticket Promedio:", f"${kpis.ticket_promedio:,.2f}", "Crecimiento Diario:", f"{kpis.crecimiento_dia_pct or 0.0}%"],
            ["Crecimiento Mensual:", f"{kpis.crecimiento_mes_pct or 0.0}%", "Crecimiento Anual:", f"{kpis.crecimiento_ano_pct or 0.0}%"]
        ]
        t_kpis = Table(kpi_table_data, colWidths=[120, 145, 120, 145])
        t_kpis.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#EDF2F7")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#1A202C")),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E0")),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
        ]))
        elements.append(t_kpis)
        elements.append(Spacer(1, 8))

    # Sección 2: Resumen ABC y Alertas
    if cfg.incluir_abc:
        elements.append(Paragraph("2. Rotación de Inventario y Concentración (Pareto ABC)", section_style))
        elements.append(Paragraph(
            f"Total de SKUs evaluados: {turnover.total_skus_analizados} | "
            f"Categoría A (Alta rotación): {turnover.resumen_abc.get('A', 0)} | "
            f"Categoría B (Media): {turnover.resumen_abc.get('B', 0)} | "
            f"Categoría C (Baja): {turnover.resumen_abc.get('C', 0)}",
            body_style
        ))
        elements.append(Spacer(1, 5))

        top_turnover = turnover.productos[:10]
        turnover_table_data = [["SKU", "Descripción", "Ingresos", "Stock", "Días Inv.", "ABC", "Reorden"]]
        for p in top_turnover:
            turnover_table_data.append([
                p.sku[:10],
                p.descripcion[:22],
                f"${p.ingresos:,.2f}",
                str(int(p.stock_actual)),
                str(p.dias_inventario) if p.dias_inventario is not None else "-",
                p.clasificacion_abc,
                "ALERTA" if p.alerta_reorden else "OK"
            ])
        if len(turnover_table_data) > 1:
            t_turnover = Table(turnover_table_data, colWidths=[65, 155, 80, 55, 55, 45, 75])
            t_turnover.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E0")),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ]))
            elements.append(t_turnover)
            elements.append(Spacer(1, 8))

    # Sección 3: Ventas por Vendedor
    if cfg.incluir_vendedores:
        elements.append(Paragraph("3. Desempeño Comercial por Vendedor", section_style))
        top_sellers = sellers.vendedores[:6]
        sellers_table_data = [["ID", "Nombre", "Total Ventas", "Transacciones", "Ticket Prom.", "% Total"]]
        for s in top_sellers:
            sellers_table_data.append([
                s.id_vendedor[:8],
                s.nombre[:20],
                f"${s.total_ventas:,.2f}",
                str(s.numero_transacciones),
                f"${s.ticket_promedio:,.2f}",
                f"{s.porcentaje_contribucion}%"
            ])
        if len(sellers_table_data) > 1:
            t_sellers = Table(sellers_table_data, colWidths=[65, 165, 90, 70, 70, 70])
            t_sellers.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E0")),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ]))
            elements.append(t_sellers)
            elements.append(Spacer(1, 8))

    # Sección 4: Proyección Predictiva y Diagnóstico ML
    if cfg.incluir_proyeccion and forecast_data:
        elements.append(Paragraph("4. Inteligencia Predictiva & Diagnóstico ML (Supervisado)", section_style))
        diag = forecast_data.get("metricas_diagnosticas", {})
        diag_table_data = [
            ["Métrica Estadística", "Valor Calibrado", "Métrica de Inventario", "Valor Sugerido"],
            ["Error WAPE (Out-of-Sample):", f"{diag.get('wape', 0)}%", "Stock de Seguridad:", f"{diag.get('stock_seguridad', 0)} un."],
            ["Error RMSE:", f"{diag.get('rmse', 0)} un.", "Punto de Reorden (ROP):", f"{diag.get('punto_reorden', 0)} un."],
            ["Coeficiente Variación (CV):", f"{diag.get('cv', 0)}", "Lead Time Aplicado:", f"{diag.get('lead_time_aplicado', 0)} días"]
        ]
        t_diag = Table(diag_table_data, colWidths=[130, 135, 130, 135])
        t_diag.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E0")),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(t_diag)
        elements.append(Spacer(1, 8))

    # Sección 5: Linaje y Certificación On-Premise
    if cfg.incluir_linaje:
        elements.append(Paragraph("5. Certificación de Gobierno de Datos & Integridad On-Premise", section_style))
        linaje_data = [
            ["Parámetro de Integridad", "Especificación Técnica"],
            ["Volumen Auditado:", f"{kpis.total_transacciones:,} transacciones POS locales"],
            ["Cobertura Comercial:", f"{turnover.total_skus_analizados} SKUs catalogados"],
            ["Motor Predictivo:", "LightGBM + Inferencia Conformal Local (Sin API Cloud Externa)"],
            ["Privacidad y Ciberseguridad:", "100% On-Premise • Cero Telemetría • Cero Fugas de Información"]
        ]
        t_linaje = Table(linaje_data, colWidths=[160, 370])
        t_linaje.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#EDF2F7")),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E0")),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(t_linaje)

    # Aviso Legal / EULA
    elements.append(Paragraph(
        "Aviso de Privacidad y Responsabilidad: Este reporte ha sido generado localmente a partir de la base de datos interna. "
        "Ningún dato financiero o comercial es transmitido ni almacenado fuera del entorno local del cliente. Las estimaciones de stock y rotación son de carácter analítico.",
        disclaimer_style
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer
