"""Напоминания о приёме лекарств. Важно (раздел 11 ТЗ): сервис не назначает
препараты и не даёт рекомендаций по дозировке — названия и времена задаёт
семья или оператор, платформа лишь напоминает и фиксирует отметки."""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..deps import get_current_user, get_elder_or_403
from ..services.helpers import audit, notify_relatives

router = APIRouter(prefix="/medications", tags=["medications"])


class MedicationIn(BaseModel):
    elder_id: int
    name: str
    note: str = ""
    times: str = "09:00"


class MedicationUpdate(BaseModel):
    name: str | None = None
    note: str | None = None
    times: str | None = None
    is_active: bool | None = None


def _serialize(m: models.Medication, taken_today: set[int] | None = None) -> dict:
    return {
        "id": m.id, "elder_id": m.elder_id, "name": m.name, "note": m.note,
        "times": [t.strip() for t in m.times.split(",") if t.strip()],
        "is_active": m.is_active,
        "taken_today": m.id in (taken_today or set()),
    }


def _taken_today_ids(db: Session, elder_id: int) -> set[int]:
    day_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    logs = (
        db.query(models.MedicationLog)
        .filter(models.MedicationLog.elder_id == elder_id,
                models.MedicationLog.taken_at >= day_start)
        .all()
    )
    return {log.medication_id for log in logs}


@router.get("")
def list_medications(elder_id: int, user: models.User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    elder = get_elder_or_403(db, user, elder_id)
    meds = (
        db.query(models.Medication)
        .filter_by(elder_id=elder.id)
        .order_by(models.Medication.created_at)
        .all()
    )
    taken = _taken_today_ids(db, elder.id)
    return [_serialize(m, taken) for m in meds]


@router.post("")
def create_medication(data: MedicationIn, user: models.User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    if user.role == models.Role.ELDER:
        raise HTTPException(403, "Напоминания настраивает родственник или оператор")
    elder = get_elder_or_403(db, user, data.elder_id)
    med = models.Medication(elder_id=elder.id, name=data.name,
                            note=data.note, times=data.times)
    db.add(med)
    audit(db, user.id, "create_medication", "medication", None)
    db.commit()
    return _serialize(med)


@router.patch("/{med_id}")
def update_medication(med_id: int, data: MedicationUpdate,
                      user: models.User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    med = db.get(models.Medication, med_id)
    if not med:
        raise HTTPException(404, "Напоминание не найдено")
    get_elder_or_403(db, user, med.elder_id)
    if user.role == models.Role.ELDER:
        raise HTTPException(403, "Напоминания настраивает родственник или оператор")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(med, key, value)
    db.commit()
    return _serialize(med)


@router.delete("/{med_id}")
def delete_medication(med_id: int, user: models.User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    med = db.get(models.Medication, med_id)
    if not med:
        raise HTTPException(404, "Напоминание не найдено")
    get_elder_or_403(db, user, med.elder_id)
    if user.role == models.Role.ELDER:
        raise HTTPException(403, "Напоминания настраивает родственник или оператор")
    db.delete(med)
    db.commit()
    return {"status": "ok"}


@router.post("/{med_id}/taken")
def mark_taken(med_id: int, user: models.User = Depends(get_current_user),
               db: Session = Depends(get_db)):
    med = db.get(models.Medication, med_id)
    if not med:
        raise HTTPException(404, "Напоминание не найдено")
    elder = get_elder_or_403(db, user, med.elder_id)
    db.add(models.MedicationLog(medication_id=med.id, elder_id=elder.id))
    notify_relatives(db, elder.id, "medication",
                     f"💊 {elder.full_name}: отмечен приём «{med.name}»", "")
    audit(db, user.id, "medication_taken", "medication", med.id)
    db.commit()
    return {"status": "ok"}


@router.get("/log")
def medication_log(elder_id: int, days: int = 7,
                   user: models.User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    elder = get_elder_or_403(db, user, elder_id)
    cutoff = datetime.utcnow() - timedelta(days=days)
    logs = (
        db.query(models.MedicationLog)
        .filter(models.MedicationLog.elder_id == elder.id,
                models.MedicationLog.taken_at >= cutoff)
        .order_by(models.MedicationLog.taken_at.desc())
        .all()
    )
    return [
        {
            "id": log.id,
            "medication": log.medication.name if log.medication else "—",
            "taken_at": log.taken_at.isoformat(),
        }
        for log in logs
    ]
