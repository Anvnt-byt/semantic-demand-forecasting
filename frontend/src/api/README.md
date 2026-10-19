# Guía de Conexión e Integración: Frontend ↔ Backend FastAPI

Este documento especifica la arquitectura de comunicación, los contratos HTTP y la plantilla de integración para conectar la aplicación frontend (React Native) con el servidor backend FastAPI que opera en red local (LAN).

---

## 1. Conmutador de Entorno (Mock / Real Backend)

El cliente HTTP está desacoplado mediante el store de configuración `src/store/useConfigStore.ts`.
- **Modo Mock (`useMocks: true`)**: Permite ejecutar pruebas completas de la UI con latencias simuladas y datos representativos sin necesidad de levantar el backend.
- **Modo Real (`useMocks: false`)**: Envía peticiones HTTP reales a la dirección configurada en el selector de Host y Puerto (`http://<ip-pos-local>:8000`).

Para cambiar de modo desde la UI:
- Abrir el panel de **Configuración / Estado de Red** en la barra superior o en la pantalla de Setup.
- Ingresar la IP LAN y Puerto de la máquina que ejecuta FastAPI.
- Desactivar la casilla "Simulación Offline (Mocks)" y presionar **"Probar Conexión LAN"**.

---

## 2. Matriz de Endpoints y Contratos

### A. Licenciamiento y Validación Offline
- **Ruta:** `POST /api/license/verify`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "license_key": "TC-PRO-DEMO-2027",
    "pos_identifier": "POS-TERM-01",
    "pos_name": "Caja Central Mostrador"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "valid": true,
    "license_key": "TC-PRO-DEMO-2027",
    "plan": "pro",
    "days_remaining": 365,
    "organization": "Retail Pro Solutions S.A.",
    "allowed_modules": [
      "pos_ingestion",
      "audit_pipeline",
      "predictive_demand",
      "pareto_abc",
      "sellers_performance",
      "temporal_comparison",
      "export_excel",
      "export_pdf"
    ],
    "message": "Licencia validada exitosamente."
  }
  ```

---

### B. Ingesta y Auditoría de Datos
- **Ruta:** `POST /predict-demand/` (Carga de archivos locales)
- **Headers:** `Content-Type: multipart/form-data`
- **Parámetros Form:**
  - `file`: Archivo binario `.csv` o `.parquet` (Límite estricto: **50 MB**).
  - `h`: int (Horizonte de pronóstico, 1 a 90, defecto: 7).
  - `lead_time`: int (Tiempo de entrega en días, 0 a 180, defecto: 0).
- **Ruta Base Relacional:** `POST /api/ingestion/sync-db`
- **Request Body:**
  ```json
  {
    "engine": "postgresql",
    "host": "192.168.1.150",
    "port": 5432,
    "database": "pos_retail_db",
    "username": "lector_readonly",
    "password": "...",
    "read_only_verified": true
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "status": "completado",
    "origen": "archivo_local",
    "metricas_saneamiento": {
      "filas_procesadas": 14820,
      "registros_descartados": 42,
      "duplicados_eliminados": 88,
      "nulos_imputados": 114,
      "tasa_calidad_pct": 99.12,
      "tiempo_procesamiento_ms": 1240
    },
    "fecha_ejecucion": "2026-10-18T20:00:00Z",
    "mensaje": "Pipeline finalizado exitosamente."
  }
  ```

---

### C. Tablero Analítico y Demanda Predictiva

#### 1. KPIs Ejecutivos
- **Ruta:** `GET /api/analytics/kpis?fecha_corte=YYYY-MM-DD`
- **Response `200 OK`:**
  ```json
  {
    "fecha_corte": "2026-10-18",
    "ventas_mes": 489500.5,
    "total_transacciones": 3412,
    "ticket_promedio": 143.46,
    "crecimiento_diario_pct": 4.8,
    "crecimiento_mensual_pct": 12.3
  }
  ```

#### 2. Comparativa Temporal
- **Ruta:** `GET /api/analytics/temporal-comparison?granularity=mes`
- **Parámetros query:** `granularity` (`dia` | `semana` | `mes` | `ano`)
- **Response `200 OK`:**
  ```json
  {
    "granularidad": "mes",
    "crecimiento_periodo_pct": 12.3,
    "total_actual": 489500.5,
    "total_anterior": 435800.0,
    "puntos": [
      { "label": "Sem 1", "actual": 112000, "anterior": 101000 },
      { "label": "Sem 2", "actual": 118500, "anterior": 106000 }
    ]
  }
  ```

#### 3. Rotación Pareto ABC
- **Ruta:** `GET /api/analytics/inventory-turnover`
- **Response `200 OK`:**
  ```json
  [
    {
      "sku": "SKU-BEV-001",
      "nombre": "Café Espresso Gourmet 1kg",
      "clasificacion_abc": "A",
      "pct_contribucion": 18.4,
      "pct_acumulado": 18.4,
      "stock_actual": 8,
      "stock_minimo": 15,
      "alerta_reorden": true,
      "dias_sin_venta": 0,
      "es_stock_estancado": false
    }
  ]
  ```

#### 4. Desempeño de Vendedores
- **Ruta:** `GET /api/analytics/sellers`
- **Response `200 OK`:**
  ```json
  [
    {
      "vendedor_id": "VEND-01",
      "nombre": "Laura Morales",
      "pct_aporte_tienda": 34.2,
      "tickets_cerrados": 1168,
      "ticket_promedio": 143.35,
      "posicion": 1
    }
  ]
  ```

#### 5. Predicción de Demanda (LightGBM)
- **Ruta:** `POST /api/analytics/predict-demand`
- **Request Body:**
  ```json
  {
    "dias_a_futuro": 14,
    "force_retrain": false
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "nivel_confianza": "alta_ml",
    "horizonte_dias": 14,
    "generado_el": "2026-10-18T20:00:00Z",
    "disclaimer": "Pronóstico probabilístico generado localmente mediante LightGBM...",
    "metricas_diagnosticas": {
      "wape": 6.42,
      "rmse": 14.85,
      "cv": 0.18,
      "stock_seguridad": 42,
      "punto_reorden": 85,
      "lead_time_aplicado": 4
    },
    "serie_temporal": [
      {
        "fecha": "2026-10-19",
        "prediccion": 152,
        "limite_inferior_p10": 134,
        "limite_superior_p90": 172
      }
    ]
  }
  ```

#### 6. Exportaciones en Memoria
- `GET /api/analytics/export/excel`: Descarga binaria `.xlsx` con hoja PowerBI_Tidy_Data.
- `GET /api/analytics/export/pdf`: Descarga binaria `.pdf` de informe gerencial.

---

## 3. Manejo de Errores y Seguridad (OWASP)

- **HTTP 429 Too Many Requests:** El cliente captura la cabecera `Retry-After` y activa un temporizador de reintento en UI con backoff exponencial.
- **HTTP 403 Forbidden:** Bloqueo de módulos restringidos según el plan de licencia (`starter` vs `pro`).
- **Seguridad de Red:** No se efectúan llamadas salientes a internet pública; todo el tráfico permanece en la subred LAN configurada.
