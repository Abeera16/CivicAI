"""Duplicate/incident detection & grouping — haversine distance only.

Cross-category embedding similarity was removed along with ChromaDB.
Same-category dedup (the common case) uses a 80m haversine radius.
Cross-category dedup uses a 150m haversine radius without semantic matching.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import CivicReport, UrbanIncident
from app.utils.geo_utils import haversine_distance_m

SAME_CATEGORY_RADIUS_M = 80
CROSS_CATEGORY_RADIUS_M = 150
SEVERITY_RANK = {"low": 1, "medium": 2, "high": 3, "critical": 4}


async def find_or_create_incident(
    db: AsyncSession, report: CivicReport
) -> tuple[UrbanIncident, bool]:
    """Attach `report` to an existing nearby open incident, or create a new one.

    Matching priority:
      1. Same category within 80m  — exact match, merged immediately.
      2. Any category within 150m  — proximity-only merge (no embedding check).
      3. No match                  — new incident created.

    Returns (incident, created_new).
    """
    result = await db.execute(select(UrbanIncident).where(UrbanIncident.status != "resolved"))
    open_incidents = result.scalars().all()

    same_category_match: UrbanIncident | None = None
    cross_category_match: UrbanIncident | None = None
    cross_category_dist = float("inf")

    for inc in open_incidents:
        dist = haversine_distance_m(report.lat, report.lng, inc.lat, inc.lng)
        if inc.category == report.category and dist <= SAME_CATEGORY_RADIUS_M:
            same_category_match = inc
            break
        if dist <= CROSS_CATEGORY_RADIUS_M and dist < cross_category_dist:
            cross_category_match = inc
            cross_category_dist = dist

    matched_incident = same_category_match or cross_category_match

    if matched_incident:
        matched_incident.report_count += 1
        if SEVERITY_RANK.get(report.severity, 0) > SEVERITY_RANK.get(matched_incident.severity, 0):
            matched_incident.severity = report.severity
        db.add(matched_incident)
        return matched_incident, False

    new_incident = UrbanIncident(
        category=report.category,
        lat=report.lat,
        lng=report.lng,
        report_count=1,
        severity=report.severity,
        status="open",
    )
    db.add(new_incident)
    await db.flush()
    return new_incident, True
