# Bitácora Técnica de Implementación: Ingesta, Auditoría y Conectores POS

Documento acumulativo de registro arquitectónico y validación técnica del módulo de ingesta de datos para *Demand Forecasting*.

---

## 1. Definición del Esquema Relacional Interno y Modelos de Datos (2026-10-18)

### Archivos creados/modificados:
- `backend/requirements.txt`
- `backend/pytest.ini`
- `backend/schemas/__init__.py`
- `backend/schemas/models_schema.py`
- `backend/schemas/ingestion.py`
- `backend/database/__init__.py`
- `backend/database/models.py`
- `backend/database/connection.py`
- `backend/tests/test_database.py`

### Propósito arquitectónico:
Establecer el contrato de datos relacional en PostgreSQL local optimizado para consultas analíticas de series temporales y staging eficiente, garantizando integridad referencial, indexación compuesta para agrupaciones cronológicas y tipado estricto sin dependencias externas.

### Funcionalidades y Reglas de Negocio:
- **Definición de tablas relacionales de destino en PostgreSQL local:**
  - `ventas`: Contiene la información requerida por el motor analítico (`id_venta`, `fecha`, `sku`, `descripcion`, `cantidad`, `precio_unitario`, `total`, `id_vendedor`, `nombre_vendedor`, `ingested_at`).
  - Índices creados: Índice compuesto B-Tree `idx_ventas_fecha_sku` sobre `(fecha, sku)` para acelerar agregaciones de demanda diaria y cálculo de lags; e índice `idx_ventas_id_venta_sku` sobre `(id_venta, sku)` para auditoría y deduplicación.
  - `inventario`: Almacena el catálogo de productos con `sku` como Primary Key, `stock_actual`, `stock_minimo` y la columna clave `lead_time_dias` (con fallback por defecto a `0.0` para activación del motor ROP).
  - `vendedores` y `lineas_venta`: Modelos relacionales auxiliares para normalización atómica de transacciones y personal de ventas.
  - `auditoria_ingesta`: Registro inmutable de trazabilidad por lote (`batch_id`, fuente, total registros, válidos, descartados, duplicados, duración en milisegundos y muestra de errores en JSON).
- **Esquemas Pydantic V2:** Contratos de validación con coerción de tipos para entrada/salida y DTOs para configuración de conexiones POS y respuestas de auditoría.

### Pruebas y Validación:
- Ejecución de suite de pruebas unitarias (`tests/test_database.py`) con SQLite en memoria y SQLAlchemy 2.0.
- `test_init_db_creates_all_tables`: Verificación de creación automática de las 5 tablas relacionales e índices.
- `test_insert_venta_record`: Verificación de persistencia, tipos numéricos y compatibilidad de campos analíticos de venta.
- `test_insert_inventario_record_with_lead_time`: Validación del almacenamiento del tiempo de reposición del proveedor (`lead_time_dias`).
- `test_pydantic_schema_validation`: Validación estricta de serialización y deserialización de modelos Pydantic.
- Resultado: 4 pruebas ejecutadas, 4 superadas (100% éxito).

---

## 2. Normalizador Semántico Determinista y Parsers de Archivos CSV/Excel (2026-10-18)

### Archivos creados/modificados:
- `backend/ingestion/__init__.py`
- `backend/ingestion/normalizer.py`
- `backend/ingestion/file_parser.py`
- `backend/tests/test_normalizer_and_parser.py`
- `backend/INGESTION_LOG.md`

### Propósito arquitectónico:
Eliminar de raíz la latencia, costo computacional y dependencias de modelos externos de lenguaje (Ollama/Docker), implementando un motor de mapeo por ontologías deterministas y lectura en streaming con Polars que procesa datasets masivos con consumo mínimo de RAM y cero fuga de información.

### Funcionalidades y Reglas de Negocio:
- **Mecanismos de normalización determinista (sin LLMs externos) para archivos CSV/Excel:**
  - Función de sanitización de cabeceras (`clean_header`): remueve diacríticos/acentos, normaliza a minúsculas y reemplaza caracteres no alfanuméricos por guiones bajos.
  - Catálogos de sinónimos exhaustivos para `ventas` y para `inventario`.
  - Mapeo en 4 fases de resolución: coincidencia exacta canónica, coincidencia en lista de sinónimos, inclusión de tokens y coincidencia difusa (Levenshtein con umbral de similitud $\ge 0.82$).
  - Reglas de negocio automáticas de derivación:
    - Auto-generación de identificadores de ticket/factura (`id_venta`) cuando el archivo de ventas no incluye folio explícito (`VTA-AUTO-{index}`).
    - Cálculo automático de total de línea (`total = cantidad * precio_unitario`) o inferencia de precio unitario (`precio_unitario = total / cantidad`) en caso de omisión.
    - Soporte explícito de `lead_time_dias` en inventario: mapeo de sinónimos (`tiempo_reposicion`, `dias_entrega`, etc.) y fallback predeterminado a `0.0` para cálculo posterior de Punto de Reorden (ROP).
