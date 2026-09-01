package com.civicai.app.ui.screens.alerts

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.civicai.app.data.remote.dto.CivicReportDto
import com.civicai.app.data.repository.ReportsRepository
import com.civicai.app.util.ApiResult
import kotlinx.coroutines.launch

/**
 * IMPORTANT — honesty note for whoever maintains this:
 * The CivicAI API reference (§3) does not define a notifications/alerts
 * endpoint. There is nothing to hardcode here, and this screen does not
 * invent fake alerts. Instead it derives a real, timestamp-sorted feed
 * directly from the signed-in user's own reports (GET /reports/mine):
 * one alert per report for "received", plus one more each time its status
 * has since moved to in_progress or resolved. Every alert links back to
 * real report/incident data — nothing here is mocked.
 *
 * If/when the backend adds a real GET /alerts or WebSocket push endpoint,
 * swap the `load()` body below for a direct call to it and delete the
 * derivation logic — the AlertUi model and screen won't need to change.
 */
data class AlertUi(
    val id: String,
    val reportId: String,
    val incidentId: String?,
    val title: String,
    val subtitle: String,
    val timestamp: String,
    val kind: AlertKind
)

enum class AlertKind { RECEIVED, INVESTIGATING, RESOLVED }

data class AlertsUiState(
    val isLoading: Boolean = true,
    val errorMessage: String? = null,
    val alerts: List<AlertUi> = emptyList()
)

class AlertsViewModel(private val reportsRepository: ReportsRepository) : ViewModel() {

    var uiState by mutableStateOf(AlertsUiState())
        private set

    fun load() {
        uiState = uiState.copy(isLoading = true, errorMessage = null)
        viewModelScope.launch {
            when (val result = reportsRepository.getMyReports()) {
                is ApiResult.Success -> uiState = uiState.copy(
                    isLoading = false,
                    alerts = deriveAlerts(result.data)
                )
                is ApiResult.Error -> uiState = uiState.copy(isLoading = false, errorMessage = result.message)
            }
        }
    }

    private fun deriveAlerts(reports: List<CivicReportDto>): List<AlertUi> {
        val alerts = mutableListOf<AlertUi>()
        reports.forEach { report ->
            val category = report.category.replace("_", " ").replaceFirstChar { it.uppercase() }
            alerts += AlertUi(
                id = "${report.id}-received",
                reportId = report.id,
                incidentId = report.incident_id,
                title = "Your report has been received",
                subtitle = category,
                timestamp = report.created_at,
                kind = AlertKind.RECEIVED
            )
            if (report.status == "in_progress" || report.status == "resolved") {
                alerts += AlertUi(
                    id = "${report.id}-investigating",
                    reportId = report.id,
                    incidentId = report.incident_id,
                    title = "Your report is now being investigated",
                    subtitle = category,
                    timestamp = report.created_at,
                    kind = AlertKind.INVESTIGATING
                )
            }
            if (report.status == "resolved") {
                alerts += AlertUi(
                    id = "${report.id}-resolved",
                    reportId = report.id,
                    incidentId = report.incident_id,
                    title = "Your reported ${report.category.replace("_", " ")} has been resolved",
                    subtitle = category,
                    timestamp = report.citizen_confirmed_at ?: report.created_at,
                    kind = AlertKind.RESOLVED
                )
            }
        }
        // Timestamps can tie within the same report (there's no per-status
        // resolved_at/updated_at field on CivicReportDto to sort by — only
        // created_at, plus citizen_confirmed_at which is usually null since
        // staff resolve incidents, not citizens). When timestamps tie, break
        // by progression stage so Resolved > Investigating > Received always
        // sorts above older/equal-timestamp alerts, instead of relying on
        // stable-sort insertion order (which put Resolved at the bottom).
        return alerts.sortedWith(
            compareByDescending<AlertUi> { it.timestamp }.thenByDescending { it.kind.ordinal }
        )
    }
}
