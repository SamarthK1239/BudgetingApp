"""Application configuration

Centralises all environment-driven settings. Every setting can be overridden with an
environment variable prefixed with ``BUDGET_`` (for example ``BUDGET_HOST=0.0.0.0``).
"""

import os
import secrets
from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_data_dir() -> str:
    """Resolve the default directory used for the database and secret key."""
    explicit = os.getenv("BUDGET_DATA_DIR")
    if explicit:
        return explicit

    if os.getenv("ENVIRONMENT") == "production":
        if os.name == "nt":
            return str(Path(os.getenv("APPDATA", str(Path.home()))) / "BudgetingApp")
        if os.uname().sysname == "Darwin":
            return str(Path.home() / "Library" / "Application Support" / "BudgetingApp")
        return str(Path.home() / ".config" / "BudgetingApp")

    return str(Path.cwd())


class Settings(BaseSettings):
    """Runtime configuration for the BudgetingApp server."""

    model_config = SettingsConfigDict(
        env_prefix="BUDGET_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Server ---------------------------------------------------------
    host: str = "0.0.0.0"
    port: int = 8000

    # --- Storage --------------------------------------------------------
    data_dir: str = _default_data_dir()
    database_path: Optional[str] = None

    # --- Security -------------------------------------------------------
    secret_key: Optional[str] = None
    session_lifetime_days: int = 30
    secure_cookies: bool = False
    cookie_name: str = "budgetapp_session"
    login_max_attempts: int = 10
    login_lockout_seconds: int = 300

    # --- Frontend / CORS ------------------------------------------------
    serve_frontend: bool = True
    frontend_dir: Optional[str] = None
    # Stored as a raw comma-separated string rather than List[str]: pydantic-settings
    # JSON-decodes complex types straight from the environment, which rejects both
    # plain comma lists and empty values before any validator could normalise them.
    # The web UI is served from this same origin, so these defaults only cover the
    # React dev server and the Electron desktop client's renderer origin.
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,file://,null"

    @property
    def cors_origin_list(self) -> List[str]:
        """Allowed browser origins, parsed from the comma-separated setting."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def data_path(self) -> Path:
        path = Path(self.data_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def resolved_database_path(self) -> str:
        """Database file location, honouring the legacy DATABASE_PATH variable."""
        if self.database_path:
            return self.database_path

        legacy = os.getenv("DATABASE_PATH")
        if legacy:
            return legacy

        return str(self.data_path / "budget.db")

    @property
    def database_url(self) -> str:
        return f"sqlite:///{self.resolved_database_path}"

    @property
    def resolved_frontend_dir(self) -> Optional[Path]:
        """Locate the built React app, if present."""
        if self.frontend_dir:
            candidate = Path(self.frontend_dir)
            return candidate if candidate.is_dir() else None

        backend_root = Path(__file__).resolve().parent.parent
        candidates = [
            backend_root / "static",
            backend_root.parent / "frontend" / "build",
        ]
        for candidate in candidates:
            if (candidate / "index.html").is_file():
                return candidate
        return None

    def resolved_secret_key(self) -> str:
        """Return the signing secret, generating and persisting one on first run.

        Persisting the generated key means sessions survive a server or container
        restart instead of being silently invalidated.
        """
        if self.secret_key:
            return self.secret_key

        key_file = self.data_path / ".secret_key"
        if key_file.is_file():
            existing = key_file.read_text(encoding="utf-8").strip()
            if existing:
                return existing

        generated = secrets.token_urlsafe(48)
        key_file.write_text(generated, encoding="utf-8")
        try:
            key_file.chmod(0o600)
        except OSError:
            pass
        return generated


@lru_cache
def get_settings() -> Settings:
    """Cached settings accessor."""
    return Settings()


settings = get_settings()