- **Parsers de Archivos de Alto Desempeño (`FileParser`):**
  - CSV: Detección heurística automática de delimitadores (`,`, `;`, `\t`, `|`) y detección de codificación de caracteres (`UTF-8`, `Latin-1`, `CP1252`).
  - Excel (`.xlsx`): Ingesta a través de Polars con motor `openpyxl`, lectura como cadenas de texto crudas para evitar coerción indeseada previa a validación.

### Pruebas y Validación:
- Suite de pruebas unitarias (`tests/test_normalizer_and_parser.py`):
  - `test_clean_header`: Validación de remoción de acentos, símbolos y espaciado irregular.
  - `test_ventas_mapping_and_rules`: Mapeo exitoso de campos en español y cálculo automático de `total` e `id_venta`.
  - `test_inventario_mapping_with_lead_time`: Detección y extracción de `lead_time_dias` desde columnas alternativas (`Dias_Entrega`).
  - `test_inventario_lead_time_fallback`: Verificación del fallback seguro a `0.0` cuando no se incluye el tiempo de reposición.
  - `test_csv_file_parser_semicolon`: Parseo exitoso de CSV sintético delimitado por punto y coma con cálculo de métricas.
  - `test_excel_file_parser`: Generación y lectura de libro Excel `.xlsx` sintético multi-fila y validación de tipos.
- Resultado: 6 pruebas ejecutadas, 6 superadas (100% éxito).

---

## 3. Pipeline de Limpieza, Saneamiento de Tipos, Detección de Duplicados y Auditoría (2026-10-18)

### Archivos creados/modificados:
- `backend/ingestion/cleaning_pipeline.py`
- `backend/ingestion/auditor.py`
- `backend/ingestion/__init__.py`
- `backend/tests/test_cleaning_and_audit.py`
- `backend/INGESTION_LOG.md`

### Propósito arquitectónico:
Garantizar la pureza e integridad de los datos previo a su almacenamiento e inferencia de series de tiempo, filtrando anomalías estructurales y duplicados en memoria mediante operaciones vectorizadas y generando trazabilidad auditable sin overhead de I/O.

### Funcionalidades y Reglas de Negocio:
- **Detección de duplicados, saneamiento de tipos y métricas de auditoría generadas:**
  - `parse_flexible_datetime`: Decodificación resiliente de estampas temporales en múltiples formatos (`ISO 8601`, `YYYY-MM-DD`, `DD/MM/YYYY`, timestamps Epoch en segundos y milisegundos).
  - `parse_numeric`: Sanitización de divisas, eliminación de símbolos monetarios (`$`, `€`, `MXN`), remoción de espacios y detección automática de separadores decimales (coma vs. punto).
  - Validación de campos mandatorios:
    - `ventas`: Obligatoriedad de `sku`, `fecha` válida y `cantidad` numérica. Rechazo de precios unitarios negativos.
    - `inventario`: Obligatoriedad de `sku` y `stock_actual` numérico; conservación del `lead_time_dias` para cálculo de inventario de seguridad.
  - Detección de duplicados:
    - En ventas: Seguimiento de claves compuestas `(id_venta, sku, fecha)`. Los duplicados son excluidos de la inserción y contabilizados en las métricas de auditoría.
    - En inventario: Seguimiento de clave primaria única `sku`, evitando colisiones.
  - Persistencia Atómica y Auditoría (`IngestionAuditor`):
    - Inserción masiva de lotes en tablas estándar `ventas` e `inventario`, con propagación relacional a `lineas_venta` y catálogo de `vendedores`.
    - Registro en `auditoria_ingesta` con identificación única `batch_id` (UUIDv4), conteo de filas recibidas, válidas, descartadas, duplicados, duración de proceso en milisegundos y muestra serializada en JSON de las primeras 50 excepciones para diagnóstico sin saturación de memoria.

