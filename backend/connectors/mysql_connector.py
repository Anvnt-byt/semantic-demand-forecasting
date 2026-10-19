import pymysql
import pymysql.cursors
from typing import Optional, List, Dict, Any
import polars as pl
from connectors.base import BasePOSConnector
from connectors.security import SecurityViolationError

class MySQLPOSConnector(BasePOSConnector):
    """
    Conector seguro para bases de datos externas MySQL de Punto de Venta (POS).
    Configura explícitamente la sesión en modo READ-ONLY mediante init_command.
    """

    def __init__(self, config):
        super().__init__(config)
        self._conn = None

    def _get_connection(self):
        if self._conn is None or not self._conn.open:
            self._conn = pymysql.connect(
                host=self.config.host,
                port=self.config.port,
                database=self.config.database,
                user=self.config.username,
                password=self.config.password,
                connect_timeout=10,
                charset="utf8mb4",
                cursorclass=pymysql.cursors.DictCursor,
                init_command="SET SESSION TRANSACTION READ ONLY;"
            )
            # Revalidar en sesión
            with self._conn.cursor() as cur:
                cur.execute("SET SESSION TRANSACTION READ ONLY;")

        return self._conn

    def test_connection(self) -> bool:
        """Verifica la conectividad con MySQL y confirma que @@session.transaction_read_only sea 1."""
        conn = self._get_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT @@session.transaction_read_only;")
            row = cur.fetchone()
            val = list(row.values())[0] if isinstance(row, dict) else row[0]
            if str(val) not in ("1", "True", "true"):
                raise SecurityViolationError(
                    "Fallo de seguridad en MySQL: La conexión no pudo establecerse en modo READ-ONLY."
                )
        return True

    def fetch_dataframe(self, query: Optional[str] = None) -> pl.DataFrame:
        safe_query = self.build_safe_query(query)
        conn = self._get_connection()

        all_records: List[Dict[str, Any]] = []

        # Usar SSDictCursor (Server-Side streaming cursor) para evitar desbordamiento de RAM
        with conn.cursor(pymysql.cursors.SSDictCursor) as cur:
            cur.execute(safe_query)
            while True:
                batch = cur.fetchmany(self.config.batch_size)
                if not batch:
                    break
                for row in batch:
                    all_records.append(dict(row))

        if not all_records:
            return pl.DataFrame()

        df = pl.DataFrame(all_records)
        return df

    def close(self):
        if self._conn and self._conn.open:
            try:
                self._conn.close()
            except Exception:
                pass
            self._conn = None
