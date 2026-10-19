from sqlalchemy import (
    Column,
    String,
    DateTime,
    Numeric,
    Integer,
    Text,
    Index,
    func
)
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Venta(Base):
    __tablename__ = "ventas"

    id = Column(Integer, primary_key=True, autoincrement=True)
    id_venta = Column(String(100), nullable=False, index=True)
    fecha = Column(DateTime, nullable=False, index=True)
    sku = Column(String(100), nullable=False, index=True)
    descripcion = Column(Text, nullable=True)
    cantidad = Column(Numeric(14, 4), nullable=False)
    precio_unitario = Column(Numeric(14, 4), nullable=True)
    total = Column(Numeric(14, 4), nullable=True)
    id_vendedor = Column(String(100), nullable=True, index=True)
    nombre_vendedor = Column(String(255), nullable=True)
    ingested_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_ventas_fecha_sku", "fecha", "sku"),
        Index("idx_ventas_id_venta_sku", "id_venta", "sku"),
    )

class Inventario(Base):
    __tablename__ = "inventario"

    sku = Column(String(100), primary_key=True, nullable=False)
    stock_actual = Column(Numeric(14, 4), nullable=False, default=0.0)
    stock_minimo = Column(Numeric(14, 4), nullable=False, default=0.0)
    lead_time_dias = Column(Numeric(8, 2), nullable=True, default=0.0)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

class Vendedor(Base):
    __tablename__ = "vendedores"

    id_vendedor = Column(String(100), primary_key=True, nullable=False)
    nombre_vendedor = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

class LineaVenta(Base):
    __tablename__ = "lineas_venta"

    id_linea = Column(Integer, primary_key=True, autoincrement=True)
    id_venta = Column(String(100), nullable=False, index=True)
    sku = Column(String(100), nullable=False, index=True)
    descripcion = Column(Text, nullable=True)
    cantidad = Column(Numeric(14, 4), nullable=False)
    precio_unitario = Column(Numeric(14, 4), nullable=True)
    total = Column(Numeric(14, 4), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_lineas_venta_id_sku", "id_venta", "sku"),
    )

class AuditoriaIngesta(Base):
    __tablename__ = "auditoria_ingesta"

    batch_id = Column(String(64), primary_key=True, nullable=False)
    fuente = Column(String(50), nullable=False)
    tipo_entidad = Column(String(20), nullable=False)
    total_registros = Column(Integer, nullable=False)
    registros_validos = Column(Integer, nullable=False)
    registros_descartados = Column(Integer, nullable=False)
    duplicados_detectados = Column(Integer, nullable=False)
    duracion_ms = Column(Integer, nullable=False)
    errores_muestra = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
