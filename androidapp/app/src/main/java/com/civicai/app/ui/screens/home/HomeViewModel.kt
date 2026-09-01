package com.civicai.app.ui.screens.home

import android.location.Location
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.civicai.app.data.remote.dto.MapIncidentDto
import com.civicai.app.data.remote.dto.WeatherReadingDto
import com.civicai.app.data.repository.CityDataRepository
import com.civicai.app.ui.components.distanceMeters
import com.civicai.app.util.ApiResult
import kotlinx.coroutines.launch

data class HomeUiState(
    val isLoading: Boolean = true,
    val errorMessage: String? = null,
    val nearbyIncidents: List<MapIncidentDto> = emptyList(),
    val weather: WeatherReadingDto? = null,
    val userLat: Double? = null,
    val userLng: Double? = null
)

class HomeViewModel(private val cityDataRepository: CityDataRepository) : ViewModel() {

    var uiState by mutableStateOf(HomeUiState())
        private set

    fun onLocationAvailable(location: Location?) {
        uiState = uiState.copy(userLat = location?.latitude, userLng = location?.longitude)
        sortByDistanceIfPossible()
    }

    fun load() {
        uiState = uiState.copy(isLoading = true, errorMessage = null)
        viewModelScope.launch {
            val incidentsResult = cityDataRepository.getMapIncidents()
            val weatherResult = cityDataRepository.getCurrentWeather()

            val incidents = when (incidentsResult) {
                is ApiResult.Success -> incidentsResult.data
                is ApiResult.Error -> emptyList()
            }
            val weather = when (weatherResult) {
                is ApiResult.Success -> weatherResult.data
                is ApiResult.Error -> null
            }

            val errorMessage = if (incidentsResult is ApiResult.Error) incidentsResult.message else null

            uiState = uiState.copy(
                isLoading = false,
                errorMessage = errorMessage,
                nearbyIncidents = incidents,
                weather = weather
            )
            sortByDistanceIfPossible()
        }
    }

    private fun sortByDistanceIfPossible() {
        val lat = uiState.userLat ?: return
        val lng = uiState.userLng ?: return
        val sorted = uiState.nearbyIncidents.sortedBy {
            distanceMeters(lat, lng, it.lat, it.lng)
        }
        uiState = uiState.copy(nearbyIncidents = sorted)
    }
}
