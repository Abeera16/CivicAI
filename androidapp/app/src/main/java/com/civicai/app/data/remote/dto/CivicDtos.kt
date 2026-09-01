package com.civicai.app.data.remote.dto

/** Matches `civic_report` in API_REFERENCE.md §4 */
data class CivicReportDto(
    val id: String,
    val category: String,
    val description: String?,
    val image_url: String,
    val lat: Double,
    val lng: Double,
    val severity: String,
    val confidence: Double,
    val department: String,
    val ai_reasoning: String,
    val status: String,
    val incident_id: String?,
    val reporter_id: String?,
    val citizen_confirmation: String?,
    val citizen_confirmed_at: String?,
    val created_at: String
)

/** Matches `urban_incident` in API_REFERENCE.md §4 */
data class UrbanIncidentDto(
    val id: String,
    val category: String,
    val lat: Double,
    val lng: Double,
    val report_count: Int,
    val severity: String,
    val impact_score: Int,
    val impact_explanation: String,
    val impact_before: Int?,
    val impact_after: Int?,
    val status: String,
    val resolved_at: String?,
    val before_photo_url: String?,
    val after_photo_url: String?,
    val created_at: String,
    val updated_at: String,
    val reports: List<CivicReportDto>? = null // only present on GET /incidents/{id}
)

/** Lightweight pin from GET /map/incidents */
data class MapIncidentDto(
    val id: String,
    val category: String,
    val lat: Double,
    val lng: Double,
    val severity: String,
    val impact_score: Int,
    val status: String,
    val report_count: Int
)

/** Cluster from GET /map/hotspots */
data class HotspotDto(
    val label: String,
    val lat: Double,
    val lng: Double,
    val incident_count: Int,
    val avg_impact_score: Double,
    val top_category: String
)

data class OsmFacilityDto(
    val id: String,
    val osm_id: String,
    val name: String?,
    val facility_type: String, // hospital | school | park
    val lat: Double,
    val lng: Double,
    val last_synced_at: String
)

data class OsmRoadDto(
    val id: String,
    val osm_id: String,
    val name: String?,
    val road_type: String,
    val importance_weight: Double,
    val geometry: List<List<Double>>,
    val last_synced_at: String
)

data class WeatherReadingDto(
    val area: String,
    val temperature_c: Double,
    val humidity_pct: Double?,
    val rainfall_mm: Double?,
    val aqi: Int?,
    val pm2_5: Double?,
    val recorded_at: String
)

data class SeverityCountsDto(
    val low: Int,
    val medium: Int,
    val high: Int,
    val critical: Int
)

data class RecommendedActionDto(
    val incident_id: String,
    val category: String,
    val severity: String,
    val impact_score: Int,
    val department: String,
    val action: String
)

/** GET /command-center/summary (staff only) */
data class CommandCenterSummaryDto(
    val open_incident_count: Int,
    val in_progress_incident_count: Int,
    val resolved_incident_count: Int,
    val severity_counts: SeverityCountsDto,
    val top_hotspot: HotspotDto?,
    val weather: WeatherReadingDto?,
    val recommended_actions: List<RecommendedActionDto>,
    val generated_at: String
)

data class AffectedIncidentDto(
    val id: String,
    val category: String,
    val severity: String,
    val impact_score: Int
)

data class NearbyFacilityDto(
    val name: String?,
    val type: String, // hospital | school
    val lat: Double,
    val lng: Double
)

/** POST /simulate/road-closure response */
data class RoadClosureResultDto(
    val road_id: String,
    val road_name: String?,
    val road_type: String,
    val hours: Int,
    val affected_incidents: List<AffectedIncidentDto>,
    val nearby_facilities: List<NearbyFacilityDto>,
    val note: String
)

data class RoadClosureRequest(
    val road_id: String,
    val hours: Int
)

data class StatusUpdateRequest(
    val status: String // "open" | "in_progress"
)

data class ResolveIncidentRequest(
    val before_photo_url: String? = null,
    val after_photo_url: String? = null
)

data class ConfirmReportRequest(
    val confirmation: String // "still_exists" | "fixed"
)
