"""City Command Center — staff-facing city-wide summary (Stage 8, Pass 2)."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt_handler import get_current_staff_user
from app.core.database import get_db
from app.models.civic_schemas import CommandCenterSummary
from app.models.db_models import User
from app.services import command_center as command_center_service

router = APIRouter(prefix="/command-center", tags=["command-center"])


@router.get("/summary", response_model=CommandCenterSummary)
async def command_center_summary(
    current_user: User = Depends(get_current_staff_user),
    db: AsyncSession = Depends(get_db),
):
    return await command_center_service.get_summary(db)
