"""Shared geospatial helpers. Plain lat/lng haversine — no PostGIS (see project decision)."""
import math

EARTH_RADIUS_M = 6_371_000


def haversine_distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in meters between two lat/lng points."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)

    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_M * c


def is_within_radius(lat1: float, lng1: float, lat2: float, lng2: float, radius_m: float) -> bool:
    return haversine_distance_m(lat1, lng1, lat2, lng2) <= radius_m


def point_to_polyline_min_distance_m(lat: float, lng: float, points: list[list[float]]) -> float:
    """Approximate min distance from a point to a polyline, using nearest-vertex haversine.

    Good enough at city-block scale for MVP road-proximity scoring — avoids pulling in a full
    geometry/projection library for a hackathon-scale dataset.
    """
    if not points:
        return float("inf")
    return min(haversine_distance_m(lat, lng, p[0], p[1]) for p in points)


def bbox_tuple(bbox_str: str) -> tuple[float, float, float, float]:
    """Parse 'south,west,north,east' string into a tuple of floats."""
    parts = [float(x.strip()) for x in bbox_str.split(",")]
    if len(parts) != 4:
        raise ValueError(f"Invalid bbox string: {bbox_str}")
    return parts[0], parts[1], parts[2], parts[3]
