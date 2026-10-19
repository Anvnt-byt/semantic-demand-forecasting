import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Optional, List, Dict, Any
import polars as pl
from connectors.base import BasePOSConnector
from connectors.security import SecurityViolationError

class PostgresPOSConnector(BasePOSConnector):
    """
    Conector seguro para bases de datos externas PostgreSQL de Punto de Venta (POS).
    Configura explícitamente la transacción en modo READ-ONLY a nivel de motor y sesión.
    """

    def __init__(self, config):
        super().__init__(config)
        self._conn = None

    def _get_connection(self):
        if self._conn is None or self._conn.closed != 0:
            # Enforzar parámetro de conexión de solo lectura en el DSN
            self._conn = psycopg2.connect(
                host=self.config.host,
                port=self.config.port,
                dbname=self.config.database,
                user=self.config.username,
                password=self.config.password,
                connect_timeout=10,
                options="-c default_transaction_read_only=on"
            )
            # Enforzar a nivel de sesión
            with self._conn.cursor() as cur:
                cur.execute("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;")
                self._conn.commit()

        return self._conn

    def test_connection(self) -> bool:
        """Verifica la conexión y confirma que PostgreSQL reconozca la sesión como transaction_read_only."""
        conn = self._get_connection()
        with conn.cursor() as cur:
            cur.execute("SHOW transaction_read_only;")
            row = cur.fetchone()
            if not row or str(row[0]).lower() not in ("on", "true", "yes", "1"):
                raise SecurityViolationError(
                    "Fallo de seguridad en PostgreSQL: La conexión no pudo establecerse en modo READ-ONLY."
                )
        return True

    def fetch_dataframe(self, query: Optional[str] = None) -> pl.DataFrame:
        safe_query = self.build_safe_query(query)
        conn = self._get_connection()

        # Usar cursor nombrado para lectura en streaming por lotes
        cursor_name = "pos_stream_cursor"
        all_records: List[Dict[str, Any]] = []

        with conn.cursor(name=cursor_name, cursor_factory=RealDictCursor) as cur:
            cur.itersize = self.config.batch_size
            cur.execute(safe_query)

            while True:
                batch = cur.fetchmany(self.config.batch_size)
                if not batch:
                    break
                for row in batch:
                    all_records.append(dict(row))

        if not all_records:
            return pl.DataFrame()

        # Convertir a Polars DataFrame convirtiendo tipos homogéneamente
        df = pl.DataFrame(all_records)
        return df

    def close(self):
        if self._conn and self._conn.closed == 0:
            try:
                self._conn.close()
            except Exception:
                pass
            self._conn = None
