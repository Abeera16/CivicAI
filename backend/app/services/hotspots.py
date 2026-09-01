"""Hotspot clustering and area risk aggregation.

Stage 12 (Pass 2): DBSCAN-style density clustering — incidents are linked into the same
hotspot whenever they're within EPS_M of *any* other member of the cluster (chained
connectivity), not just of one shared grid cell. This fixes the grid-bucket MVP's main flaw:
two incidents 20m apart on either side of a grid boundary used to land in separate hotspots.
Implemented by hand (haversine-based region growing, minPts=1) rather than pulling in
scikit-learn — city-scale incident counts make the O(n^2) neighbor scan cheap, and every
incident still ends up in some hotspot (no "noise" points dropped), matching Pass 1 behavior.
"""
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import UrbanIncident
from app.utils.geo_utils import haversine_distance_m

EPS_M = 250  # cluster radius: incidents within this distance of a cluster member join it


def _cluster_indices(incidents: list[UrbanIncident], eps_m: float = EPS_M) -> list[list[int]]:
    n = len(incidents)
    visited = [False] * n
    clusters: list[list[int]] = []

    for start in range(n):
        if visited[start]:
            continue
        visited[start] = True
        cluster = [start]
        frontier = [start]
        while frontier:
            cur = frontier.pop()
            for j in range(n):
                if visited[j]:
                    continue
                if haversine_distance_m(
                    incidents[cur].lat, incidents[cur].lng, incidents[j].lat, incidents[j].lng
                ) <= eps_m:
                    visited[j] = True
                    cluster.append(j)
                    frontier.append(j)
        clusters.append(cluster)

    return clusters


async def get_hotspots(db: AsyncSession, limit: int = 10) -> list[dict]:
    result = await db.execute(select(UrbanIncident).where(UrbanIncident.status != "resolved"))
    incidents = result.scalars().all()
    if not incidents:
        return []

    hotspots = []
    for indices in _cluster_indices(incidents):
        incs = [incidents[i] for i in indices]
        avg_lat = sum(i.lat for i in incs) / len(incs)
        avg_lng = sum(i.lng for i in incs) / len(incs)
        avg_impact = sum(i.impact_score for i in incs) / len(incs)
        category_counts: dict[str, int] = defaultdict(int)
        for i in incs:
            category_counts[i.category] += 1
        top_category = max(category_counts, key=category_counts.get)

        hotspots.append(
            {
                "label": f"{top_category.replace('_', ' ').title()} cluster ({len(incs)} incidents)",
                "lat": round(avg_lat, 6),
                "lng": round(avg_lng, 6),
                "incident_count": len(incs),
                "avg_impact_score": round(avg_impact, 1),
                "top_category": top_category,
            }
        )

    hotspots.sort(key=lambda h: (h["incident_count"], h["avg_impact_score"]), reverse=True)
    return hotspots[:limit]


async def get_risk_score(db: AsyncSession, lat: float, lng: float, radius_m: int = 500) -> dict:
    result = await db.execute(select(UrbanIncident).where(UrbanIncident.status != "resolved"))
    incidents = result.scalars().all()

    nearby = [i for i in incidents if haversine_distance_m(lat, lng, i.lat, i.lng) <= radius_m]
    if not nearby:
        return {"lat": lat, "lng": lng, "radius_m": radius_m, "avg_impact_score": 0.0,
                "incident_count": 0, "top_category": None}

    avg_impact = sum(i.impact_score for i in nearby) / len(nearby)
    category_counts = defaultdict(int)
    for i in nearby:
        category_counts[i.category] += 1
    top_category = max(category_counts, key=category_counts.get)

    return {
        "lat": lat, "lng": lng, "radius_m": radius_m,
        "avg_impact_score": round(avg_impact, 1),
        "incident_count": len(nearby),
        "top_category": top_category,
    }
