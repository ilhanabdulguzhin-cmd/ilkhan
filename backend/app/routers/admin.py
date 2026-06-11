import csv
import io
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..deps import get_current_user, get_elder_or_403, require_admin, require_staff
from ..security import hash_password
from ..services.helpers import audit, notify_relatives, serialize_elder

router = APIRouter(prefix="/admin", tags=["admin"])


class PartnerIn(BaseModel):
    name: str
    kind: str = "retail"
    phone: str = ""
    contact_person: str = ""
    city: str = ""
    notes: str = ""


class PartnerUpdate(BaseModel):
    name: str | None = None
    kind: str | None = None
    phone: str | None = None
    contact_person: str | None = None
    city: str | None = None
    notes: str | None = None
    is_active: bool | None = None
    rating: float | None = None


class CallIn(BaseModel):
    elder_id: int
    scheduled_at: datetime | None = None


class CallResultIn(BaseModel):
    result: str
    comment: str = ""


class EmergencyResolveIn(BaseModel):
    resolution: str = ""


class PartnerUserIn(BaseModel):
    phone: str
    full_name: str
    password: str


class PromoIn(BaseModel):
    code: str
    discount_percent: int = 10
    uses_left: int | None = None


@router.get("/dashboard")
def dashboard(user: models.User = Depends(require_staff), db: Session = Depends(get_db)):
    def count_status(status: str) -> int:
        return db.query(models.Request).filter_by(status=status).count()

    two_days_ago = datetime.utcnow() - timedelta(days=2)
    recent_elder_ids = {
        row[0] for row in
        db.query(models.CheckIn.elder_id)
        .filter(models.CheckIn.created_at >= two_days_ago)
        .distinct()
    }
    total_elders = db.query(models.ElderProfile).count()

    return {
        "new_requests": count_status(models.RequestStatus.NEW),
        "emergency_requests": count_status(models.RequestStatus.EMERGENCY),
        "overdue_requests": count_status(models.RequestStatus.OVERDUE),
        "in_progress": count_status(models.RequestStatus.IN_PROGRESS),
        "awaiting_partner": count_status(models.RequestStatus.SENT_TO_PARTNER),
        "awaiting_payment": count_status(models.RequestStatus.AWAITING_PAYMENT),
        "open_emergencies": db.query(models.EmergencyEvent)
                              .filter_by(status="open").count(),
        "elders_without_contact": max(total_elders - len(recent_elder_ids), 0),
        "calls_today": db.query(models.CallLog)
                         .filter(models.CallLog.result == "planned").count(),
        "total_elders": total_elders,
    }


@router.get("/analytics")
def analytics(user: models.User = Depends(require_staff), db: Session = Depends(get_db)):
    month_ago = datetime.utcnow() - timedelta(days=30)
    total_requests = db.query(models.Request).count()
    done_requests = db.query(models.Request).filter_by(
        status=models.RequestStatus.DONE).count()
    paying_users = db.query(models.Subscription).filter_by(status="active").count()
    mrr = (
        db.query(func.coalesce(func.sum(models.Payment.amount), 0))
        .filter(models.Payment.created_at >= month_ago,
                models.Payment.subscription_id.isnot(None))
        .scalar()
    )
    repeat_orders = db.query(models.Request).filter(
        models.Request.title.like("Повтор заказа%")).count()
    return {
        "relatives_registered": db.query(models.User)
                                  .filter_by(role=models.Role.RELATIVE).count(),
        "elders_connected": db.query(models.ElderProfile).count(),
        "social_elders": db.query(models.ElderProfile).filter_by(is_social=True).count(),
        "requests_total": total_requests,
        "requests_done": done_requests,
        "completion_rate": round(done_requests / total_requests * 100) if total_requests else 0,
        "checkins_total": db.query(models.CheckIn).count(),
        "calls_total": db.query(models.CallLog).count(),
        "emergencies_total": db.query(models.EmergencyEvent).count(),
        "emergencies_resolved": db.query(models.EmergencyEvent)
                                  .filter_by(status="resolved").count(),
        "paying_relatives": paying_users,
        "mrr": float(mrr or 0),
        "repeat_orders": repeat_orders,
        "voice_requests": db.query(models.Request).filter_by(source="voice").count(),
    }


