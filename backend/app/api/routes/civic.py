"""Lahore Urban Intelligence — citizen reporting, incidents, and map data endpoints."""
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt_handler import get_current_staff_user, get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.logging_config import logger
from app.models.civic_schemas import (
    CONFIRMATIONS,
    STATUSES,
    Hotspot,
    IncidentDetail,
    IncidentOut,
    IncidentResolve,
    IncidentStatusUpdate,
    MapIncident,
    ReportConfirm,
    ReportOut,
    RoadClosureOut,
    RoadClosureRequest,
)
from app.models.db_models import CivicReport, UrbanIncident, User
from app.services import hotspots as hotspots_service
from app.services import simulation as simulation_service
from app.services.impact_engine import compute_post_resolution_score
from app.services.reports import create_report

router = APIRouter(tags=["civic"])

MEDIA_DIR = Path(__file__).resolve().parents[3] / "media" / "reports"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}


def _r2_client():
    """Lazily build a boto3 S3-compatible client pointed at Cloudflare R2."""
    import boto3

    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
    )


async def _save_uploaded_image(image: UploadFile) -> str:
    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported image type: {image.content_type}")
    ext = Path(image.filename or "upload.jpg").suffix or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    contents = await image.read()

    if settings.r2_bucket_name:
        # Persistent storage — survives redeploys. Upload runs in a thread so
        # the boto3 (blocking) call doesn't block the async event loop.
        client = _r2_client()
        await run_in_threadpool(
            client.put_object,
            Bucket=settings.r2_bucket_name,
            Key=f"reports/{filename}",
            Body=contents,
            ContentType=image.content_type,
        )
        return f"{settings.r2_public_url.rstrip('/')}/reports/{filename}"

    # Fallback: local disk (dev only — wiped on every Render redeploy)
    dest = MEDIA_DIR / filename
    dest.write_bytes(contents)
    return f"/media/reports/{filename}"


