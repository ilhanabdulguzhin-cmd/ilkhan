from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..deps import get_current_user, get_elder_or_403
from ..services.helpers import audit, elder_activity_status, notify_relatives

router = APIRouter(prefix="/checkins", tags=["checkins"])


class CheckInOk(BaseModel):
    elder_id: int


class ScheduleIn(BaseModel):
    elder_id: int
    frequency: str = "daily"  # daily | every_other_day | weekly_2_3
    time_of_day: str = "10:00"


class ScheduleUpdate(BaseModel):
    frequency: str | None = None
    time_of_day: str | None = None
    is_active: bool | None = None


@router.post("/ok")
def check_in_ok(data: CheckInOk, user: models.User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    """Кнопка «Всё хорошо» (раздел 6.3 ТЗ)."""
    elder = get_elder_or_403(db, user, data.elder_id)
    checkin = models.CheckIn(elder_id=elder.id, kind="ok_button")
    db.add(checkin)
    notify_relatives(db, elder.id, "checkin_ok",
                     f"{elder.full_name}: всё хорошо",
                     "Нажата кнопка «Всё хорошо».")
    audit(db, user.id, "checkin_ok", "elder_profile", elder.id)
    db.commit()
    return {"status": "ok", "created_at": checkin.created_at.isoformat()}


@router.get("/history")
def history(elder_id: int, user: models.User = Depends(get_current_user),
            db: Session = Depends(get_db)):
    elder = get_elder_or_403(db, user, elder_id)
    checkins = (
        db.query(models.CheckIn)
        .filter_by(elder_id=elder.id)
        .order_by(models.CheckIn.created_at.desc())
        .limit(100)
        .all()
    )
    return [
        {"id": c.id, "kind": c.kind, "comment": c.comment,
         "created_at": c.created_at.isoformat()}
        for c in checkins
    ]


@router.get("/status")
def activity_status(elder_id: int, user: models.User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    elder = get_elder_or_403(db, user, elder_id)
    return elder_activity_status(db, elder)


@router.post("/schedule")
def create_schedule(data: ScheduleIn, user: models.User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    elder = get_elder_or_403(db, user, data.elder_id)
    schedule = models.CheckInSchedule(
        elder_id=elder.id, frequency=data.frequency, time_of_day=data.time_of_day,
    )
    db.add(schedule)
    audit(db, user.id, "create_checkin_schedule", "checkin_schedule", None)
    db.commit()
    return {"id": schedule.id, "frequency": schedule.frequency,
            "time_of_day": schedule.time_of_day, "is_active": schedule.is_active}


@router.get("/schedule")
def list_schedules(elder_id: int, user: models.User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    elder = get_elder_or_403(db, user, elder_id)
    schedules = db.query(models.CheckInSchedule).filter_by(elder_id=elder.id).all()
    return [
        {"id": s.id, "frequency": s.frequency, "time_of_day": s.time_of_day,
         "is_active": s.is_active}
        for s in schedules
    ]


@router.patch("/schedule/{schedule_id}")
def update_schedule(schedule_id: int, data: ScheduleUpdate,
                    user: models.User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    schedule = db.get(models.CheckInSchedule, schedule_id)
    if not schedule:
        raise HTTPException(404, "Расписание не найдено")
    get_elder_or_403(db, user, schedule.elder_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(schedule, key, value)
    db.commit()
    return {"status": "ok"}