@router.get("/users")
def list_users(role: str | None = None, user: models.User = Depends(require_staff),
               db: Session = Depends(get_db)):
    query = db.query(models.User)
    if role:
        query = query.filter_by(role=role)
    users = query.order_by(models.User.created_at.desc()).limit(200).all()
    return [
        {
            "id": u.id, "phone": u.phone, "full_name": u.full_name,
            "email": u.email, "role": u.role, "is_active": u.is_active,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]


@router.get("/elders")
def list_elders(user: models.User = Depends(require_staff), db: Session = Depends(get_db)):
    elders = db.query(models.ElderProfile).all()
    return [serialize_elder(e, db) for e in elders]


# --- Партнёры -----------------------------------------------------------

@router.get("/partners")
def list_partners(user: models.User = Depends(require_staff),
                  db: Session = Depends(get_db)):
    partners = db.query(models.Partner).order_by(models.Partner.name).all()
    return [
        {
            "id": p.id, "name": p.name, "kind": p.kind, "phone": p.phone,
            "contact_person": p.contact_person, "city": p.city,
            "rating": p.rating, "is_active": p.is_active, "notes": p.notes,
        }
        for p in partners
    ]


@router.post("/partners")
def create_partner(data: PartnerIn, user: models.User = Depends(require_staff),
                   db: Session = Depends(get_db)):
    partner = models.Partner(**data.model_dump())
    db.add(partner)
    audit(db, user.id, "create_partner", "partner", None)
    db.commit()
    return {"id": partner.id, "status": "ok"}


@router.patch("/partners/{partner_id}")
def update_partner(partner_id: int, data: PartnerUpdate,
                   user: models.User = Depends(require_staff),
                   db: Session = Depends(get_db)):
    partner = db.get(models.Partner, partner_id)
    if not partner:
        raise HTTPException(404, "Партнёр не найден")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(partner, key, value)
    audit(db, user.id, "update_partner", "partner", partner.id)
    db.commit()
    return {"status": "ok"}


@router.post("/partners/{partner_id}/user")
def create_partner_user(partner_id: int, data: PartnerUserIn,
                        user: models.User = Depends(require_admin),
                        db: Session = Depends(get_db)):
    """Создание логина партнёрского кабинета (только администратор)."""
    partner = db.get(models.Partner, partner_id)
    if not partner:
        raise HTTPException(404, "Партнёр не найден")
    if db.query(models.User).filter_by(phone=data.phone).first():
        raise HTTPException(400, "Телефон уже занят")
    partner_user = models.User(
        phone=data.phone, full_name=data.full_name,
        role=models.Role.PARTNER, partner_id=partner.id,
        password_hash=hash_password(data.password),
    )
    db.add(partner_user)
    audit(db, user.id, "create_partner_user", "partner", partner.id)
    db.commit()
    return {"id": partner_user.id, "status": "ok"}


# --- Промокоды -------------------------------------------------------------

@router.get("/promos")
def list_promos(user: models.User = Depends(require_admin),
                db: Session = Depends(get_db)):
    promos = db.query(models.PromoCode).order_by(models.PromoCode.created_at.desc()).all()
    return [
        {"id": p.id, "code": p.code, "discount_percent": p.discount_percent,
         "uses_left": p.uses_left, "is_active": p.is_active}
        for p in promos
    ]


@router.post("/promos")
def create_promo(data: PromoIn, user: models.User = Depends(require_admin),
                 db: Session = Depends(get_db)):
    code = data.code.strip().upper()
    if db.query(models.PromoCode).filter_by(code=code).first():
        raise HTTPException(400, "Такой промокод уже существует")
    if not (1 <= data.discount_percent <= 100):
        raise HTTPException(400, "Скидка должна быть от 1 до 100%")
    promo = models.PromoCode(code=code, discount_percent=data.discount_percent,
                             uses_left=data.uses_left)
    db.add(promo)
    audit(db, user.id, "create_promo", "promo", None, details=code)
    db.commit()
    return {"id": promo.id, "status": "ok"}


@router.patch("/promos/{promo_id}")
def toggle_promo(promo_id: int, user: models.User = Depends(require_admin),
                 db: Session = Depends(get_db)):
    promo = db.get(models.PromoCode, promo_id)
    if not promo:
        raise HTTPException(404, "Промокод не найден")
    promo.is_active = not promo.is_active
    db.commit()
    return {"status": "ok", "is_active": promo.is_active}


# --- Таймсерии для графиков и экспорт ---------------------------------------

@router.get("/analytics/timeseries")
def analytics_timeseries(days: int = 14, user: models.User = Depends(require_staff),
                         db: Session = Depends(get_db)):
    days = min(max(days, 7), 90)
    today = datetime.utcnow().date()
    cutoff = datetime.utcnow() - timedelta(days=days)
    buckets = [(today - timedelta(days=i)).isoformat() for i in range(days - 1, -1, -1)]

    def bucketize(rows):
        counts = {b: 0 for b in buckets}
        for (created_at,) in rows:
            key = created_at.date().isoformat()
            if key in counts:
                counts[key] += 1
        return [counts[b] for b in buckets]

    requests_rows = db.query(models.Request.created_at).filter(
        models.Request.created_at >= cutoff).all()
    checkin_rows = db.query(models.CheckIn.created_at).filter(
        models.CheckIn.created_at >= cutoff).all()
    emergency_rows = db.query(models.EmergencyEvent.created_at).filter(
        models.EmergencyEvent.created_at >= cutoff).all()

    return {
        "dates": buckets,
        "requests": bucketize(requests_rows),
        "checkins": bucketize(checkin_rows),
        "emergencies": bucketize(emergency_rows),
    }


@router.get("/export/requests.csv")
def export_requests_csv(user: models.User = Depends(require_staff),
                        db: Session = Depends(get_db)):
    """Выгрузка заявок для НКО, фондов и партнёров (раздел 15.3 ТЗ)."""
    requests = db.query(models.Request).order_by(models.Request.created_at.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")
    writer.writerow(["Номер", "Подопечный", "Соц. контур", "Категория", "Статус",
                     "Приоритет", "Источник", "Стоимость", "Партнёр", "Создана"])
    for r in requests:
        writer.writerow([
            r.number,
            r.elder.full_name if r.elder else "",
            "да" if (r.elder and r.elder.is_social) else "нет",
            models.RequestCategory.LABELS.get(r.category, r.category),
            models.RequestStatus.LABELS.get(r.status, r.status),
            r.priority, r.source, r.cost or "",
            r.partner.name if r.partner else "",
            r.created_at.strftime("%d.%m.%Y %H:%M"),
        ])
    audit(db, user.id, "export_requests", "request", None)
    db.commit()
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue().encode("utf-8-sig")]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=vnuchok_requests.csv"},
    )


