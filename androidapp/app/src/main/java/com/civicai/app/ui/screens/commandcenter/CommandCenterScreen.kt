package com.civicai.app.ui.screens.commandcenter

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.civicai.app.ui.components.*
import com.civicai.app.ui.theme.*
import com.civicai.app.util.viewModelFactory

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CommandCenterScreen(onBack: () -> Unit, onOpenIncident: (String) -> Unit) {
    val viewModel: CommandCenterViewModel = viewModel(factory = viewModelFactory { CommandCenterViewModel(it.cityDataRepository) })
    val state = viewModel.uiState
    var selectedRoadId by remember { mutableStateOf<String?>(null) }
    var hours by remember { mutableStateOf("6") }
    var roadMenuExpanded by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { viewModel.load() }

    Column(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, null) }
            Text("Command Center", style = MaterialTheme.typography.titleLarge, color = CivicNavy)
        }

        when {
            state.isLoading -> LoadingState()
            state.errorMessage != null -> ErrorState(state.errorMessage, onRetry = { viewModel.load() })
            state.summary == null -> EmptyState("No data available yet.")
            else -> {
                val summary = state.summary
                LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            MetricTile("Open", summary.open_incident_count, SeverityHigh, Modifier.weight(1f))
                            MetricTile("In Progress", summary.in_progress_incident_count, CivicTeal, Modifier.weight(1f))
                            MetricTile("Resolved", summary.resolved_incident_count, ImpactGreen, Modifier.weight(1f))
                        }
                    }
                    item {
                        Card(shape = RoundedCornerShape(14.dp)) {
                            Column(Modifier.padding(14.dp)) {
                                Text("Severity breakdown", fontWeight = FontWeight.SemiBold)
                                Spacer(Modifier.height(10.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    SeverityCount("Low", summary.severity_counts.low, SeverityLow)
                                    SeverityCount("Med", summary.severity_counts.medium, SeverityMedium)
                                    SeverityCount("High", summary.severity_counts.high, SeverityHigh)
                                    SeverityCount("Crit", summary.severity_counts.critical, SeverityCritical)
                                }
                            }
                        }
                    }
                    if (summary.weather != null) {
                        item {
                            Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = CivicTeal.copy(alpha = 0.1f))) {
                                Column(Modifier.padding(14.dp)) {
                                    Text("${summary.weather.area} weather", fontWeight = FontWeight.SemiBold)
                                    Text(
                                        "${summary.weather.temperature_c}°C · AQI ${summary.weather.aqi ?: "—"} · PM2.5 ${summary.weather.pm2_5 ?: "—"}",
                                        color = TextSecondary
                                    )
                                }
                            }
                        }
                    }
                    if (summary.top_hotspot != null) {
                        item {
                            Card(shape = RoundedCornerShape(14.dp)) {
                                Column(Modifier.padding(14.dp)) {
                                    Text("Top hotspot", fontWeight = FontWeight.SemiBold)
                                    Text(summary.top_hotspot.label, color = TextSecondary)
                                    Text("Avg impact ${summary.top_hotspot.avg_impact_score}", color = TextSecondary, fontSize = 12.sp)
                                }
                            }
                        }
                    }

                    item { Text("Recommended actions", style = MaterialTheme.typography.titleMedium) }
                    items(summary.recommended_actions) { action ->
                        Card(shape = RoundedCornerShape(14.dp)) {
                            Column(Modifier.padding(14.dp).fillMaxWidth()) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    SeverityChip(action.severity)
                                    Spacer(Modifier.width(8.dp))
                                    ImpactBadge(action.impact_score)
                                }
                                Spacer(Modifier.height(6.dp))
                                Text(action.action)
                                Spacer(Modifier.height(6.dp))
                                TextButton(onClick = { onOpenIncident(action.incident_id) }, contentPadding = PaddingValues(0.dp)) {
                                    Text("Open incident")
                                }
                            }
                        }
                    }

                    item {
                        HorizontalDivider(color = Divider)
                        Spacer(Modifier.height(8.dp))
                        Text("What-if: road closure simulation", style = MaterialTheme.typography.titleMedium)
                        Spacer(Modifier.height(10.dp))

                        ExposedDropdownMenuBox(expanded = roadMenuExpanded, onExpandedChange = { roadMenuExpanded = it }) {
                            OutlinedTextField(
                                value = state.roads.firstOrNull { it.osm_id == selectedRoadId }?.name ?: "Select a road",
                                onValueChange = {},
                                readOnly = true,
                                modifier = Modifier.menuAnchor().fillMaxWidth(),
                                label = { Text("Road") }
                            )
                            ExposedDropdownMenu(expanded = roadMenuExpanded, onDismissRequest = { roadMenuExpanded = false }) {
                                state.roads.forEach { road ->
                                    DropdownMenuItem(
                                        text = { Text(road.name ?: road.osm_id) },
                                        onClick = { selectedRoadId = road.osm_id; roadMenuExpanded = false }
                                    )
                                }
                            }
                        }
                        Spacer(Modifier.height(8.dp))
                        OutlinedTextField(
                            value = hours, onValueChange = { hours = it.filter { c -> c.isDigit() } },
                            label = { Text("Hours") }, singleLine = true, modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(Modifier.height(10.dp))
                        Button(
                            onClick = { selectedRoadId?.let { viewModel.simulateClosure(it, hours.toIntOrNull() ?: 1) } },
                            enabled = selectedRoadId != null && !state.isSimulating,
                            modifier = Modifier.fillMaxWidth()
                        ) { Text("Simulate closure") }

                        state.simulationResult?.let { result ->
                            Spacer(Modifier.height(12.dp))
                            Card(shape = RoundedCornerShape(14.dp)) {
                                Column(Modifier.padding(14.dp)) {
                                    Text(result.road_name ?: result.road_id, fontWeight = FontWeight.SemiBold)
                                    Spacer(Modifier.height(6.dp))
                                    Text(result.note, color = TextSecondary)
                                    Spacer(Modifier.height(6.dp))
                                    Text("${result.affected_incidents.size} affected incidents · ${result.nearby_facilities.size} nearby facilities", fontSize = 12.sp)
                                }
                            }
                        }
                    }
                    item { Spacer(Modifier.height(24.dp)) }
                }
            }
        }
    }
}

@Composable
private fun MetricTile(label: String, count: Int, color: androidx.compose.ui.graphics.Color, modifier: Modifier) {
    Card(modifier = modifier, shape = RoundedCornerShape(14.dp)) {
        Column(Modifier.padding(14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("$count", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = color)
            Text(label, color = TextSecondary, fontSize = 12.sp)
        }
    }
}

@Composable
private fun SeverityCount(label: String, count: Int, color: androidx.compose.ui.graphics.Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text("$count", fontWeight = FontWeight.Bold, color = color)
        Text(label, fontSize = 11.sp, color = TextSecondary)
    }
}
