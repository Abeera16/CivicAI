"""Real Overpass API ingestion for the Lahore bounding box — rerunnable sync, cached in Postgres.

Usage: python scripts/sync_osm.py  (or call sync_all() directly from an endpoint/background task)
"""
from datetime import datetime

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging_config import logger
from app.models.db_models import OSMFacility, OSMRoad
from app.utils.geo_utils import bbox_tuple
from app.utils.retry import with_retry

IMPORTANCE_BY_HIGHWAY = {
    "motorway": 1.0,
    "motorway_link": 1.0,
    "trunk": 1.0,
    "trunk_link": 1.0,
    "primary": 0.8,
    "primary_link": 0.8,
    "secondary": 0.5,
    "secondary_link": 0.5,
    "residential": 0.2,
    "living_street": 0.2,
}
DEFAULT_ROAD_TYPE = "other"
DEFAULT_IMPORTANCE = 0.1

ROADS_QUERY = """
[out:json][timeout:60];
(
  way["highway"~"^(motorway|trunk|primary|secondary|residential|motorway_link|trunk_link|primary_link|secondary_link|living_street)$"]({s},{w},{n},{e});
);
out body;
>;
out skel qt;
"""

FACILITIES_QUERY = """
[out:json][timeout:60];
(
  node["amenity"="hospital"]({s},{w},{n},{e});
  way["amenity"="hospital"]({s},{w},{n},{e});
  node["amenity"="school"]({s},{w},{n},{e});
  way["amenity"="school"]({s},{w},{n},{e});
  node["leisure"="park"]({s},{w},{n},{e});
  way["leisure"="park"]({s},{w},{n},{e});
);
out center;
"""


@with_retry(max_attempts=3, min_wait=2, max_wait=15)
async def _query_overpass(query: str) -> dict:
    # Overpass API rejects requests with the default httpx User-Agent
    # (generic/anonymous clients get a 406) — send a descriptive one, as
    # their usage policy asks: https://wiki.openstreetmap.org/wiki/Overpass_API
    headers = {
        "User-Agent": "CivicAI-Lahore/1.0 (civic incident platform; contact: admin@civicai.local)",
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/x-www-form-urlencoded",
    }
    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post(settings.overpass_api_url, data={"data": query}, headers=headers)
        response.raise_for_status()
        return response.json()


def _road_type_and_weight(tags: dict) -> tuple[str, float]:
    highway = tags.get("highway", "")
    if highway in ("motorway", "motorway_link", "trunk", "trunk_link"):
        return "motorway" if "motorway" in highway else "trunk", IMPORTANCE_BY_HIGHWAY.get(highway, DEFAULT_IMPORTANCE)
    if highway in ("primary", "primary_link"):
        return "primary", IMPORTANCE_BY_HIGHWAY[highway]
    if highway in ("secondary", "secondary_link"):
        return "secondary", IMPORTANCE_BY_HIGHWAY[highway]
    if highway in ("residential", "living_street"):
        return "residential", IMPORTANCE_BY_HIGHWAY[highway]
    return DEFAULT_ROAD_TYPE, DEFAULT_IMPORTANCE


async def sync_roads(db: AsyncSession) -> int:
    s, w, n, e = bbox_tuple(settings.lahore_bbox)
    data = await _query_overpass(ROADS_QUERY.format(s=s, w=w, n=n, e=e))

    node_coords: dict[int, tuple[float, float]] = {}
    ways = []
    for el in data.get("elements", []):
        if el["type"] == "node":
            node_coords[el["id"]] = (el["lat"], el["lon"])
        elif el["type"] == "way":
            ways.append(el)

    count = 0
    for way in ways:
        osm_id = str(way["id"])
        tags = way.get("tags", {})
        road_type, weight = _road_type_and_weight(tags)
        geometry = [
            [node_coords[nid][0], node_coords[nid][1]] for nid in way.get("nodes", []) if nid in node_coords
        ]
        if not geometry:
            continue

        result = await db.execute(select(OSMRoad).where(OSMRoad.osm_id == osm_id))
        existing = result.scalar_one_or_none()
        if existing:
            existing.name = tags.get("name")
            existing.road_type = road_type
            existing.importance_weight = weight
            existing.geometry = geometry
            existing.last_synced_at = datetime.utcnow()
        else:
            db.add(
                OSMRoad(
                    osm_id=osm_id, name=tags.get("name"), road_type=road_type,
                    importance_weight=weight, geometry=geometry,
                )
            )
        count += 1

    await db.commit()
    logger.info(f"OSM roads synced: {count}")
    return count


async def sync_facilities(db: AsyncSession) -> int:
    s, w, n, e = bbox_tuple(settings.lahore_bbox)
    data = await _query_overpass(FACILITIES_QUERY.format(s=s, w=w, n=n, e=e))

    count = 0
    for el in data.get("elements", []):
        tags = el.get("tags", {})
        if tags.get("amenity") == "hospital":
            facility_type = "hospital"
        elif tags.get("amenity") == "school":
            facility_type = "school"
        elif tags.get("leisure") == "park":
            facility_type = "park"
        else:
            continue

        if el["type"] == "node":
            lat, lng = el.get("lat"), el.get("lon")
        else:  # way/relation — Overpass 'out center' gives a centroid
            center = el.get("center")
            if not center:
                continue
            lat, lng = center.get("lat"), center.get("lon")
        if lat is None or lng is None:
            continue

        osm_id = f"{el['type']}/{el['id']}"
        result = await db.execute(select(OSMFacility).where(OSMFacility.osm_id == osm_id))
        existing = result.scalar_one_or_none()
        if existing:
            existing.name = tags.get("name")
            existing.facility_type = facility_type
            existing.lat, existing.lng = lat, lng
            existing.last_synced_at = datetime.utcnow()
        else:
            db.add(
                OSMFacility(osm_id=osm_id, name=tags.get("name"), facility_type=facility_type, lat=lat, lng=lng)
            )
        count += 1

    await db.commit()
    logger.info(f"OSM facilities synced: {count}")
    return count


async def sync_all(db: AsyncSession) -> dict:
    try:
        road_count = await sync_roads(db)
    except Exception as exc:  # noqa: BLE001
        logger.error(f"Overpass roads sync failed after retries: {exc}")
        road_count = 0

    try:
        facility_count = await sync_facilities(db)
    except Exception as exc:  # noqa: BLE001
        logger.error(f"Overpass facilities sync failed after retries: {exc}")
        facility_count = 0

    return {"roads_synced": road_count, "facilities_synced": facility_count}
