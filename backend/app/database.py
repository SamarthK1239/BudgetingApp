"""Database configuration and session management"""

import os
from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import Engine

# Determine database location based on environment
def get_database_path():
    """Get the database file path based on environment"""
    db_path = os.getenv("DATABASE_PATH")
    
    if db_path:
        return db_path
    
    # Default to app data directory for production
    if os.getenv("ENVIRONMENT") == "production":
        if os.name == "nt":  # Windows
            app_data = os.getenv("APPDATA")
            db_dir = Path(app_data) / "BudgetingApp"
        elif os.name == "posix":
            if os.uname().sysname == "Darwin":  # macOS
                db_dir = Path.home() / "Library" / "Application Support" / "BudgetingApp"
            else:  # Linux
                db_dir = Path.home() / ".config" / "BudgetingApp"
        
        db_dir.mkdir(parents=True, exist_ok=True)
        return str(db_dir / "budget.db")
    
    # Development: use local database
    return "budget.db"


DATABASE_URL = f"sqlite:///{get_database_path()}"

# Create engine with SQLite-specific optimizations
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,  # Set to True for SQL query logging
)

# Enable foreign key constraints for SQLite
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")  # Write-Ahead Logging for better concurrency
    cursor.close()

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency for FastAPI routes
def get_db():
    """Database session dependency for FastAPI"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
