from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class TargetEntity(str, Enum):
    VENTAS = "ventas"
    INVENTARIO = "inventario"

class SourceType(str, Enum):
    CSV = "CSV"
    EXCEL = "EXCEL"
    POS_MYSQL = "POS_MYSQL"
    POS_POSTGRES = "POS_POSTGRES"

class POSDBType(str, Enum):
    MYSQL = "mysql"
    POSTGRESQL = "postgresql"

class POSConnectionConfig(BaseModel):
    db_type: POSDBType = Field(..., description="Motor de base de datos relacional: 'mysql' o 'postgresql'")
    host: str = Field(..., description="Dirección del host de la base de datos POS")
    port: int = Field(..., description="Puerto de conexión (ej. 3306 o 5432)")
    database: str = Field(..., description="Nombre de la base de datos externa")
    username: str = Field(..., description="Usuario con permisos SELECT")
    password: str = Field(..., description="Contraseña de autenticación")
    query_or_table: str = Field(..., description="Nombre de la tabla o sentencia SELECT personalizada a extraer")
    batch_size: int = Field(default=5000, ge=100, le=50000, description="Tamaño de lote para lectura en streaming")

class POSSyncRequest(BaseModel):
    pos_config: POSConnectionConfig
    target_entity: TargetEntity = Field(default=TargetEntity.VENTAS, description="Entidad de destino: 'ventas' o 'inventario'")
    column_mapping_override: Optional[Dict[str, str]] = Field(None, description="Mapeo manual opcional para columnas específicas")

class ErrorDetail(BaseModel):
    row_number: int = Field(..., description="Número de fila o índice del registro con error")
    reason: str = Field(..., description="Motivo técnico del rechazo o descarte")
    sample_data: Optional[Dict[str, Any]] = Field(None, description="Muestra sanitizada de los datos inválidos")

class AuditReport(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    batch_id: str = Field(..., description="UUID único asignado al lote de ingesta")
    fuente: SourceType = Field(..., description="Origen de los datos")
    tipo_entidad: TargetEntity = Field(..., description="Entidad objetivo procesada")
    total_registros: int = Field(..., description="Total de registros brutos recibidos")
    registros_validos: int = Field(..., description="Registros exitosamente procesados e insertados")
    registros_descartados: int = Field(..., description="Registros filtrados por inconsistencias")
    duplicados_detectados: int = Field(..., description="Registros duplicados omitidos")
    duracion_ms: int = Field(..., description="Tiempo total de ejecución en milisegundos")
    errores_muestra: List[ErrorDetail] = Field(default_factory=list, description="Lista de primeros errores detectados para auditoría")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Fecha y hora UTC del procesamiento")

class IngestionStatusResponse(BaseModel):
    success: bool
    message: str
    audit: AuditReport
