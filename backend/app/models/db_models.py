import uuid
from datetime import datetime

from sqlalchemy import String, Text, ForeignKey, DateTime, Boolean, JSON, Float, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    full_name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="citizen", index=True)  # citizen | staff
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    conversations: Mapped[list["Conversation"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(500), default="New conversation")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="conversations")
    messages: Mapped[list["Message"]] = relationship(back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(20))  # user | assistant | system
    content: Mapped[str] = mapped_column(Text)
    agent_trace: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    citations: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")


class GovDocument(Base):
    """Metadata record of a scraped government document (content itself lives in ChromaDB)."""
    __tablename__ = "gov_documents"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    source_url: Mapped[str] = mapped_column(String(1000), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(500))
    category: Mapped[str] = mapped_column(String(100), index=True)
    checksum: Mapped[str] = mapped_column(String(64))
    last_scraped_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    chunk_count: Mapped[int] = mapped_column(default=0)


# ============================================================
# Lahore Urban Intelligence
# ============================================================

class CivicReport(Base):
    """Raw citizen submission — one report of one problem at one point in time."""
    __tablename__ = "civic_reports"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    category: Mapped[str] = mapped_column(String(50), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str] = mapped_column(String(1000))
    lat: Mapped[float] = mapped_column(Float, index=True)
    lng: Mapped[float] = mapped_column(Float, index=True)
    severity: Mapped[str] = mapped_column(String(20))
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    department: Mapped[str] = mapped_column(String(50))
    ai_reasoning: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="open", index=True)
    incident_id: Mapped[str | None] = mapped_column(
        ForeignKey("urban_incidents.id", ondelete="SET NULL"), nullable=True, index=True
    )
    reporter_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # Stage 10 (Pass 2): citizen verification of their own report's real-world state.
    citizen_confirmation: Mapped[str | None] = mapped_column(String(20), nullable=True)  # still_exists | fixed
    citizen_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    incident: Mapped["UrbanIncident"] = relationship(back_populates="reports")


class UrbanIncident(Base):
    """Deduplicated grouping of one or more civic_reports at (roughly) one location."""
    __tablename__ = "urban_incidents"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    category: Mapped[str] = mapped_column(String(50), index=True)
    lat: Mapped[float] = mapped_column(Float, index=True)
    lng: Mapped[float] = mapped_column(Float, index=True)
    report_count: Mapped[int] = mapped_column(Integer, default=1)
    severity: Mapped[str] = mapped_column(String(20))
    impact_score: Mapped[int] = mapped_column(Integer, default=0, index=True)
    impact_explanation: Mapped[str] = mapped_column(Text, default="")
    impact_before: Mapped[int | None] = mapped_column(Integer, nullable=True)
    impact_after: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="open", index=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    before_photo_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    after_photo_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    reports: Mapped[list["CivicReport"]] = relationship(back_populates="incident")


class OSMRoad(Base):
    __tablename__ = "osm_roads"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    osm_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    road_type: Mapped[str] = mapped_column(String(30), index=True)
    importance_weight: Mapped[float] = mapped_column(Float, default=0.1)
    geometry: Mapped[list] = mapped_column(JSON)  # list of [lat, lng]
    last_synced_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class OSMFacility(Base):
    __tablename__ = "osm_facilities"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    osm_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    facility_type: Mapped[str] = mapped_column(String(30), index=True)
    lat: Mapped[float] = mapped_column(Float, index=True)
    lng: Mapped[float] = mapped_column(Float, index=True)
    last_synced_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class WeatherReading(Base):
    __tablename__ = "weather_readings"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    area: Mapped[str] = mapped_column(String(100), default="Lahore", index=True)
    temperature_c: Mapped[float] = mapped_column(Float)
    humidity_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    rainfall_mm: Mapped[float | None] = mapped_column(Float, nullable=True)
    aqi: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pm2_5: Mapped[float | None] = mapped_column(Float, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
