"""Dependency FastAPI per autenticazione e controllo accessi per ruolo/brand."""

from __future__ import annotations

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models.db_models import User
from ..services.auth import decode_token


def get_current_user(
    authorization: str | None = Header(default=None), db: Session = Depends(get_db)
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Autenticazione richiesta")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(401, "Sessione non valida, effettua di nuovo il login")
    user = db.get(User, int(payload["sub"]))
    if user is None:
        raise HTTPException(401, "Sessione non valida, effettua di nuovo il login")
    return user


def require_agency(user: User = Depends(get_current_user)) -> User:
    """Solo account agenzia: integrazioni, template, gestione brand/utenti."""
    if user.role != "agency":
        raise HTTPException(403, "Azione riservata all'agenzia")
    return user


def require_brand_access(brand_id: int, user: User = Depends(get_current_user)) -> User:
    """Agenzia vede tutti i brand; un cliente solo il proprio."""
    if user.role == "client" and user.brand_id != brand_id:
        raise HTTPException(403, "Non hai accesso a questo brand")
    return user


def check_brand_access(user: User, brand_id: int) -> None:
    """Stessa logica di require_brand_access per risorse identificate da un
    id proprio (non brand_id in path): caricare la risorsa, poi chiamare
    questa funzione col suo brand_id."""
    if user.role == "client" and user.brand_id != brand_id:
        raise HTTPException(403, "Non hai accesso a questo brand")
