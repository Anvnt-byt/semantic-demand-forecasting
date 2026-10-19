import re
from typing import Set

ALLOW_EXTERNAL_WRITE_OPERATIONS: bool = False

LEGAL_WRITE_DISCLAIMER: str = (
    "ADVERTENCIA LEGAL Y DE SEGURIDAD: Las conexiones a sistemas de punto de venta (POS) externos "
    "operan con garantías criptográficas y transaccionales en modo SOLO LECTURA (READ-ONLY / SELECT únicamente). "
    "Queda terminantemente prohibida la ejecución de comandos DDL (CREATE, DROP, ALTER) o DML de escritura "
    "(INSERT, UPDATE, DELETE) sobre los servidores de los clientes. El uso no autorizado de permisos de "
    "escritura exime a los desarrolladores de toda responsabilidad legal civil o mercantil sobre la integridad "
    "de los datos origen."
)

FORBIDDEN_KEYWORDS: Set[str] = {
    "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE",
    "CREATE", "REPLACE", "RENAME", "GRANT", "REVOKE", "CALL",
    "EXEC", "EXECUTE", "LOCK", "SET", "MERGE", "UPSERT",
    "FLUSH", "SHUTDOWN", "KILL", "INTO", "OUTFILE", "DUMPFILE"
}

class SecurityViolationError(Exception):
    """Excepción emitida cuando una consulta externa viola la política de Solo Lectura."""
    pass

def sanitize_and_validate_query(query: str) -> str:
    """
    Inspecciona y valida que la sentencia SQL sea estrictamente de SOLO LECTURA (SELECT o CTE WITH ... SELECT).
    Rechaza inyecciones multisentencia y comandos DDL/DML.
    """
    if not query or not query.strip():
        raise SecurityViolationError("La consulta SQL suministrada está vacía.")

    # 1. Eliminar comentarios SQL (-- y /* ... */) para evitar ocultamiento de instrucciones
    clean_sql = re.sub(r"--.*?(\r\n|\r|\n)", " ", query)
    clean_sql = re.sub(r"/\*.*?\*/", " ", clean_sql, flags=re.DOTALL).strip()

    # 2. Verificar que no contenga múltiples sentencias encadenadas con punto y coma
    statements = [s.strip() for s in clean_sql.split(";") if s.strip()]
    if len(statements) > 1:
        raise SecurityViolationError(
            "Violación de seguridad: Se detectaron múltiples sentencias delimitadas por ';'. "
            "Solo se permite una única sentencia SELECT de lectura."
        )

    single_statement = statements[0]
    tokens = re.findall(r"\b[A-Za-z_]+\b", single_statement.upper())

    if not tokens:
        raise SecurityViolationError("Consulta SQL inválida o carente de tokens reconocibles.")

    # 3. La consulta debe comenzar obligatoriamente con SELECT o con CTE (WITH)
    first_token = tokens[0]
    if first_token not in ("SELECT", "WITH"):
        raise SecurityViolationError(
            f"Operación no permitida: Las consultas deben iniciar con 'SELECT' o 'WITH'. Comando recibido: '{first_token}'."
        )

    # 4. Escanear presencia de cualquier palabra clave prohibida de modificación o DDL
    for token in tokens:
        if token in FORBIDDEN_KEYWORDS:
            # Excepción controlada: 'INTO' sólo si no está precedido por SELECT INTO
            raise SecurityViolationError(
                f"Violación crítica de Solo Lectura: La sentencia contiene la palabra clave restringida '{token}'. "
                "Operación abortada para proteger la base de datos externa."
            )

    return single_statement
