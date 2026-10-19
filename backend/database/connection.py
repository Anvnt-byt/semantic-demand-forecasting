import os
from contextlib import contextmanager
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from database.models import Base

DEFAULT_DB_URL = "postgresql://postgres:postgres@localhost:5432/demand_forecasting"

def get_database_url() -> str:
    url = os.getenv("DATABASE_URL", DEFAULT_DB_URL).strip()
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url

_engine = None
_SessionFactory = None

def get_engine(db_url: str = None):
    global _engine, _SessionFactory
    target_url = db_url or get_database_url()
    
    # Si la URL cambió o el motor no existe, recreamos
    if _engine is None or str(_engine.url) != target_url:
        is_sqlite = target_url.startswith("sqlite")
        connect_args = {"check_same_thread": False} if is_sqlite else {}
        
        if is_sqlite:
            _engine = create_engine(
                target_url,
                connect_args=connect_args,
                echo=False
            )
        else:
            _engine = create_engine(
                target_url,
                pool_size=10,
                max_overflow=20,
                pool_pre_ping=True,
                pool_recycle=3600,
                echo=False
            )
        _SessionFactory = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
        
    return _engine

def get_session_factory(db_url: str = None):
    global _SessionFactory
    if _SessionFactory is None:
        get_engine(db_url)
    return _SessionFactory

@contextmanager
def get_db_session(db_url: str = None) -> Generator[Session, None, None]:
    factory = get_session_factory(db_url)
    session: Session = factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

def get_db() -> Generator[Session, None, None]:
    """Generador de sesión para inyección de dependencias en FastAPI."""
    with get_db_session() as session:
        yield session

def init_db(engine=None):
    """Inicializa el esquema de tablas en la base de datos interna."""
    eng = engine or get_engine()
    Base.metadata.create_all(bind=eng)
