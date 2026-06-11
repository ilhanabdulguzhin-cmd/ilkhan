"""Фоновый мониторинг (разделы 8.1 и 13 ТЗ):
- автопометка просроченных заявок (>24 ч без закрытия);
- контроль неактивности: нет check-in 48 ч => уведомление родственникам и оператору.

В MVP — поток внутри процесса API; при росте нагрузки выносится в Celery/RQ.
"""

import threading
import time
from datetime import datetime, timedelta

from .. import models
from ..database import SessionLocal
from .helpers import notify_relatives, notify_staff, set_request_status

CHECK_INTERVAL_SECONDS = 300
OVERDUE_AFTER = timedelta(hours=24)
INACTIVITY_AFTER = timedelta(hours=48)

# Чтобы не спамить: по каждому подопечному напоминаем о неактивности раз в сутки
_last_inactivity_alert: dict[int, datetime] = {}

ACTIVE_STATUSES = [
    models.RequestStatus.NEW,
    models.RequestStatus.NEEDS_CLARIFICATION,
    models.RequestStatus.ACCEPTED,
    models.RequestStatus.SENT_TO_PARTNER,
    models.RequestStatus.IN_PROGRESS,
]


def run_checks_once() -> dict:
    db = SessionLocal()
    overdue_count = inactive_count = 0
    try:
        now = datetime.utcnow()

        stale = (
            db.query(models.Request)
            .filter(models.Request.status.in_(ACTIVE_STATUSES),
                    models.Request.created_at < now - OVERDUE_AFTER)
            .all()
        )
        for req in stale:
            set_request_status(db, req, models.RequestStatus.OVERDUE, None,
                               "Автоматически: заявка не закрыта более 24 часов")
            notify_staff(db, "overdue", f"Просрочена заявка {req.number}",
                         f"{req.title} — создана {req.created_at:%d.%m %H:%M}")
            overdue_count += 1

        cutoff = now - INACTIVITY_AFTER
        for elder in db.query(models.ElderProfile).all():
            last = (
                db.query(models.CheckIn)
                .filter_by(elder_id=elder.id)
                .order_by(models.CheckIn.created_at.desc())
                .first()
            )
            last_at = last.created_at if last else elder.created_at
            if last_at > cutoff:
                continue
            alerted = _last_inactivity_alert.get(elder.id)
            if alerted and now - alerted < timedelta(hours=24):
                continue
            _last_inactivity_alert[elder.id] = now
            notify_relatives(db, elder.id, "no_contact",
                             f"{elder.full_name}: давно нет связи",
                             "Более 2 дней не было кнопки «Всё хорошо» и звонков. "
                             "Рекомендуем позвонить или заказать звонок оператора.")
            notify_staff(db, "no_contact", f"Нет связи: {elder.full_name}",
                         "Более 48 часов без check-in. Запланируйте звонок.")
            inactive_count += 1

        db.commit()
    finally:
        db.close()
    return {"overdue_marked": overdue_count, "inactivity_alerts": inactive_count}


def _loop():
    while True:
        try:
            run_checks_once()
        except Exception:
            pass  # монитор не должен ронять API; ошибки видны в error monitoring
        time.sleep(CHECK_INTERVAL_SECONDS)


def start_monitor():
    thread = threading.Thread(target=_loop, daemon=True, name="vnuchok-monitor")
    thread.start()
