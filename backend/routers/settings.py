from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models.user import User
from backend.schemas.settings import SettingsResponse, SettingsUpdate

router = APIRouter()


@router.get("", response_model=SettingsResponse)
def get_settings(current_user: User = Depends(get_current_user)):
    return SettingsResponse(
        full_name=current_user.full_name,
        email=current_user.email,
        language=current_user.language,
        notifications=current_user.notifications,
    )


@router.patch("", response_model=SettingsResponse)
def update_settings(
    body: SettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.full_name is not None:
        current_user.full_name = body.full_name
    if body.language is not None:
        current_user.language = body.language
    if body.notifications is not None:
        current_user.notifications = body.notifications
    db.commit()
    db.refresh(current_user)
    return SettingsResponse(
        full_name=current_user.full_name,
        email=current_user.email,
        language=current_user.language,
        notifications=current_user.notifications,
    )
