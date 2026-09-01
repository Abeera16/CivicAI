from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.logging_config import logger
from app.models.civic_schemas import OSMFacilityOut, OSMRoadOut
from app.models.db_models import OSMFacility, OSMRoad
from app.services.osm_sync import sync_all

router = APIRouter(prefix="/osm", tags=["osm"])


@router.get("/roads", response_model=list[OSMRoadOut])
async def list_roads(road_type: str | None = None, db: AsyncSession = Depends(get_db)):
    query = select(OSMRoad)
    if road_type:
        query = query.where(OSMRoad.road_type == road_type)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/facilities", response_model=list[OSMFacilityOut])
async def list_facilities(facility_type: str | None = None, db: AsyncSession = Depends(get_db)):
    query = select(OSMFacility)
    if facility_type:
        query = query.where(OSMFacility.facility_type == facility_type)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/sync")
async def trigger_sync(db: AsyncSession = Depends(get_db)):
    """Rerunnable Overpass sync. Also available as scripts/sync_osm.py for scheduled/CLI use."""
    logger.info("OSM sync triggered via API")
    return await sync_all(db)
