package com.civicai.app.ui.screens.report

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.civicai.app.data.remote.dto.CivicReportDto
import com.civicai.app.data.repository.ReportsRepository
import com.civicai.app.util.ApiResult
import kotlinx.coroutines.launch
import java.io.File

data class ReportUiState(
    val category: String? = null,       // hint only, AI classification is authoritative
    val description: String = "",
    val lat: Double? = null,
    val lng: Double? = null,
    val imageFile: File? = null,
    val imageUrl: String = "",
    val isSubmitting: Boolean = false,
    val errorMessage: String? = null,
    val result: CivicReportDto? = null
)

val REPORT_CATEGORIES = listOf("pothole", "flooding", "waste", "streetlight", "water_leak", "road_damage")

class ReportViewModel(private val reportsRepository: ReportsRepository) : ViewModel() {

    var uiState by mutableStateOf(ReportUiState())
        private set

    fun setCategory(category: String) { uiState = uiState.copy(category = category) }
    fun setDescription(desc: String) { uiState = uiState.copy(description = desc) }
    fun setLocation(lat: Double, lng: Double) { uiState = uiState.copy(lat = lat, lng = lng) }
    fun setImageFile(file: File?) { uiState = uiState.copy(imageFile = file, imageUrl = "") }
    fun setImageUrl(url: String) { uiState = uiState.copy(imageUrl = url, imageFile = null) }
    fun clearResult() { uiState = ReportUiState() }
    fun dismissError() { uiState = uiState.copy(errorMessage = null) }

    fun submit() {
        val lat = uiState.lat
        val lng = uiState.lng
        if (lat == null || lng == null) {
            uiState = uiState.copy(errorMessage = "Location is required — enable GPS or drop a pin on the map.")
            return
        }
        if (uiState.imageFile == null && uiState.imageUrl.isBlank()) {
            uiState = uiState.copy(errorMessage = "Add a photo or paste an image URL.")
            return
        }

        uiState = uiState.copy(isSubmitting = true, errorMessage = null)
        viewModelScope.launch {
            val result = reportsRepository.createReport(
                lat = lat,
                lng = lng,
                description = uiState.description.ifBlank { null },
                category = uiState.category,
                imageFile = uiState.imageFile,
                imageUrl = uiState.imageUrl.ifBlank { null }
            )
            when (result) {
                is ApiResult.Success -> uiState = uiState.copy(isSubmitting = false, result = result.data)
                is ApiResult.Error -> uiState = uiState.copy(isSubmitting = false, errorMessage = result.message)
            }
        }
    }
}
