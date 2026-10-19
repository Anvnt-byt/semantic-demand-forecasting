# Bitácora Técnica de Implementación Frontend - POSBuddy Demand Forecasting

Este documento registra cronológicamente cada bloque funcional, pantalla, arquitectura de datos y decisiones técnicas implementadas en la aplicación frontend React Native / TypeScript.

---

## Sección 1: Estructura Base, Configuración Multi-Dispositivo y Sistema de Temas (Claro / Oscuro)
**Fecha:** 2026-10-18

### 1. Archivos Creados / Modificados
- `package.json`: Configuración de dependencias de React Native, Expo 52, TypeScript, Navigation, SVG y Zustand.
- `tsconfig.json`: Modo estricto (`strict: true`) con alias de ruta `@/*`.
- `babel.config.js`: Preset para compilación de Expo.
- `app.json`: Configuración de la aplicación con soporte para tabletas (`supportsTablet: true`), móviles y temas dinámicos.
- `src/theme/theme.ts`: Tokens del sistema de diseño *Neo-Industrial POS* con paletas independientes Dark y Light (WCAG AAA).
- `src/theme/ThemeContext.tsx`: Contexto y hook para alternancia y persistencia entre Modo Claro y Modo Oscuro.

### 2. Propósito Arquitectónico
- Proveer un entorno unificado de alto rendimiento para tablets POS, smartphones y computadoras de escritorio.
- El sistema de tokens desacopla los colores y contrastes mediante constantes fuertemente tipadas, garantizando una relación de contraste ≥ 7:1 en modo claro y oscuro, con touch targets ergonómicos de ≥ 48x48 dp.
- Eliminación de dependencias de pago o código privativo, priorizando renderizado vectorial nativo con `react-native-svg` y virtualización eficiente.

### 3. Interfaces TypeScript y Contratos
```typescript
export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentPrimary: string;
  accentSecondary: string;
  confidenceHigh: string;      // Verde ML LightGBM
  confidenceHeuristic: string; // Ámbar EMA
  alertCritical: string;       // Rojo stock crítico / reorden
  alertWarning: string;        // Ámbar advertencias
  cardGlow: string;
  inputBackground: string;
  inputBorder: string;
}
```

### 4. Casos de Prueba / Verificación
- Verificación de tipos estricta con TypeScript (`npm run ts:check`).
- Contraste visual accesible verificado para pantallas de caja con alta luminosidad ambiental (Modo Claro) y centros de analistas (Modo Oscuro).
---

## Sección 2: Capa de Seguridad OWASP, Almacenamiento Cifrado y Cliente HTTP Resiliente
**Fecha:** 2026-10-18

### 1. Archivos Creados / Modificados
- `src/types/license.types.ts`: Contratos TypeScript para verificación de licencias y planes.
- `src/types/ingestion.types.ts`: Modelos tipados para orígenes de datos y métricas de saneamiento.
- `src/types/analytics.types.ts`: Esquemas tipados para KPIs, Pareto ABC, vendedores y predicción de demanda.
- `src/store/useConfigStore.ts`: Almacenamiento seguro del host/puerto LAN y conmutador offline/online.
- `src/store/useLicenseStore.ts`: Gestión cifrada de licencias, módulos habilitados y políticas de acceso.
- `src/api/client.ts`: Instancia Axios con interceptores para HTTP 429 (backoff exponencial) y HTTP 403 (módulos restringidos).
- `src/api/mockData.ts`: Colección representativa de datos simulados para desarrollo desacoplado.
- `src/api/README.md`: Documentación exhaustiva y plantillas de integración para conectar con FastAPI.

### 2. Propósito Arquitectónico
- Implementación de resiliencia de red en LAN: interceptores que detectan límites de peticiones (429) y aplican backoff exponencial automático con avisos dinámicos en la UI.
- Protección contra fuga de datos: el almacenamiento local se ejecuta a través de APIs de almacenamiento seguro nativo sin envío de telemetría a nubes públicas.

### 3. Interfaces TypeScript y Contratos
```typescript
export interface LicenseVerifyRequest {
  license_key: string;
  pos_identifier: string;
  pos_name: string;
}

export interface LicenseVerifyResponse {
  valid: boolean;
  license_key: string;
  plan: 'starter' | 'pro' | 'enterprise';
  days_remaining: number;
  allowed_modules: AllowedModule[];
  organization?: string;
  message?: string;
}
```

