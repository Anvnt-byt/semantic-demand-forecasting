import os
import logging
from typing import Optional
import polars as pl
from sqlalchemy import text
from sqlalchemy.engine import Engine
from database.connection import get_engine, get_database_url

logger = logging.getLogger(__name__)

def query_to_polars(sql: str, params: Optional[dict] = None) -> pl.DataFrame:
    """
    Ejecuta una consulta SQL y retorna un DataFrame de Polars optimizado en memoria
    utilizando el motor y pool de conexiones compartido del sistema.
    """
    engine = get_engine()
    with engine.connect() as conn:
        result = conn.execute(text(sql), params or {})
        rows = result.fetchall()
        columns = list(result.keys())
        if not rows:
            return pl.DataFrame(schema={col: pl.Utf8 for col in columns})
        
        # Mapeo a diccionario de listas para construcción nativa de Polars
        data = {col: [row[i] for row in rows] for i, col in enumerate(columns)}
        return pl.DataFrame(data)
