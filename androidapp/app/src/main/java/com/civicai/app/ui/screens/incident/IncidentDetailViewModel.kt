package com.civicai.app.ui.screens.incident

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.civicai.app.data.remote.dto.UrbanIncidentDto
import com.civicai.app.data.repository.IncidentsRepository
import com.civicai.app.util.ApiResult
import kotlinx.coroutines.launch

data class IncidentDetailUiState(
    val isLoading: Boolean = true,
    val errorMessage: String? = null,
    val incident: UrbanIncidentDto? = null,
    val isUpdating: Boolean = false
)

class IncidentDetailViewModel(private val incidentsRepository: IncidentsRepository) : ViewModel() {

    var uiState by mutableStateOf(IncidentDetailUiState())
        private set

    fun load(incidentId: String) {
        uiState = uiState.copy(isLoading = true, errorMessage = null)
        viewModelScope.launch {
            when (val result = incidentsRepository.getIncidentDetail(incidentId)) {
                is ApiResult.Success -> uiState = uiState.copy(isLoading = false, incident = result.data)
                is ApiResult.Error -> uiState = uiState.copy(isLoading = false, errorMessage = result.message)
            }
        }
    }

    fun updateStatus(incidentId: String, status: String) {
        uiState = uiState.copy(isUpdating = true)
        viewModelScope.launch {
            when (val result = incidentsRepository.updateStatus(incidentId, status)) {
                is ApiResult.Success -> uiState = uiState.copy(isUpdating = false, incident = result.data)
                is ApiResult.Error -> uiState = uiState.copy(isUpdating = false, errorMessage = result.message)
            }
        }
    }

    fun resolve(incidentId: String, beforePhotoUrl: String?, afterPhotoUrl: String?) {
        uiState = uiState.copy(isUpdating = true)
        viewModelScope.launch {
            when (val result = incidentsRepository.resolveIncident(incidentId, beforePhotoUrl, afterPhotoUrl)) {
                is ApiResult.Success -> uiState = uiState.copy(isUpdating = false, incident = result.data)
                is ApiResult.Error -> uiState = uiState.copy(isUpdating = false, errorMessage = result.message)
            }
        }
    }
}
