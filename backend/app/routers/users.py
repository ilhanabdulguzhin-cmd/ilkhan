from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..deps import get_current_user, get_elder_or_403, require_relative
from ..services.helpers import audit, notify_user, serialize_elder

router = APIRouter(prefix="/users", tags=["users"])


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None


class ElderIn(BaseModel):
    full_name: str
    age: int | None = None
    phone: str = ""
    address: str = ""
    access_comment: str = ""
    mobility_limits: str = ""
    food_preferences: str = ""
    food_restrictions: str = ""
    regular_pharmacy_items: str = ""
    preferred_call_time: str = ""
    preferred_contact_method: str = "phone"
    operator_notes: str = ""
    relation_type: str = "родственник"


class ElderUpdate(BaseModel):
    full_name: str | None = None
    age: int | None = None
    phone: str | None = None
    address: str | None = None
    access_comment: str | None = None
    mobility_limits: str | None = None
    food_preferences: str | None = None
    food_restrictions: str | None = None
    regular_pharmacy_items: str | None = None
    preferred_call_time: str | None = None
    preferred_contact_method: str | None = None
    operator_notes: str | None = None
    is_social: bool | None = None
    ngo_name: str | None = None


class ContactIn(BaseModel):
    name: str
    phone: str
    kind: str = "trusted"


@router.get("/me")
def me(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    data = {
        "id": user.id,
        "phone": user.phone,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
    }
    if user.role == models.Role.ELDER:
        elder = db.query(models.ElderProfile).filter_by(user_id=user.id).first()
        data["elder_profile"] = serialize_elder(elder, db) if elder else None
    return data


@router.patch("/me")
def update_me(data: UserUpdate, user: models.User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.email is not None:
        user.email = data.email
    audit(db, user.id, "update_profile", "user", user.id)
    db.commit()
    return {"status": "ok"}


@router.get("/elders")
def my_elders(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Список подопечных текущего родственника."""
    if user.role in (models.Role.OPERATOR, models.Role.ADMIN):
        elders = db.query(models.ElderProfile).all()
    else:
        relations = db.query(models.FamilyRelation).filter_by(relative_id=user.id).all()
        elders = [rel.elder for rel in relations]
    return [serialize_elder(e, db) for e in elders]


@router.post("/elder")
def create_elder(data: ElderIn, user: models.User = Depends(require_relative),
                 db: Session = Depends(get_db)):
    elder = models.ElderProfile(**data.model_dump(exclude={"relation_type"}))
    db.add(elder)
    db.flush()
    db.add(models.FamilyRelation(
        relative_id=user.id, elder_id=elder.id,
        relation_type=data.relation_type, is_owner=True,
    ))
    notify_user(db, user.id, "elder_connected",
                f"Профиль «{elder.full_name}» создан",
                f"Код подключения для приложения: {elder.connect_code}")
    audit(db, user.id, "create_elder", "elder_profile", elder.id)
    db.commit()
    db.refresh(elder)
    return serialize_elder(elder, db)


@router.get("/elder/{elder_id}")
def get_elder(elder_id: int, user: models.User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    elder = get_elder_or_403(db, user, elder_id)
    return serialize_elder(elder, db)


@router.patch("/elder/{elder_id}")
def update_elder(elder_id: int, data: ElderUpdate,
                 user: models.User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    elder = get_elder_or_403(db, user, elder_id)
    updates = data.model_dump(exclude_unset=True)
    if user.role not in (models.Role.OPERATOR, models.Role.ADMIN):
        updates.pop("is_social", None)
        updates.pop("ngo_name", None)
    for key, value in updates.items():
        setattr(elder, key, value)
    audit(db, user.id, "update_elder", "elder_profile", elder.id)
    db.commit()
    return serialize_elder(elder, db)


@router.post("/elder/{elder_id}/contacts")
def add_contact(elder_id: int, data: ContactIn,
                user: models.User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    elder = get_elder_or_403(db, user, elder_id)
    contact = models.Contact(elder_id=elder.id, **data.model_dump())
    db.add(contact)
    audit(db, user.id, "add_contact", "contact", None)
    db.commit()
    return {"status": "ok", "id": contact.id}


@router.delete("/elder/{elder_id}/contacts/{contact_id}")
def delete_contact(elder_id: int, contact_id: int,
                   user: models.User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    elder = get_elder_or_403(db, user, elder_id)
    contact = db.get(models.Contact, contact_id)
    if not contact or contact.elder_id != elder.id:
        raise HTTPException(404, "Контакт не найден")
    db.delete(contact)
    db.commit()
    return {"status": "ok"}
