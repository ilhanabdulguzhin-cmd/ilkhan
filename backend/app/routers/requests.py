from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models
from ..config import PRODUCT_SETS
from ..database import get_db
from ..deps import get_current_user, get_elder_or_403, require_staff
from ..services.helpers import (
    audit,
    notify_relatives,
    notify_staff,
    serialize_request,
    set_request_status,
)

router = APIRouter(prefix="/requests", tags=["requests"])


class RequestIn(BaseModel):
    elder_id: int
    category: str
    title: str = ""
    description: str = ""
    source: str = "button"
    priority: str = "normal"
    cost: float | None = None


class RequestUpdate(BaseModel):
    status: str | None = None
    priority: str | None = None
    operator_id: int | None = None
    partner_id: int | None = None
    executor_id: int | None = None
    cost: float | None = None
    comment: str = ""


class CommentIn(BaseModel):
    text: str


class RepeatIn(BaseModel):
    elder_id: int


def _create_request(db: Session, user: models.User, elder: models.ElderProfile,
                    data: RequestIn) -> models.Request:
    title = data.title or models.RequestCategory.LABELS.get(data.category, "Заявка")
    is_emergency = data.category == models.RequestCategory.FEELING_BAD or data.priority == "critical"
    req = models.Request(
        elder_id=elder.id,
        created_by_id=user.id,
        category=data.category,
        source=data.source,
        title=title,
        description=data.description,
        priority="critical" if is_emergency else data.priority,
        status=models.RequestStatus.EMERGENCY if is_emergency else models.RequestStatus.NEW,
        cost=data.cost,
    )
    db.add(req)
    db.flush()
    db.add(models.RequestStatusHistory(
        request_id=req.id, status=req.status, changed_by_id=user.id,
        comment="Заявка создана",
    ))

    if is_emergency:
        db.add(models.EmergencyEvent(
            elder_id=elder.id, request_id=req.id,
            reason=data.description or "Пользователь сообщил, что ему плохо",
        ))
        notify_staff(db, "emergency", f"ТРЕВОГА: {elder.full_name}",
                     f"Заявка {req.number}: {data.description or 'нужна срочная помощь'}")
        notify_relatives(db, elder.id, "emergency",
                         f"Тревожный сигнал от {elder.full_name}",
                         "Оператор уже занимается ситуацией и свяжется с вами.")
    else:
        notify_staff(db, "request_created", f"Новая заявка {req.number}",
                     f"{elder.full_name}: {title}")
        notify_relatives(db, elder.id, "request_created",
                         f"Создана заявка: {title}",
                         f"Заявка {req.number} для {elder.full_name} принята в обработку.")
    audit(db, user.id, "create_request", "request", req.id, details=data.category)
    return req


@router.get("/product-sets")
def product_sets():
    return PRODUCT_SETS


