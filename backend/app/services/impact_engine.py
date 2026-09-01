"""Urban Impact Score engine — explainable weighted scoring, no ML training (see project scope)."""
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import OSMFacility, OSMRoad, UrbanIncident, WeatherReading
from app.utils.geo_utils import haversine_distance_m, point_to_polyline_min_distance_m

SEVERITY_SCORES = {"low": 20, "medium": 45, "high": 70, "critical": 95}

W_SEVERITY = 0.35
W_REPORT_COUNT = 0.20
W_ROAD_PROXIMITY = 0.20
W_FACILITY_PROXIMITY = 0.15
W_RECURRENCE = 0.10

ROAD_PROXIMITY_RADIUS_M = 100
FACILITY_NEAR_M = 500
FACILITY_FAR_M = 2000
RECURRENCE_RADIUS_M = 150
FLOOD_RAIN_THRESHOLD_MM = 10
FLOOD_RAIN_WINDOW_HOURS = 6
FLOOD_MULTIPLIER = 1.15


async def _nearest_road_importance(db: AsyncSession, lat: float, lng: float) -> tuple[float, str | None]:
    result = await db.execute(select(OSMRoad))
    roads = result.scalars().all()

    best_weight, best_name, best_dist = 0.0, None, float("inf")
    for road in roads:
        dist = point_to_polyline_min_distance_m(lat, lng, road.geometry or [])
        if dist <= ROAD_PROXIMITY_RADIUS_M and dist < best_dist:
            best_dist, best_weight, best_name = dist, road.importance_weight, road.name
    return best_weight, best_name


async def _nearest_facility(db: AsyncSession, lat: float, lng: float) -> tuple[float, dict | None]:
    result = await db.execute(
        select(OSMFacility).where(OSMFacility.facility_type.in_(["hospital", "school"]))
    )
    facilities = result.scalars().all()

    best_score, best_info, best_dist = 0.0, None, float("inf")
    for f in facilities:
        dist = haversine_distance_m(lat, lng, f.lat, f.lng)
        if dist < best_dist:
            best_dist = dist
            best_info = {"name": f.name, "type": f.facility_type, "distance_m": round(dist)}
    if best_dist <= FACILITY_NEAR_M:
        best_score = 100.0
    elif best_dist < FACILITY_FAR_M:
        best_score = 100.0 * (1 - (best_dist - FACILITY_NEAR_M) / (FACILITY_FAR_M - FACILITY_NEAR_M))
    else:
        best_score = 0.0
    return max(best_score, 0.0), best_info


async def _recurrence_count(db: AsyncSession, lat: float, lng: float, exclude_id: str | None) -> int:
    result = await db.execute(select(UrbanIncident).where(UrbanIncident.status == "resolved"))
    resolved = result.scalars().all()
    count = 0
    for inc in resolved:
        if exclude_id and inc.id == exclude_id:
            continue
        if haversine_distance_m(lat, lng, inc.lat, inc.lng) <= RECURRENCE_RADIUS_M:
            count += 1
    return count


async def _flood_multiplier_applies(db: AsyncSession, category: str) -> bool:
    if category != "flooding":
        return False
    result = await db.execute(
        select(WeatherReading).where(WeatherReading.area == "Lahore").order_by(WeatherReading.recorded_at.desc())
    )
    latest = result.scalars().first()
    if not latest or latest.rainfall_mm is None:
        return False
    if latest.recorded_at < datetime.utcnow() - timedelta(hours=FLOOD_RAIN_WINDOW_HOURS):
        return False
    return latest.rainfall_mm > FLOOD_RAIN_THRESHOLD_MM


async def compute_impact_score(
    db: AsyncSession,
    category: str,
    severity: str,
    report_count: int,
    lat: float,
    lng: float,
    exclude_incident_id: str | None = None,
) -> tuple[int, str]:
    """Returns (impact_score 0-100, one-sentence explanation)."""
    severity_score = SEVERITY_SCORES.get(severity, 45)
    report_count_score = min(report_count * 8, 100)
    road_weight, road_name = await _nearest_road_importance(db, lat, lng)
    road_proximity_score = road_weight * 100
    facility_score, facility_info = await _nearest_facility(db, lat, lng)
    recurrence_n = await _recurrence_count(db, lat, lng, exclude_incident_id)
    recurrence_score = min(recurrence_n * 15, 100)

    raw = (
        severity_score * W_SEVERITY
        + report_count_score * W_REPORT_COUNT
        + road_proximity_score * W_ROAD_PROXIMITY
        + facility_score * W_FACILITY_PROXIMITY
        + recurrence_score * W_RECURRENCE
    )

    if await _flood_multiplier_applies(db, category):
        raw *= FLOOD_MULTIPLIER

    score = max(0, min(100, round(raw)))
    explanation = _build_explanation(severity, road_name, road_proximity_score, facility_info, recurrence_n, score)
    return score, explanation


async def compute_post_resolution_score(
    db: AsyncSession, category: str, report_count: int, lat: float, lng: float, incident_id: str,
) -> tuple[int, str]:
    """impact_after: residual location risk once the acute issue is fixed.

    Reuses the same formula/weights (no bespoke scoring logic) but with severity floored to
    "low", since the reported problem itself is resolved — this isolates how much of the
    original score was location risk (busy road / near a hospital / recurring spot) versus
    the acute severity that intervention removed.
    """
    return await compute_impact_score(
        db, category=category, severity="low", report_count=report_count,
        lat=lat, lng=lng, exclude_incident_id=incident_id,
    )


def _build_explanation(
    severity: str,
    road_name: str | None,
    road_proximity_score: float,
    facility_info: dict | None,
    recurrence_n: int,
    score: int,
) -> str:
    level = "High impact" if score >= 70 else "Moderate impact" if score >= 40 else "Low impact"
    factors = [f"{severity} severity"]

    if road_proximity_score >= 50 and road_name:
        factors.append(f"on {road_name}")
    elif road_proximity_score >= 50:
        factors.append("on a major road")

    if facility_info and facility_info["distance_m"] <= FACILITY_NEAR_M:
        factors.append(f"{facility_info['distance_m']}m from a {facility_info['type']}")

    if recurrence_n >= 2 and len(factors) < 3:
        factors.append(f"a recurring problem area ({recurrence_n} past incidents nearby)")

    return f"{level}: {', '.join(factors[:2])}."
