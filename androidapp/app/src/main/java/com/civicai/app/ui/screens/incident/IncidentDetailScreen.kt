package com.civicai.app.ui.screens.incident

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.civicai.app.BuildConfig
import com.civicai.app.ui.components.*
import com.civicai.app.ui.theme.*
import com.civicai.app.util.viewModelFactory

@Composable
fun IncidentDetailScreen(
    incidentId: String,
    isStaff: Boolean,
    onBack: () -> Unit
) {
    val viewModel: IncidentDetailViewModel = viewModel(factory = viewModelFactory { IncidentDetailViewModel(it.incidentsRepository) })
    val state = viewModel.uiState

    LaunchedEffect(incidentId) { viewModel.load(incidentId) }

    Column(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, null) }
            Text("Incident detail", style = MaterialTheme.typography.titleMedium)
        }

        when {
            state.isLoading -> LoadingState()
            state.errorMessage != null -> ErrorState(state.errorMessage, onRetry = { viewModel.load(incidentId) })
            state.incident == null -> EmptyState("Incident not found.")
            else -> IncidentBody(state.incident, isStaff, state.isUpdating,
                onSetStatus = { status -> viewModel.updateStatus(incidentId, status) },
                onResolve = { before, after -> viewModel.resolve(incidentId, before, after) }
            )
        }
    }
}

@Composable
private fun IncidentBody(
    incident: com.civicai.app.data.remote.dto.UrbanIncidentDto,
    isStaff: Boolean,
    isUpdating: Boolean,
    onSetStatus: (String) -> Unit,
    onResolve: (String?, String?) -> Unit
) {
    var beforeUrl by remember { mutableStateOf("") }
    var afterUrl by remember { mutableStateOf("") }

    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(categoryLabel(incident.category), style = MaterialTheme.typography.titleLarge)
                Spacer(Modifier.weight(1f))
                SeverityChip(incident.severity)
            }
            Spacer(Modifier.height(6.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatusChip(incident.status)
                ImpactBadge(incident.impact_score)
            }
        }

        item {
            Card(shape = RoundedCornerShape(14.dp)) {
                Column(Modifier.padding(14.dp)) {
                    Text("Why this score", fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(6.dp))
                    Text(incident.impact_explanation, color = TextSecondary)
                }
            }
        }

        if (incident.status == "resolved" && incident.impact_before != null) {
            item {
                Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = ImpactGreen.copy(alpha = 0.08f))) {
                    Column(Modifier.padding(14.dp)) {
                        Text("Did it work?", fontWeight = FontWeight.SemiBold)
                        Spacer(Modifier.height(6.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            Column {
                                Text("Before", color = TextSecondary, fontSize = 12.sp)
                                Text("${incident.impact_before}", fontWeight = FontWeight.Bold, fontSize = 20.sp)
                            }
                            Column {
                                Text("After", color = TextSecondary, fontSize = 12.sp)
                                Text("${incident.impact_after ?: "—"}", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = ImpactGreen)
                            }
                        }
                    }
                }
            }
        }

        item {
            Text("Reports in this incident (${incident.reports?.size ?: incident.report_count})", style = MaterialTheme.typography.titleMedium)
        }
        items(incident.reports.orEmpty()) { report ->
            Card(shape = RoundedCornerShape(14.dp)) {
                Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    ReportThumbnail(report.image_url, BuildConfig.CIVICAI_BASE_URL, size = 56)
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(report.description ?: "No description", maxLines = 2)
                        Spacer(Modifier.height(4.dp))
                        Text(report.ai_reasoning, color = TextSecondary, fontSize = 12.sp, maxLines = 2)
                    }
                }
            }
        }

        // Staff-only resolution workflow (per API §2, staff-only endpoints return 403 for citizens).
        if (isStaff) {
            item {
                HorizontalDivider(color = Divider)
                Spacer(Modifier.height(4.dp))
                Text("Staff actions", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(10.dp))

                if (incident.status != "resolved") {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedButton(
                            onClick = { onSetStatus("open") },
                            enabled = !isUpdating && incident.status != "open",
                            modifier = Modifier.weight(1f)
                        ) { Text("Mark Open") }
                        OutlinedButton(
                            onClick = { onSetStatus("in_progress") },
                            enabled = !isUpdating && incident.status != "in_progress",
                            modifier = Modifier.weight(1f)
                        ) { Text("In Progress") }
                    }
                    Spacer(Modifier.height(14.dp))
                    OutlinedTextField(
                        value = beforeUrl, onValueChange = { beforeUrl = it },
                        label = { Text("Before photo URL (optional)") },
                        singleLine = true, modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = afterUrl, onValueChange = { afterUrl = it },
                        label = { Text("After photo URL (optional)") },
                        singleLine = true, modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(Modifier.height(10.dp))
                    Button(
                        onClick = { onResolve(beforeUrl.ifBlank { null }, afterUrl.ifBlank { null }) },
                        enabled = !isUpdating,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = ImpactGreen)
                    ) { Text("Mark Resolved") }
                } else {
                    Text("This incident is resolved. Reopen it by moving it back to Open or In Progress.", color = TextSecondary)
                    Spacer(Modifier.height(10.dp))
                    OutlinedButton(onClick = { onSetStatus("open") }, enabled = !isUpdating) {
                        Text("Reopen")
                    }
                }
            }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}
