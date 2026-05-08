from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models.user import User
from backend.schemas.settings import SettingsResponse, SettingsUpdate
from backend.models.activity import ActivityLog
from backend.models.chat import ChatSession
from backend.services.auth_service import hash_password, verify_password

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


class ChangeEmailRequest(BaseModel):
    current_password: str
    new_email: EmailStr


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class DeleteAccountRequest(BaseModel):
    current_password: str


@router.patch("/email")
def change_email(
    body: ChangeEmailRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if db.query(User).filter(User.email == body.new_email, User.id != current_user.id).first():
        raise HTTPException(status_code=400, detail="Email already in use")
    current_user.email = body.new_email
    db.commit()
    return {"email": current_user.email}


@router.patch("/password")
def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(body.new_password)
    db.commit()
    return {"success": True}


@router.delete("/account", status_code=204)
def delete_account(
    body: DeleteAccountRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    db.query(ActivityLog).filter(ActivityLog.user_id == current_user.id).delete()
    db.query(ChatSession).filter(ChatSession.user_id == current_user.id).delete()
    db.delete(current_user)
    db.commit()
