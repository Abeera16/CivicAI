from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.civic_schemas import WeatherOut
from app.services.weather_sync import get_current_weather

router = APIRouter(prefix="/weather", tags=["weather"])


@router.get("/current", response_model=WeatherOut)
async def current_weather(force_refresh: bool = False, db: AsyncSession = Depends(get_db)):
    """
    Returns current weather / AQI for Lahore.
    Always returns data — falls back to Lahore climate defaults if the live API
    is unavailable and there is no cached reading in the database.
    """
    reading = await get_current_weather(db, force_refresh=force_refresh)
    return reading
