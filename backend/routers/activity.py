from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models.user import User
from backend.models.activity import ActivityLog
from backend.schemas.activity import ActivityListResponse, ActivityOut

router = APIRouter()


@router.get("", response_model=ActivityListResponse)
def get_activity(
    status: str | None = Query(None, description="Filter by status: completed, pending, failed"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(ActivityLog).filter(ActivityLog.user_id == current_user.id)
    if status:
        query = query.filter(ActivityLog.status == status)
    total = query.count()
    items = query.order_by(ActivityLog.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return ActivityListResponse(items=items, total=total, page=page, limit=limit)
