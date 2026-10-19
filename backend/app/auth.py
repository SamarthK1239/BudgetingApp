"""Authentication core: password hashing, session tokens and FastAPI dependencies"""

import hashlib
import hmac
import logging
import secrets
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Tuple

import bcrypt
from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User, UserSession

logger = logging.getLogger(__name__)

# bcrypt silently truncates anything past 72 bytes, so reject longer inputs explicitly.
_BCRYPT_MAX_BYTES = 72


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt"""
    encoded = password.encode("utf-8")
    if len(encoded) > _BCRYPT_MAX_BYTES:
        raise ValueError("Password is too long (maximum 72 bytes)")
    return bcrypt.hashpw(encoded, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Check a plaintext password against a stored bcrypt hash"""
    try:
        encoded = password.encode("utf-8")
        if len(encoded) > _BCRYPT_MAX_BYTES:
            return False
        return bcrypt.checkpw(encoded, password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def hash_token(token: str) -> str:
    """Derive the stored representation of a session token.

    The raw token never touches the database, so a database leak alone does not
    yield usable session credentials.
    """
    secret = settings.resolved_secret_key().encode("utf-8")
    return hmac.new(secret, token.encode("utf-8"), hashlib.sha256).hexdigest()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _as_aware(value: datetime) -> datetime:
    """SQLite returns naive datetimes; treat those as UTC."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def create_session(
    db: Session,
    user: User,
    user_agent: Optional[str] = None,
    client_ip: Optional[str] = None,
) -> Tuple[str, UserSession]:
    """Create a new login session and return the raw token plus the record"""
    raw_token = secrets.token_urlsafe(48)
    session = UserSession(
        token_hash=hash_token(raw_token),
        user_id=user.id,
        expires_at=_utcnow() + timedelta(days=settings.session_lifetime_days),
        last_seen_at=_utcnow(),
        user_agent=(user_agent or "")[:255] or None,
        client_ip=(client_ip or "")[:64] or None,
    )
    db.add(session)
    user.last_login_at = _utcnow()
    db.commit()
    db.refresh(session)
    return raw_token, session


def revoke_session(db: Session, session: UserSession) -> None:
    """Delete a session, immediately invalidating its token"""
    db.delete(session)
    db.commit()


def purge_expired_sessions(db: Session) -> int:
    """Remove sessions that are past their expiry"""
    deleted = (
        db.query(UserSession)
        .filter(UserSession.expires_at < _utcnow())
        .delete(synchronize_session=False)
    )
    db.commit()
    return deleted


def set_session_cookie(response: Response, token: str) -> None:
    """Attach the session cookie used by the browser web UI"""
    response.set_cookie(
        key=settings.cookie_name,
        value=token,
        max_age=settings.session_lifetime_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.secure_cookies,
        samesite="lax",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    """Remove the session cookie"""
    response.delete_cookie(key=settings.cookie_name, path="/")


class LoginThrottle:
    """In-memory failed-login throttle keyed by client IP and username.

    Deliberately process-local: the deployment is a single container serving a
    small tailnet, so a shared store would add dependencies for little gain.
    """

    def __init__(self, max_attempts: int, lockout_seconds: int) -> None:
        self._max_attempts = max_attempts
        self._lockout_seconds = lockout_seconds
        self._failures: Dict[str, Tuple[int, float]] = {}
        self._lock = threading.Lock()

    def _prune(self, now: float) -> None:
        stale = [key for key, (_, last) in self._failures.items() if now - last > self._lockout_seconds]
        for key in stale:
            self._failures.pop(key, None)

    def retry_after(self, key: str) -> int:
        """Seconds the caller must wait, or 0 if they may try now"""
        now = time.monotonic()
        with self._lock:
            self._prune(now)
            count, last = self._failures.get(key, (0, 0.0))
            if count < self._max_attempts:
                return 0
            remaining = self._lockout_seconds - (now - last)
            return max(int(remaining), 1) if remaining > 0 else 0

    def record_failure(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            self._prune(now)
            count, _ = self._failures.get(key, (0, 0.0))
            self._failures[key] = (count + 1, now)

    def reset(self, key: str) -> None:
        with self._lock:
            self._failures.pop(key, None)


login_throttle = LoginThrottle(settings.login_max_attempts, settings.login_lockout_seconds)


def get_client_ip(request: Request) -> str:
    """Best-effort client address, honouring a reverse proxy header"""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def extract_token(request: Request) -> Optional[str]:
    """Read the session token from the Authorization header or session cookie"""
    auth_header = request.headers.get("authorization")
    if auth_header:
        scheme, _, value = auth_header.partition(" ")
        if scheme.lower() == "bearer" and value.strip():
            return value.strip()

    cookie = request.cookies.get(settings.cookie_name)
    if cookie:
        return cookie

    return None


def resolve_session(db: Session, token: str) -> Optional[UserSession]:
    """Look up a live session for a raw token, refreshing its sliding expiry"""
    session = (
        db.query(UserSession)
        .filter(UserSession.token_hash == hash_token(token))
        .first()
    )
    if session is None:
        return None

    if _as_aware(session.expires_at) <= _utcnow():
        db.delete(session)
        db.commit()
        return None

    if session.user is None or not session.user.is_active:
        return None

    # Sliding expiry: active use keeps the session alive.
    now = _utcnow()
    last_seen = _as_aware(session.last_seen_at) if session.last_seen_at else None
    if last_seen is None or (now - last_seen) > timedelta(hours=1):
        session.last_seen_at = now
        session.expires_at = now + timedelta(days=settings.session_lifetime_days)
        db.commit()

    return session


_UNAUTHENTICATED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_session(
    request: Request,
    db: Session = Depends(get_db),
) -> UserSession:
    """Resolve the caller's session or raise 401"""
    token = extract_token(request)
    if not token:
        raise _UNAUTHENTICATED

    session = resolve_session(db, token)
    if session is None:
        raise _UNAUTHENTICATED

    return session


def get_current_user(session: UserSession = Depends(get_current_session)) -> User:
    """Resolve the authenticated user or raise 401"""
    return session.user


def require_admin(user: User = Depends(get_current_user)) -> User:
    """Resolve the authenticated user, requiring admin privileges"""
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges are required",
        )
    return user
