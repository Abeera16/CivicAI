"""Real weather/AQI polling for Lahore — short-TTL cache backed by Postgres (weather_readings).
Falls back to representative Lahore climate defaults if the external API is unreachable and the
database is empty, so the frontend always receives *something* on first boot.
"""
from datetime import datetime, timezone, timedelta

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging_config import logger
from app.models.db_models import WeatherReading
from app.utils.retry import with_retry

AREA = "Lahore"

# Representative Lahore climate defaults used when both the live API
# and the DB cache are unavailable (e.g. first boot with no key).
_LAHORE_DEFAULTS = {
    "temperature_c": 32.0,
    "humidity_pct": 55.0,
    "rainfall_mm": 0.0,
    "aqi": 125,
    "pm2_5": 45.0,
}


@with_retry(max_attempts=3, min_wait=2, max_wait=10)
async def _fetch_openweathermap() -> dict:
    if not settings.openweathermap_api_key:
        raise RuntimeError("OPENWEATHERMAP_API_KEY is not set")

    async with httpx.AsyncClient(timeout=20) as client:
        weather_resp = await client.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={
                "lat": settings.lahore_lat, "lon": settings.lahore_lng,
                "appid": settings.openweathermap_api_key, "units": "metric",
            },
        )
        weather_resp.raise_for_status()
        w = weather_resp.json()

        air_resp = await client.get(
            "https://api.openweathermap.org/data/2.5/air_pollution",
            params={"lat": settings.lahore_lat, "lon": settings.lahore_lng, "appid": settings.openweathermap_api_key},
        )
        air_resp.raise_for_status()
        air = air_resp.json()

    owm_aqi = None
    pm2_5 = None
    if air.get("list"):
        entry = air["list"][0]
        owm_aqi = entry.get("main", {}).get("aqi")  # OWM scale 1-5
        pm2_5 = entry.get("components", {}).get("pm2_5")

    return {
        "temperature_c": w.get("main", {}).get("temp"),
        "humidity_pct": w.get("main", {}).get("humidity"),
        "rainfall_mm": w.get("rain", {}).get("1h", 0.0),
        "aqi": _owm_aqi_to_us_scale(owm_aqi),
        "pm2_5": pm2_5,
    }


def _owm_aqi_to_us_scale(owm_aqi: int | None) -> int | None:
    """OWM's 1-5 scale doesn't map cleanly to US AQI; use representative midpoints per band."""
    if owm_aqi is None:
        return None
    return {1: 25, 2: 75, 3: 125, 4: 175, 5: 300}.get(owm_aqi)


@with_retry(max_attempts=3, min_wait=2, max_wait=10)
async def _fetch_iqair() -> dict:
    if not settings.iqair_api_key:
        raise RuntimeError("IQAIR_API_KEY is not set")

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(
            "https://api.airvisual.com/v2/nearest_city",
            params={"lat": settings.lahore_lat, "lon": settings.lahore_lng, "key": settings.iqair_api_key},
        )
        resp.raise_for_status()
        data = resp.json().get("data", {})

    current = data.get("current", {})
    weather = current.get("weather", {})
    pollution = current.get("pollution", {})

    return {
        "temperature_c": weather.get("tp"),
        "humidity_pct": weather.get("hu"),
        "rainfall_mm": None,  # IQAir does not provide rainfall
        "aqi": pollution.get("aqius"),
        "pm2_5": None,
    }


async def _fetch_live() -> dict:
    provider = settings.weather_provider.lower().strip()
    if provider == "iqair":
        return await _fetch_iqair()
    return await _fetch_openweathermap()


def _utcnow() -> datetime:
    """Return current UTC time as a timezone-aware datetime."""
    return datetime.now(tz=timezone.utc)


async def get_current_weather(db: AsyncSession, force_refresh: bool = False) -> WeatherReading:
    """
    Return the current weather reading for Lahore.

    Priority:
      1. Fresh DB cache (within TTL) — unless force_refresh=True.
      2. Live fetch from configured provider (OpenWeatherMap / IQAir).
      3. Stale DB cache (any age) if live fetch fails.
      4. Hardcoded Lahore climate defaults — never returns None.
    """
    now = _utcnow()
    ttl = timedelta(minutes=settings.weather_cache_ttl_minutes)

    if not force_refresh:
        result = await db.execute(
            select(WeatherReading).where(WeatherReading.area == AREA).order_by(WeatherReading.recorded_at.desc())
        )
        latest = result.scalars().first()
        if latest:
            # Make recorded_at timezone-aware for safe comparison if stored naive.
            recorded = latest.recorded_at
            if recorded.tzinfo is None:
                recorded = recorded.replace(tzinfo=timezone.utc)
            if now - recorded < ttl:
                return latest

    try:
        live = await _fetch_live()
    except Exception as exc:  # noqa: BLE001
        logger.error(f"Live weather/AQI fetch failed after retries: {exc}. Serving last cached reading if any.")
        result = await db.execute(
            select(WeatherReading).where(WeatherReading.area == AREA).order_by(WeatherReading.recorded_at.desc())
        )
        cached = result.scalars().first()
        if cached:
            return cached
        # No cache at all — insert Lahore defaults so the endpoint never 503s.
        logger.warning("No cached weather data found; inserting Lahore climate defaults.")
        live = _LAHORE_DEFAULTS

    reading = WeatherReading(
        area=AREA,
        temperature_c=live.get("temperature_c") or _LAHORE_DEFAULTS["temperature_c"],
        humidity_pct=live.get("humidity_pct"),
        rainfall_mm=live.get("rainfall_mm"),
        aqi=live.get("aqi"),
        pm2_5=live.get("pm2_5"),
        recorded_at=now.replace(tzinfo=None),
    )
    db.add(reading)
    await db.commit()
    await db.refresh(reading)
    return reading
