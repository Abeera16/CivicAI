package com.civicai.app.data.repository

import com.civicai.app.data.remote.CivicAiApiService
import com.civicai.app.data.remote.dto.*
import com.civicai.app.util.ApiResult
import com.civicai.app.util.safeApiCall

/** Stages 2, 5, 6, 8, 11 — everything that isn't reports/incidents/auth/chat. */
class CityDataRepository(private val api: CivicAiApiService) {

    // Stage 5: map
    suspend fun getMapIncidents(): ApiResult<List<MapIncidentDto>> =
        safeApiCall { api.getMapIncidents() }

    suspend fun getMapHotspots(limit: Int = 10): ApiResult<List<HotspotDto>> =
        safeApiCall { api.getMapHotspots(limit) }

    // Stage 2: OSM reference data (used as map overlays)
    suspend fun getFacilities(
        facilityType: String? = null,
        lat: Double? = null,
        lng: Double? = null,
        radiusM: Int? = null
    ): ApiResult<List<OsmFacilityDto>> =
        safeApiCall { api.getOsmFacilities(facilityType, lat, lng, radiusM) }

    suspend fun getRoads(roadType: String? = null): ApiResult<List<OsmRoadDto>> =
        safeApiCall { api.getOsmRoads(roadType) }

    // Stage 6: weather/AQI
    suspend fun getCurrentWeather(forceRefresh: Boolean = false): ApiResult<WeatherReadingDto> =
        safeApiCall { api.getCurrentWeather(forceRefresh) }

    // Stage 8: command center (staff)
    suspend fun getCommandCenterSummary(): ApiResult<CommandCenterSummaryDto> =
        safeApiCall { api.getCommandCenterSummary() }

    // Stage 11: road closure simulation (staff)
    suspend fun simulateRoadClosure(roadId: String, hours: Int): ApiResult<RoadClosureResultDto> =
        safeApiCall { api.simulateRoadClosure(RoadClosureRequest(roadId, hours)) }
}
