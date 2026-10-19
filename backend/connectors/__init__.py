from schemas.ingestion import POSConnectionConfig, POSDBType
from connectors.security import (
    SecurityViolationError, 
    sanitize_and_validate_query, 
    ALLOW_EXTERNAL_WRITE_OPERATIONS, 
    LEGAL_WRITE_DISCLAIMER
)
from connectors.base import BasePOSConnector
from connectors.postgres_connector import PostgresPOSConnector
from connectors.mysql_connector import MySQLPOSConnector

def get_pos_connector(config: POSConnectionConfig) -> BasePOSConnector:
    """Fábrica de conectores externos con enforcing estricto de solo lectura."""
    if config.db_type == POSDBType.POSTGRESQL or str(config.db_type).lower() == "postgresql":
        return PostgresPOSConnector(config)
    elif config.db_type == POSDBType.MYSQL or str(config.db_type).lower() == "mysql":
        return MySQLPOSConnector(config)
    else:
        raise ValueError(
            f"Motor de base de datos no soportado: '{config.db_type}'. "
            "Únicamente se admiten bases de datos relacionales MySQL y PostgreSQL."
        )

__all__ = [
    "BasePOSConnector",
    "PostgresPOSConnector",
    "MySQLPOSConnector",
    "get_pos_connector",
    "SecurityViolationError",
    "sanitize_and_validate_query",
    "ALLOW_EXTERNAL_WRITE_OPERATIONS",
    "LEGAL_WRITE_DISCLAIMER"
]