### 4. Casos de Prueba / Verificación
- Simulación de error HTTP 429 con cabecera `Retry-After` validando la activación de cuenta regresiva automática.
- Restricción de módulos no autorizados con retorno estructurado de HTTP 403.

---

## Sección 3: Pantalla 1 - Setup, Verificación de Licencia Offline & EULA Legal
**Fecha:** 2026-10-18

### 1. Archivos Creados / Modificados
- `src/screens/SetupLicenseScreen.tsx`: Pantalla de registro de licencia, selector de host/puerto y EULA.
- `src/api/endpoints/licenseApi.ts`: Endpoint `POST /api/license/verify` con soporte para claves demo (`TC-PRO-DEMO-2027` y `TC-STARTER-DEMO-2027`).
- `src/components/common/TactileCard.tsx`: Contenedor estilizado táctil con adaptabilidad de tema.
- `src/components/common/TactileButton.tsx`: Botón táctil ergonómico (≥ 48x48 dp) accesible WCAG AAA.
- `src/components/common/ErrorBanner.tsx`: Alerta dinámica para rate limits y avisos de red.

### 2. Propósito Arquitectónico
- Garantizar que la terminal POS no opere sin la aceptación obligatoria del EULA (procesamiento 100% local y consultas de solo lectura en bases de datos).
- El selector editable de host y puerto permite adaptar la terminal a cualquier dirección IP de la subred LAN en caliente sin reconstruir la app.

### 3. Interfaces TypeScript y Contratos
```typescript
export interface StoredLicenseState {
  isVerified: boolean;
  licenseKey: string;
  plan: LicensePlan;
  daysRemaining: number;
  allowedModules: AllowedModule[];
  posIdentifier: string;
  posName: string;
  eulaAccepted: boolean;
  eulaAcceptedAt?: string;
}
```

### 4. Casos de Prueba / Verificación
- Intento de activación con EULA desmarcado: alerta modal impidiendo el avance.
- Inserción de clave demo `TC-PRO-DEMO-2027`: activación de los 8 módulos con 365 días de vigencia.
- Inserción de clave demo `TC-STARTER-DEMO-2027`: activación de 4 módulos con 90 días de vigencia.

---

## Sección 4: Pantalla 2 - Monitor de Ingesta y Auditoría de Saneamiento
**Fecha:** 2026-10-18

### 1. Archivos Creados / Modificados
- `src/screens/IngestionAuditScreen.tsx`: Vista con pestañas para Base Relacional (MySQL/PostgreSQL) y Archivo Local (CSV/Parquet).
- `src/api/endpoints/ingestionApi.ts`: Servicios para verificación de base de datos en solo lectura y carga segura (máximo 50 MB según directrices OWASP).
- `src/components/common/MetricBadge.tsx`: Badges de estado de saneamiento y pipelines.

### 2. Propósito Arquitectónico
- Conector desacoplado con validación estricta de políticas de solo lectura (SELECT exclusivo) para proteger los sistemas de facturación de la tienda contra modificaciones no autorizadas.
- Límite de tamaño local de 50 MB con validación previa en cliente para evitar desbordamientos de memoria en dispositivos POS.

### 3. Interfaces TypeScript y Contratos
```typescript
export interface DatabaseConnectionParams {
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
  engine: 'mysql' | 'postgresql';
  read_only_verified: boolean;
}

export interface SanitizationMetrics {
  filas_procesadas: number;
  registros_descartados: number;
  duplicados_eliminados: number;
  nulos_imputados: number;
  tasa_calidad_pct: number;
  tiempo_procesamiento_ms: number;
}
```

### 4. Casos de Prueba / Verificación
- Conmutación dinámica entre motores PostgreSQL (puerto 5432) y MySQL (puerto 3306).
- Auditoría en tiempo real reflejando 14,820 filas procesadas, 42 registros descartados y 99.12% de calidad en 1,240 ms.

---

## Sección 5: Pantalla 3 - Tablero Analítico y Demanda Predictiva (LightGBM)
**Fecha:** 2026-10-18

