package com.civicai.app.ui.screens.nearby

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.civicai.app.data.remote.dto.HotspotDto
import com.civicai.app.data.remote.dto.MapIncidentDto
import com.civicai.app.data.repository.CityDataRepository
import com.civicai.app.util.ApiResult
import kotlinx.coroutines.launch

enum class NearbyFilter { ALL, CRITICAL, IN_PROGRESS, RESOLVED }

data class NearbyUiState(
    val isLoading: Boolean = true,
    val errorMessage: String? = null,
    val allIncidents: List<MapIncidentDto> = emptyList(),
    val hotspots: List<HotspotDto> = emptyList(),
    val filter: NearbyFilter = NearbyFilter.ALL
) {
    val filteredIncidents: List<MapIncidentDto>
        get() = when (filter) {
            NearbyFilter.ALL -> allIncidents
            NearbyFilter.CRITICAL -> allIncidents.filter { it.severity == "critical" }
            NearbyFilter.IN_PROGRESS -> allIncidents.filter { it.status == "in_progress" }
            NearbyFilter.RESOLVED -> allIncidents.filter { it.status == "resolved" }
        }
}

class NearbyViewModel(private val cityDataRepository: CityDataRepository) : ViewModel() {

    var uiState by mutableStateOf(NearbyUiState())
        private set

    fun setFilter(filter: NearbyFilter) { uiState = uiState.copy(filter = filter) }

    fun load() {
        uiState = uiState.copy(isLoading = true, errorMessage = null)
        viewModelScope.launch {
            val incidentsResult = cityDataRepository.getMapIncidents()
            val hotspotsResult = cityDataRepository.getMapHotspots()

            if (incidentsResult is ApiResult.Error) {
                uiState = uiState.copy(isLoading = false, errorMessage = incidentsResult.message)
                return@launch
            }

            uiState = uiState.copy(
                isLoading = false,
                errorMessage = null,
                allIncidents = (incidentsResult as ApiResult.Success).data,
                hotspots = (hotspotsResult as? ApiResult.Success)?.data ?: emptyList()
            )
        }
    }
}
