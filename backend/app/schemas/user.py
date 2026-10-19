"""Authentication and user management schemas"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

USERNAME_PATTERN = r"^[A-Za-z0-9._-]+$"
MIN_PASSWORD_LENGTH = 8


def _validate_password(value: str) -> str:
    if len(value) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters long")
    return value


class UserCreate(BaseModel):
    """Payload for creating a user (bootstrap or admin-managed)"""
    username: str = Field(..., min_length=3, max_length=64, pattern=USERNAME_PATTERN)
    password: str = Field(..., max_length=128)
    display_name: Optional[str] = Field(default=None, max_length=100)
    is_admin: bool = False

    @field_validator("password")
    @classmethod
    def check_password(cls, value: str) -> str:
        return _validate_password(value)


class UserUpdate(BaseModel):
    """Admin-editable user fields"""
    display_name: Optional[str] = Field(default=None, max_length=100)
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(default=None, max_length=128)

    @field_validator("password")
    @classmethod
    def check_password(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        return _validate_password(value)


class UserResponse(BaseModel):
    """Public representation of a user"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: Optional[str] = None
    is_admin: bool
    is_active: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None


class LoginRequest(BaseModel):
    """Username/password login payload"""
    username: str = Field(..., max_length=64)
    password: str = Field(..., max_length=128)


class LoginResponse(BaseModel):
    """Login result, including a bearer token for non-browser clients"""
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    user: UserResponse


class ChangePasswordRequest(BaseModel):
    """Self-service password change"""
    current_password: str = Field(..., max_length=128)
    new_password: str = Field(..., max_length=128)

    @field_validator("new_password")
    @classmethod
    def check_password(cls, value: str) -> str:
        return _validate_password(value)


class BootstrapStatusResponse(BaseModel):
    """Whether the instance still needs its first admin account"""
    needs_bootstrap: bool
    user_count: int


class SessionResponse(BaseModel):
    """An active login session"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    expires_at: datetime
    last_seen_at: Optional[datetime] = None
    user_agent: Optional[str] = None
    client_ip: Optional[str] = None


class MessageResponse(BaseModel):
    """Generic acknowledgement"""
    message: str