### 1. Archivos Creados / Modificados
- `src/screens/AnalyticsDashboardScreen.tsx`: Tablero analítico ejecutivo con KPIs, comparativas temporales, curva de demanda LightGBM, Pareto ABC y vendedores.
- `src/api/endpoints/analyticsApi.ts`: Endpoints `GET /api/analytics/kpis`, `GET /api/analytics/temporal-comparison`, `GET /api/analytics/inventory-turnover`, `GET /api/analytics/sellers`, `POST /api/analytics/predict-demand`, y exportadores binarios.
- `src/components/charts/DemandForecastSvgChart.tsx`: Gráfica SVG interactiva con sombreado de bandas de incertidumbre P10 a P90 y scrubber táctil.
- `src/components/charts/TemporalComparisonChart.tsx`: Gráfica comparativa temporal en SVG nativo para períodos actual vs anterior.
- `src/components/tables/ParetoTable.tsx`: Tabla de inventario Pareto ABC con indicadores visuales de reorden crítico y stock estancado.
- `src/components/tables/SellersTable.tsx`: Ranking de vendedores con barras de contribución porcentual y tickets promedio.
- `src/components/common/AppHeader.tsx`: Cabecera global con alternador de modo Claro/Oscuro y monitor de estado LAN.
- `src/navigation/RootNavigator.tsx`: Navegación ergonómica por pestañas.
- `App.tsx`: Inicialización unificada de contexto y almacenamiento.

### 2. Propósito Arquitectónico
- Renderizado vectorial de 60 FPS mediante `react-native-svg` para trazar el cono probabilístico P10-P90 sin utilizar bibliotecas privativas o de pago.
- Desglose diagnóstico modular de métricas analíticas (WAPE, RMSE, CV, stock de seguridad, punto de reorden) con advertencia legal al pie.

### 3. Interfaces TypeScript y Contratos
```typescript
export interface PredictDemandResponse {
  nivel_confianza: 'alta_ml' | 'fase_aprendizaje_heuristica';
  horizonte_dias: number;
  serie_temporal: ForecastPoint[];
  metricas_diagnosticas: DiagnosticMetrics;
  disclaimer: string;
  generado_el: string;
}
```

### 4. Casos de Prueba / Verificación
- Verificación de tipos TypeScript (`npm run ts:check`): 0 errores.
- Alternancia de tema Claro / Oscuro verificada en todos los componentes.
- Restricción de exportaciones y demanda predictiva probada con licencias Plan Starter (HTTP 403 preventivo).
- Validación de interactividad táctil en gráfica P10-P90 con tooltip de fecha y cantidades estimadas.
---

## Sección 6: Escala Tipográfica WCAG, Sistema Global de Toasts y Flujo Secuencial (Wizard a Dashboard Principal)
**Fecha:** 2026-10-18

### 1. Archivos Creados / Modificados
- `src/theme/theme.ts`: Incremento del 25%-30% en todos los tokens de escala tipográfica (`xs: 14`, `sm: 16`, `base: 18`, `lg: 22`, `xl: 26`, `xxl: 32`, `metric: 40`).
- `src/context/ToastContext.tsx`: Contexto y componente de notificaciones flotantes animadas con auto-hide de 3.5 segundos.
- `src/store/useConfigStore.ts`: Incorporación de estados persistentes `onboardingStep` (`'license'` | `'ingestion'` | `'completed'`) y `activeSection` (`'dashboard'` | `'license'` | `'ingestion'`).
- `src/screens/SetupLicenseScreen.tsx`: Integración de feedback con `useToast`, indicador visual del Paso 1 y avance automático al Paso 2 al validar.
- `src/screens/IngestionAuditScreen.tsx`: Indicador del Paso 2, notificaciones toast en sincronización de BD y carga de archivos, y avance automático al Tablero Analítico.
- `src/screens/AnalyticsDashboardScreen.tsx`: Reemplazo de diálogos invasivos por toasts para exportaciones y predicción.
- `src/components/common/AppHeader.tsx`: Botón `⚙️ CONFIG`, menú modal de navegación entre módulos/red LAN, y banner de retorno rápido al Tablero Analítico.
- `src/navigation/RootNavigator.tsx`: Reestructuración con guard de pasos secuenciales y establecimiento del Tablero Analítico como pantalla principal permanente.
- `App.tsx`: Envoltura global con `ToastProvider`.