@router.post("")
def create_request(data: RequestIn, user: models.User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    elder = get_elder_or_403(db, user, data.elder_id)
    if data.category not in models.RequestCategory.LABELS:
        raise HTTPException(400, "Неизвестная категория заявки")
    if user.role == models.Role.RELATIVE:
        data.source = "relative"
    elif user.role in (models.Role.OPERATOR, models.Role.ADMIN):
        data.source = "operator"
    req = _create_request(db, user, elder, data)
    db.commit()
    db.refresh(req)
    return serialize_request(req, full=True)


@router.post("/repeat-last")
def repeat_last(data: RepeatIn, user: models.User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    """Повтор последнего продуктового/аптечного заказа (раздел 6.5 ТЗ)."""
    elder = get_elder_or_403(db, user, data.elder_id)
    last = (
        db.query(models.Request)
        .filter(
            models.Request.elder_id == elder.id,
            models.Request.category.in_([
                models.RequestCategory.PRODUCTS, models.RequestCategory.PHARMACY,
            ]),
        )
        .order_by(models.Request.created_at.desc())
        .first()
    )
    if not last:
        raise HTTPException(404, "Прошлых заказов пока нет")
    req = _create_request(db, user, elder, RequestIn(
        elder_id=elder.id,
        category=last.category,
        title=f"Повтор заказа: {last.title}",
        description=last.description,
        source="button",
        cost=last.cost,
    ))
    db.commit()
    db.refresh(req)
    return serialize_request(req, full=True)


@router.get("")
def list_requests(status: str | None = None, category: str | None = None,
                  elder_id: int | None = None,
                  user: models.User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    query = db.query(models.Request)
    if user.role == models.Role.ELDER:
        elder = db.query(models.ElderProfile).filter_by(user_id=user.id).first()
        if not elder:
            return []
        query = query.filter(models.Request.elder_id == elder.id)
    elif user.role == models.Role.RELATIVE:
        relations = db.query(models.FamilyRelation).filter_by(relative_id=user.id).all()
        elder_ids = [rel.elder_id for rel in relations]
        query = query.filter(models.Request.elder_id.in_(elder_ids or [-1]))
    if status:
        query = query.filter(models.Request.status == status)
    if category:
        query = query.filter(models.Request.category == category)
    if elder_id:
        query = query.filter(models.Request.elder_id == elder_id)
    requests = query.order_by(models.Request.created_at.desc()).limit(200).all()
    return [serialize_request(r) for r in requests]


def _get_request_or_403(db: Session, user: models.User, request_id: int) -> models.Request:
    req = db.get(models.Request, request_id)
    if not req:
        raise HTTPException(404, "Заявка не найдена")
    get_elder_or_403(db, user, req.elder_id)
    return req


@router.get("/{request_id}")
def get_request(request_id: int, user: models.User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    req = _get_request_or_403(db, user, request_id)
    return serialize_request(req, full=True)


@router.patch("/{request_id}")
def update_request(request_id: int, data: RequestUpdate,
                   user: models.User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    req = _get_request_or_403(db, user, request_id)
    is_staff = user.role in (models.Role.OPERATOR, models.Role.ADMIN)
    if not is_staff:
        # Родственник и пожилой могут только отменить свою заявку
        if data.status != models.RequestStatus.CANCELLED:
            raise HTTPException(403, "Можно только отменить заявку")
        set_request_status(db, req, models.RequestStatus.CANCELLED, user.id,
                           data.comment or "Отменена пользователем")
        db.commit()
        return serialize_request(req, full=True)

    if data.priority is not None:
        req.priority = data.priority
    if data.operator_id is not None:
        req.operator_id = data.operator_id
    if data.partner_id is not None:
        req.partner_id = data.partner_id
    if data.executor_id is not None:
        req.executor_id = data.executor_id
    if data.cost is not None:
        req.cost = data.cost
    if data.status is not None:
        if data.status not in models.RequestStatus.ALL:
            raise HTTPException(400, "Неизвестный статус")
        set_request_status(db, req, data.status, user.id, data.comment)
        label = models.RequestStatus.LABELS[data.status]
        notify_relatives(db, req.elder_id, "status_changed",
                         f"Заявка {req.number}: {label}",
                         data.comment or req.title)
        if data.status == models.RequestStatus.DONE:
            # Закрытие тревоги, если заявка была эскалацией
            event = db.query(models.EmergencyEvent).filter_by(
                request_id=req.id, status="open").first()
            if event:
                event.status = "resolved"
                event.resolution = data.comment or "Закрыто оператором"
                event.resolved_at = models.now()
    audit(db, user.id, "update_request", "request", req.id)
    db.commit()
    return serialize_request(req, full=True)


@router.post("/{request_id}/comment")
def add_comment(request_id: int, data: CommentIn,
                user: models.User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    req = _get_request_or_403(db, user, request_id)
    db.add(models.OperatorComment(request_id=req.id, author_id=user.id, text=data.text))
    if user.role in (models.Role.OPERATOR, models.Role.ADMIN):
        notify_relatives(db, req.elder_id, "operator_comment",
                         f"Комментарий оператора по заявке {req.number}", data.text)
    audit(db, user.id, "comment_request", "request", req.id)
    db.commit()
    return serialize_request(req, full=True)


@router.post("/{request_id}/assign")
def assign_request(request_id: int, data: RequestUpdate,
                   user: models.User = Depends(require_staff),
                   db: Session = Depends(get_db)):
    req = _get_request_or_403(db, user, request_id)
    req.operator_id = data.operator_id or user.id
    if data.partner_id:
        req.partner_id = data.partner_id
        set_request_status(db, req, models.RequestStatus.SENT_TO_PARTNER, user.id,
                           data.comment or "Передана партнёру")
        notify_relatives(db, req.elder_id, "status_changed",
                         f"Заявка {req.number} передана партнёру", req.title)
    elif req.status in (models.RequestStatus.NEW, models.RequestStatus.EMERGENCY):
        set_request_status(db, req, models.RequestStatus.ACCEPTED, user.id,
                           "Принята оператором")
        notify_relatives(db, req.elder_id, "status_changed",
                         f"Заявка {req.number} принята оператором", req.title)
    audit(db, user.id, "assign_request", "request", req.id)
    db.commit()
    return serialize_request(req, full=True)


@router.post("/{request_id}/close")
def close_request(request_id: int, data: CommentIn | None = None,
                  user: models.User = Depends(require_staff),
                  db: Session = Depends(get_db)):
    req = _get_request_or_403(db, user, request_id)
    comment = data.text if data else "Заявка выполнена"
    set_request_status(db, req, models.RequestStatus.DONE, user.id, comment)
    event = db.query(models.EmergencyEvent).filter_by(
        request_id=req.id, status="open").first()
    if event:
        event.status = "resolved"
        event.resolution = comment
        event.resolved_at = models.now()
    notify_relatives(db, req.elder_id, "request_done",
                     f"Заявка {req.number} выполнена", comment)
    audit(db, user.id, "close_request", "request", req.id)
    db.commit()
    return serialize_request(req, full=True)
