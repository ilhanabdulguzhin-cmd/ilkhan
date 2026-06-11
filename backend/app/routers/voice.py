"""Голосовой контур: приём текста распознанной речи (STT выполняется на
устройстве через Web Speech API либо внешним STT-сервисом), классификация
AI-агентом и создание заявки. Раздел 9 и 22.4 ТЗ."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..deps import get_current_user, get_elder_or_403
from ..services.classifier import classify
from ..services.helpers import (
    audit,
    notify_relatives,
    notify_staff,
    serialize_request,
)

router = APIRouter(prefix="/voice", tags=["voice"])


class VoiceTextIn(BaseModel):
    elder_id: int
    text: str


@router.post("/classify")
def classify_text(data: VoiceTextIn, user: models.User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    get_elder_or_403(db, user, data.elder_id)
    result = classify(data.text)
    return {
        "category": result.category,
        "category_label": models.RequestCategory.LABELS.get(result.category),
        "urgency": result.urgency,
        "is_emergency": result.is_emergency,
        "clarification": result.clarification,
    }


@router.post("/create-request")
def create_from_voice(data: VoiceTextIn, user: models.User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    elder = get_elder_or_403(db, user, data.elder_id)
    result = classify(data.text)

    req = models.Request(
        elder_id=elder.id,
        created_by_id=user.id,
        category=result.category,
        source="voice",
        title=models.RequestCategory.LABELS.get(result.category, "Голосовая заявка"),
        description=data.text,
        voice_text=data.text,
        ai_category=result.category,
        ai_urgency=result.urgency,
        ai_clarification=result.clarification,
        priority="critical" if result.is_emergency else (
            "high" if result.urgency == "high" else "normal"),
        status=models.RequestStatus.EMERGENCY if result.is_emergency
        else models.RequestStatus.NEW,
    )
    db.add(req)
    db.flush()
    db.add(models.RequestStatusHistory(
        request_id=req.id, status=req.status, changed_by_id=user.id,
        comment=f"Голосовая заявка. AI: {models.RequestCategory.LABELS.get(result.category)}"
                f", срочность {result.urgency}",
    ))

    if result.is_emergency:
        db.add(models.EmergencyEvent(
            elder_id=elder.id, request_id=req.id,
            reason=f"Тревожные слова в голосовом запросе: {data.text[:200]}",
        ))
        notify_staff(db, "emergency", f"ТРЕВОГА (голос): {elder.full_name}",
                     f"«{data.text[:200]}» — заявка {req.number}")
        notify_relatives(db, elder.id, "emergency",
                         f"Тревожный сигнал от {elder.full_name}",
                         "Оператор срочно свяжется с вашим близким.")
    else:
        notify_staff(db, "request_created",
                     f"Голосовая заявка {req.number}",
                     f"{elder.full_name}: «{data.text[:200]}»")
        notify_relatives(db, elder.id, "request_created",
                         f"{elder.full_name}: новая заявка голосом",
                         f"«{data.text[:120]}» — {req.title}")
    audit(db, user.id, "voice_request", "request", req.id, details=result.category)
    db.commit()
    db.refresh(req)

    response = serialize_request(req, full=True)
    response["ai"] = {
        "category": result.category,
        "category_label": models.RequestCategory.LABELS.get(result.category),
        "urgency": result.urgency,
        "is_emergency": result.is_emergency,
        "clarification": result.clarification,
    }
    return response