### 2. Propósito Arquitectónico
- Flujo guiado estricto (Guard Pattern): previene acceso a ingesta o analítica sin licencia activa y EULA aceptado; una vez completada la ingesta inicial, el Tablero Analítico asume el rol de pantalla principal permanente.
- Accesibilidad ergonómica: el incremento tipográfico garantiza lectura clara en pantallas táctiles de POS a distancia de mostrador y monitores de analistas.
- Notificaciones no invasivas: desacoplamiento de alertas mediante un bus de toasts temporales que liberan la vista sin requerir confirmaciones manuales constantes.

### 3. Interfaces TypeScript y Contratos
```typescript
export type OnboardingStep = 'license' | 'ingestion' | 'completed';
export type ActiveSection = 'dashboard' | 'license' | 'ingestion';

export interface ToastOptions {
  type?: 'success' | 'error' | 'warning' | 'info';
  durationMs?: number;
}

export interface ToastContextType {
  showToast: (message: string, options?: ToastOptions) => void;
  hideToast: () => void;
}
```

### 4. Casos de Prueba / Verificación
- Verificación de tipos TypeScript (`npx tsc --noEmit`): 0 errores.
- Flujo secuencial verificado:
  1. Inicio bloqueado en Paso 1 (Licencia y EULA).
  2. Al verificar clave demo `TC-PRO-DEMO-2027` y aceptar EULA $\rightarrow$ Toast de confirmación y salto inmediato a Paso 2 (Ingesta).
  3. Al completar carga de archivo o conexión de BD $\rightarrow$ Toast de confirmación y transición definitiva a Pantalla 3 (Tablero Analítico).
  4. Apertura del panel `⚙️ CONFIG` $\rightarrow$ Acceso a Licencia e Ingesta con banner visible de retorno al Tablero.
- Auto-ocultado de toasts validado tras 3.5 segundos con desvanecimiento animado.

---

## Sección 7: Refinamiento Tipográfico WCAG, Iconografía Vectorial SVG (Cero Emojis), Descargas Reales y Alineación de Tablas
**Fecha:** 2026-10-18

### 1. Archivos Creados / Modificados
- `src/theme/theme.ts`: Ajuste proporcional de escala tipográfica (`xs: 12`, `sm: 14`, `base: 16`, `lg: 19`, `xl: 23`, `xxl: 27`, `metric: 32`).
- `src/components/common/SvgIcons.tsx`: Suite vectorial completa en `react-native-svg` (`IconClose`, `IconSettings`, `IconDashboard`, `IconIngestion`, `IconLicense`, `IconSun`, `IconMoon`, `IconFilePdf`, `IconFileExcel`, `IconCheck`, `IconWarning`, `IconDatabase`, `IconArrowLeft`).
- `src/utils/fileDownloader.ts`: Generador y descargador en memoria de archivos Excel (.csv con BOM UTF-8) e informes ejecutivos imprimibles PDF (HTML dinámico en ventana desacoplada).
- `src/components/common/AppHeader.tsx`: Incorporación de botón "✕" de cierre en el modal de configuración, cierre por toque fuera del modal, iconos SVG y acceso directo a secciones sin rehacer pasos.
- `src/navigation/RootNavigator.tsx`: Sub-barra de navegación superior fija (`subNavBar`) para alternar entre Tablero Analítico, Licencia & EULA e Ingesta & Auditoría tras completar el onboarding.
- `src/screens/SetupLicenseScreen.tsx`: Selector dinámico de planes demo (Pro vs Starter) con resaltado táctil y guardado no bloqueante en modo configuración.
- `src/screens/IngestionAuditScreen.tsx`: Sustitución total de emojis por iconos SVG limpios y guardado persistente sin rebloqueo.
- `src/screens/AnalyticsDashboardScreen.tsx`: Vinculación de botones de descarga a generadores reales en memoria (`downloadRealExcel` y `downloadRealPdf`).
- `src/components/tables/ParetoTable.tsx`: Reestructuración con contenedores `<View>` de proporción flex fija para alinear encabezados numéricos y datos sin superposición.
- `src/components/tables/SellersTable.tsx`: Alineación precisa de columnas de porcentaje y montos monetarios con anchos relativos consistentes.
- `src/context/ToastContext.tsx`: Iconografía de estado migrada a vectores SVG.

### 2. Propósito Arquitectónico
- Eliminación de emojis de plataforma: garantiza renderizado idéntico y sobrio en Android, iOS, Windows y Web.
- Sincronización Flexbox en tablas: en React Native, la alineación de texto requiere contenedores de columna explícitos para emparejar encabezados y celdas sin distorsión de zoom.
- Exportación local no bloqueante: generación binaria/DOM directa sin dependencias privativas ni llamadas a servicios en la nube (OWASP compliant).

