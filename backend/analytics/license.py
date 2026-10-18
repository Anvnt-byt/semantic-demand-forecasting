import hashlib
import hmac
import os
import re
from datetime import datetime, timezone
from typing import List, Dict, Tuple, Optional

from schemas.analytics import LicenseVerifyRequest, LicenseVerifyResponse

# Clave secreta interna para firma de licencias offline (SaaS local sin telemetría)
LICENSE_SECRET = os.getenv("LICENSE_SECRET", "techconnect-pos-secret-key-2026").encode()

PLAN_FEATURES: Dict[str, List[str]] = {
    "starter": [
        "kpis_basicos",
        "rotacion_abc",
        "exportacion_excel",
        "ingesta_manual_csv_excel"
    ],
    "pro": [
        "kpis_basicos",
        "rotacion_abc",
        "exportacion_excel",
        "exportacion_pdf",
        "pronostico_demanda_ml",
        "stock_seguridad_rop",
        "conexion_relacional_mysql_postgres",
        "ingesta_manual_csv_excel"
    ],
    "enterprise": [
        "kpis_basicos",
        "rotacion_abc",
        "exportacion_excel",
        "exportacion_pdf",
        "pronostico_demanda_ml",
        "stock_seguridad_rop",
        "conexion_relacional_mysql_postgres",
        "multi_terminal",
        "comparativas_multianuales",
        "soporte_prioritario"
    ]
}

def verify_license(req: LicenseVerifyRequest) -> LicenseVerifyResponse:
    """
    Valida la clave de licencia SaaS.
    Soporta formato comercial offline: TC-<PLAN>-<YYYYMMDD>-<SIGNATURE>
    así como claves de prueba controladas para ambiente de desarrollo.
    """
    key = req.license_key.strip().upper()
    now = datetime.now(timezone.utc)

    # 1. Validación de claves demo / desarrollo
    demo_keys = {
        "TC-STARTER-DEMO-2027": ("starter", datetime(2027, 12, 31, 23, 59, 59, tzinfo=timezone.utc), "Comercio Demo Starter"),
        "TC-PRO-DEMO-2027": ("pro", datetime(2027, 12, 31, 23, 59, 59, tzinfo=timezone.utc), "Comercio Demo Pro"),
        "TC-ENTERPRISE-DEMO-2027": ("enterprise", datetime(2027, 12, 31, 23, 59, 59, tzinfo=timezone.utc), "Corporativo Demo Enterprise")
    }

    if key in demo_keys:
        plan, expires_at, empresa = demo_keys[key]
        dias_restantes = max(0, (expires_at - now).days)
        return LicenseVerifyResponse(
            valid=True,
            plan=plan,  # type: ignore
            empresa=empresa,
            expires_at=expires_at,
            dias_restantes=dias_restantes,
            features_habilitadas=PLAN_FEATURES[plan]
        )

    # 2. Validación de formato criptográfico offline: TC-<PLAN>-<YYYYMMDD>-<HASH8>
    match = re.match(r"^TC-(STARTER|PRO|ENTERPRISE)-(\d{8})-([A-F0-9]{8})$", key)
    if not match:
        return LicenseVerifyResponse(
            valid=False,
            plan="starter",
            empresa=None,
            expires_at=None,
            dias_restantes=0,
            features_habilitadas=[]
        )

    plan_str, exp_str, hash_str = match.groups()
    plan = plan_str.lower()

    try:
        exp_year = int(exp_str[0:4])
        exp_month = int(exp_str[4:6])
        exp_day = int(exp_str[6:8])
        expires_at = datetime(exp_year, exp_month, exp_day, 23, 59, 59, tzinfo=timezone.utc)
    except ValueError:
        return LicenseVerifyResponse(
            valid=False,
            plan="starter",
            empresa=None,
            expires_at=None,
            dias_restantes=0,
            features_habilitadas=[]
        )

    # Verificar expiración
    if expires_at < now:
        return LicenseVerifyResponse(
            valid=False,
            plan=plan,  # type: ignore
            empresa=None,
            expires_at=expires_at,
            dias_restantes=0,
            features_habilitadas=[]
        )

    # Verificar firma criptográfica HMAC-SHA256 con payload: PLAN + EXPIRY + POS_ID
    payload = f"{plan_str}-{exp_str}-{req.pos_identifier}".encode()
    signature = hmac.new(LICENSE_SECRET, payload, hashlib.sha256).hexdigest()[:8].upper()

    if signature != hash_str:
        return LicenseVerifyResponse(
            valid=False,
            plan="starter",
            empresa=None,
            expires_at=None,
            dias_restantes=0,
            features_habilitadas=[]
        )

    dias_restantes = max(0, (expires_at - now).days)
    return LicenseVerifyResponse(
        valid=True,
        plan=plan,  # type: ignore
        empresa=f"Terminal POS ({req.pos_identifier[:10]})",
        expires_at=expires_at,
        dias_restantes=dias_restantes,
        features_habilitadas=PLAN_FEATURES[plan]
    )
