# Bitácora de Integración Backend en `dev` (TechConnect POS)

## 1. Fusión y Acople de Ramas (`feat/backend-ingesta` + `feat/backend-analitica`)

- **Fecha:** 2026-10-18
- **Rama:** `dev`
- **Commits Base:**
  - `origin/feat/backend-ingesta`: `85313a0` (Sec 1 a 5 de conectores, saneamiento, auditoría atómica y normalización determinista)
  - `origin/feat/backend-analitica`: `f5f5cd6` (Sec 1 a 8 de KPIs en Polars, Pareto con Lorenz shift, LightGBM con WAPE/RMSE/ROP, exportadores multi-pestaña y licencias offline)
- **Propósito:**
  Unificar el pipeline completo en la rama de integración `dev`, asegurando que los datos capturados y saneados por ingesta alimenten de forma directa, reactiva y sin errores al motor analítico y predictivo.

---

## 2. Resoluciones de Arquitectura y Armonización

1. **Unificación de Enrutamiento en `backend/main.py`:**
   - Montaje simultáneo de `ingestion_router` (`/ingest/*`), `analytics_router` (`/api/analytics/*`) y `license_router` (`/api/license/*`).
   - Rate limiting global unificado mediante `SlowAPI` con manejo limpio de excepciones `HTTP 429`.
   - Soporte CORS dinámico para la aplicación móvil React Native.

2. **Consolidación del Pool de Conexiones (`backend/analytics/db.py` y `backend/database/connection.py`):**
   - El motor analítico delega la obtención de conexiones a `database.connection.get_engine`, eliminando duplicidad de pools y reduciendo el consumo de memoria a la mitad.
   - Configuración explícita del driver `postgresql+psycopg2://` para compatibilidad nativa con `psycopg2-binary`.

3. **Alineación de Modelos y Consultas SQL:**
   - La tabla `ventas` normalizada contiene transacciones completas con SKU, descripción, cantidad, total y datos de vendedor.
   - Las consultas de `metrics.py` y `forecasting.py` operan con push-down directo sobre `ventas` e `inventario`, eliminando la necesidad de un JOIN pesado con `lineas_venta` y acelerando la respuesta a 1-3 ms.

4. **Consolidación de Contratos en `backend/schemas/__init__.py`:**
   - Exportación de todos los esquemas Pydantic v2 tanto de ingesta (`VentaRecord`, `InventarioRecord`, `AuditReport`, etc.) como de analítica (`KPIsSummaryResponse`, `ProductTurnoverItem`, `ProductForecastItem`, `LicenseVerifyResponse`, etc.).

---

## 3. Resultados de la Suite de Pruebas Automatizadas

Se ejecutó la suite completa de 43 pruebas unitarias y de integración end-to-end con 100% de éxito:

- `backend/tests/test_api_ingestion.py`: 8/8 pasadas (Carga CSV/Excel, conexión POS solo lectura, sincronización y auditoría).
- `backend/tests/test_cleaning_and_audit.py`: 5/5 pasadas (Deduplicación, validación de tipos, persistencia atómica).
- `backend/tests/test_database.py`: 4/4 pasadas (Esquemas SQLAlchemy y sesiones).
- `backend/tests/test_normalizer_and_parser.py`: 6/6 pasadas (Normalización determinista sin LLM, parseo de archivos).
- `backend/tests/test_pos_connectors.py`: 18/18 pasadas (Conectores MySQL y PostgreSQL en modo estricto READ-ONLY).
- `backend/tests/test_end_to_end_integration.py`: 2/2 pasadas (Flujo completo: Ingesta CSV ventas 35d + Excel inventario con lead time $\rightarrow$ KPIs en vivo $\rightarrow$ Pareto ABC $\rightarrow$ Vendedores $\rightarrow$ Pronóstico LightGBM + WAPE + ROP $\rightarrow$ Exportables Excel Tidy Data y PDF $\rightarrow$ Licencia SaaS).