### 3. Casos de Prueba / Verificación
- Verificación estricta TypeScript (`npx tsc --noEmit`): 0 errores.
- Descarga de Excel: genera y descarga archivo `reporte_analitico_tidyddata.csv` en el navegador.
- Informe PDF: genera e invoca cuadro de impresión/PDF del sistema con KPIs ejecutivos y tablas formateadas.
- Modal de configuración: se cierra con el botón "✕" y con toque en el overlay externo.
- Tablas Pareto y Vendedores: columnas perfectamente alineadas horizontalmente y legibles en cualquier tamaño de pantalla.

---

## Sección 8: Módulo Interactivo de Edición y Sanitización de Datos Pre-Auditoría (Flujo de 3 Fases)
**Fecha:** 2026-10-18

### 1. Archivos Creados / Modificados
- `src/components/editor/DataEditorView.tsx`: Vista interactiva para inspección tabular de transacciones cargadas, con edición en celda (inline cell edit), eliminación de registros individuales, búsqueda reactiva y barra de herramientas de sanitización masiva (deduplicación por firma única de tupla, imputación automática de valores nulos/vacíos y recorte de espacios en blanco `trim`).
- `src/components/common/SvgIcons.tsx`: Incorporación de iconos SVG vectoriales dedicados (`IconEdit`, `IconTrash`, `IconFilter`, `IconSearch`, `IconTable`).
- `src/types/ingestion.types.ts`: Definición de `IngestedDataRow` y estados de fase `IngestionPhase` (`'source'` | `'editor'` | `'audit'`).
- `src/api/mockData.ts`: Dataset de muestra `MOCK_INGESTED_ROWS` con registros POS reales, incluyendo inconsistencias controladas (tuplas duplicadas intencionales y campos vacíos) para validar las herramientas de saneamiento.
- `src/screens/IngestionAuditScreen.tsx`: Reestructuración del flujo en 3 fases secuenciales estrictas:
  1. **Fase 1 (Origen):** Conexión SQL o subida de archivo local. Al completar, pasa a la Fase 2 en lugar de avanzar al Dashboard.
  2. **Fase 2 (Editor de Datos):** El usuario audita, edita valores, elimina registros y ejecuta sanitizaciones en memoria antes de comprometer los datos.
  3. **Fase 3 (Auditoría de Calidad):** Se calculan y muestran las métricas finales de saneamiento únicamente tras confirmar la revisión en el editor. El botón final avanza al Tablero Analítico.

### 2. Propósito Arquitectónico
- Separación de responsabilidades y soberanía del usuario: previene que datos no verificados fluyan directamente a los modelos predictivos de LightGBM sin supervisión analítica previa.
- Procesamiento en memoria zero-cloud: todas las operaciones de edición y sanitización se ejecutan en estado local seguro, respetando los estándares OWASP para POS en red LAN.

### 3. Casos de Prueba / Verificación
- Verificación estricta TypeScript (`npx tsc --noEmit`): 0 errores.
- Flujo de 3 fases validado:
  1. Carga de archivo o sincronización BD $\rightarrow$ Redirige inmediatamente al Editor de Datos con badge "PASO 2 DE 3".
  2. Edición de celdas: toque sobre cualquier celda abre input inline y actualiza el estado de la fila.
  3. Herramientas de sanitización: "Eliminar Duplicados" remueve tuplas redundantes; "Imputar Vacíos" rellena campos omitidos; "Limpiar Espacios" normaliza strings.
  4. "Confirmar Datos y Ejecutar Saneamiento" $\rightarrow$ Transición a "PASO 3 DE 3: AUDITORÍA DE CALIDAD" reflejando las métricas de filas limpias, descartadas y corregidas.
  5. Botón "Continuar al Tablero Analítico" $\rightarrow$ Establece `onboardingStep = 'completed'` y da paso al Dashboard permanente.

---

## Sección 9: Transformación Arquitectónica - "Photoshop de Datos" (Data Studio Wrangler), Navegación Modular de 5 Pestañas y Conexión End-to-End en dev
**Fecha:** 2026-10-18