### Pruebas y Validación:
- Suite de pruebas unitarias (`tests/test_cleaning_and_audit.py`):
  - `test_parse_flexible_datetime`: Conversión exacta de fechas en formato ISO, barra y delimitador tradicional.
  - `test_parse_numeric`: Conversión de cadenas con formato de moneda internacional y delimitadores mixtos.
  - `test_cleaning_pipeline_ventas_validation_and_deduplication`: Detección sintética de registros con fechas inválidas, falta de SKU, cantidades corruptas y duplicados exactos; verificación de las métricas del `AuditReport`.
  - `test_cleaning_pipeline_inventario_lead_time`: Validación de campos de inventario y preservación de `lead_time_dias` sintético.
  - `test_auditor_persistence`: Comprobación de inserción en base de datos SQLite en memoria y consulta de reporte por `batch_id`.
- Resultado: 5 pruebas ejecutadas, 5 superadas (100% éxito).

---

## 4. Conectores POS Seguros en Modo Solo Lectura Estricto para MySQL y PostgreSQL (2026-10-18)

### Archivos creados/modificados:
- `backend/connectors/__init__.py`
- `backend/connectors/security.py`
- `backend/connectors/base.py`
- `backend/connectors/postgres_connector.py`
- `backend/connectors/mysql_connector.py`
- `backend/tests/test_pos_connectors.py`
- `backend/INGESTION_LOG.md`

### Propósito arquitectónico:
Proteger la integridad jurídica y operativa de las bases de datos de producción de los clientes al extraer catálogos y transacciones, imponiendo barreras criptográficas, sesiones transaccionales de sólo lectura y análisis léxico contra inyecciones DDL/DML con streaming cursor para consumo acotado de memoria.

