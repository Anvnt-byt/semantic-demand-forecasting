# POSBuddy Analytics & Demand Forecasting Engine

Solución local (*on-premise*) de analítica comercial, control de inventario y pronóstico de demanda basada en aprendizaje automático para Puntos de Venta (POS). Diseñada para operar de forma modular, ligera y 100% local, garantizando la privacidad absoluta de los datos contables sin depender de servicios en la nube, contenedores Docker pesados ni telemetría externa.

---

## 1. Visión y Capacidades Principales

- **100% Local y Privado:** Procesamiento en la terminal o servidor local del comercio; cero transferencia de datos a la nube o APIs de terceros.
- **Rendimiento en Hardware Estándar:** Optimizado para operar de forma eficiente en equipos POS convencionales (4 a 8 GB de RAM, procesador de 2 a 4 núcleos), descartando cargas pesadas de LLMs o contenedores.
- **Doble Perfil de Usuario:**
  - **Gerente de Tienda:** Panel móvil ágil para consulta diaria de KPIs, metas de vendedores y alertas críticas de reabastecimiento.
  - **Analista / Científico de Datos:** Transparencia estadística con diagnósticos de error fuera de muestra (WAPE, RMSE, Coeficiente de Variación), fidelidad decimal continua en inventario y exportación tabular normalizada (*Tidy Data*) para ingesta directa en Power BI y Tableau.

---

## 2. Arquitectura de Módulos

```
                                  [ Bases de Datos POS Locales ]
                                  (MySQL / PostgreSQL en Solo Lectura)
                                                │
                                                ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. Módulo de Ingesta y Auditoría (feat/backend-ingesta)                                │
│    ├── Conectores no invasivos (SELECT exclusivo)                                      │
│    ├── Carga manual de contingencia (CSV / Excel)                                      │
│    └── Normalización y almacenamiento en PostgreSQL Local                              │
└───────────────────────────────────────────────┬────────────────────────────────────────┘
                                                │
                                                ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. Motor Analítico y Predictivo (feat/backend-analitica)                                │
│    ├── Agregaciones vectorizadas en memoria con Polars (Push-down SQL)                 │
│    ├── Rotación de Inventario y Curva de Lorenz (Pareto ABC con corrección de sesgo)   │
│    ├── Pronóstico de Demanda: LightGBM / MLForecast (>=30d) + Fallback Heurístico EMA  │
│    ├── Dimensionamiento de Stock: Stock de Seguridad y ROP por Lead Time de SKU        │
│    ├── Diagnósticos Estadísticos: WAPE, RMSE, Coeficiente de Variación (CV)            │
│    ├── Exportador en Memoria: Multi-pestaña Excel (con PowerBI_Tidy_Data) y PDF        │
│    └── Licenciamiento Offline: Validación criptográfica HMAC-SHA256                    │
└───────────────────────────────────────────────┬────────────────────────────────────────┘
                                                │ REST API (FastAPI)
                                                ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. Interfaz Móvil y Punto de Venta (frontend)                                          │
│    ├── Aplicación React Native para tablets y dispositivos móviles                     │
│    ├── Tableros ejecutivos de KPIs y comparativas temporales                           │
│    ├── Semáforo visual de quiebre de stock y órdenes de compra sugeridas               │
│    └── Activación local de licencias SaaS                                              │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Estructura del Repositorio y Ramas de Trabajo

El desarrollo se organiza en ramas desacopladas para integración continua:

- `main`: Rama de producción e integración base.
- `feat/backend-ingesta`: Módulo de conexión, extracción y normalización a PostgreSQL.
- `feat/backend-analitica`: Motor estadístico, modelos LightGBM, exportables y licencias.
- `frontend`: Aplicación móvil en React Native.

```text
.
├── backend/                    # Servicios FastAPI y motor analítico (Python)
│   ├── analytics/              # Métricas, forecasting, exportaciones y licencias
│   │   ├── db.py               # Pool SQLAlchemy y vectorización Polars
│   │   ├── metrics.py          # KPIs, comparativas temporales, Pareto ABC
│   │   ├── forecasting.py      # LightGBM, EMA cold-start, WAPE/RMSE, ROP
│   │   ├── exporter.py         # Generación de Excel y PDF en memoria
│   │   └── license.py          # Verificación criptográfica HMAC-SHA256
│   ├── connectors/             # Conectores relacionales e ingesta (MySQL / Postgres)
│   ├── schemas/                # Contratos y modelos de datos Pydantic v2
│   ├── entrenar_modelo.py      # Script de entrenamiento por lotes
│   ├── main.py                 # Punto de entrada de FastAPI
│   ├── requirements.txt        # Dependencias Python
│   └── .env.example            # Variables de entorno modelo
├── frontend/                   # Aplicación móvil (React Native)
│   └── .gitkeep
├── DISCLAIMER.md               # Descargo de responsabilidad algorítmica
├── LICENSE                     # Licencia MIT
└── README.md
```

---

## 4. Guía de Inicio Rápido

### Requisitos del Sistema
- **Python 3.10+**
- **PostgreSQL 14+** (Instancia local)
- **Node.js 18+** & **npm / yarn** (para React Native)

### Configuración del Backend

```bash
cd backend
python -m venv .venv

# Activar entorno virtual
# En Windows PowerShell:
.venv\Scripts\Activate.ps1
# En Linux/macOS:
# source .venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env

# Ejecutar servidor de desarrollo
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

El servicio estará disponible en `http://localhost:8000`.

### Documentación Interactiva de la API
- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 5. Licencia y Responsabilidad

- **Licencia:** Distribuido bajo la **MIT License**. Consulta [LICENSE](LICENSE) para más información.
- **Aviso Legal:** Los pronósticos generados son estimaciones estadísticas de apoyo a la decisión y no garantizan resultados financieros o comerciales. Consulta [DISCLAIMER.md](DISCLAIMER.md).