### 1. Archivos Creados / Modificados
- `src/store/useDataWranglerStore.ts` (NUEVO): Store Zustand reactivo para gestión no destructiva de datasets tabulares. Incluye perfilado estadístico en tiempo real (`min`, `max`, `mean`, `median`, `stdDev`, `q1`, `q3`, `iqr`, nulos, outliers), sistema de capas de transformaciones (recetas activables/desactivables), tratamiento de outliers (Winsorize / Trim por IQR y Z-Score), imputación estadística (media, mediana, constante cero, forward-fill), normalización de texto y derivación de columnas analíticas (`margen_bruto`, `ingreso_total`, `dia_semana`).
- `src/components/studio/ColumnProfiler.tsx` (NUEVO): Panel de inspección profunda de columnas con barra tricolor de salud del dato (% válido, % atípico, % nulo), resumen de métricas paramétricas/no paramétricas e histograma SVG de 5 intervalos de frecuencia.
- `src/components/studio/CleaningToolbar.tsx` (NUEVO): Barra de herramientas interactiva para analistas y científicos de datos con modales para capping de outliers, imputación de nulos, limpieza de cadenas y fórmulas de columnas calculadas.
- `src/components/studio/RecipeHistoryPanel.tsx` (NUEVO): Consola de auditoría de transformaciones ("Capas de Photoshop") con conmutadores toggle por paso y botón de reversión global.
- `src/screens/DataStudioScreen.tsx` (NUEVO): Pantalla principal del Data Studio que integra la barra de herramientas, selector de dataset activo, vista previa de grid tabular y perfilador estadístico.
- `src/screens/InventoryAnalyticsScreen.tsx` (NUEVO): Pantalla especializada en inventario, clasificación Pareto ABC, curva de Lorenz, alertas de quiebre de stock, detección de productos estancados (dead stock >10 días) y búsqueda instantánea.
- `src/screens/DemandForecastingScreen.tsx` (NUEVO): Laboratorio predictivo supervisado con inferencia LightGBM, bandas de incertidumbre no negativa [p10, p90], selección de horizonte (7, 14, 30 días), toggle de reentrenamiento, diagnóstico out-of-sample (WAPE, RMSE, CV) y punto de reorden (ROP) con Lead Time configurable.
- `src/navigation/RootNavigator.tsx` & `src/navigation/types.ts`: Sustitución del flujo de onboarding rígido por una barra de navegación modular superior de 5 módulos de primer nivel con acceso inmediato y modo demo preconfigurado (`dashboard`, `studio`, `inventory`, `forecasting`, `ingestion`, `license`).
- `src/screens/AnalyticsDashboardScreen.tsx`: Refactorización hacia un tablero ejecutivo conciso enfocado en KPIs macro, comparativa temporal por granularidad (día, semana, mes, año), ranking de vendedores y accesos directos táctiles hacia Data Studio, Inventario y Forecast.
- `src/utils/fileDownloader.ts`: Descarga real de binarios Excel (con hoja `PowerBI_Tidy_Data`) e informes ejecutivos PDF directamente desde los endpoints FastAPI (`/api/analytics/export/excel` y `/api/analytics/export/pdf`).
- `src/api/endpoints/ingestionApi.ts` & `src/types/ingestion.types.ts`: Armonización tipada completa con los esquemas Pydantic del backend (`AuditReport`, `IngestionStatusResponse`, `DatabaseEngine = 'mysql' | 'postgresql'`).

### 2. Propósito Arquitectónico
- Proporcionar un verdadero "Photoshop de Datos" para analistas y Store Managers: el saneamiento manual celda a celda es inviable en entornos comerciales con miles de tickets y viola la integridad de auditoría contable. El Data Studio permite aplicar recetas reproducibles y no destructivas sobre columnas completas.
- Navegación modular orientada al rol: en lugar de forzar un wizard lineal secuencial, la aplicación permite al usuario explorar directamente el tablero analítico, abrir el laboratorio de pronósticos ML, consultar el inventario o conectar fuentes POS en cualquier orden.
- Integración End-to-End en rama `dev`: sincronización perfecta entre ingesta POS/archivos, base de datos PostgreSQL local, motor analítico Polars/LightGBM y capa de visualización React Native.

### 3. Casos de Prueba / Verificación
- Verificación estricta TypeScript (`npx tsc --noEmit` en `frontend/`): 0 errores, código de salida 0.
- Verificación de pruebas unitarias e integración en backend (`pytest tests/`): 43 pruebas pasando al 100% de éxito en 1.71s.

