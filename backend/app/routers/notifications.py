from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(unread_only: bool = False,
                       user: models.User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    query = db.query(models.Notification).filter_by(user_id=user.id)
    if unread_only:
        query = query.filter_by(is_read=False)
    items = query.order_by(models.Notification.created_at.desc()).limit(100).all()
    unread = db.query(models.Notification).filter_by(
        user_id=user.id, is_read=False).count()
    return {
        "unread_count": unread,
        "items": [
            {
                "id": n.id, "kind": n.kind, "title": n.title, "body": n.body,
                "is_read": n.is_read, "created_at": n.created_at.isoformat(),
            }
            for n in items
        ],
    }


@router.patch("/{notification_id}/read")
def mark_read(notification_id: int, user: models.User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    notification = db.get(models.Notification, notification_id)
    if not notification or notification.user_id != user.id:
        raise HTTPException(404, "Уведомление не найдено")
    notification.is_read = True
    db.commit()
    return {"status": "ok"}


@router.post("/read-all")
def mark_all_read(user: models.User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    db.query(models.Notification).filter_by(user_id=user.id, is_read=False).update(
        {"is_read": True})
    db.commit()
    return {"status": "ok"}
