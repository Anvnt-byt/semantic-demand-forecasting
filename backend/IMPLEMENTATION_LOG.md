# Bitácora de Implementaciones - Módulo Analítica y Backend

Este documento registra cronológicamente cada componente, servicio y esquema implementado en la rama `feat/backend-analitica`, detallando su propósito, contratos de entrada/salida y consideraciones técnicas.

---

## 1. Contratos y Modelos de Datos (`backend/schemas/analytics.py`)

- **Fecha:** 2026-10-18
- **Archivos creados:**
  - `backend/schemas/__init__.py`
  - `backend/schemas/analytics.py`
- **Propósito:**
  Definir los contratos de datos (`Pydantic v2`) para la comunicación entre la API FastAPI y la aplicación móvil React Native (Pantalla 3: Analítica y Limpieza, y Pantalla 1: Setup/Licencia).
- **Esquemas Implementados:**
  - `KPIsSummaryResponse`: Resumen ejecutivo de ventas totales, ticket promedio, número de transacciones y tasas de crecimiento temporal (diario, mensual, anual).
  - `TemporalComparisonItem` / `TemporalComparisonResponse`: Comparativas de ventas y transacciones en ventanas temporales (día contra día previo, mes contra mes, año contra año).
  - `ProductTurnoverItem` / `ProductsTurnoverResponse`: Análisis de rotación de stock, cálculo de días de inventario, clasificación ABC y alertas de reorden por SKU.
  - `SellerPerformanceItem` / `SellersPerformanceResponse`: Desempeño descriptivo por vendedor (volumen vendido, transacciones, ticket promedio y porcentaje de contribución). *Cumple con la exclusión explícita de evaluaciones predictivas sobre personas.*
  - `ForecastPoint` / `ProductForecastItem` / `DemandForecastResponse`: Salida del modelo predictivo con intervalos empíricos de incertidumbre (`p10`, `p90`), cálculo de stock de seguridad y punto de reorden (ROP). Incluye disclaimer legal de responsabilidad algorítmica.
  - `LicenseVerifyRequest` / `LicenseVerifyResponse`: Verificación de licencias SaaS (Starter, Pro, Enterprise), vigencia temporal y activación de capacidades modulares.
