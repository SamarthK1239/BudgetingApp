"""FastAPI application entry point"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.database import engine, Base
from app.api import accounts, transactions, categories, budgets, reports, setup, imports, keywords, goals, income_schedules

# Import models to ensure they're registered with Base
from app.models import account, transaction, category, budget, category_keyword, goal, income_schedule

# Import database health checks
from app.database_fixes import run_database_health_checks

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("Starting BudgetingApp backend...")
    
    # Startup: Create database tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified")
    
    # Run auto-migrations (if Alembic is configured)
    try:
        from alembic.config import Config
        from alembic import command
        alembic_cfg = Config("alembic.ini")
        command.upgrade(alembic_cfg, "head")
        logger.info("Alembic migrations applied")
    except Exception as e:
        logger.warning(f"Alembic migration skipped: {e}")
    
    # Run database health checks and fixes
    try:
        logger.info("Running database health checks...")
        results = run_database_health_checks()
        if results["fixes_applied"] > 0:
            logger.info(f"✓ Applied {results['fixes_applied']} database fix(es)")
        if results["errors"]:
            logger.error(f"Database health check errors: {results['errors']}")
    except Exception as e:
        logger.error(f"Error during database health checks: {e}")
    
    logger.info("Backend startup complete")
    
    yield
    
    # Shutdown: cleanup if needed
    logger.info("Shutting down backend...")
    pass


app = FastAPI(
    title="BudgetingApp API",
    description="REST API for desktop budgeting application",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware for Electron renderer
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to electron://
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for backend status"""
    return {"status": "healthy", "service": "budgeting-app-backend"}


# Include API routers
app.include_router(setup.router, prefix="/api/setup", tags=["setup"])
app.include_router(accounts.router, prefix="/api/accounts", tags=["accounts"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["transactions"])
app.include_router(categories.router, prefix="/api/categories", tags=["categories"])
app.include_router(keywords.router, prefix="/api/keywords", tags=["keywords"])
app.include_router(budgets.router, prefix="/api/budgets", tags=["budgets"])
app.include_router(goals.router, prefix="/api/goals", tags=["goals"])
app.include_router(income_schedules.router, prefix="/api/income-schedules", tags=["income-schedules"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(imports.router, prefix="/api/import", tags=["import"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
