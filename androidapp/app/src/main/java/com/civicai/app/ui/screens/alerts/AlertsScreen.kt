package com.civicai.app.ui.screens.alerts

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.MarkEmailRead
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.civicai.app.ui.components.EmptyState
import com.civicai.app.ui.components.ErrorState
import com.civicai.app.ui.components.LoadingState
import com.civicai.app.ui.theme.*
import com.civicai.app.util.viewModelFactory

@Composable
fun AlertsScreen(onOpenIncident: (String) -> Unit) {
    val viewModel: AlertsViewModel = viewModel(factory = viewModelFactory { AlertsViewModel(it.reportsRepository) })
    val state = viewModel.uiState

    LaunchedEffect(Unit) { viewModel.load() }

    Column(Modifier.fillMaxSize()) {
        Row(
            Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Alerts", style = MaterialTheme.typography.headlineMedium, color = CivicNavy)
            Spacer(Modifier.weight(1f))
            TextButton(onClick = { /* purely local read-state; no mark-all-read endpoint exists */ }) {
                Icon(Icons.Default.MarkEmailRead, null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(4.dp))
                Text("Mark all read")
            }
        }

        when {
            state.isLoading -> LoadingState()
            state.errorMessage != null -> ErrorState(state.errorMessage, onRetry = { viewModel.load() })
            state.alerts.isEmpty() -> EmptyState("No alerts yet. Submit a report and updates will show up here.")
            else -> LazyColumn(contentPadding = PaddingValues(horizontal = 16.dp)) {
                items(state.alerts, key = { it.id }) { alert ->
                    AlertRow(alert) { alert.incidentId?.let(onOpenIncident) }
                    HorizontalDivider(color = Divider)
                }
            }
        }
    }
}

@Composable
private fun AlertRow(alert: AlertUi, onClick: () -> Unit) {
    val (icon, tint) = when (alert.kind) {
        AlertKind.RECEIVED -> Icons.Default.NotificationsActive to CivicNavy
        AlertKind.INVESTIGATING -> Icons.Default.Search to CivicTeal
        AlertKind.RESOLVED -> Icons.Default.CheckCircle to ImpactGreen
    }
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            Modifier.size(38.dp).clip(CircleShape).background(tint.copy(alpha = 0.14f)),
            contentAlignment = Alignment.Center
        ) { Icon(icon, null, tint = tint, modifier = Modifier.size(20.dp)) }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(alert.title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            Text(alert.subtitle, color = TextSecondary, style = MaterialTheme.typography.bodyMedium)
        }
        Text(relativeTime(alert.timestamp), color = TextSecondary, fontSize = 12.sp)
    }
}

private fun relativeTime(iso: String): String = try {
    val instant = java.time.Instant.parse(iso)
    val minutes = java.time.Duration.between(instant, java.time.Instant.now()).toMinutes()
    when {
        minutes < 60 -> "${minutes}m ago"
        minutes < 60 * 24 -> "${minutes / 60}h ago"
        else -> "${minutes / (60 * 24)}d ago"
    }
} catch (e: Exception) {
    ""
}

