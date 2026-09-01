package com.civicai.app.ui.screens.commandcenter

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.civicai.app.data.remote.dto.CommandCenterSummaryDto
import com.civicai.app.data.remote.dto.OsmRoadDto
import com.civicai.app.data.remote.dto.RoadClosureResultDto
import com.civicai.app.data.repository.CityDataRepository
import com.civicai.app.util.ApiResult
import kotlinx.coroutines.launch

data class CommandCenterUiState(
    val isLoading: Boolean = true,
    val errorMessage: String? = null,
    val summary: CommandCenterSummaryDto? = null,
    val roads: List<OsmRoadDto> = emptyList(),
    val simulationResult: RoadClosureResultDto? = null,
    val isSimulating: Boolean = false
)

class CommandCenterViewModel(private val cityDataRepository: CityDataRepository) : ViewModel() {

    var uiState by mutableStateOf(CommandCenterUiState())
        private set

    fun load() {
        uiState = uiState.copy(isLoading = true, errorMessage = null)
        viewModelScope.launch {
            val summaryResult = cityDataRepository.getCommandCenterSummary()
            val roadsResult = cityDataRepository.getRoads()

            if (summaryResult is ApiResult.Error) {
                uiState = uiState.copy(isLoading = false, errorMessage = summaryResult.message)
                return@launch
            }
            uiState = uiState.copy(
                isLoading = false,
                summary = (summaryResult as ApiResult.Success).data,
                roads = (roadsResult as? ApiResult.Success)?.data ?: emptyList()
            )
        }
    }

    fun simulateClosure(roadId: String, hours: Int) {
        uiState = uiState.copy(isSimulating = true)
        viewModelScope.launch {
            when (val result = cityDataRepository.simulateRoadClosure(roadId, hours)) {
                is ApiResult.Success -> uiState = uiState.copy(isSimulating = false, simulationResult = result.data)
                is ApiResult.Error -> uiState = uiState.copy(isSimulating = false, errorMessage = result.message)
            }
        }
    }
}
