import secrets
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def now() -> datetime:
    return datetime.utcnow()


class Role:
    ELDER = "elder"
    RELATIVE = "relative"
    OPERATOR = "operator"
    ADMIN = "admin"
    PARTNER = "partner"
    NGO = "ngo"


class RequestStatus:
    NEW = "new"
    NEEDS_CLARIFICATION = "needs_clarification"
    ACCEPTED = "accepted"
    AWAITING_PAYMENT = "awaiting_payment"
    SENT_TO_PARTNER = "sent_to_partner"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    CANCELLED = "cancelled"
    OVERDUE = "overdue"
    EMERGENCY = "emergency"

    ALL = [NEW, NEEDS_CLARIFICATION, ACCEPTED, AWAITING_PAYMENT, SENT_TO_PARTNER,
           IN_PROGRESS, DONE, CANCELLED, OVERDUE, EMERGENCY]

    LABELS = {
        NEW: "Новая",
        NEEDS_CLARIFICATION: "Требует уточнения",
        ACCEPTED: "Принята оператором",
        AWAITING_PAYMENT: "Ожидает оплаты",
        SENT_TO_PARTNER: "Передана партнёру",
        IN_PROGRESS: "В работе",
        DONE: "Выполнена",
        CANCELLED: "Отменена",
        OVERDUE: "Просрочена",
        EMERGENCY: "Тревожная эскалация",
    }


