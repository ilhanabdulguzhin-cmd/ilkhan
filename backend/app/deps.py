from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from . import models
from .database import get_db
from .security import decode_token

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> models.User:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Не авторизован")
    payload = decode_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Недействительный токен")
    user = db.get(models.User, int(payload["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Пользователь не найден")
    return user


def require_roles(*roles: str):
    def checker(user: models.User = Depends(get_current_user)) -> models.User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Недостаточно прав")
        return user

    return checker


require_staff = require_roles(models.Role.OPERATOR, models.Role.ADMIN)
require_admin = require_roles(models.Role.ADMIN)
require_relative = require_roles(models.Role.RELATIVE, models.Role.ADMIN)
require_elder = require_roles(models.Role.ELDER)


def get_elder_or_403(db: Session, user: models.User, elder_id: int) -> models.ElderProfile:
    """Доступ к профилю пожилого: сам пожилой, его родственники, оператор, админ."""
    elder = db.get(models.ElderProfile, elder_id)
    if elder is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Профиль не найден")
    if user.role in (models.Role.OPERATOR, models.Role.ADMIN):
        return elder
    if user.role == models.Role.ELDER and elder.user_id == user.id:
        return elder
    if user.role == models.Role.RELATIVE:
        rel = (
            db.query(models.FamilyRelation)
            .filter_by(relative_id=user.id, elder_id=elder_id)
            .first()
        )
        if rel:
            return elder
    raise HTTPException(status.HTTP_403_FORBIDDEN, "Нет доступа к этому профилю")


def get_own_elder_profile(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> models.ElderProfile:
    if user.role != models.Role.ELDER:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Только для пожилого пользователя")
    elder = db.query(models.ElderProfile).filter_by(user_id=user.id).first()
    if elder is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Профиль не найден")
    return elder
