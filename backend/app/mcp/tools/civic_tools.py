"""Lahore Urban Intelligence MCP tools — exact signatures per project spec.

Each tool opens its own short-lived DB session since MCP tools are called outside
FastAPI's request-scoped dependency injection.
"""
from datetime import datetime

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.db_models import CivicReport, UrbanIncident, WeatherReading
from app.services import hotspots as hotspots_service
from app.services import simulation as simulation_service
from app.services import weather_sync


async def get_civic_reports(
    category: str | None = None,
    severity: str | None = None,
    status: str | None = None,
    since: str | None = None,
) -> list[dict]:
    """Returns civic_reports matching filters, most recent first, max 50."""
    async with AsyncSessionLocal() as db:
        query = select(CivicReport)
        if category:
            query = query.where(CivicReport.category == category)
        if severity:
            query = query.where(CivicReport.severity == severity)
        if status:
            query = query.where(CivicReport.status == status)
        if since:
            try:
                since_dt = datetime.fromisoformat(since)
                query = query.where(CivicReport.created_at >= since_dt)
            except ValueError:
                pass
        query = query.order_by(CivicReport.created_at.desc()).limit(50)

        result = await db.execute(query)
        reports = result.scalars().all()
        return [
            {
                "id": r.id, "category": r.category, "description": r.description,
                "lat": r.lat, "lng": r.lng, "severity": r.severity, "confidence": r.confidence,
                "department": r.department, "status": r.status, "incident_id": r.incident_id,
                "created_at": r.created_at.isoformat(),
            }
            for r in reports
        ]


async def get_urban_impact(incident_id: str) -> dict:
    """Returns the urban_incident record including score, explanation, and grouped report count."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(UrbanIncident).where(UrbanIncident.id == incident_id))
        incident = result.scalar_one_or_none()
        if not incident:
            return {"error": f"No urban_incident found with id={incident_id}"}
        return {
            "id": incident.id, "category": incident.category, "lat": incident.lat, "lng": incident.lng,
            "report_count": incident.report_count, "severity": incident.severity,
            "impact_score": incident.impact_score, "impact_explanation": incident.impact_explanation,
            "status": incident.status,
        }


async def get_hotspots(limit: int = 10) -> list[dict]:
    """Returns top zones by clustered incident density/impact, each with a label, lat/lng center, and incident_count."""
    async with AsyncSessionLocal() as db:
        return await hotspots_service.get_hotspots(db, limit=limit)


async def get_risk_score(lat: float, lng: float, radius_m: int = 500) -> dict:
    """Returns aggregate risk for an area: avg impact_score of open incidents within radius, incident_count, top category."""
    async with AsyncSessionLocal() as db:
        return await hotspots_service.get_risk_score(db, lat=lat, lng=lng, radius_m=radius_m)


async def get_weather_aqi(area: str = "Lahore") -> dict:
    """Returns latest weather_readings row for the area."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(WeatherReading).where(WeatherReading.area == area).order_by(WeatherReading.recorded_at.desc())
        )
        reading = result.scalars().first()
        if not reading:
            reading = await weather_sync.get_current_weather(db)
        if not reading:
            return {"error": f"No weather data available for {area} yet"}
        return {
            "area": reading.area, "temperature_c": reading.temperature_c, "humidity_pct": reading.humidity_pct,
            "rainfall_mm": reading.rainfall_mm, "aqi": reading.aqi, "pm2_5": reading.pm2_5,
            "recorded_at": reading.recorded_at.isoformat(),
        }


async def simulate_road_closure(road_id: str, hours: int) -> dict:
    """Returns: affected open incidents within 300m of the road geometry, nearby hospitals/schools within 1km,
    and a rough estimated impact note. Simplified radius-based logic, not real routing - acceptable for MVP."""
    async with AsyncSessionLocal() as db:
        return await simulation_service.simulate_road_closure(db, road_id=road_id, hours=hours)
