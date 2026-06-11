import random

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models
from ..config import DEMO_MODE, DEMO_SMS_CODE
from ..database import get_db
from ..security import create_access_token, verify_password
from ..services.helpers import audit, notify_user

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterIn(BaseModel):
    phone: str
    full_name: str
    email: str = ""
    consent_personal_data: bool = True
    consent_voice: bool = False


class PhoneIn(BaseModel):
    phone: str


class VerifyIn(BaseModel):
    phone: str
    code: str


class ElderLoginIn(BaseModel):
    connect_code: str


class StaffLoginIn(BaseModel):
    phone: str
    password: str


def _issue_code(db: Session, phone: str) -> str:
    code = DEMO_SMS_CODE if DEMO_MODE else f"{random.randint(1000, 9999)}"
    db.add(models.SmsCode(phone=phone, code=code))
    db.commit()
    # В проде здесь вызов SMS-провайдера; в демо код возвращается в ответе
    return code


def _auth_response(user: models.User) -> dict:
    return {
        "access_token": create_access_token(user.id, user.role),
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "phone": user.phone,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
        },
    }


@router.post("/register")
def register(data: RegisterIn, db: Session = Depends(get_db)):
    if not data.consent_personal_data:
        raise HTTPException(400, "Необходимо согласие на обработку персональных данных")
    existing = db.query(models.User).filter_by(phone=data.phone).first()
    if existing:
        raise HTTPException(400, "Пользователь с таким телефоном уже зарегистрирован")
    user = models.User(
        phone=data.phone, full_name=data.full_name,
        email=data.email, role=models.Role.RELATIVE,
    )
    db.add(user)
    db.flush()
    db.add(models.Consent(user_id=user.id, kind="personal_data", granted=True))
    if data.consent_voice:
        db.add(models.Consent(user_id=user.id, kind="voice_recording", granted=True))
    notify_user(db, user.id, "registration", "Добро пожаловать во ВнучОК!",
                "Добавьте пожилого родственника и выберите тариф, чтобы начать.")
    audit(db, user.id, "register", "user", user.id)
    db.commit()
    code = _issue_code(db, data.phone)
    return {"status": "code_sent", "demo_code": code if DEMO_MODE else None}


@router.post("/request-code")
def request_code(data: PhoneIn, db: Session = Depends(get_db)):
    user = db.query(models.User).filter_by(phone=data.phone).first()
    if not user:
        raise HTTPException(404, "Пользователь не найден. Сначала зарегистрируйтесь.")
    code = _issue_code(db, data.phone)
    return {"status": "code_sent", "demo_code": code if DEMO_MODE else None}


@router.post("/verify-code")
def verify_code(data: VerifyIn, db: Session = Depends(get_db)):
    sms = (
        db.query(models.SmsCode)
        .filter_by(phone=data.phone, code=data.code, used=False)
        .order_by(models.SmsCode.created_at.desc())
        .first()
    )
    if not sms:
        raise HTTPException(400, "Неверный код подтверждения")
    sms.used = True
    user = db.query(models.User).filter_by(phone=data.phone).first()
    if not user:
        raise HTTPException(404, "Пользователь не найден")
    audit(db, user.id, "login_sms", "user", user.id)
    db.commit()
    return _auth_response(user)


@router.post("/elder-login")
def elder_login(data: ElderLoginIn, db: Session = Depends(get_db)):
    """Вход пожилого пользователя по коду подключения от родственника/оператора."""
    elder = (
        db.query(models.ElderProfile)
        .filter_by(connect_code=data.connect_code.strip().upper())
        .first()
    )
    if not elder:
        raise HTTPException(404, "Код подключения не найден. Проверьте код у родственника.")
    if elder.user_id:
        user = db.get(models.User, elder.user_id)
    else:
        user = models.User(
            phone=elder.phone or f"elder-{elder.id}",
            full_name=elder.full_name,
            role=models.Role.ELDER,
        )
        db.add(user)
        db.flush()
        elder.user_id = user.id
    audit(db, user.id, "elder_login", "elder_profile", elder.id)
    db.commit()
    response = _auth_response(user)
    response["elder_profile_id"] = elder.id
    return response


@router.post("/login")
def staff_login(data: StaffLoginIn, db: Session = Depends(get_db)):
    """Вход оператора/администратора по паролю."""
    user = db.query(models.User).filter_by(phone=data.phone).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Неверный телефон или пароль")
    if user.role not in (models.Role.OPERATOR, models.Role.ADMIN):
        raise HTTPException(403, "Вход по паролю доступен только сотрудникам")
    audit(db, user.id, "login_password", "user", user.id)
    db.commit()
    return _auth_response(user)