# --- Звонки --------------------------------------------------------------

@router.get("/calls")
def list_calls(user: models.User = Depends(require_staff), db: Session = Depends(get_db)):
    calls = (
        db.query(models.CallLog)
        .order_by(models.CallLog.created_at.desc())
        .limit(100)
        .all()
    )
    return [
        {
            "id": c.id, "elder_id": c.elder_id,
            "elder_name": c.elder.full_name if c.elder else None,
            "elder_phone": c.elder.phone if c.elder else None,
            "operator": c.operator.full_name if c.operator else None,
            "result": c.result, "comment": c.comment,
            "scheduled_at": c.scheduled_at.isoformat() if c.scheduled_at else None,
            "created_at": c.created_at.isoformat(),
        }
        for c in calls
    ]


@router.post("/calls")
def plan_call(data: CallIn, user: models.User = Depends(require_staff),
              db: Session = Depends(get_db)):
    elder = db.get(models.ElderProfile, data.elder_id)
    if not elder:
        raise HTTPException(404, "Профиль не найден")
    call = models.CallLog(elder_id=elder.id, operator_id=user.id,
                          scheduled_at=data.scheduled_at)
    db.add(call)
    audit(db, user.id, "plan_call", "call", None)
    db.commit()
    return {"id": call.id, "status": "ok"}


@router.patch("/calls/{call_id}")
def call_result(call_id: int, data: CallResultIn,
                user: models.User = Depends(require_staff),
                db: Session = Depends(get_db)):
    call = db.get(models.CallLog, call_id)
    if not call:
        raise HTTPException(404, "Звонок не найден")
    call.result = data.result
    call.comment = data.comment
    call.operator_id = user.id
    if data.result in ("reached", "all_good"):
        db.add(models.CheckIn(elder_id=call.elder_id, kind="call_done",
                              comment=data.comment))
        notify_relatives(db, call.elder_id, "call_report",
                         "Отчёт о звонке",
                         data.comment or "Оператор поговорил с вашим близким, всё в порядке.")
    elif data.result == "escalation":
        db.add(models.EmergencyEvent(
            elder_id=call.elder_id,
            reason=f"Эскалация после звонка: {data.comment or 'без комментария'}",
        ))
        notify_relatives(db, call.elder_id, "emergency",
                         "Требуется внимание после звонка",
                         data.comment or "Оператор отметил тревожную ситуацию.")
    elif data.result == "not_reached":
        db.add(models.CheckIn(elder_id=call.elder_id, kind="call_missed",
                              comment=data.comment))
        notify_relatives(db, call.elder_id, "no_contact",
                         "Не удалось дозвониться",
                         "Оператор не смог связаться с вашим близким. Попробуем ещё раз.")
    audit(db, user.id, "call_result", "call", call.id, details=data.result)
    db.commit()
    return {"status": "ok"}


