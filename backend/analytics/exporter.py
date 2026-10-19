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
    SellersPerformanceResponse
)

logger = logging.getLogger(__name__)

def generate_excel_report(
    kpis: KPIsSummaryResponse,
    turnover: ProductsTurnoverResponse,
    sellers: SellersPerformanceResponse
) -> io.BytesIO:
    """
    Genera un archivo Excel (.xlsx) estructurado en memoria con pestañas dedicadas
    para KPIs Ejecutivos, Rotación de Stock (ABC) y Desempeño de Vendedores.
    """
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        # Pestaña 1: Resumen de KPIs
        kpis_data = [
            {"Métrica": "Ventas Totales", "Valor": f"${kpis.ventas_totales:,.2f}"},
            {"Métrica": "Total de Transacciones", "Valor": f"{kpis.total_transacciones:,}"},
            {"Métrica": "Ticket Promedio", "Valor": f"${kpis.ticket_promedio:,.2f}"},
            {"Métrica": "Crecimiento vs Día Anterior", "Valor": f"{kpis.crecimiento_dia_pct}%" if kpis.crecimiento_dia_pct is not None else "N/A"},
            {"Métrica": "Crecimiento vs Mes Anterior", "Valor": f"{kpis.crecimiento_mes_pct}%" if kpis.crecimiento_mes_pct is not None else "N/A"},
            {"Métrica": "Crecimiento vs Año Anterior", "Valor": f"{kpis.crecimiento_ano_pct}%" if kpis.crecimiento_ano_pct is not None else "N/A"},
            {"Métrica": "Fecha de Corte", "Valor": kpis.fecha_corte.strftime("%Y-%m-%d %H:%M:%S")},
        ]
        df_kpis = pd.DataFrame(kpis_data)
        df_kpis.to_excel(writer, sheet_name="KPIs Ejecutivos", index=False)

        # Pestaña 2: Rotación de Productos (Clasificación ABC)
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

        # Pestaña 4: Datos Normalizados Planos (Aptos para Power BI, Tableau, Pandas)
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
    sellers: SellersPerformanceResponse
) -> io.BytesIO:
    """
    Genera un informe ejecutivo consolidado en PDF en memoria.
    """
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
        spaceAfter=12
    )
    section_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#2B6CB0"),
        spaceBefore=14,
        spaceAfter=8
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#2D3748")
    )
    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        parent=styles['Italic'],
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#718096"),
        spaceBefore=20
    )

    elements = []

    # Encabezado
    elements.append(Paragraph("Reporte Ejecutivo de Rendimiento y Rotación", title_style))
    elements.append(Paragraph(f"Fecha de corte: {kpis.fecha_corte.strftime('%d/%m/%Y %H:%M:%S')} | Herramienta de Análisis POS", body_style))
    elements.append(Spacer(1, 10))

    # Sección 1: KPIs
    elements.append(Paragraph("1. Métricas Clave de Negocio", section_style))
    kpi_table_data = [
        ["Métrica", "Valor", "Métrica", "Valor"],
        ["Ventas Totales:", f"${kpis.ventas_totales:,.2f}", "Transacciones:", f"{kpis.total_transacciones:,}"],
        ["Ticket Promedio:", f"${kpis.ticket_promedio:,.2f}", "Crecimiento Diario:", f"{kpis.crecimiento_dia_pct or 0.0}%"],
        ["Crecimiento Mensual:", f"{kpis.crecimiento_mes_pct or 0.0}%", "Crecimiento Anual:", f"{kpis.crecimiento_ano_pct or 0.0}%"]
    ]
    t_kpis = Table(kpi_table_data, colWidths=[120, 130, 120, 130])
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
    elements.append(Spacer(1, 10))

    # Sección 2: Resumen ABC y Alertas
    elements.append(Paragraph("2. Rotación de Inventario (Resumen ABC)", section_style))
    elements.append(Paragraph(
        f"Total de SKUs evaluados: {turnover.total_skus_analizados} | "
        f"Categoría A (Alta rotación): {turnover.resumen_abc.get('A', 0)} | "
        f"Categoría B (Media): {turnover.resumen_abc.get('B', 0)} | "
        f"Categoría C (Baja): {turnover.resumen_abc.get('C', 0)}",
        body_style
    ))
    elements.append(Spacer(1, 6))

    top_turnover = turnover.productos[:10]  # Top 10 productos
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
        t_turnover = Table(turnover_table_data, colWidths=[60, 150, 80, 55, 55, 45, 55])
        t_turnover.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E0")),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(t_turnover)

    # Sección 3: Ventas por Vendedor
    elements.append(Paragraph("3. Desempeño por Vendedor", section_style))
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
        t_sellers = Table(sellers_table_data, colWidths=[60, 160, 90, 70, 70, 50])
        t_sellers.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E0")),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(t_sellers)

    # Aviso Legal / EULA
    elements.append(Paragraph(
        "Aviso de Privacidad y Responsabilidad: Este reporte ha sido generado localmente a partir de la base de datos interna PostgreSQL. "
        "Ningún dato financiero o comercial es transmitido ni almacenado fuera del entorno local del cliente. Las estimaciones de stock y rotación son de carácter informativo.",
        disclaimer_style
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer
