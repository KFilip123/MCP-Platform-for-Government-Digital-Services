from pydantic import BaseModel


class SettingsResponse(BaseModel):
    full_name: str | None
    email: str
    language: str
    notifications: bool


class SettingsUpdate(BaseModel):
    full_name: str | None = None
    language: str | None = None
    notifications: bool | None = None
