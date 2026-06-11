import os

# В проде заменить на переменные окружения / секреты
SECRET_KEY = os.getenv("VNUCHOK_SECRET_KEY", "vnuchok-dev-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("VNUCHOK_TOKEN_TTL", "1440"))

# SQLite для MVP; для прода указать postgresql+psycopg://...
DATABASE_URL = os.getenv("VNUCHOK_DATABASE_URL", "sqlite:///./vnuchok.db")

# Демо-режим: SMS-код не отправляется, а возвращается в ответе API
DEMO_MODE = os.getenv("VNUCHOK_DEMO_MODE", "1") == "1"
DEMO_SMS_CODE = "1234"

# Тарифы (руб./мес)
TARIFFS = {
    "na_svyazi": {
        "code": "na_svyazi",
        "title": "На связи",
        "price": 990,
        "features": [
            "1 звонок в неделю",
            "Кнопка «Всё хорошо»",
            "Уведомления",
            "Базовый кабинет родственника",
            "Помощь оператора",
        ],
    },
    "zabota": {
        "code": "zabota",
        "title": "Забота",
        "price": 2490,
        "features": [
            "2–3 звонка в неделю",
            "AI-агент ВнучОК",
            "Продуктовые заявки",
            "Аптечные заявки",
            "История активности",
            "Отчёты родственнику",
        ],
    },
    "ryadom": {
        "code": "ryadom",
        "title": "Рядом",
        "price": 4990,
        "features": [
            "Расширенные звонки",
            "Бытовая помощь",
            "Персональный координатор",
            "Расширенный мониторинг",
            "Индивидуальный план заботы",
        ],
    },
    "social": {
        "code": "social",
        "title": "Социальный (НКО)",
        "price": 0,
        "features": [
            "Кнопка «Мне нужна помощь»",
            "Кнопка «Всё хорошо»",
            "Регулярный звонок",
            "Базовая продуктовая заявка",
            "Аптечная заявка через партнёра",
            "Подключение НКО или волонтёра",
        ],
    },
}

# Продуктовые наборы MVP (раздел 10.3 ТЗ)
PRODUCT_SETS = [
    {"code": "week_basic", "title": "Базовый набор на неделю", "price": 2200},
    {"code": "breakfast", "title": "Набор завтраков", "price": 1100},
    {"code": "no_cooking", "title": "Набор «без готовки»", "price": 1800},
    {"code": "light", "title": "Лёгкий набор", "price": 900},
    {"code": "water_household", "title": "Вода и бытовые товары", "price": 1300},
]
