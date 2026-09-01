package com.civicai.app.ui.screens.myreports

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.civicai.app.BuildConfig
import com.civicai.app.data.remote.dto.CivicReportDto
import com.civicai.app.ui.components.*
import com.civicai.app.ui.theme.*
import com.civicai.app.util.viewModelFactory

@Composable
fun MyReportsScreen(onOpenIncident: (String) -> Unit) {
    val viewModel: MyReportsViewModel = viewModel(factory = viewModelFactory { MyReportsViewModel(it.reportsRepository) })
    val state = viewModel.uiState

    LaunchedEffect(Unit) { viewModel.load() }

    Column(Modifier.fillMaxSize()) {
        Text(
            "My Reports",
            style = MaterialTheme.typography.titleLarge,
            color = CivicNavy,
            modifier = Modifier.padding(16.dp)
        )

        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            StatTile("Submitted", state.submittedCount, CivicNavy, Modifier.weight(1f))
            StatTile("In Progress", state.inProgressCount, CivicTeal, Modifier.weight(1f))
            StatTile("Resolved", state.resolvedCount, ImpactGreen, Modifier.weight(1f))
        }
        Spacer(Modifier.height(8.dp))

        when {
            state.isLoading -> LoadingState()
            state.errorMessage != null -> ErrorState(state.errorMessage, onRetry = { viewModel.load() })
            state.reports.isEmpty() -> EmptyState("You haven't submitted any reports yet. Tap Report a Problem on Home to get started.")
            else -> LazyColumn(
                Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp)
            ) {
                items(state.reports, key = { it.id }) { report ->
                    ReportCard(
                        report = report,
                        isConfirming = state.confirmingReportId == report.id,
                        onOpenIncident = { report.incident_id?.let(onOpenIncident) },
                        onConfirm = { confirmation -> viewModel.confirm(report.id, confirmation) }
                    )
                    Spacer(Modifier.height(10.dp))
                }
            }
        }
    }
}

@Composable
private fun StatTile(label: String, count: Int, color: androidx.compose.ui.graphics.Color, modifier: Modifier) {
    Card(modifier = modifier, shape = RoundedCornerShape(14.dp)) {
        Column(Modifier.padding(14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("$count", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = color)
            Text(label, style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
        }
    }
}

@Composable
private fun ReportCard(
    report: CivicReportDto,
    isConfirming: Boolean,
    onOpenIncident: () -> Unit,
    onConfirm: (String) -> Unit
) {
    Card(shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth().clickable(onClick = onOpenIncident)) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                ReportThumbnail(report.image_url, BuildConfig.CIVICAI_BASE_URL, size = 48)
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(categoryLabel(report.category), fontWeight = FontWeight.SemiBold)
                    Text(
                        formatTimestamp(report.created_at),
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary
                    )
                }
                StatusChip(report.status)
            }

            Spacer(Modifier.height(12.dp))
            StatusPipeline(status = report.status)

            // Only surfaced once the incident is resolved, per the API doc's suggested screen.
            if (report.status == "resolved") {
                Spacer(Modifier.height(12.dp))
                HorizontalDivider(color = Divider)
                Spacer(Modifier.height(10.dp))
                Text("Is it actually fixed?", fontWeight = FontWeight.Medium)
                Spacer(Modifier.height(8.dp))
                if (report.citizen_confirmation != null) {
                    Text(
                        if (report.citizen_confirmation == "fixed") "You confirmed this is fixed ✓" else "You reported this still exists",
                        color = TextSecondary,
                        style = MaterialTheme.typography.bodyMedium
                    )
                } else {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedButton(
                            onClick = { onConfirm("still_exists") },
                            enabled = !isConfirming,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp)
                        ) { Text("Still a problem") }
                        Button(
                            onClick = { onConfirm("fixed") },
                            enabled = !isConfirming,
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = ImpactGreen),
                            shape = RoundedCornerShape(12.dp)
                        ) { Text("It's fixed") }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatusPipeline(status: String) {
    val steps = listOf("open" to "Received", "in_progress" to "Investigating", "resolved" to "Resolved")
    val currentIndex = steps.indexOfFirst { it.first == status }.coerceAtLeast(0)

    Column {
        Row(verticalAlignment = Alignment.CenterVertically) {
            steps.forEachIndexed { index, (_, label) ->
                val active = index <= currentIndex
                Box(
                    Modifier
                        .weight(1f)
                        .height(4.dp)
                        .background(if (active) statusColor(status) else Divider, RoundedCornerShape(2.dp))
                )
                if (index != steps.lastIndex) Spacer(Modifier.width(4.dp))
            }
        }
        Spacer(Modifier.height(6.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            steps.forEach { (_, label) ->
                Text(label, style = MaterialTheme.typography.bodyMedium, color = TextSecondary, fontSize = 11.sp)
            }
        }
    }
}

private fun formatTimestamp(iso: String): String = try {
    val instant = java.time.Instant.parse(iso)
    val now = java.time.Instant.now()
    val days = java.time.Duration.between(instant, now).toDays()
    when {
        days <= 0L -> "Today"
        days == 1L -> "1 day ago"
        days < 30L -> "$days days ago"
        else -> java.time.format.DateTimeFormatter.ofPattern("MMM d, yyyy")
            .withZone(java.time.ZoneId.systemDefault()).format(instant)
    }
} catch (e: Exception) {
    iso
}
