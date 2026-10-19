import json
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from database.models import Venta, Inventario, Vendedor, LineaVenta, AuditoriaIngesta
from schemas.ingestion import AuditReport, TargetEntity, ErrorDetail, SourceType

class IngestionAuditor:
    """Administra la persistencia de auditoría y la carga transaccional por lotes."""

    @classmethod
    def save_audit_report(cls, session: Session, report: AuditReport) -> AuditoriaIngesta:
        # Serializar errores muestra a JSON
        errores_json = json.dumps([err.model_dump() for err in report.errores_muestra], default=str)
        
        db_audit = AuditoriaIngesta(
            batch_id=report.batch_id,
            fuente=report.fuente.value if hasattr(report.fuente, "value") else str(report.fuente),
            tipo_entidad=report.tipo_entidad.value if hasattr(report.tipo_entidad, "value") else str(report.tipo_entidad),
            total_registros=report.total_registros,
            registros_validos=report.registros_validos,
            registros_descartados=report.registros_descartados,
            duplicados_detectados=report.duplicados_detectados,
            duracion_ms=report.duracion_ms,
            errores_muestra=errores_json,
            created_at=report.created_at
        )
        session.add(db_audit)
        session.flush()
        return db_audit

    @classmethod
    def persist_records(
        cls,
        session: Session,
        valid_records: List[Dict[str, Any]],
        entity: TargetEntity,
        report: AuditReport
    ) -> None:
        """Inserta los registros saneados y su auditoría de manera atómica."""
        if entity == TargetEntity.VENTAS:
            ventas_objs = []
            lineas_objs = []
            vendedores_vistos = set()

            for r in valid_records:
                # Objeto para tabla principal 'ventas' esperada por analítica
                v = Venta(
                    id_venta=r["id_venta"],
                    fecha=r["fecha"],
                    sku=r["sku"],
                    descripcion=r.get("descripcion"),
                    cantidad=r["cantidad"],
                    precio_unitario=r.get("precio_unitario"),
                    total=r.get("total"),
                    id_vendedor=r.get("id_vendedor"),
                    nombre_vendedor=r.get("nombre_vendedor")
                )
                ventas_objs.append(v)

                # Objeto para líneas de venta relacional
                linea = LineaVenta(
                    id_venta=r["id_venta"],
                    sku=r["sku"],
                    descripcion=r.get("descripcion"),
                    cantidad=r["cantidad"],
                    precio_unitario=r.get("precio_unitario"),
                    total=r.get("total")
                )
                lineas_objs.append(linea)

                # Vendedores si vienen completos
                id_v = r.get("id_vendedor")
                nom_v = r.get("nombre_vendedor")
                if id_v and nom_v and id_v not in vendedores_vistos:
                    vendedores_vistos.add(id_v)
                    # Comprobar si ya existe
                    existente = session.get(Vendedor, id_v)
                    if not existente:
                        session.add(Vendedor(id_vendedor=id_v, nombre_vendedor=nom_v))

            if ventas_objs:
                session.bulk_save_objects(ventas_objs)
            if lineas_objs:
                session.bulk_save_objects(lineas_objs)

        elif entity == TargetEntity.INVENTARIO:
            for r in valid_records:
                sku = r["sku"]
                existente = session.get(Inventario, sku)
                if existente:
                    existente.stock_actual = r["stock_actual"]
                    existente.stock_minimo = r["stock_minimo"]
                    if r.get("lead_time_dias") is not None:
                        existente.lead_time_dias = r["lead_time_dias"]
                else:
                    inv = Inventario(
                        sku=sku,
                        stock_actual=r["stock_actual"],
                        stock_minimo=r["stock_minimo"],
                        lead_time_dias=r.get("lead_time_dias", 0.0)
                    )
                    session.add(inv)

        # Guardar reporte de auditoría en la misma transacción
        cls.save_audit_report(session, report)

    @classmethod
    def get_audit_by_id(cls, session: Session, batch_id: str) -> Optional[AuditReport]:
        row = session.get(AuditoriaIngesta, batch_id)
        if not row:
            return None

        errores = []
        if row.errores_muestra:
            try:
                errores_data = json.loads(row.errores_muestra)
                errores = [ErrorDetail(**err) for err in errores_data]
            except Exception:
                pass

        return AuditReport(
            batch_id=row.batch_id,
            fuente=SourceType(row.fuente) if row.fuente in SourceType._value2member_map_ else SourceType.CSV,
            tipo_entidad=TargetEntity(row.tipo_entidad) if row.tipo_entidad in TargetEntity._value2member_map_ else TargetEntity.VENTAS,
            total_registros=row.total_registros,
            registros_validos=row.registros_validos,
            registros_descartados=row.registros_descartados,
            duplicados_detectados=row.duplicados_detectados,
            duracion_ms=row.duracion_ms,
            errores_muestra=errores,
            created_at=row.created_at
        )

    @classmethod
    def list_recent_audits(cls, session: Session, limit: int = 20) -> List[AuditReport]:
        stmt = select(AuditoriaIngesta).order_by(desc(AuditoriaIngesta.created_at)).limit(limit)
        rows = session.execute(stmt).scalars().all()
        result = []
        for row in rows:
            report = cls.get_audit_by_id(session, row.batch_id)
            if report:
                result.append(report)
        return result
