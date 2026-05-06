from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import text
from backend.database import engine, Base
from backend.models import password_reset  # noqa: F401 — registers model with Base
from backend.services.chat_service import chat_service
from backend.routers import auth, chat, services, activity, settings as settings_router

Base.metadata.create_all(bind=engine)

# Add disabled_institutions column if it doesn't exist yet (safe migration)
with engine.connect() as _conn:
    try:
        _conn.execute(text("ALTER TABLE users ADD COLUMN disabled_institutions TEXT DEFAULT ''"))
        _conn.commit()
    except Exception:
        pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    await chat_service.start()
    yield
    await chat_service.stop()


app = FastAPI(title="MCP Government Platform", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
    expose_headers=["X-Captcha-Token"],
)

app.include_router(auth.router,             prefix="/api/auth",     tags=["auth"])
app.include_router(chat.router,             prefix="/api/chat",     tags=["chat"])
app.include_router(services.router,         prefix="/api/services", tags=["services"])
app.include_router(activity.router,         prefix="/api/activity", tags=["activity"])
app.include_router(settings_router.router,  prefix="/api/settings", tags=["settings"])
