"""AI-агент «ВнучОК»: классификация запросов с safety-слоем (раздел 9 ТЗ).

В MVP — rule-based классификатор поверх нормализованного текста. Архитектура
позволяет заменить classify() на вызов LLM, сохранив safety-слой: тревожные
маркеры всегда проверяются ДО и НЕЗАВИСИМО от модели, а решение по эскалации
принимает оператор (human-in-the-loop).
"""

from dataclasses import dataclass, field

from ..models import RequestCategory

# Тревожные маркеры: при совпадении заявка немедленно уходит оператору
# с приоритетом critical. AI не успокаивает и не даёт медицинских советов.
ALARM_MARKERS = [
    "плохо", "болит", "боль", "упал", "упала", "падение", "скорая", "скорую",
    "давление", "сердце", "задыха", "кровь", "температура", "головокруж",
    "теряю сознание", "потерял сознание", "инсульт", "инфаркт", "умира",
    "помогите", "страшно", "не могу встать", "не могу дышать",
]

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    RequestCategory.REPEAT_ORDER: [
        "повтори", "повторить", "как в прошлый раз", "то же самое", "как раньше",
    ],
    RequestCategory.PHARMACY: [
        "лекарств", "аптек", "таблетк", "препарат", "валидол", "корвалол",
        "пластыр", "градусник", "тонометр", "витамин",
    ],
    RequestCategory.PRODUCTS: [
        "продукт", "еда", "еду", "хлеб", "молоко", "магазин", "купить",
        "закаж", "заказать", "кефир", "крупа", "овощ", "покушать", "поесть",
    ],
    RequestCategory.HOUSEHOLD: [
        "убор", "убрать", "мусор", "ремонт", "кран", "лампочк", "квитанц",
        "по дому", "помощь дома", "сантехник", "электрик", "сопровод",
        "поликлиник", "документ",
    ],
    RequestCategory.FAMILY_CONTACT: [
        "дочк", "дочер", "сын", "сыну", "внук", "внучк", "родн", "семь",
        "свяжи", "связаться",
    ],
    RequestCategory.CALL: [
        "позвони", "звонок", "перезвони", "наберите",
    ],
    RequestCategory.LONELY: [
        "поговорить", "одинок", "скучно", "грустно", "пообщаться", "поболтать",
    ],
    RequestCategory.TECH_HELP: [
        "телефон не", "не работает", "интернет", "телевизор", "приложение",
        "кнопка не", "разобраться с телефоном",
    ],
}

CLARIFICATIONS = {
    RequestCategory.PRODUCTS: "Подскажите, что из продуктов вам привезти? Можно выбрать готовый набор.",
    RequestCategory.PHARMACY: "Что нужно из аптеки? Оператор уточнит детали и передаст заявку аптеке-партнёру.",
    RequestCategory.HOUSEHOLD: "Какая помощь по дому нужна? Оператор свяжется с вами для уточнения.",
    RequestCategory.CALL: "Хорошо, оператор позвонит вам в ближайшее время.",
    RequestCategory.FAMILY_CONTACT: "Передаём вашему родственнику, что вы хотите связаться.",
    RequestCategory.FEELING_BAD: "Мы передали ваш запрос оператору, он срочно свяжется с вами. Оставайтесь на связи.",
    RequestCategory.LONELY: "Оператор позвонит вам, чтобы поговорить.",
    RequestCategory.REPEAT_ORDER: "Повторяем ваш прошлый заказ. Подтвердите, пожалуйста.",
    RequestCategory.TECH_HELP: "Оператор поможет разобраться. Он скоро позвонит вам.",
    RequestCategory.OTHER: "Мы передали ваш запрос оператору, он уточнит детали.",
}


@dataclass
class Classification:
    category: str
    urgency: str  # normal | high | critical
    is_emergency: bool
    clarification: str
    matched_markers: list[str] = field(default_factory=list)


def classify(text: str) -> Classification:
    normalized = (text or "").lower().strip()

    matched_alarms = [m for m in ALARM_MARKERS if m in normalized]
    if matched_alarms:
        # Safety-правило: тревожные слова => немедленная передача оператору,
        # без самостоятельных медицинских рекомендаций со стороны AI.
        return Classification(
            category=RequestCategory.FEELING_BAD,
            urgency="critical",
            is_emergency=True,
            clarification=CLARIFICATIONS[RequestCategory.FEELING_BAD],
            matched_markers=matched_alarms,
        )

    scores: dict[str, int] = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in normalized)
        if score:
            scores[category] = score

    if not scores:
        category = RequestCategory.OTHER
    else:
        category = max(scores, key=lambda c: scores[c])

    urgency = "high" if category in (RequestCategory.CALL, RequestCategory.FAMILY_CONTACT) else "normal"
    return Classification(
        category=category,
        urgency=urgency,
        is_emergency=False,
        clarification=CLARIFICATIONS.get(category, CLARIFICATIONS[RequestCategory.OTHER]),
    )