class RequestCategory:
    PRODUCTS = "products"
    PHARMACY = "pharmacy"
    HOUSEHOLD = "household"
    CALL = "call"
    FAMILY_CONTACT = "family_contact"
    FEELING_BAD = "feeling_bad"
    LONELY = "lonely"
    REPEAT_ORDER = "repeat_order"
    TECH_HELP = "tech_help"
    OTHER = "other"

    LABELS = {
        PRODUCTS: "Продукты",
        PHARMACY: "Аптека",
        HOUSEHOLD: "Бытовая помощь",
        CALL: "Звонок",
        FAMILY_CONTACT: "Связь с родственником",
        FEELING_BAD: "Плохое самочувствие",
        LONELY: "Поговорить",
        REPEAT_ORDER: "Повтор заказа",
        TECH_HELP: "Техническая помощь",
        OTHER: "Другое",
    }


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    phone: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255), default="")
    email: Mapped[str] = mapped_column(String(255), default="")
    role: Mapped[str] = mapped_column(String(32), default=Role.RELATIVE, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    elder_profile: Mapped["ElderProfile | None"] = relationship(
        back_populates="user", uselist=False, foreign_keys="ElderProfile.user_id"
    )


class ElderProfile(Base):
    __tablename__ = "elder_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    full_name: Mapped[str] = mapped_column(String(255))
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    phone: Mapped[str] = mapped_column(String(32), default="")
    address: Mapped[str] = mapped_column(String(512), default="")
    access_comment: Mapped[str] = mapped_column(Text, default="")
    mobility_limits: Mapped[str] = mapped_column(Text, default="")
    food_preferences: Mapped[str] = mapped_column(Text, default="")
    food_restrictions: Mapped[str] = mapped_column(Text, default="")
    regular_pharmacy_items: Mapped[str] = mapped_column(Text, default="")
    preferred_call_time: Mapped[str] = mapped_column(String(128), default="")
    preferred_contact_method: Mapped[str] = mapped_column(String(64), default="phone")
    operator_notes: Mapped[str] = mapped_column(Text, default="")
    is_social: Mapped[bool] = mapped_column(Boolean, default=False)
    ngo_name: Mapped[str] = mapped_column(String(255), default="")
    connect_code: Mapped[str] = mapped_column(
        String(12), unique=True, index=True,
        default=lambda: secrets.token_hex(3).upper(),
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    user: Mapped["User | None"] = relationship(
        back_populates="elder_profile", foreign_keys=[user_id]
    )
    contacts: Mapped[list["Contact"]] = relationship(
        back_populates="elder", cascade="all, delete-orphan"
    )
    relations: Mapped[list["FamilyRelation"]] = relationship(
        back_populates="elder", cascade="all, delete-orphan"
    )


class FamilyRelation(Base):
    __tablename__ = "family_relations"

    id: Mapped[int] = mapped_column(primary_key=True)
    relative_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    elder_id: Mapped[int] = mapped_column(ForeignKey("elder_profiles.id"), index=True)
    relation_type: Mapped[str] = mapped_column(String(64), default="родственник")
    is_owner: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    relative: Mapped["User"] = relationship(foreign_keys=[relative_id])
    elder: Mapped["ElderProfile"] = relationship(back_populates="relations")


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[int] = mapped_column(primary_key=True)
    elder_id: Mapped[int] = mapped_column(ForeignKey("elder_profiles.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str] = mapped_column(String(32))
    kind: Mapped[str] = mapped_column(String(32), default="trusted")  # trusted | emergency
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    elder: Mapped["ElderProfile"] = relationship(back_populates="contacts")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    plan: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(32), default="active")  # active|cancelled|expired
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    subscription_id: Mapped[int | None] = mapped_column(
        ForeignKey("subscriptions.id"), nullable=True
    )
    request_id: Mapped[int | None] = mapped_column(ForeignKey("requests.id"), nullable=True)
    amount: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(8), default="RUB")
    status: Mapped[str] = mapped_column(String(32), default="succeeded")
    description: Mapped[str] = mapped_column(String(512), default="")
    receipt_number: Mapped[str] = mapped_column(
        String(32), default=lambda: "R-" + secrets.token_hex(4).upper()
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Request(Base):
    __tablename__ = "requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    number: Mapped[str] = mapped_column(
        String(16), unique=True, default=lambda: "VN-" + secrets.token_hex(3).upper()
    )
    elder_id: Mapped[int] = mapped_column(ForeignKey("elder_profiles.id"), index=True)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    category: Mapped[str] = mapped_column(String(32), index=True)
    source: Mapped[str] = mapped_column(String(32), default="button")  # voice|button|relative|operator|partner
    status: Mapped[str] = mapped_column(String(32), default=RequestStatus.NEW, index=True)
    priority: Mapped[str] = mapped_column(String(16), default="normal")  # low|normal|high|critical
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    voice_text: Mapped[str] = mapped_column(Text, default="")
    ai_category: Mapped[str] = mapped_column(String(32), default="")
    ai_urgency: Mapped[str] = mapped_column(String(16), default="")
    ai_clarification: Mapped[str] = mapped_column(Text, default="")
    operator_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    partner_id: Mapped[int | None] = mapped_column(ForeignKey("partners.id"), nullable=True)
    executor_id: Mapped[int | None] = mapped_column(ForeignKey("executors.id"), nullable=True)
    cost: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)

    elder: Mapped["ElderProfile"] = relationship()
    operator: Mapped["User | None"] = relationship(foreign_keys=[operator_id])
    partner: Mapped["Partner | None"] = relationship()
    status_history: Mapped[list["RequestStatusHistory"]] = relationship(
        back_populates="request", cascade="all, delete-orphan",
        order_by="RequestStatusHistory.created_at",
    )
    comments: Mapped[list["OperatorComment"]] = relationship(
        back_populates="request", cascade="all, delete-orphan",
        order_by="OperatorComment.created_at",
    )


class RequestStatusHistory(Base):
    __tablename__ = "request_status_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("requests.id"), index=True)
    status: Mapped[str] = mapped_column(String(32))
    comment: Mapped[str] = mapped_column(Text, default="")
    changed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    request: Mapped["Request"] = relationship(back_populates="status_history")
    changed_by: Mapped["User | None"] = relationship()


class OperatorComment(Base):
    __tablename__ = "operator_comments"

    id: Mapped[int] = mapped_column(primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("requests.id"), index=True)
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    request: Mapped["Request"] = relationship(back_populates="comments")
    author: Mapped["User | None"] = relationship()


class Partner(Base):
    __tablename__ = "partners"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    kind: Mapped[str] = mapped_column(String(32), default="retail")  # retail|pharmacy|clinic|household|ngo|volunteer
    phone: Mapped[str] = mapped_column(String(32), default="")
    contact_person: Mapped[str] = mapped_column(String(255), default="")
    city: Mapped[str] = mapped_column(String(128), default="")
    rating: Mapped[float] = mapped_column(Float, default=5.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Executor(Base):
    __tablename__ = "executors"

    id: Mapped[int] = mapped_column(primary_key=True)
    partner_id: Mapped[int | None] = mapped_column(ForeignKey("partners.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str] = mapped_column(String(32), default="")
    rating: Mapped[float] = mapped_column(Float, default=5.0)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class CheckIn(Base):
    __tablename__ = "checkins"

    id: Mapped[int] = mapped_column(primary_key=True)
    elder_id: Mapped[int] = mapped_column(ForeignKey("elder_profiles.id"), index=True)
    kind: Mapped[str] = mapped_column(String(32), default="ok_button")  # ok_button|call_done|call_missed
    comment: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class CheckInSchedule(Base):
    __tablename__ = "checkin_schedules"

    id: Mapped[int] = mapped_column(primary_key=True)
    elder_id: Mapped[int] = mapped_column(ForeignKey("elder_profiles.id"), index=True)
    frequency: Mapped[str] = mapped_column(String(32), default="daily")  # daily|every_other_day|weekly_2_3
    time_of_day: Mapped[str] = mapped_column(String(8), default="10:00")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    kind: Mapped[str] = mapped_column(String(64), default="info")
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text, default="")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class EmergencyEvent(Base):
    __tablename__ = "emergency_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    elder_id: Mapped[int] = mapped_column(ForeignKey("elder_profiles.id"), index=True)
    request_id: Mapped[int | None] = mapped_column(ForeignKey("requests.id"), nullable=True)
    reason: Mapped[str] = mapped_column(String(512))
    status: Mapped[str] = mapped_column(String(32), default="open")  # open|resolved
    resolution: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    elder: Mapped["ElderProfile"] = relationship()


class CallLog(Base):
    __tablename__ = "call_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    elder_id: Mapped[int] = mapped_column(ForeignKey("elder_profiles.id"), index=True)
    operator_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    result: Mapped[str] = mapped_column(String(32), default="planned")
    # planned|reached|not_reached|retry_needed|escalation|all_good
    comment: Mapped[str] = mapped_column(Text, default="")
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    elder: Mapped["ElderProfile"] = relationship()
    operator: Mapped["User | None"] = relationship()


class SmsCode(Base):
    __tablename__ = "sms_codes"

    id: Mapped[int] = mapped_column(primary_key=True)
    phone: Mapped[str] = mapped_column(String(32), index=True)
    code: Mapped[str] = mapped_column(String(8))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    used: Mapped[bool] = mapped_column(Boolean, default=False)


class Consent(Base):
    __tablename__ = "consents"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    kind: Mapped[str] = mapped_column(String(64))  # personal_data|voice_recording|photo
    granted: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(128))
    entity: Mapped[str] = mapped_column(String(64), default="")
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    details: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
