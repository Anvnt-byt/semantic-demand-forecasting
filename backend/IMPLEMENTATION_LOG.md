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

---

## 2. Capa de Base de Datos y Consultas Analíticas (`backend/analytics/`)

- **Fecha:** 2026-10-18
- **Archivos creados/modificados:**
  - `backend/analytics/__init__.py`
  - `backend/analytics/db.py`
  - `backend/analytics/metrics.py`
  - `backend/requirements.txt` (adición de `sqlalchemy`, `psycopg2-binary`, `openpyxl`, `reportlab`)
- **Propósito:**
  Establecer la conexión nativa hacia la base interna PostgreSQL y computar métricas ejecutivas en memoria mediante Polars, minimizando el impacto en recursos del servidor local.
- **Funcionalidades Implementadas:**
  - `get_database_url` y `query_to_polars`: Conexión mediante pool singleton SQLAlchemy y conversión vectorizada hacia DataFrames de Polars.
  - `calculate_kpis_summary`: Cálculo de facturación agregada, tickets, ticket promedio y cálculo de delta porcentual contra periodos base (día anterior, mes anterior y año anterior) con tolerancia a datasets vacíos.
  - `calculate_temporal_comparison`: Agrupación dinámica por intervalos (`dia`, `semana`, `mes`, `ano`) y cálculo de variaciones secuenciales.
  - `calculate_products_turnover`: Clasificación ABC de productos basada en la regla de Pareto (80/15/5), cálculo de velocidad de venta diaria, estimación de días restantes de inventario y bandera booleana de alerta de reorden.
  - `calculate_sellers_performance`: Cálculo descriptivo de participación por vendedor respecto a la facturación global de la tienda.

---

## 3. Adaptación del Motor Predictivo (`backend/analytics/forecasting.py`)

- **Fecha:** 2026-10-18
- **Archivos creados:**
  - `backend/analytics/forecasting.py`
- **Propósito:**
  Extraer series temporales históricas de ventas por producto desde la base de datos interna PostgreSQL y generar pronósticos de demanda a horizontes de 7, 14 o 30 días, integrando intervalos empíricos de incertidumbre y métricas de inventario (stock de seguridad y punto de reorden).
- **Funcionalidades Implementadas:**
  - Concurrencia acotada con `threading.BoundedSemaphore(2)` y recolección forzada de basura (`gc.collect`) para proteger la memoria del servidor local.
  - Extracción y agregación diaria en SQL (`v.sku` como `unique_id`, `DATE(v.fecha)` como `ds`, `SUM(v.cantidad)` como `y`).
  - Imputación cronológica con `utilsforecast.preprocessing.fill_gaps`.
  - Hiperparámetros dinámicos para `LGBMRegressor` según la densidad de filas y series maduras.
  - Intervalos de incertidumbre conformal (`p10`, `p90`) acotados estrictamente a valores no negativos (`>= 0`).
  - Cálculo automático de Stock de Seguridad (nivel de servicio 95%) y Punto de Reorden (ROP) cuando se proporciona el tiempo de entrega de proveedores (`lead_time`).

---

## 4. Módulo de Exportación Multiformato (`backend/analytics/exporter.py`)

- **Fecha:** 2026-10-18
- **Archivos creados:**
  - `backend/analytics/exporter.py`
- **Propósito:**
  Generar reportes ejecutivos consolidados en memoria (`io.BytesIO`) en formatos Excel (`.xlsx`) y PDF sin dejar archivos residuales en el disco local del cliente.
- **Funcionalidades Implementadas:**
  - `generate_excel_report`: Creación de libro Excel multi-pestaña con `openpyxl`:
    - Pestaña 1: "KPIs Ejecutivos" (Ventas, tickets, variaciones día/mes/año).
    - Pestaña 2: "Rotación y Stock" (Inventario, días de stock, Pareto ABC, alertas).
    - Pestaña 3: "Vendedores" (Participación porcentual y ticket promedio).
  - `generate_pdf_report`: Generación de documento PDF ejecutivo mediante `reportlab.platypus` con tablas formateadas, paleta sobria de colores, fecha de corte, desglose de inventario y leyenda legal de EULA/privacidad local.

---

## 5. Servicio de Validación de Licencias SaaS (`backend/analytics/license.py`)

- **Fecha:** 2026-10-18
- **Archivos creados:**
  - `backend/analytics/license.py`
