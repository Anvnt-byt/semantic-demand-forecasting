from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
import polars as pl
from schemas.ingestion import POSConnectionConfig
from connectors.security import (
    sanitize_and_validate_query, 
    SecurityViolationError, 
    ALLOW_EXTERNAL_WRITE_OPERATIONS, 
    LEGAL_WRITE_DISCLAIMER
)

class BasePOSConnector(ABC):
    """
    Clase base abstracta para conectores de bases de datos de clientes (POS).
    Enforza el modo Solo Lectura (READ-ONLY) a nivel de diseño y configuración.
    """

    def __init__(self, config: POSConnectionConfig):
        self.config = config
        
        # Validar bandera legal inmutable
        if ALLOW_EXTERNAL_WRITE_OPERATIONS:
            raise SecurityViolationError(
                f"Configuración insegura detectada: ALLOW_EXTERNAL_WRITE_OPERATIONS está habilitada.\n{LEGAL_WRITE_DISCLAIMER}"
            )

    @abstractmethod
    def test_connection(self) -> bool:
        """Verifica la conectividad y certifica que la sesión sea de SOLO LECTURA."""
        pass

    @abstractmethod
    def fetch_dataframe(self, query: Optional[str] = None) -> pl.DataFrame:
        """Extrae el conjunto de datos de forma segura en streaming hacia un DataFrame de Polars."""
        pass

    def build_safe_query(self, custom_query_or_table: Optional[str] = None) -> str:
        """Construye o valida una consulta SQL de lectura para la tabla o consulta especificada."""
        target = (custom_query_or_table or self.config.query_or_table).strip()

        # Si el usuario pasó solo el nombre de una tabla (sin espacios ni SELECT)
        if " " not in target and not target.upper().startswith("SELECT"):
            safe_query = f"SELECT * FROM {target}"
        else:
            safe_query = target

        # Pasar siempre por el validador estricto de solo lectura
        return sanitize_and_validate_query(safe_query)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    @abstractmethod
    def close(self):
        """Cierra de forma segura el pool o cursor de la conexión externa."""
        pass
