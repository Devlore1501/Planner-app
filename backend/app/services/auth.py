"""Hashing password e JWT di sessione."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from .. import settings as cfg
from ..models.db_models import User

JWT_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:
        return False


def create_token(user: User) -> str:
    payload = {
        "sub": str(user.id),
        "role": user.role,
        "brand_id": user.brand_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=cfg.JWT_EXPIRES_HOURS),
    }
    return jwt.encode(payload, cfg.JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, cfg.JWT_SECRET, algorithms=[JWT_ALGORITHM])
