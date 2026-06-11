"""Демо-данные для пилота: админ, оператор, партнёры, демо-семья."""

from . import models
from .database import SessionLocal
from .security import hash_password


def seed_initial_data() -> None:
    db = SessionLocal()
    try:
        if db.query(models.User).count() > 0:
            return

        admin = models.User(
            phone="+70000000001", full_name="Администратор ВнучОК",
            role=models.Role.ADMIN, password_hash=hash_password("admin123"),
        )
        operator = models.User(
            phone="+70000000002", full_name="Оператор Мария",
            role=models.Role.OPERATOR, password_hash=hash_password("operator123"),
        )
        relative = models.User(
            phone="+79991234567", full_name="Анна Петрова",
            email="anna@example.com", role=models.Role.RELATIVE,
        )
        db.add_all([admin, operator, relative])
        db.flush()

        elder = models.ElderProfile(
            full_name="Мария Ивановна Петрова", age=78,
            phone="+79997654321",
            address="г. Казань, ул. Пушкина, д. 10, кв. 5",
            mobility_limits="Ходит с тростью, тяжело спускаться по лестнице",
            food_preferences="Молочные продукты, каши, рыба",
            food_restrictions="Без острого, мало соли",
            regular_pharmacy_items="Тонометр, валидол",
            preferred_call_time="10:00–12:00",
            connect_code="DEMO01",
        )
        db.add(elder)
        db.flush()
        db.add(models.FamilyRelation(
            relative_id=relative.id, elder_id=elder.id, relation_type="дочь",
        ))
        db.add(models.Contact(elder_id=elder.id, name="Анна (дочь)",
                              phone="+79991234567", kind="emergency"))

        retail = models.Partner(name="Магнит Доставка", kind="retail",
                                city="Казань", phone="+78001000000",
                                contact_person="Отдел B2B")
        db.add_all([
            retail,
            models.Partner(name="Аптека Здоровье", kind="pharmacy",
                           city="Казань", phone="+78002000000",
                           contact_person="Ирина Сергеевна"),
            models.Partner(name="НКО «Добрые соседи»", kind="ngo",
                           city="Казань", phone="+78003000000",
                           contact_person="Координатор волонтёров"),
            models.Partner(name="Бытовая помощь 24", kind="household",
                           city="Казань", phone="+78004000000"),
        ])
        db.flush()

        db.add(models.User(
            phone="+70000000003", full_name="Кабинет «Магнит Доставка»",
            role=models.Role.PARTNER, partner_id=retail.id,
            password_hash=hash_password("partner123"),
        ))

        db.add(models.CheckInSchedule(elder_id=elder.id, frequency="daily",
                                      time_of_day="10:00"))

        db.add_all([
            models.Medication(elder_id=elder.id, name="Таблетки от давления",
                              note="После завтрака, запить водой", times="09:00"),
            models.Medication(elder_id=elder.id, name="Витамины",
                              note="Назначены семьёй", times="09:00,20:00"),
        ])

        db.add(models.PromoCode(code="ZABOTA10", discount_percent=10))
        db.add(models.PromoCode(code="PILOT50", discount_percent=50, uses_left=30))

        db.add_all([
            models.ChatMessage(elder_id=elder.id, author_id=relative.id,
                               text="Мама, привет! Мы подключили тебе ВнучОК. "
                                    "Нажимай большие кнопки, если что-то нужно ❤️"),
            models.ChatMessage(elder_id=elder.id, author_id=operator.id,
                               text="Здравствуйте! Я Мария, ваш оператор. "
                                    "Звоните в любое время, поможем."),
        ])
        db.commit()
    finally:
        db.close()
