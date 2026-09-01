package com.civicai.app.data.repository

import com.civicai.app.data.remote.CivicAiApiService
import com.civicai.app.data.remote.dto.ResolveIncidentRequest
import com.civicai.app.data.remote.dto.StatusUpdateRequest
import com.civicai.app.data.remote.dto.UrbanIncidentDto
import com.civicai.app.util.ApiResult
import com.civicai.app.util.safeApiCall

class IncidentsRepository(private val api: CivicAiApiService) {

    suspend fun getIncidents(status: String? = null, category: String? = null): ApiResult<List<UrbanIncidentDto>> =
        safeApiCall { api.getIncidents(status, category) }

    suspend fun getIncidentDetail(incidentId: String): ApiResult<UrbanIncidentDto> =
        safeApiCall { api.getIncidentDetail(incidentId) }

    suspend fun getIncidentImpact(incidentId: String): ApiResult<UrbanIncidentDto> =
        safeApiCall { api.getIncidentImpact(incidentId) }

    /** PATCH /incidents/{id}/status — staff only; "resolved" is rejected by the backend. */
    suspend fun updateStatus(incidentId: String, status: String): ApiResult<UrbanIncidentDto> =
        safeApiCall { api.updateIncidentStatus(incidentId, StatusUpdateRequest(status)) }

    /** POST /incidents/{id}/resolve — staff only. */
    suspend fun resolveIncident(
        incidentId: String,
        beforePhotoUrl: String?,
        afterPhotoUrl: String?
    ): ApiResult<UrbanIncidentDto> =
        safeApiCall { api.resolveIncident(incidentId, ResolveIncidentRequest(beforePhotoUrl, afterPhotoUrl)) }
}
