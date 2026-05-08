from datetime import datetime
from pydantic import BaseModel


class ActivityOut(BaseModel):
    id: int
    service: str
    action: str
    status: str
    description: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class ActivityListResponse(BaseModel):
    items: list[ActivityOut]
    total: int
    page: int
    limit: int
