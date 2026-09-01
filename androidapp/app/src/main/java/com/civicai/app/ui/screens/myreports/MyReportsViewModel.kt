package com.civicai.app.ui.screens.myreports

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.civicai.app.data.remote.dto.CivicReportDto
import com.civicai.app.data.repository.ReportsRepository
import com.civicai.app.util.ApiResult
import kotlinx.coroutines.launch

data class MyReportsUiState(
    val isLoading: Boolean = true,
    val errorMessage: String? = null,
    val reports: List<CivicReportDto> = emptyList(),
    val confirmingReportId: String? = null
) {
    val submittedCount get() = reports.size
    val inProgressCount get() = reports.count { it.status == "in_progress" }
    val resolvedCount get() = reports.count { it.status == "resolved" }
}

class MyReportsViewModel(private val reportsRepository: ReportsRepository) : ViewModel() {

    var uiState by mutableStateOf(MyReportsUiState())
        private set

    fun load() {
        uiState = uiState.copy(isLoading = true, errorMessage = null)
        viewModelScope.launch {
            when (val result = reportsRepository.getMyReports()) {
                is ApiResult.Success -> uiState = uiState.copy(isLoading = false, reports = result.data)
                is ApiResult.Error -> uiState = uiState.copy(isLoading = false, errorMessage = result.message)
            }
        }
    }

    fun confirm(reportId: String, confirmation: String) {
        uiState = uiState.copy(confirmingReportId = reportId)
        viewModelScope.launch {
            when (val result = reportsRepository.confirmReport(reportId, confirmation)) {
                is ApiResult.Success -> {
                    val updated = uiState.reports.map { if (it.id == reportId) result.data else it }
                    uiState = uiState.copy(reports = updated, confirmingReportId = null)
                }
                is ApiResult.Error -> uiState = uiState.copy(
                    confirmingReportId = null,
                    errorMessage = result.message
                )
            }
        }
    }
}
