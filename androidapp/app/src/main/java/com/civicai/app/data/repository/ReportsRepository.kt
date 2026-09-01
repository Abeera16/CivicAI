package com.civicai.app.data.repository

import com.civicai.app.data.remote.CivicAiApiService
import com.civicai.app.data.remote.dto.CivicReportDto
import com.civicai.app.data.remote.dto.ConfirmReportRequest
import com.civicai.app.util.ApiResult
import com.civicai.app.util.reportImageMediaType
import com.civicai.app.util.safeApiCall
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File

class ReportsRepository(private val api: CivicAiApiService) {

    /** POST /reports — exactly one of [imageFile] / [imageUrl] must be supplied. */
    suspend fun createReport(
        lat: Double,
        lng: Double,
        description: String?,
        category: String?,
        imageFile: File?,
        imageUrl: String?
    ): ApiResult<CivicReportDto> {
        val latBody = lat.toString().toRequestBody("text/plain".toMediaTypeOrNull())
        val lngBody = lng.toString().toRequestBody("text/plain".toMediaTypeOrNull())
        val descBody = description?.toRequestBody("text/plain".toMediaTypeOrNull())
        val catBody = category?.toRequestBody("text/plain".toMediaTypeOrNull())
        val urlBody = imageUrl?.toRequestBody("text/plain".toMediaTypeOrNull())
        val imagePart = imageFile?.let {
            val reqFile = it.asRequestBody(reportImageMediaType(it).toMediaTypeOrNull())
            MultipartBody.Part.createFormData("image", it.name, reqFile)
        }

        return safeApiCall {
            api.createReport(latBody, lngBody, descBody, catBody, urlBody, imagePart)
        }
    }

    /** GET /reports/mine */
    suspend fun getMyReports(status: String? = null): ApiResult<List<CivicReportDto>> =
        safeApiCall { api.getMyReports(status) }

    /** POST /reports/{id}/confirm */
    suspend fun confirmReport(reportId: String, confirmation: String): ApiResult<CivicReportDto> =
        safeApiCall { api.confirmReport(reportId, ConfirmReportRequest(confirmation)) }
}
