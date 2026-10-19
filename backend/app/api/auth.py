"""Authentication and user management API endpoints"""

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.auth import (
    clear_session_cookie,
    create_session,
    get_client_ip,
    get_current_session,
    get_current_user,
    hash_password,
    login_throttle,
    require_admin,
    revoke_session,
    set_session_cookie,
    verify_password,
)
from app.database import get_db
from app.models.user import User, UserSession
from app.schemas.user import (
    BootstrapStatusResponse,
    ChangePasswordRequest,
    LoginRequest,
    LoginResponse,
    MessageResponse,
    SessionResponse,
    UserCreate,
    UserResponse,
    UserUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def _normalize_username(username: str) -> str:
    return username.strip().lower()


@router.get("/bootstrap-status", response_model=BootstrapStatusResponse)
def get_bootstrap_status(db: Session = Depends(get_db)):
    """Report whether the instance still needs its first admin account"""
    user_count = db.query(User).count()
    return BootstrapStatusResponse(needs_bootstrap=user_count == 0, user_count=user_count)


@router.post("/bootstrap", response_model=LoginResponse, status_code=201)
def bootstrap_admin(
    payload: UserCreate,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """Create the first administrator account.

    Only permitted while no users exist; afterwards accounts are created by an admin.
    """
    if db.query(User).count() > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An administrator account already exists",
        )

    user = User(
        username=_normalize_username(payload.username),
        display_name=payload.display_name,
        password_hash=hash_password(payload.password),
        is_admin=True,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    logger.info("Bootstrapped initial administrator '%s'", user.username)

    token, session = create_session(
        db,
        user,
        user_agent=request.headers.get("user-agent"),
        client_ip=get_client_ip(request),
    )
    set_session_cookie(response, token)

    return LoginResponse(
        access_token=token,
        expires_at=session.expires_at,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=LoginResponse)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """Authenticate with username and password"""
    username = _normalize_username(payload.username)
    throttle_key = f"{get_client_ip(request)}:{username}"

    retry_after = login_throttle.retry_after(throttle_key)
    if retry_after:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)},
        )

    user = db.query(User).filter(User.username == username).first()

    if user is None or not verify_password(payload.password, user.password_hash):
        login_throttle.record_failure(throttle_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been disabled",
        )

    login_throttle.reset(throttle_key)

    token, session = create_session(
        db,
        user,
        user_agent=request.headers.get("user-agent"),
        client_ip=get_client_ip(request),
    )
    set_session_cookie(response, token)

    return LoginResponse(
        access_token=token,
        expires_at=session.expires_at,
        user=UserResponse.model_validate(user),
    )


@router.post("/logout", response_model=MessageResponse)
def logout(
    response: Response,
    db: Session = Depends(get_db),
    session: UserSession = Depends(get_current_session),
):
    """Revoke the current session"""
    revoke_session(db, session)
    clear_session_cookie(response)
    return MessageResponse(message="Logged out")


@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)):
    """Return the authenticated user"""
    return user


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    session: UserSession = Depends(get_current_session),
):
    """Change the authenticated user's own password"""
    user = session.user

    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    user.password_hash = hash_password(payload.new_password)

    # Invalidate every other session so a stolen token cannot outlive the change.
    db.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.id != session.id,
    ).delete(synchronize_session=False)
    db.commit()

    return MessageResponse(message="Password updated")


@router.get("/sessions", response_model=List[SessionResponse])
def list_my_sessions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List the authenticated user's active sessions"""
    return (
        db.query(UserSession)
        .filter(UserSession.user_id == user.id)
        .order_by(UserSession.created_at.desc())
        .all()
    )


@router.delete("/sessions/{session_id}", response_model=MessageResponse)
def revoke_my_session(
    session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Revoke one of the authenticated user's sessions"""
    target = (
        db.query(UserSession)
        .filter(UserSession.id == session_id, UserSession.user_id == user.id)
        .first()
    )
    if target is None:
        raise HTTPException(status_code=404, detail="Session not found")

    revoke_session(db, target)
    return MessageResponse(message="Session revoked")


# --- Admin user management ---------------------------------------------------

@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """List all users (admin only)"""
    return db.query(User).order_by(User.username).all()


@router.post("/users", response_model=UserResponse, status_code=201)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Create a new user (admin only)"""
    username = _normalize_username(payload.username)

    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="That username is already taken")

    user = User(
        username=username,
        display_name=payload.display_name,
        password_hash=hash_password(payload.password),
        is_admin=payload.is_admin,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Update a user (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    data = payload.model_dump(exclude_unset=True)

    # Guard against an admin locking everyone out of user management.
    if user.is_admin and data.get("is_admin") is False:
        remaining_admins = (
            db.query(User)
            .filter(User.is_admin.is_(True), User.is_active.is_(True), User.id != user.id)
            .count()
        )
        if remaining_admins == 0:
            raise HTTPException(status_code=400, detail="Cannot remove the last administrator")

    if user.id == admin.id and data.get("is_active") is False:
        raise HTTPException(status_code=400, detail="You cannot disable your own account")

    if "display_name" in data:
        user.display_name = data["display_name"]
    if "is_admin" in data:
        user.is_admin = data["is_admin"]
    if "is_active" in data:
        user.is_active = data["is_active"]
        if not data["is_active"]:
            db.query(UserSession).filter(UserSession.user_id == user.id).delete(
                synchronize_session=False
            )
    if data.get("password"):
        user.password_hash = hash_password(data["password"])
        db.query(UserSession).filter(UserSession.user_id == user.id).delete(
            synchronize_session=False
        )

    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", response_model=MessageResponse)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Delete a user (admin only)"""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_admin:
        remaining_admins = (
            db.query(User)
            .filter(User.is_admin.is_(True), User.is_active.is_(True), User.id != user.id)
            .count()
        )
        if remaining_admins == 0:
            raise HTTPException(status_code=400, detail="Cannot delete the last administrator")

    db.delete(user)
    db.commit()
    return MessageResponse(message="User deleted")
