from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

CATEGORIES = {"pothole", "flooding", "waste", "streetlight", "water_leak", "road_damage", "other"}
SEVERITIES = {"low", "medium", "high", "critical"}
STATUSES = {"open", "in_progress", "resolved"}
DEPARTMENTS = {
    "road_maintenance", "drainage", "waste_management", "municipal_services", "water_sanitation",
}
FACILITY_TYPES = {"hospital", "school", "park"}
CONFIRMATIONS = {"still_exists", "fixed"}


# ---------- Reports ----------
class ReportCreate(BaseModel):
    lat: float
    lng: float
    description: Optional[str] = None
    image_url: Optional[str] = Field(None, description="Used if no file is uploaded in the multipart body")
    category: Optional[str] = Field(None, description="Optional hint; AI classification is authoritative")


class ReportOut(BaseModel):
    id: str
    category: str
    description: Optional[str]
    image_url: str
    lat: float
    lng: float
    severity: str
    confidence: float
    department: str
    ai_reasoning: str
    status: str
    incident_id: Optional[str]
    reporter_id: Optional[str]
    citizen_confirmation: Optional[str] = None
    citizen_confirmed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ReportConfirm(BaseModel):
    confirmation: str = Field(description="still_exists | fixed")


# ---------- Incidents ----------
class IncidentOut(BaseModel):
    id: str
    category: str
    lat: float
    lng: float
    report_count: int
    severity: str
    impact_score: int
    impact_explanation: str
    impact_before: Optional[int]
    impact_after: Optional[int]
    status: str
    resolved_at: Optional[datetime]
    before_photo_url: Optional[str]
    after_photo_url: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class IncidentDetail(IncidentOut):
    reports: list[ReportOut] = []


class IncidentStatusUpdate(BaseModel):
    status: str = Field(description="open | in_progress | resolved")


class IncidentResolve(BaseModel):
    before_photo_url: Optional[str] = None
    after_photo_url: Optional[str] = None


# ---------- Map ----------
class MapIncident(BaseModel):
    id: str
    category: str
    lat: float
    lng: float
    severity: str
    impact_score: int
    status: str
    report_count: int


class Hotspot(BaseModel):
    label: str
    lat: float
    lng: float
    incident_count: int
    avg_impact_score: float
    top_category: str


# ---------- OSM ----------
class OSMRoadOut(BaseModel):
    id: str
    osm_id: str
    name: Optional[str]
    road_type: str
    importance_weight: float
    geometry: list
    last_synced_at: datetime

    class Config:
        from_attributes = True


class OSMFacilityOut(BaseModel):
    id: str
    osm_id: str
    name: Optional[str]
    facility_type: str
    lat: float
    lng: float
    last_synced_at: datetime

    class Config:
        from_attributes = True


# ---------- Weather ----------
class WeatherOut(BaseModel):
    area: str
    temperature_c: float
    humidity_pct: Optional[float]
    rainfall_mm: Optional[float]
    aqi: Optional[int]
    pm2_5: Optional[float]
    recorded_at: datetime

    class Config:
        from_attributes = True


# ---------- Assistant ----------
class AssistantChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: Optional[str] = None


class AssistantChatResponse(BaseModel):
    conversation_id: Optional[str]
    answer: str
    citations: list[dict] = []
    agent_trace: list[dict] = []


# ---------- Risk / simulation ----------
class RiskScoreOut(BaseModel):
    lat: float
    lng: float
    radius_m: int
    avg_impact_score: float
    incident_count: int
    top_category: Optional[str]


class RoadClosureRequest(BaseModel):
    road_id: str
    hours: int = Field(gt=0, le=168)


class AffectedIncident(BaseModel):
    id: str
    category: str
    severity: str
    impact_score: int


class NearbyFacility(BaseModel):
    name: Optional[str]
    type: str
    lat: float
    lng: float


class RoadClosureOut(BaseModel):
    road_id: str
    road_name: Optional[str]
    road_type: str
    hours: int
    affected_incidents: list[AffectedIncident]
    nearby_facilities: list[NearbyFacility]
    note: str


# ---------- Command Center (Pass 2 / Stage 8) ----------
class SeverityCounts(BaseModel):
    low: int = 0
    medium: int = 0
    high: int = 0
    critical: int = 0


class RecommendedAction(BaseModel):
    incident_id: str
    category: str
    severity: str
    impact_score: int
    department: str
    action: str


class CommandCenterSummary(BaseModel):
    open_incident_count: int
    in_progress_incident_count: int
    resolved_incident_count: int
    severity_counts: SeverityCounts
    top_hotspot: Optional[Hotspot]
    weather: Optional[WeatherOut]
    recommended_actions: list[RecommendedAction]
    generated_at: datetime
