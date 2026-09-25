from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging_config import logger
from app.models.db_models import CivicReport, UrbanIncident
from app.services.classification import classify_report
from app.services.dedup import find_or_create_incident
from app.services.impact_engine import compute_impact_score


async def create_report(
    db: AsyncSession,
    lat: float,
    lng: float,
    image_url: str,
    description: str | None = None,
    category_hint: str | None = None,
    reporter_id: str | None = None,
    image_bytes: bytes | None = None,
    image_mime: str | None = None,
) -> tuple[CivicReport, UrbanIncident]:
    classification = await classify_report(
        description, image_url, category_hint, image_bytes=image_bytes, image_mime=image_mime
    )

    report = CivicReport(
        category=classification["category"],
        description=description,
        image_url=image_url,
        lat=lat,
        lng=lng,
        severity=classification["severity"],
        confidence=classification["confidence"],
        department=classification["department"],
        ai_reasoning=classification["ai_reasoning"],
        status="open",
        reporter_id=reporter_id,
    )
    db.add(report)
    await db.flush()

    incident, created = await find_or_create_incident(db, report)
    report.incident_id = incident.id

    score, explanation = await compute_impact_score(
        db,
        category=incident.category,
        severity=incident.severity,
        report_count=incident.report_count,
        lat=incident.lat,
        lng=incident.lng,
        exclude_incident_id=incident.id,
    )
    incident.impact_score = score
    incident.impact_explanation = explanation

    db.add(incident)
    await db.commit()
    await db.refresh(report)
    await db.refresh(incident)

    logger.info(
        f"Report {report.id} classified as {report.category}/{report.severity} "
        f"-> incident {incident.id} ({'new' if created else 'merged'}), impact_score={score}"
    )
    return report, incident
