"""FastAPI application entry point"""

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.requests import Request
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.auth import get_current_user, purge_expired_sessions
from app.api import (
    accounts, transactions, categories, budgets, reports, setup, imports,
    keywords, goals, income_schedules, auth as auth_api
)

# Import models to ensure they're registered with Base
from app.models import (
    account, transaction, category, budget, category_keyword, goal,
    income_schedule, user
)

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
    
    # Drop expired login sessions so the table does not grow unbounded
    try:
        db = SessionLocal()
        try:
            removed = purge_expired_sessions(db)
            if removed:
                logger.info(f"Purged {removed} expired session(s)")
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"Could not purge expired sessions: {e}")
    
    logger.info(f"Backend startup complete (listening on {settings.host}:{settings.port})")
    
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

# CORS: explicit origins are required because the browser UI authenticates with cookies,
# which browsers refuse to send when the origin is the "*" wildcard.
if settings.cors_origin_list:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Health check endpoint (unauthenticated, for container/uptime probes)
@app.get("/health")
async def health_check():
    """Health check endpoint for backend status"""
    return {"status": "healthy", "service": "budgeting-app-backend"}


# Authentication endpoints are public; they are what grant access.
app.include_router(auth_api.router, prefix="/api/auth", tags=["auth"])

# Every other API router requires a valid session.
protected = [Depends(get_current_user)]

app.include_router(setup.router, prefix="/api/setup", tags=["setup"], dependencies=protected)
app.include_router(accounts.router, prefix="/api/accounts", tags=["accounts"], dependencies=protected)
app.include_router(transactions.router, prefix="/api/transactions", tags=["transactions"], dependencies=protected)
app.include_router(categories.router, prefix="/api/categories", tags=["categories"], dependencies=protected)
app.include_router(keywords.router, prefix="/api/keywords", tags=["keywords"], dependencies=protected)
app.include_router(budgets.router, prefix="/api/budgets", tags=["budgets"], dependencies=protected)
app.include_router(goals.router, prefix="/api/goals", tags=["goals"], dependencies=protected)
app.include_router(income_schedules.router, prefix="/api/income-schedules", tags=["income-schedules"], dependencies=protected)
app.include_router(reports.router, prefix="/api/reports", tags=["reports"], dependencies=protected)
app.include_router(imports.router, prefix="/api/import", tags=["import"], dependencies=protected)


# Unmatched /api paths must 404 as JSON rather than falling through to the SPA.
@app.get("/api/{path:path}", include_in_schema=False)
async def api_not_found(path: str):
    return JSONResponse({"detail": "Not Found"}, status_code=404)


def _mount_frontend() -> None:
    """Serve the built React app from this process, if it is available.

    The frontend uses HashRouter, so a single index.html fallback is sufficient --
    client-side routes never reach the server as distinct paths.
    """
    frontend_dir = settings.resolved_frontend_dir
    if frontend_dir is None:
        logger.info("No frontend build found; running in API-only mode")
        return

    static_dir = frontend_dir / "static"
    if static_dir.is_dir():
        app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

    index_file = frontend_dir / "index.html"

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str, request: Request):
        candidate = (frontend_dir / full_path).resolve()
        # Guard against path traversal escaping the build directory.
        if full_path and str(candidate).startswith(str(frontend_dir.resolve())) and candidate.is_file():
            return FileResponse(str(candidate))
        return FileResponse(str(index_file))

    logger.info(f"Serving frontend from {frontend_dir}")


if settings.serve_frontend:
    _mount_frontend()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.host, port=settings.port)
