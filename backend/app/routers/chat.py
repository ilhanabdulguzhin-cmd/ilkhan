"""Семейный чат (версия 2 ТЗ): общая лента для родственников, пожилого
пользователя и оператора по каждому подопечному."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..deps import get_current_user, get_elder_or_403
from ..services.helpers import audit, notify_relatives, notify_user

router = APIRouter(prefix="/chat", tags=["chat"])


class MessageIn(BaseModel):
    text: str


ROLE_LABELS = {
    "elder": "Подопечный", "relative": "Семья",
    "operator": "Оператор", "admin": "Оператор",
}


@router.get("/{elder_id}/messages")
def list_messages(elder_id: int, user: models.User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    elder = get_elder_or_403(db, user, elder_id)
    messages = (
        db.query(models.ChatMessage)
        .filter_by(elder_id=elder.id)
        .order_by(models.ChatMessage.created_at.desc())
        .limit(100)
        .all()
    )
    return [
        {
            "id": m.id,
            "author_id": m.author_id,
            "author_name": m.author.full_name if m.author else "—",
            "author_role": m.author.role if m.author else "",
            "author_label": ROLE_LABELS.get(m.author.role if m.author else "", ""),
            "mine": m.author_id == user.id,
            "text": m.text,
            "created_at": m.created_at.isoformat(),
        }
        for m in reversed(messages)
    ]


@router.post("/{elder_id}/messages")
def send_message(elder_id: int, data: MessageIn,
                 user: models.User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    elder = get_elder_or_403(db, user, elder_id)
    message = models.ChatMessage(elder_id=elder.id, author_id=user.id,
                                 text=data.text.strip()[:2000])
    db.add(message)

    preview = data.text[:120]
    if user.role == models.Role.ELDER:
        notify_relatives(db, elder.id, "chat",
                         f"💬 {elder.full_name} пишет в семейный чат", preview)
    else:
        # сообщение семье/оператора: уведомляем остальных родственников
        relations = db.query(models.FamilyRelation).filter_by(elder_id=elder.id).all()
        for rel in relations:
            if rel.relative_id != user.id:
                notify_user(db, rel.relative_id, "chat",
                            f"💬 Новое сообщение в чате ({elder.full_name})", preview)
    audit(db, user.id, "chat_message", "elder_profile", elder.id)
    db.commit()
    return {"status": "ok", "id": message.id}
