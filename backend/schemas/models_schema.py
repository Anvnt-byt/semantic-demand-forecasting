from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal

class VentaRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_venta: str = Field(..., description="Identificador único del ticket o factura")
    fecha: datetime = Field(..., description="Fecha y hora de la transacción")
    sku: str = Field(..., description="Código único de producto / SKU")
    descripcion: Optional[str] = Field(None, description="Descripción textual del producto")
    cantidad: float = Field(..., description="Volumen o cantidad de unidades vendidas")
    precio_unitario: Optional[float] = Field(None, description="Precio unitario de venta")
    total: Optional[float] = Field(None, description="Monto total de la línea de venta")
    id_vendedor: Optional[str] = Field(None, description="Identificador del vendedor")
    nombre_vendedor: Optional[str] = Field(None, description="Nombre o alias del vendedor")

class InventarioRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sku: str = Field(..., description="Código único del producto")
    stock_actual: float = Field(..., description="Cantidad física en stock")
    stock_minimo: float = Field(default=0.0, description="Punto de stock mínimo de seguridad")
    lead_time_dias: Optional[float] = Field(default=0.0, description="Tiempo de reposición del proveedor en días")

class VendedorRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_vendedor: str = Field(..., description="Identificador único del vendedor")
    nombre_vendedor: str = Field(..., description="Nombre completo del vendedor")

class LineaVentaRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_venta: str = Field(..., description="Identificador de la venta asociada")
    sku: str = Field(..., description="Código del producto")
    descripcion: Optional[str] = Field(None, description="Descripción del artículo")
    cantidad: float = Field(..., description="Cantidad vendida")
    precio_unitario: Optional[float] = Field(None, description="Precio unitario")
    total: Optional[float] = Field(None, description="Total de la línea")
