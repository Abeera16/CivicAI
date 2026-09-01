"""What-if road closure simulation. Simplified radius-based logic, not real routing (MVP-acceptable)."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import OSMFacility, OSMRoad, UrbanIncident
from app.utils.geo_utils import haversine_distance_m, point_to_polyline_min_distance_m

AFFECTED_INCIDENT_RADIUS_M = 300
NEARBY_FACILITY_RADIUS_M = 1000


async def simulate_road_closure(db: AsyncSession, road_id: str, hours: int) -> dict:
    result = await db.execute(select(OSMRoad).where(OSMRoad.osm_id == road_id))
    road = result.scalar_one_or_none()
    if not road:
        return {"error": f"No OSM road found with osm_id={road_id}"}

    geometry = road.geometry or []

    inc_result = await db.execute(select(UrbanIncident).where(UrbanIncident.status != "resolved"))
    affected_incidents = [
        inc for inc in inc_result.scalars().all()
        if point_to_polyline_min_distance_m(inc.lat, inc.lng, geometry) <= AFFECTED_INCIDENT_RADIUS_M
    ]

    fac_result = await db.execute(
        select(OSMFacility).where(OSMFacility.facility_type.in_(["hospital", "school"]))
    )
    nearby_facilities = [
        f for f in fac_result.scalars().all()
        if point_to_polyline_min_distance_m(f.lat, f.lng, geometry) <= NEARBY_FACILITY_RADIUS_M
    ]

    hospital_count = sum(1 for f in nearby_facilities if f.facility_type == "hospital")
    note = (
        f"Closing {road.name or road.osm_id} ({road.road_type}, importance "
        f"{road.importance_weight:.1f}) for {hours}h would detour traffic around "
        f"{len(affected_incidents)} open incident(s) and affect access to {len(nearby_facilities)} "
        f"nearby facilit{'y' if len(nearby_facilities) == 1 else 'ies'}"
        f"{f', including {hospital_count} hospital(s) — high caution advised' if hospital_count else ''}."
    )

    return {
        "road_id": road_id,
        "road_name": road.name,
        "road_type": road.road_type,
        "hours": hours,
        "affected_incidents": [
            {"id": i.id, "category": i.category, "severity": i.severity, "impact_score": i.impact_score}
            for i in affected_incidents
        ],
        "nearby_facilities": [
            {"name": f.name, "type": f.facility_type, "lat": f.lat, "lng": f.lng} for f in nearby_facilities
        ],
        "note": note,
    }
