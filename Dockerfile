# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1: build the React web UI
# ---------------------------------------------------------------------------
FROM node:20-bookworm-slim AS frontend

WORKDIR /build

COPY frontend/package.json frontend/package-lock.json ./
# react-scripts 5 declares a TypeScript ^4 peer range while this project uses
# TypeScript 5, so legacy peer resolution is required for a reproducible install.
RUN npm ci --no-audit --no-fund --legacy-peer-deps

COPY frontend/tsconfig.json ./
COPY frontend/public ./public
COPY frontend/src ./src

# CRA treats warnings as errors when CI is set; keep it unset for a tolerant build.
ENV CI=false
RUN npm run build


# ---------------------------------------------------------------------------
# Stage 2: Python runtime serving both the API and the web UI
# ---------------------------------------------------------------------------
FROM python:3.12-slim-bookworm AS runtime

# WeasyPrint (PDF reports) needs Pango/Cairo at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpango-1.0-0 \
        libpangoft2-1.0-0 \
        libcairo2 \
        libgdk-pixbuf-2.0-0 \
        libffi8 \
        shared-mime-info \
        curl \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY backend/requirements.txt ./requirements.txt
# PyInstaller is only needed to build the desktop bundle, not to run the server.
RUN sed -i '/pyinstaller/d' requirements.txt && pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY backend/alembic ./alembic
COPY backend/alembic.ini ./alembic.ini

# The built web UI is served directly by FastAPI.
COPY --from=frontend /build/build ./static

# Database, WAL files and the generated signing key live on a mounted volume.
RUN mkdir -p /data && useradd --create-home --uid 1000 budgetapp && chown -R budgetapp /app /data
USER budgetapp

ENV BUDGET_DATA_DIR=/data \
    BUDGET_HOST=0.0.0.0 \
    BUDGET_PORT=8000 \
    BUDGET_SERVE_FRONTEND=true

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8000/health || exit 1

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
