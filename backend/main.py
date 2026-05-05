from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import engine, Base
from backend.services.chat_service import chat_service
from backend.routers import auth, chat, services, activity, settings as settings_router

Base.metadata.create_all(bind=engine)


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
)

app.include_router(auth.router,             prefix="/api/auth",     tags=["auth"])
app.include_router(chat.router,             prefix="/api/chat",     tags=["chat"])
app.include_router(services.router,         prefix="/api/services", tags=["services"])
app.include_router(activity.router,         prefix="/api/activity", tags=["activity"])
app.include_router(settings_router.router,  prefix="/api/settings", tags=["settings"])
