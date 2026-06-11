"""Общие операции: уведомления родственникам, аудит, сериализация, статусы."""

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from .. import models


def audit(db: Session, user_id: int | None, action: str, entity: str = "",
          entity_id: int | None = None, details: str = "") -> None:
    db.add(models.AuditLog(user_id=user_id, action=action, entity=entity,
                           entity_id=entity_id, details=details))


def notify_user(db: Session, user_id: int, kind: str, title: str, body: str = "") -> None:
    db.add(models.Notification(user_id=user_id, kind=kind, title=title, body=body))


def notify_relatives(db: Session, elder_id: int, kind: str, title: str, body: str = "") -> None:
    relations = db.query(models.FamilyRelation).filter_by(elder_id=elder_id).all()
    for rel in relations:
        notify_user(db, rel.relative_id, kind, title, body)


def notify_staff(db: Session, kind: str, title: str, body: str = "") -> None:
    staff = (
        db.query(models.User)
        .filter(models.User.role.in_([models.Role.OPERATOR, models.Role.ADMIN]))
        .all()
    )
    for member in staff:
        notify_user(db, member.id, kind, title, body)


def set_request_status(db: Session, request: models.Request, status: str,
                       user_id: int | None = None, comment: str = "") -> None:
    request.status = status
    db.add(models.RequestStatusHistory(
        request_id=request.id, status=status, comment=comment, changed_by_id=user_id,
    ))


def elder_activity_status(db: Session, elder: models.ElderProfile) -> dict:
    """Статус активности для дашборда родственника (раздел 7.1 ТЗ)."""
    open_emergency = (
        db.query(models.EmergencyEvent)
        .filter_by(elder_id=elder.id, status="open")
        .first()
    )
    last_checkin = (
        db.query(models.CheckIn)
        .filter_by(elder_id=elder.id)
        .order_by(models.CheckIn.created_at.desc())
        .first()
    )
    now = datetime.utcnow()
    if open_emergency:
        status, label = "alarm", "Тревожный сигнал"
    elif last_checkin is None or last_checkin.created_at < now - timedelta(days=2):
        status, label = "no_contact", "Давно не было связи"
    elif last_checkin.created_at < now - timedelta(days=1):
        status, label = "attention", "Требуется внимание"
    else:
        status, label = "ok", "Всё хорошо"
    return {
        "status": status,
        "label": label,
        "last_checkin_at": last_checkin.created_at.isoformat() if last_checkin else None,
        "open_emergency": bool(open_emergency),
    }


def serialize_request(r: models.Request, full: bool = False) -> dict:
    data = {
        "id": r.id,
        "number": r.number,
        "elder_id": r.elder_id,
        "elder_name": r.elder.full_name if r.elder else None,
        "category": r.category,
        "category_label": models.RequestCategory.LABELS.get(r.category, r.category),
        "source": r.source,
        "status": r.status,
        "status_label": models.RequestStatus.LABELS.get(r.status, r.status),
        "priority": r.priority,
        "title": r.title,
        "description": r.description,
        "cost": r.cost,
        "operator_id": r.operator_id,
        "operator_name": r.operator.full_name if r.operator else None,
        "partner_id": r.partner_id,
        "partner_name": r.partner.name if r.partner else None,
        "created_at": r.created_at.isoformat(),
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }
    if full:
        data.update({
            "voice_text": r.voice_text,
            "ai_category": r.ai_category,
            "ai_urgency": r.ai_urgency,
            "ai_clarification": r.ai_clarification,
            "elder": {
                "id": r.elder.id,
                "full_name": r.elder.full_name,
                "phone": r.elder.phone,
                "address": r.elder.address,
                "is_social": r.elder.is_social,
                "ngo_name": r.elder.ngo_name,
            } if r.elder else None,
            "status_history": [
                {
                    "status": h.status,
                    "status_label": models.RequestStatus.LABELS.get(h.status, h.status),
                    "comment": h.comment,
                    "changed_by": h.changed_by.full_name if h.changed_by else None,
                    "created_at": h.created_at.isoformat(),
                }
                for h in r.status_history
            ],
            "comments": [
                {
                    "id": c.id,
                    "author": c.author.full_name if c.author else None,
                    "text": c.text,
                    "created_at": c.created_at.isoformat(),
                }
                for c in r.comments
            ],
        })
    return data


def serialize_elder(e: models.ElderProfile, db: Session | None = None) -> dict:
    data = {
        "id": e.id,
        "full_name": e.full_name,
        "age": e.age,
        "phone": e.phone,
        "address": e.address,
        "access_comment": e.access_comment,
        "mobility_limits": e.mobility_limits,
        "food_preferences": e.food_preferences,
        "food_restrictions": e.food_restrictions,
        "regular_pharmacy_items": e.regular_pharmacy_items,
        "preferred_call_time": e.preferred_call_time,
        "preferred_contact_method": e.preferred_contact_method,
        "operator_notes": e.operator_notes,
        "is_social": e.is_social,
        "ngo_name": e.ngo_name,
        "connect_code": e.connect_code,
        "contacts": [
            {"id": c.id, "name": c.name, "phone": c.phone, "kind": c.kind}
            for c in e.contacts
        ],
    }
    if db is not None:
        data["activity"] = elder_activity_status(db, e)
    return data
