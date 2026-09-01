package com.civicai.app.data.remote

import com.civicai.app.data.remote.dto.*
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.*

/**
 * 1:1 mapping to CivicAI — Lahore Urban Intelligence API Reference.
 * Every function here corresponds to one documented endpoint; see
 * API_INTEGRATION.md at the project root for the full mapping table.
 */
interface CivicAiApiService {

    // ---- Auth (§2) ----
    @POST("auth/register")
    suspend fun register(@Body body: RegisterRequest): Response<UserDto>

    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): Response<TokenResponse>

    @POST("auth/refresh")
    suspend fun refresh(@Body body: RefreshRequest): Response<TokenResponse>

    @GET("auth/me")
    suspend fun me(): Response<UserDto>

    // ---- Stage 1: Citizen reporting ----
    @Multipart
    @POST("reports")
    suspend fun createReport(
        @Part("lat") lat: RequestBody,
        @Part("lng") lng: RequestBody,
        @Part("description") description: RequestBody?,
        @Part("category") category: RequestBody?,
        @Part("image_url") imageUrl: RequestBody?,
        @Part image: MultipartBody.Part?
    ): Response<CivicReportDto>

    // ---- Stage 2: OSM data ----
    @GET("osm/roads")
    suspend fun getOsmRoads(@Query("road_type") roadType: String? = null): Response<List<OsmRoadDto>>

    @GET("osm/facilities")
    suspend fun getOsmFacilities(
        @Query("facility_type") facilityType: String? = null,
        @Query("lat") lat: Double? = null,
        @Query("lng") lng: Double? = null,
        @Query("radius_m") radiusM: Int? = null
    ): Response<List<OsmFacilityDto>>

    @POST("osm/sync")
    suspend fun syncOsm(): Response<Map<String, Int>>

    // ---- Stage 3: Urban Impact Engine ----
    @GET("incidents/{incidentId}/impact")
    suspend fun getIncidentImpact(@Path("incidentId") incidentId: String): Response<UrbanIncidentDto>

    // ---- Stage 4: Incidents ----
    @GET("incidents")
    suspend fun getIncidents(
        @Query("status") status: String? = null,
        @Query("category") category: String? = null
    ): Response<List<UrbanIncidentDto>>

    @GET("incidents/{incidentId}")
    suspend fun getIncidentDetail(@Path("incidentId") incidentId: String): Response<UrbanIncidentDto>

    // ---- Stage 5: Map data ----
    @GET("map/incidents")
    suspend fun getMapIncidents(): Response<List<MapIncidentDto>>

    @GET("map/hotspots")
    suspend fun getMapHotspots(@Query("limit") limit: Int = 10): Response<List<HotspotDto>>

    // ---- Stage 6: Weather / AQI ----
    @GET("weather/current")
    suspend fun getCurrentWeather(@Query("force_refresh") forceRefresh: Boolean = false): Response<WeatherReadingDto>

    // ---- Stage 7: AI City Assistant ----
    @POST("assistant/chat")
    suspend fun sendChatMessage(@Body body: ChatRequest): Response<ChatResponseDto>

    // ---- Stage 8: City Command Center (staff) ----
    @GET("command-center/summary")
    suspend fun getCommandCenterSummary(): Response<CommandCenterSummaryDto>

    // ---- Stage 9: Incident resolution (staff) ----
    @PATCH("incidents/{incidentId}/status")
    suspend fun updateIncidentStatus(
        @Path("incidentId") incidentId: String,
        @Body body: StatusUpdateRequest
    ): Response<UrbanIncidentDto>

    @POST("incidents/{incidentId}/resolve")
    suspend fun resolveIncident(
        @Path("incidentId") incidentId: String,
        @Body body: ResolveIncidentRequest
    ): Response<UrbanIncidentDto>

    // ---- Stage 10: Citizen report tracking ----
    @GET("reports/mine")
    suspend fun getMyReports(@Query("status") status: String? = null): Response<List<CivicReportDto>>

    @POST("reports/{reportId}/confirm")
    suspend fun confirmReport(
        @Path("reportId") reportId: String,
        @Body body: ConfirmReportRequest
    ): Response<CivicReportDto>

    // ---- Stage 11: Road closure simulation (staff) ----
    @POST("simulate/road-closure")
    suspend fun simulateRoadClosure(@Body body: RoadClosureRequest): Response<RoadClosureResultDto>
}
