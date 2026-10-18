# POS Analytics & Demand Forecasting Engine

Este repositorio contiene la arquitectura backend y el soporte móvil para una herramienta de análisis de datos y apoyo a puntos de venta (POS). Diseñada para operar de forma modular, ligera y 100% local, garantizando la privacidad de los datos comerciales sin depender de servicios en la nube ni telemetría.

## Arquitectura y Módulos

### 1. Ingesta y Auditoría de Datos
- **Conexiones automáticas (Solo Lectura):** Conexión no invasiva a bases de datos relacionales locales (MySQL y PostgreSQL) mediante consultas SELECT exclusivas.
- **Carga manual:** Ingesta de archivos CSV y Excel (.xlsx).
- **Pipeline de limpieza:** Detección de duplicados, validación de tipos e integridad de transacciones con reportes de auditoría.
- **Base interna:** Almacenamiento local optimizado exclusivamente en PostgreSQL.

### 2. Motor Analítico y Métricas de Negocio (Polars)
- Agregaciones vectorizadas en memoria con **Polars** para alto rendimiento y bajo consumo de RAM.
- **KPIs ejecutivos:** Ventas totales, tickets, ticket promedio y comparativas dinámicas (día vs. día anterior, mes vs. mes anterior, año vs. año anterior).
- **Rotación de inventario:** Clasificación Pareto ABC (80/15/5), velocidad de venta diaria y alertas tempranas de reposición.
- **Desempeño de ventas:** Métricas descriptivas por vendedor y porcentaje de contribución.

### 3. Motor Predictivo de Demanda (LightGBM & MLForecast)
- Inferencia de demanda sobre series temporales por SKU utilizando **LightGBM** optimizado para CPU multinúcleo.
- Bandas de incertidumbre conformal (`p10` y `p90`) garantizadas como no negativas (`>= 0`).
- Cálculo dinámico de **Stock de Seguridad** y **Punto de Reorden (ROP)** cuando se especifica el tiempo de entrega de proveedores (`lead_time`).
- Concurrencia acotada con semáforos para proteger los recursos de la máquina en el punto de venta.

### 4. Licenciamiento SaaS y Exportaciones
- Validación de licencias SaaS offline mediante firmas criptográficas HMAC-SHA256, sin necesidad de conexión externa.
- Generación de reportes tabulares en **Excel (.xlsx)** y resúmenes ejecutivos en **PDF**.

---

## Estructura del Repositorio

```text
.
├── backend/            # Servicios FastAPI y motor analítico (Python)
│   ├── analytics/      # Métricas, forecasting, exportaciones y licencias
│   ├── connectors/     # Conectores relacionales e ingesta
│   ├── schemas/        # Contratos y modelos de datos Pydantic
│   ├── entrenar_modelo.py
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/           # Aplicación móvil (React Native)
│   └── .gitkeep
└── README.md
```

---

## Guía de Inicio

### Requisitos Previos

- **Python 3.10+** (para `backend`)
- **PostgreSQL 14+** (base de datos local del sistema)
- **Node.js 18+** & **npm / yarn** (para `frontend`)

### Configuración del Backend

```bash
cd backend
python -m venv .venv

# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env

# Iniciar servidor local
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

El servicio estará disponible en `http://localhost:8000`.

### Documentación Interactiva (Swagger / OpenAPI)

En modo de desarrollo (`ENVIRONMENT=development`), la documentación interactiva está disponible en:
- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## Licencia y Privacidad

- **Licencia:** Distribuido bajo términos de la **MIT License**. Consulta [LICENSE](LICENSE) para más detalles.
- **Aviso Legal:** El procesamiento es 100% local. Consulta [DISCLAIMER.md](DISCLAIMER.md) para condiciones sobre el uso de pronósticos algorítmicos.