@router.post("/reports", response_model=ReportOut, status_code=201)
async def submit_report(
    lat: float = Form(...),
    lng: float = Form(...),
    description: str | None = Form(None),
    category: str | None = Form(None),
    image_url: str | None = Form(None),
    image: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not image and not image_url:
        raise HTTPException(status_code=400, detail="Provide either an image upload or an image_url")

    resolved_image_url = await _save_uploaded_image(image) if image else image_url

    try:
        report, _incident = await create_report(
            db, lat=lat, lng=lng, image_url=resolved_image_url, description=description,
            category_hint=category, reporter_id=current_user.id,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Report creation failed")
        raise HTTPException(status_code=500, detail="Could not process report") from exc

    return report


@router.get("/reports/mine", response_model=list[ReportOut])
async def my_reports(
    status: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(CivicReport).where(CivicReport.reporter_id == current_user.id)
    if status:
        query = query.where(CivicReport.status == status)
    query = query.order_by(CivicReport.created_at.desc())

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/reports/{report_id}/confirm", response_model=ReportOut)
async def confirm_report(
    report_id: str,
    payload: ReportConfirm,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.confirmation not in CONFIRMATIONS:
        raise HTTPException(status_code=400, detail=f"confirmation must be one of {sorted(CONFIRMATIONS)}")

    result = await db.execute(select(CivicReport).where(CivicReport.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.reporter_id != current_user.id and current_user.role != "staff":
        raise HTTPException(status_code=403, detail="You can only confirm your own reports")

    report.citizen_confirmation = payload.confirmation
    report.citizen_confirmed_at = datetime.utcnow()
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report


@router.get("/incidents", response_model=list[IncidentOut])
async def list_incidents(
    status: str | None = None,
    category: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(UrbanIncident)
    if status:
        query = query.where(UrbanIncident.status == status)
    if category:
        query = query.where(UrbanIncident.category == category)
    query = query.order_by(UrbanIncident.updated_at.desc())

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/incidents/{incident_id}", response_model=IncidentDetail)
async def get_incident(incident_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UrbanIncident).where(UrbanIncident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    await db.refresh(incident, attribute_names=["reports"])
    return incident


@router.get("/incidents/{incident_id}/impact", response_model=IncidentOut)
async def get_incident_impact(incident_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UrbanIncident).where(UrbanIncident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.patch("/incidents/{incident_id}/status", response_model=IncidentOut)
async def update_incident_status(
    incident_id: str,
    payload: IncidentStatusUpdate,
    current_user: User = Depends(get_current_staff_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.status not in STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of {sorted(STATUSES)}")
    if payload.status == "resolved":
        raise HTTPException(
            status_code=400,
            detail="Use POST /incidents/{id}/resolve to resolve an incident (records before/after photos and impact_after)",
        )

    result = await db.execute(select(UrbanIncident).where(UrbanIncident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    if incident.status == "resolved" and payload.status != "resolved":
        # Reopening — start a fresh resolution cycle.
        incident.resolved_at = None
        incident.impact_before = None
        incident.impact_after = None
        incident.before_photo_url = None
        incident.after_photo_url = None
        for report in (await db.execute(select(CivicReport).where(CivicReport.incident_id == incident.id))).scalars():
            report.status = payload.status
            db.add(report)

    if payload.status == "in_progress" and incident.impact_before is None:
        incident.impact_before = incident.impact_score

    incident.status = payload.status
    db.add(incident)
    await db.commit()
    await db.refresh(incident)
    return incident


@router.post("/incidents/{incident_id}/resolve", response_model=IncidentOut)
async def resolve_incident(
    incident_id: str,
    payload: IncidentResolve,
    current_user: User = Depends(get_current_staff_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(UrbanIncident).where(UrbanIncident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    if incident.impact_before is None:
        incident.impact_before = incident.impact_score
    if payload.before_photo_url:
        incident.before_photo_url = payload.before_photo_url
    if payload.after_photo_url:
        incident.after_photo_url = payload.after_photo_url

    impact_after, _explanation = await compute_post_resolution_score(
        db, category=incident.category, report_count=incident.report_count,
        lat=incident.lat, lng=incident.lng, incident_id=incident.id,
    )
    incident.impact_after = impact_after
    incident.status = "resolved"
    incident.resolved_at = datetime.utcnow()
    db.add(incident)

    reports_result = await db.execute(select(CivicReport).where(CivicReport.incident_id == incident.id))
    for report in reports_result.scalars():
        report.status = "resolved"
        db.add(report)

    await db.commit()
    await db.refresh(incident)
    logger.info(f"Incident {incident.id} resolved: impact {incident.impact_before} -> {incident.impact_after}")
    return incident


@router.get("/map/incidents", response_model=list[MapIncident])
async def map_incidents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UrbanIncident).where(UrbanIncident.status != "resolved"))
    incidents = result.scalars().all()
    return [
        MapIncident(
            id=i.id, category=i.category, lat=i.lat, lng=i.lng, severity=i.severity,
            impact_score=i.impact_score, status=i.status, report_count=i.report_count,
        )
        for i in incidents
    ]


@router.get("/map/hotspots", response_model=list[Hotspot])
async def map_hotspots(limit: int = 10, db: AsyncSession = Depends(get_db)):
    hotspots = await hotspots_service.get_hotspots(db, limit=limit)
    return [Hotspot(**h) for h in hotspots]


@router.post("/simulate/road-closure", response_model=RoadClosureOut)
async def simulate_road_closure(
    payload: RoadClosureRequest,
    current_user: User = Depends(get_current_staff_user),
    db: AsyncSession = Depends(get_db),
):
    """REST wrapper around the same logic the `simulate_road_closure` MCP tool uses (Stage 7)."""
    result = await simulation_service.simulate_road_closure(db, road_id=payload.road_id, hours=payload.hours)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result