- **Propósito:**
  Gestionar la validación y activación de suscripciones comerciales de forma 100% offline y local, garantizando la privacidad del punto de venta sin depender de conexiones remotas a la nube.
- **Funcionalidades Implementadas:**
  - `verify_license`: Verificación con doble mecanismo:
    1. Soporte para claves demo/desarrollo (`TC-STARTER-DEMO-2027`, `TC-PRO-DEMO-2027`, `TC-ENTERPRISE-DEMO-2027`).
    2. Algoritmo criptográfico HMAC-SHA256 para formato comercial `TC-<PLAN>-<YYYYMMDD>-<HASH8>`, validando fecha de expiración y concordancia con el identificador único de terminal (`pos_identifier`).
  - Matriz de características por nivel de plan (Starter, Pro, Enterprise), desacoplando qué endpoints y capacidades se activan según la suscripción.

---

## 6. Enrutador de FastAPI e Integración de Endpoints (`backend/analytics/router.py`, `backend/main.py`)

- **Fecha:** 2026-10-18
- **Archivos creados/modificados:**
  - `backend/analytics/router.py`
  - `backend/main.py`
  - `backend/.env.example`
- **Propósito:**
  Exponer los servicios analíticos y de licenciamiento a través de rutas RESTful en FastAPI, configuradas con control de tasa (`slowapi`), manejo de errores y compatibilidad CORS para la app React Native.
- **Rutas Registradas:**
  - `GET /api/analytics/kpis`: Retorna resumen ejecutivo con métricas de ventas y deltas temporales.
  - `GET /api/analytics/temporal-comparison`: Evolución secuencial y variación porcentual (día, semana, mes, año).
  - `GET /api/analytics/inventory-turnover`: Clasificación ABC de productos, rotación y alertas de reposición.
  - `GET /api/analytics/sellers`: Reporte descriptivo de ventas acumuladas por vendedor y porcentaje de aporte.
  - `POST /api/analytics/predict-demand`: Disparo del pipeline predictivo LightGBM desde PostgreSQL con semáforo de concurrencia.
  - `GET /api/analytics/export/excel`: Descarga en streaming del reporte multi-pestaña en formato `.xlsx`.
  - `GET /api/analytics/export/pdf`: Descarga en streaming del informe ejecutivo estructurado en `.pdf`.
  - `POST /api/license/verify`: Endpoint de activación y verificación de licencia para la Pantalla 1 (Setup) de la aplicación móvil.

---

## 7. Refinamientos de Escalabilidad y Casos Reales (`backend/analytics/forecasting.py`, `backend/schemas/analytics.py`)

- **Fecha:** 2026-10-18
- **Archivos modificados:**
  - `backend/schemas/analytics.py`
  - `backend/analytics/forecasting.py`
  - `backend/analytics/metrics.py`
  - `backend/analytics/db.py`
- **Propósito:**
  Resolver problemas operativos de retail del mundo real: tiempos de entrega diferenciados por proveedor/producto, productos recién lanzados (arranque en frío) y portabilidad estándar de consultas SQL.
- **Funcionalidades Implementadas:**
  - `lead_time_aplicado` prioritario por SKU: El motor consulta `lead_time_dias` de la tabla `inventario` para cada producto individual, permitiendo que perecederos (1-2 días) no se sobre-abastezcan y electrónicos (20-30 días) no caigan en quiebre de stock.
  - Fallback Heurístico para Cold-Start (`_forecast_ema_heuristic`): Los productos con 7 a 29 días de historial ya no se descartan; se modelan mediante Media Móvil Exponencial (EMA, $\alpha=0.3$) combinada con factores de estacionalidad por día de la semana y bandas empíricas.
  - Atributo de Transparencia (`nivel_confianza`): Cada producto pronosticado devuelve `alta_ml` (LightGBM supervisado) o `fase_aprendizaje_heuristica` (EMA), permitiendo a la UI advertir al gerente sobre el grado de madurez del dato.
  - Parametrización SQL Portable: Filtros de fechas mediante objetos nativos `datetime` y soporte para dialectos SQLite (desarrollo/testing local) y PostgreSQL (producción).
  - Consistencia Contable en Tiempo Real: Se descarta el almacenamiento en caché ciego para KPIs diarios, asegurando que las ventas registradas se reflejen inmediatamente en la pantalla analítica.