# --- Тревожные события ----------------------------------------------------

@router.get("/emergencies")
def list_emergencies(user: models.User = Depends(require_staff),
                     db: Session = Depends(get_db)):
    events = (
        db.query(models.EmergencyEvent)
        .order_by(models.EmergencyEvent.created_at.desc())
        .limit(100)
        .all()
    )
    return [
        {
            "id": e.id, "elder_id": e.elder_id,
            "elder_name": e.elder.full_name if e.elder else None,
            "request_id": e.request_id, "reason": e.reason,
            "status": e.status, "resolution": e.resolution,
            "created_at": e.created_at.isoformat(),
            "resolved_at": e.resolved_at.isoformat() if e.resolved_at else None,
        }
        for e in events
    ]


@router.post("/emergencies/{event_id}/resolve")
def resolve_emergency(event_id: int, data: EmergencyResolveIn,
                      user: models.User = Depends(require_staff),
                      db: Session = Depends(get_db)):
    event = db.get(models.EmergencyEvent, event_id)
    if not event:
        raise HTTPException(404, "Событие не найдено")
    event.status = "resolved"
    event.resolution = data.resolution or "Ситуация решена оператором"
    event.resolved_at = datetime.utcnow()
    notify_relatives(db, event.elder_id, "emergency_resolved",
                     "Тревожная ситуация решена", event.resolution)
    audit(db, user.id, "resolve_emergency", "emergency", event.id)
    db.commit()
    return {"status": "ok"}


@router.get("/audit")
def audit_logs(user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    logs = (
        db.query(models.AuditLog)
        .order_by(models.AuditLog.created_at.desc())
        .limit(200)
        .all()
    )
    return [
        {
            "id": l.id, "user_id": l.user_id, "action": l.action,
            "entity": l.entity, "entity_id": l.entity_id,
            "details": l.details, "created_at": l.created_at.isoformat(),
        }
        for l in logs
    ]


# --- Лента активности (раздел 7.3 ТЗ) -------------------------------------

@router.get("/activity")
def activity_feed(elder_id: int, user: models.User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    elder = get_elder_or_403(db, user, elder_id)
    events: list[dict] = []

    for c in (db.query(models.CheckIn).filter_by(elder_id=elder.id)
              .order_by(models.CheckIn.created_at.desc()).limit(50)):
        titles = {
            "ok_button": "Нажата кнопка «Всё хорошо»",
            "call_done": "Состоялся звонок оператора",
            "call_missed": "Оператор не дозвонился",
        }
        events.append({
            "type": "checkin", "kind": c.kind,
            "title": titles.get(c.kind, "Контакт"),
            "body": c.comment, "created_at": c.created_at.isoformat(),
        })

    for h in (
        db.query(models.RequestStatusHistory)
        .join(models.Request, models.Request.id == models.RequestStatusHistory.request_id)
        .filter(models.Request.elder_id == elder.id)
        .order_by(models.RequestStatusHistory.created_at.desc())
        .limit(50)
    ):
        events.append({
            "type": "request_status",
            "title": f"Заявка {h.request.number}: "
                     f"{models.RequestStatus.LABELS.get(h.status, h.status)}",
            "body": h.comment or h.request.title,
            "created_at": h.created_at.isoformat(),
        })

    for e in (db.query(models.EmergencyEvent).filter_by(elder_id=elder.id)
              .order_by(models.EmergencyEvent.created_at.desc()).limit(20)):
        events.append({
            "type": "emergency",
            "title": "Тревожный сигнал" if e.status == "open" else "Тревога снята",
            "body": e.reason if e.status == "open" else e.resolution,
            "created_at": e.created_at.isoformat(),
        })

    events.sort(key=lambda item: item["created_at"], reverse=True)
    return events[:80]