### Funcionalidades y Reglas de Negocio:
- **Conectores en solo lectura (SELECT exclusivo) para MySQL y PostgreSQL externos:**
  - Validador de Seguridad SQL (`sanitize_and_validate_query`):
    - Limpieza de comentarios SQL multilínea y de una sola línea.
    - Rechazo inmediato de sentencias múltiples encadenadas con `;`.
    - Enforzamiento estricto de que la sentencia inicie únicamente con `SELECT` o `WITH` (Common Table Expressions para lectura).
    - Bloqueo de lista negra de palabras clave DDL/DML: `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `CREATE`, `REPLACE`, `RENAME`, `GRANT`, `REVOKE`, `CALL`, `EXEC`, `EXECUTE`, `LOCK`, `SET`, `MERGE`, `OUTFILE`, etc.
    - Emisión de excepción de seguridad crítica `SecurityViolationError`.
  - Bandera Legal Inmutable:
    - `ALLOW_EXTERNAL_WRITE_OPERATIONS = False` constante con descargo de responsabilidad explícito (`LEGAL_WRITE_DISCLAIMER`).
  - Conector PostgreSQL POS (`PostgresPOSConnector`):
    - Parámetro a nivel de DSN: `options="-c default_transaction_read_only=on"`.
    - Ejecución de sesión: `SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;`.
    - Verificación proactiva con `SHOW transaction_read_only` antes de la extracción.
    - Lectura en streaming mediante cursores nombrados del lado del servidor (`RealDictCursor`) por bloques configurables (`batch_size`).
  - Conector MySQL POS (`MySQLPOSConnector`):
    - Inicialización de conexión con `init_command="SET SESSION TRANSACTION READ ONLY;"`.
    - Verificación proactiva de variable global/sesión: `SELECT @@session.transaction_read_only`.
    - Lectura en streaming sin acumulación de buffer completo en memoria usando `SSDictCursor`.

### Pruebas y Validación:
- Suite de pruebas de seguridad y conectores (`tests/test_pos_connectors.py`):
  - `test_sanitize_and_validate_query_valid`: Verificación de paso exitoso de consultas `SELECT` directas, CTEs complejas (`WITH`) y comentarios válidos.
  - `test_sanitize_and_validate_query_forbidden`: Parametrización exhaustiva de 13 vectores de ataque sintéticos que intentan ejecutar `INSERT`, `UPDATE`, `DELETE`, `DROP`, `TRUNCATE`, `ALTER`, `GRANT`, multi-consultas con `;`, procedimientos almacenados `EXEC`/`CALL` y volcados de disco `INTO OUTFILE`. Todos rechazados con `SecurityViolationError`.
  - `test_connector_factory_and_table_query`: Construcción automática y segura de consultas basadas en nombres simples de tabla para PostgreSQL y MySQL.
  - `test_unsupported_database_engine`: Validación de rechazo de motores no relacionales o no soportados.
  - `test_postgres_read_only_enforcement`: Mock de sesión PostgreSQL validando la configuración de `default_transaction_read_only=on` y el comando de sesión correspondiente.
  - `test_mysql_read_only_enforcement`: Mock de sesión MySQL validando `transaction_read_only` y comando `SET SESSION TRANSACTION READ ONLY`.
- Resultado: 18 pruebas ejecutadas, 18 superadas (100% éxito).

---

## 5. Exposición de Endpoints de Ingesta, Sincronización POS y Rate Limiting (2026-10-18)

### Archivos creados/modificados:
- `backend/routers/__init__.py`
- `backend/routers/ingestion_router.py`
- `backend/main.py`
- `backend/pipeline_semantico.py`
- `backend/tests/test_api_ingestion.py`
- `backend/INGESTION_LOG.md`

### Propósito arquitectónico:
Centralizar la exposición HTTP RESTful de los servicios de ingesta con protección perimetral de tasa de peticiones (Rate Limiting) y streaming seguro de archivos temporales limitados a 50 MB para blindar el servidor contra saturación de memoria RAM y ataques de denegación de servicio (DoS).

### Funcionalidades y Reglas de Negocio:
- **Endpoints de Ingesta Manual de Archivos (`POST /ingest/file`):**
  - Admite carga `multipart/form-data` para archivos `.csv` y `.xlsx` (Excel).
  - Parámetro de entidad destino (`TargetEntity`): `ventas` o `inventario`.
  - Soporte de sobrescritura manual de mapeo (`column_mapping_override`) en JSON opcional.
  - Streaming a disco por bloques de 1 MB con límite máximo de 50 MB (`MAX_UPLOAD_SIZE_BYTES`); descarte con código HTTP 413 si se supera el umbral.
  - Rate limiting controlado por SlowAPI (`10/minuto`).
  - Limpieza rigurosa de archivos temporales en bloques `finally` y recolección forzada de basura (`gc.collect()`).
- **Endpoints de Conexión y Sincronización POS Externa:**
  - `POST /ingest/pos/test-connection`: Prueba y certifica en tiempo real que las credenciales del cliente establezcan la conexión en modo `READ-ONLY` estricto (revisión de variables de sesión en MySQL y PostgreSQL).
  - `POST /ingest/pos/sync`: Extracción en streaming por lotes (`batch_size`), normalización semántica determinista, saneamiento de tipos y persistencia atómica en las tablas internas. Protegido por SlowAPI (`5/minuto`).
- **Endpoints de Trazabilidad y Auditoría:**
  - `GET /ingest/audit/{batch_id}`: Recuperación de métricas de procesamiento (total, válidas, descartadas, duplicados y muestra de errores).
  - `GET /ingest/audit`: Listado cronológico de los lotes de ingesta recientes con paginación (`limit`).
- **Desacoplamiento Total de Dependencias Externas (CERO Ollama):**
  - Refactorización de `pipeline_semantico.py` sustituyendo las llamadas a `instructor` y `OpenAI` local por el clasificador semántico determinista por reglas, logrando ejecución instantánea sin consumo de VRAM ni dependencias de contenedores.

### Pruebas y Validación:
- Suite de pruebas de integración HTTP con FastAPI `TestClient` (`tests/test_api_ingestion.py`):
  - `test_health_endpoint`: Verificación del estado de salud del servicio (HTTP 200).
  - `test_ingest_file_csv_ventas`: Carga y persistencia exitosa de dataset CSV sintético de ventas; verificación de inserción y retorno de auditoría.
  - `test_ingest_file_excel_inventario_with_lead_time`: Carga de libro Excel `.xlsx` sintético con columna alternativa `Dias_Entrega`; verificación del almacenamiento de `lead_time_dias` y consulta inmediata del reporte vía `GET /ingest/audit/{batch_id}`.
  - `test_ingest_file_invalid_extension`: Rechazo inmediato (HTTP 400) ante archivos no tabulares (`.py`).
  - `test_pos_test_connection_success`: Certificación exitosa de conexión de solo lectura ante credenciales POS simuladas.
  - `test_pos_test_connection_security_violation`: Detección y bloqueo con código HTTP 403 cuando el servidor POS rechaza el modo de solo lectura.
  - `test_pos_sync_success`: Simulación de extracción POS relacional, normalización de campos, deduplicación y persistencia transaccional.
  - `test_list_recent_audits`: Consulta paginada del histórico de auditorías.
- Resultado: 8 pruebas ejecutadas, 8 superadas (100% éxito).
- **Consolidado General del Backend:** 41 pruebas ejecutadas a lo largo de los 5 módulos, 41 superadas (100% de éxito).




