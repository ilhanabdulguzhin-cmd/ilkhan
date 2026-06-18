import os
import time
from collections import defaultdict, deque

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .database import Base, engine
from .routers import (
    admin,
    auth,
    chat,
    checkins,
    medications,
    notifications,
    partner,
    payments,
    requests,
    users,
    voice,
)
from .seed import seed_initial_data
from .services.monitor import start_monitor

app = FastAPI(
    title="ВнучОК API",
    description="Платформа заботы о пожилых: голосовые и кнопочные заявки, "
                "семейный кабинет, операторская панель, подписки.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # в проде ограничить доменами фронтенда
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Простой rate limiter (раздел 24.3 ТЗ): не больше 30 запросов за 10 секунд с IP
_hits: dict[str, deque] = defaultdict(deque)
RATE_LIMIT = 30
RATE_WINDOW = 10.0


@app.middleware("http")
async def rate_limiter(request: Request, call_next):
    ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    window = _hits[ip]
    while window and now - window[0] > RATE_WINDOW:
        window.popleft()
    if len(window) >= RATE_LIMIT:
        return JSONResponse({"detail": "Слишком много запросов, попробуйте позже"},
                            status_code=429)
    window.append(now)
    return await call_next(request)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    seed_initial_data()
    start_monitor()


@app.get("/health")
def health():
    return {"status": "ok", "service": "vnuchok-api"}


app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(requests.router, prefix="/api")
app.include_router(voice.router, prefix="/api")
app.include_router(checkins.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(medications.router, prefix="/api")
app.include_router(partner.router, prefix="/api")

# Serve built frontend (production: static/ dir populated by Docker build)
_static = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.isdir(_static):
    app.mount("/", StaticFiles(directory=_static, html=True), name="static")
