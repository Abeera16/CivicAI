"""City Command Center summary — pre-aggregated snapshot for a staff dashboard.

Powers GET /command-center/summary: severity breakdown, the top hotspot, current
weather/AQI, and a recommended-action feed. The feed is template-generated from the
highest-impact open incidents (same "explainable, no ML" philosophy as the impact engine
and Citation Agent) rather than an LLM call, so the endpoint stays fast and deterministic
for a live dashboard.
"""
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import UrbanIncident
from app.services import hotspots as hotspots_service
from app.services import weather_sync
from app.services.classification import DEPARTMENT_BY_CATEGORY

RECOMMENDED_ACTIONS_LIMIT = 5


async def _department_for(category: str) -> str:
    return DEPARTMENT_BY_CATEGORY.get(category, "municipal_services")


def _build_action_text(incident: UrbanIncident, department: str) -> str:
    dept_label = department.replace("_", " ")
    category_label = incident.category.replace("_", " ")
    return (
        f"Dispatch {dept_label} to the {category_label} incident "
        f"({incident.severity} severity, impact {incident.impact_score}, "
        f"{incident.report_count} report{'s' if incident.report_count != 1 else ''})."
    )


async def get_summary(db: AsyncSession) -> dict:
    result = await db.execute(select(UrbanIncident))
    all_incidents = result.scalars().all()

    open_incidents = [i for i in all_incidents if i.status == "open"]
    in_progress_incidents = [i for i in all_incidents if i.status == "in_progress"]
    resolved_incidents = [i for i in all_incidents if i.status == "resolved"]

    severity_counts = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    for i in open_incidents + in_progress_incidents:
        if i.severity in severity_counts:
            severity_counts[i.severity] += 1

    hotspots = await hotspots_service.get_hotspots(db, limit=1)
    top_hotspot = hotspots[0] if hotspots else None

    weather_reading = await weather_sync.get_current_weather(db)
    weather = (
        {
            "area": weather_reading.area,
            "temperature_c": weather_reading.temperature_c,
            "humidity_pct": weather_reading.humidity_pct,
            "rainfall_mm": weather_reading.rainfall_mm,
            "aqi": weather_reading.aqi,
            "pm2_5": weather_reading.pm2_5,
            "recorded_at": weather_reading.recorded_at,
        }
        if weather_reading
        else None
    )

    actionable = sorted(open_incidents, key=lambda i: i.impact_score, reverse=True)
    recommended_actions = []
    for incident in actionable[:RECOMMENDED_ACTIONS_LIMIT]:
        department = await _department_for(incident.category)
        recommended_actions.append(
            {
                "incident_id": incident.id,
                "category": incident.category,
                "severity": incident.severity,
                "impact_score": incident.impact_score,
                "department": department,
                "action": _build_action_text(incident, department),
            }
        )

    return {
        "open_incident_count": len(open_incidents),
        "in_progress_incident_count": len(in_progress_incidents),
        "resolved_incident_count": len(resolved_incidents),
        "severity_counts": severity_counts,
        "top_hotspot": top_hotspot,
        "weather": weather,
        "recommended_actions": recommended_actions,
        "generated_at": datetime.utcnow(),
    }
