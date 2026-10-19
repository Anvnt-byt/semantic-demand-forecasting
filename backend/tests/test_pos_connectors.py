import pytest
from unittest.mock import MagicMock, patch
from schemas.ingestion import POSConnectionConfig, POSDBType
from connectors.security import (
    sanitize_and_validate_query, 
    SecurityViolationError, 
    ALLOW_EXTERNAL_WRITE_OPERATIONS
)
from connectors import get_pos_connector, PostgresPOSConnector, MySQLPOSConnector

def test_sanitize_and_validate_query_valid():
    q1 = "SELECT id_ticket, fecha, sku, cantidad FROM tickets_pos WHERE fecha >= '2026-01-01'"
    assert sanitize_and_validate_query(q1) == q1

    q2 = "WITH articulos AS (SELECT sku, descripcion FROM catalogo) SELECT * FROM articulos"
    assert sanitize_and_validate_query(q2) == q2

    # Query con comentarios normales
    q3 = "-- Consulta para extraer ventas\nSELECT * FROM ventas /* filtro rapido */"
    assert "SELECT * FROM ventas" in sanitize_and_validate_query(q3)

@pytest.mark.parametrize("malicious_query", [
    "INSERT INTO clientes (nombre) VALUES ('hacked')",
    "UPDATE inventario SET stock = 9999 WHERE sku = 'SKU-01'",
    "DELETE FROM ventas WHERE fecha < '2020-01-01'",
    "DROP TABLE historial_ventas",
    "ALTER TABLE inventario DROP COLUMN stock_minimo",
    "TRUNCATE TABLE transacciones",
    "CREATE TABLE backdoor (id INT)",
    "GRANT ALL PRIVILEGES ON *.* TO 'attacker'@'%'",
    "SELECT * FROM ventas; DROP TABLE auditoria;",
    "SELECT * FROM ventas; INSERT INTO logs VALUES (1);",
    "EXEC sp_executesql 'SELECT 1'",
    "CALL backup_procedure()",
    "SELECT * INTO OUTFILE '/tmp/dump.txt' FROM ventas"
])
def test_sanitize_and_validate_query_forbidden(malicious_query):
    with pytest.raises(SecurityViolationError):
        sanitize_and_validate_query(malicious_query)

def test_connector_factory_and_table_query():
    pg_config = POSConnectionConfig(
        db_type=POSDBType.POSTGRESQL,
        host="192.168.1.50",
        port=5432,
        database="pos_db",
        username="readonly_user",
        password="secret_password",
        query_or_table="ventas_pos"
    )
    connector = get_pos_connector(pg_config)
    assert isinstance(connector, PostgresPOSConnector)
    assert connector.build_safe_query() == "SELECT * FROM ventas_pos"

    mysql_config = POSConnectionConfig(
        db_type=POSDBType.MYSQL,
        host="192.168.1.51",
        port=3306,
        database="retail_pos",
        username="ro_agent",
        password="secret_password",
        query_or_table="SELECT sku, stock FROM articulos"
    )
    m_connector = get_pos_connector(mysql_config)
    assert isinstance(m_connector, MySQLPOSConnector)
    assert m_connector.build_safe_query() == "SELECT sku, stock FROM articulos"

def test_unsupported_database_engine():
    with pytest.raises(Exception):
        POSConnectionConfig(
            db_type="oracle", # No soportado por el enum
            host="10.0.0.1",
            port=1521,
            database="db",
            username="u",
            password="p",
            query_or_table="ventas"
        )

@patch("psycopg2.connect")
def test_postgres_read_only_enforcement(mock_connect):
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_connect.return_value = mock_conn
    mock_conn.cursor.return_value.__enter__.return_value = mock_cur
    mock_cur.fetchone.return_value = ("on",)

    pg_config = POSConnectionConfig(
        db_type=POSDBType.POSTGRESQL,
        host="127.0.0.1",
        port=5432,
        database="pos",
        username="ro_user",
        password="ro_password",
        query_or_table="ventas"
    )
    connector = PostgresPOSConnector(pg_config)
    assert connector.test_connection() is True

    # Verificar que se envió el comando de sesión de solo lectura
    mock_cur.execute.assert_any_call("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;")
    mock_cur.execute.assert_any_call("SHOW transaction_read_only;")

@patch("pymysql.connect")
def test_mysql_read_only_enforcement(mock_connect):
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_connect.return_value = mock_conn
    mock_conn.cursor.return_value.__enter__.return_value = mock_cur
    mock_cur.fetchone.return_value = {"@@session.transaction_read_only": 1}

    mysql_config = POSConnectionConfig(
        db_type=POSDBType.MYSQL,
        host="127.0.0.1",
        port=3306,
        database="pos",
        username="ro_user",
        password="ro_password",
        query_or_table="articulos"
    )
    connector = MySQLPOSConnector(mysql_config)
    assert connector.test_connection() is True

    mock_cur.execute.assert_any_call("SET SESSION TRANSACTION READ ONLY;")
    mock_cur.execute.assert_any_call("SELECT @@session.transaction_read_only;")
