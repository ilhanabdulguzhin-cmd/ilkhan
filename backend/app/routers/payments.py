"""Платежи и подписки (раздел 14 ТЗ). В MVP — мок платёжного провайдера:
платежи сразу получают статус succeeded. Интеграция с ЮKassa/CloudPayments
подключается заменой _charge()."""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models
from ..config import TARIFFS
from ..database import get_db
from ..deps import get_current_user
from ..services.helpers import audit, notify_user

router = APIRouter(tags=["payments"])


class PaymentIn(BaseModel):
    amount: float
    description: str = ""
    request_id: int | None = None


class SubscriptionIn(BaseModel):
    plan: str


class SubscriptionUpdate(BaseModel):
    plan: str | None = None
    auto_renew: bool | None = None


def _charge(db: Session, user: models.User, amount: float, description: str,
            subscription_id: int | None = None,
            request_id: int | None = None) -> models.Payment:
    payment = models.Payment(
        user_id=user.id, amount=amount, description=description,
        subscription_id=subscription_id, request_id=request_id,
        status="succeeded",
    )
    db.add(payment)
    db.flush()
    notify_user(db, user.id, "payment",
                f"Оплата {amount:.0f} ₽ прошла успешно",
                f"{description}. Чек {payment.receipt_number}.")
    return payment


@router.get("/tariffs")
def tariffs():
    return list(TARIFFS.values())


@router.post("/payments/create")
def create_payment(data: PaymentIn, user: models.User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    if data.amount <= 0:
        raise HTTPException(400, "Некорректная сумма")
    payment = _charge(db, user, data.amount,
                      data.description or "Разовая оплата услуги",
                      request_id=data.request_id)
    if data.request_id:
        req = db.get(models.Request, data.request_id)
        if req and req.status == models.RequestStatus.AWAITING_PAYMENT:
            req.status = models.RequestStatus.ACCEPTED
            db.add(models.RequestStatusHistory(
                request_id=req.id, status=req.status,
                changed_by_id=user.id, comment="Оплата получена",
            ))
    audit(db, user.id, "payment", "payment", payment.id)
    db.commit()
    return {"id": payment.id, "status": payment.status,
            "receipt_number": payment.receipt_number}


@router.get("/payments/history")
def payment_history(user: models.User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    payments = (
        db.query(models.Payment)
        .filter_by(user_id=user.id)
        .order_by(models.Payment.created_at.desc())
        .all()
    )
    return [
        {
            "id": p.id, "amount": p.amount, "currency": p.currency,
            "status": p.status, "description": p.description,
            "receipt_number": p.receipt_number,
            "created_at": p.created_at.isoformat(),
        }
        for p in payments
    ]


@router.get("/subscriptions/my")
def my_subscription(user: models.User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    sub = (
        db.query(models.Subscription)
        .filter_by(user_id=user.id, status="active")
        .order_by(models.Subscription.started_at.desc())
        .first()
    )
    if not sub:
        return None
    tariff = TARIFFS.get(sub.plan, {})
    return {
        "id": sub.id, "plan": sub.plan, "plan_title": tariff.get("title", sub.plan),
        "price": tariff.get("price"), "status": sub.status,
        "auto_renew": sub.auto_renew,
        "started_at": sub.started_at.isoformat(),
        "expires_at": sub.expires_at.isoformat() if sub.expires_at else None,
    }


@router.post("/subscriptions/create")
def create_subscription(data: SubscriptionIn,
                        user: models.User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    tariff = TARIFFS.get(data.plan)
    if not tariff:
        raise HTTPException(400, "Неизвестный тариф")
    if tariff["code"] == "social" and user.role != models.Role.ADMIN:
        raise HTTPException(403, "Социальный тариф назначает администратор или НКО")
    existing = db.query(models.Subscription).filter_by(
        user_id=user.id, status="active").first()
    if existing:
        existing.status = "cancelled"
    sub = models.Subscription(
        user_id=user.id, plan=data.plan,
        expires_at=datetime.utcnow() + timedelta(days=30),
    )
    db.add(sub)
    db.flush()
    if tariff["price"] > 0:
        _charge(db, user, tariff["price"],
                f"Подписка «{tariff['title']}» на 30 дней", subscription_id=sub.id)
    notify_user(db, user.id, "subscription",
                f"Подписка «{tariff['title']}» активна",
                f"Действует до {sub.expires_at:%d.%m.%Y}.")
    audit(db, user.id, "subscribe", "subscription", sub.id, details=data.plan)
    db.commit()
    return {"id": sub.id, "plan": sub.plan, "status": sub.status}


@router.patch("/subscriptions/{subscription_id}")
def update_subscription(subscription_id: int, data: SubscriptionUpdate,
                        user: models.User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    sub = db.get(models.Subscription, subscription_id)
    if not sub or (sub.user_id != user.id and user.role != models.Role.ADMIN):
        raise HTTPException(404, "Подписка не найдена")
    if data.auto_renew is not None:
        sub.auto_renew = data.auto_renew
    if data.plan is not None:
        if data.plan not in TARIFFS:
            raise HTTPException(400, "Неизвестный тариф")
        sub.plan = data.plan
    db.commit()
    return {"status": "ok"}


@router.post("/subscriptions/cancel")
def cancel_subscription(user: models.User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    sub = db.query(models.Subscription).filter_by(
        user_id=user.id, status="active").first()
    if not sub:
        raise HTTPException(404, "Активная подписка не найдена")
    sub.status = "cancelled"
    sub.auto_renew = False
    notify_user(db, user.id, "subscription", "Подписка отменена",
                "Доступ сохранится до конца оплаченного периода.")
    audit(db, user.id, "cancel_subscription", "subscription", sub.id)
    db.commit()
    return {"status": "ok"}
