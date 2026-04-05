from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings


def _normalize_database_url(url: str) -> str:
    # Some hosts (and older guides) use postgres:// which SQLAlchemy treats as an alias
    # but driver selection is clearer when we normalize it.
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg2://", 1)
    return url

# Handle SQLite needing check_same_thread=False
connect_args = {}
database_url = _normalize_database_url(settings.DATABASE_URL)

if database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(database_url, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
