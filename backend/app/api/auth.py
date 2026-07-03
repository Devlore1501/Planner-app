"""Login e gestione utenti (account agenzia + account cliente per-brand)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models.db_models import Brand, User
from ..models.schemas import LoginIn, TokenOut, UserCreate, UserOut, UserPasswordReset
from ..services.auth import create_token, hash_password, verify_password
from .deps import get_current_user, require_agency

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_out(user: User) -> UserOut:
    out = UserOut.model_validate(user)
    out.brand_name = user.brand.name if user.brand else None
    return out


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.strip().lower()).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Email o password errati")
    return TokenOut(access_token=create_token(user), user=_user_out(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return _user_out(user)


# ---- Gestione utenti (solo agenzia)

users_router = APIRouter(prefix="/api/users", tags=["users"])


@users_router.get("", response_model=list[UserOut], dependencies=[Depends(require_agency)])
def list_users(db: Session = Depends(get_db)):
    return [_user_out(u) for u in db.query(User).order_by(User.role, User.email).all()]


@users_router.post("", response_model=UserOut, status_code=201)
def create_user(
    payload: UserCreate, db: Session = Depends(get_db), _: User = Depends(require_agency)
):
    email = payload.email.strip().lower()
    if db.query(User).filter(User.email == email).first() is not None:
        raise HTTPException(409, "Esiste già un utente con questa email")
    if payload.role == "client":
        if payload.brand_id is None:
            raise HTTPException(422, "Un account cliente deve essere collegato a un brand")
        if db.get(Brand, payload.brand_id) is None:
            raise HTTPException(404, "Brand non trovato")
    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        brand_id=payload.brand_id if payload.role == "client" else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_out(user)


@users_router.patch(
    "/{user_id}/password", response_model=UserOut, dependencies=[Depends(require_agency)]
)
def reset_password(user_id: int, payload: UserPasswordReset, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "Utente non trovato")
    user.password_hash = hash_password(payload.password)
    db.commit()
    return _user_out(user)


@users_router.delete("/{user_id}", status_code=204, dependencies=[Depends(require_agency)])
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "Utente non trovato")
    db.delete(user)
    db.commit()
