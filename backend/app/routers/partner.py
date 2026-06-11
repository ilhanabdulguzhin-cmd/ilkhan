"""Партнёрский кабинет (версия 2 ТЗ): партнёр видит назначенные ему заказы,
подтверждает принятие, обновляет статус и оставляет комментарии оператору."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..deps import require_roles
from ..services.helpers import (
    audit,
    notify_relatives,
    notify_staff,
    serialize_request,
    set_request_status,
)

router = APIRouter(prefix="/partner", tags=["partner"])

require_partner = require_roles(models.Role.PARTNER)

# Какие переходы статусов разрешены партнёру
ALLOWED_TRANSITIONS = {
    models.RequestStatus.SENT_TO_PARTNER: [models.RequestStatus.IN_PROGRESS],
    models.RequestStatus.IN_PROGRESS: [models.RequestStatus.DONE],
}


class PartnerStatusIn(BaseModel):
    status: str
    comment: str = ""


class PartnerCommentIn(BaseModel):
    text: str


def _partner_request(db: Session, user: models.User, request_id: int) -> models.Request:
    req = db.get(models.Request, request_id)
    if not req or req.partner_id != user.partner_id:
        raise HTTPException(404, "Заказ не найден")
    return req


@router.get("/me")
def partner_info(user: models.User = Depends(require_partner),
                 db: Session = Depends(get_db)):
    partner = db.get(models.Partner, user.partner_id) if user.partner_id else None
    if not partner:
        raise HTTPException(404, "Партнёрская организация не привязана")
    return {"id": partner.id, "name": partner.name, "kind": partner.kind,
            "city": partner.city, "rating": partner.rating}


@router.get("/orders")
def partner_orders(user: models.User = Depends(require_partner),
                   db: Session = Depends(get_db)):
    if not user.partner_id:
        return []
    orders = (
        db.query(models.Request)
        .filter(models.Request.partner_id == user.partner_id)
        .order_by(models.Request.created_at.desc())
        .limit(200)
        .all()
    )
    result = []
    for r in orders:
        data = serialize_request(r)
        # Партнёру не передаём лишние персональные данные — только нужное для исполнения
        data["address"] = r.elder.address if r.elder else ""
        data["elder_phone"] = r.elder.phone if r.elder else ""
        data["access_comment"] = r.elder.access_comment if r.elder else ""
        data["description"] = r.description
        result.append(data)
    return result


@router.post("/orders/{request_id}/status")
def update_order_status(request_id: int, data: PartnerStatusIn,
                        user: models.User = Depends(require_partner),
                        db: Session = Depends(get_db)):
    req = _partner_request(db, user, request_id)
    allowed = ALLOWED_TRANSITIONS.get(req.status, [])
    if data.status not in allowed:
        raise HTTPException(400, "Недопустимый переход статуса для партнёра")
    set_request_status(db, req, data.status, user.id,
                       data.comment or "Обновлено партнёром")
    label = models.RequestStatus.LABELS[data.status]
    notify_staff(db, "partner_update", f"Партнёр обновил заявку {req.number}",
                 f"{label}. {data.comment}".strip())
    notify_relatives(db, req.elder_id, "status_changed",
                     f"Заявка {req.number}: {label}",
                     data.comment or req.title)
    audit(db, user.id, "partner_status", "request", req.id, details=data.status)
    db.commit()
    return serialize_request(req)


@router.post("/orders/{request_id}/comment")
def partner_comment(request_id: int, data: PartnerCommentIn,
                    user: models.User = Depends(require_partner),
                    db: Session = Depends(get_db)):
    req = _partner_request(db, user, request_id)
    db.add(models.OperatorComment(request_id=req.id, author_id=user.id,
                                  text=data.text))
    notify_staff(db, "partner_update", f"Комментарий партнёра по {req.number}",
                 data.text[:200])
    audit(db, user.id, "partner_comment", "request", req.id)
    db.commit()
    return {"status": "ok"}
