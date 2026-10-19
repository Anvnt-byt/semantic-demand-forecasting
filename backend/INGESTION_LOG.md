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
