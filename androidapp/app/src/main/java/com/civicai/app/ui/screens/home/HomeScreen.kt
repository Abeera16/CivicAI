package com.civicai.app.ui.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.civicai.app.ui.components.*
import com.civicai.app.ui.theme.*
import com.civicai.app.util.rememberLocationState
import com.civicai.app.util.viewModelFactory

@Composable
fun HomeScreen(
    userFullName: String?,
    onOpenReport: () -> Unit,
    onOpenNearby: () -> Unit,
    onOpenMyReports: () -> Unit,
    onOpenAlerts: () -> Unit,
    onOpenChat: () -> Unit,
    onOpenIncident: (String) -> Unit,
    onLogout: () -> Unit
) {
    val viewModel: HomeViewModel = viewModel(factory = viewModelFactory { HomeViewModel(it.cityDataRepository) })
    val locationState = rememberLocationState()
    val state = viewModel.uiState
    var showLogoutConfirm by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        locationState.requestPermission()
        viewModel.load()
    }
    LaunchedEffect(locationState.location) {
        viewModel.onLocationAvailable(locationState.location)
    }

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        // Top app bar
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.HealthAndSafety, null, tint = CivicTeal, modifier = Modifier.size(26.dp))
            Spacer(Modifier.width(8.dp))
            Text("CivicAI", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Spacer(Modifier.weight(1f))
            AssistChip(
                onClick = onOpenNearby,
                label = { Text("Lahore") },
                leadingIcon = { Icon(Icons.Default.LocationOn, null, modifier = Modifier.size(16.dp)) }
            )
            Spacer(Modifier.width(8.dp))
            IconButton(onClick = onOpenAlerts) {
                Icon(Icons.Default.Notifications, contentDescription = "Alerts")
            }
            IconButton(onClick = { showLogoutConfirm = true }) {
                Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = "Log out")
            }
        }

        if (showLogoutConfirm) {
            AlertDialog(
                onDismissRequest = { showLogoutConfirm = false },
                title = { Text("Log out?") },
                text = { Text("You'll need to sign in again to report problems or view your reports.") },
                confirmButton = {
                    TextButton(onClick = {
                        showLogoutConfirm = false
                        onLogout()
                    }) { Text("Log out", color = CivicDestructive) }
                },
                dismissButton = {
                    TextButton(onClick = { showLogoutConfirm = false }) { Text("Cancel") }
                }
            )
        }

        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                // Report CTA card
                Card(
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = CivicNavy),
                    modifier = Modifier.fillMaxWidth().clickable(onClick = onOpenReport)
                ) {
                    Row(
                        Modifier.padding(20.dp).fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            Modifier.size(52.dp).clip(RoundedCornerShape(14.dp)).background(CivicTeal),
                            contentAlignment = Alignment.Center
                        ) { Icon(Icons.Default.CameraAlt, null, tint = CivicNavy) }
                        Spacer(Modifier.width(16.dp))
                        Column(Modifier.weight(1f)) {
                            Text("Report a Problem", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            Text("Photo + GPS in seconds", color = Color.White.copy(alpha = 0.75f), fontSize = 13.sp)
                        }
                        Icon(Icons.Default.ChevronRight, null, tint = Color.White)
                    }
                }
            }

            item {
                // Weather / AQI banner — GET /weather/current, no hardcoded values
                WeatherBanner(state)
            }

            item {
                // Quick actions grid
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    QuickAction(Icons.Default.Place, "Problems\nNear Me", Modifier.weight(1f), onOpenNearby)
                    QuickAction(Icons.Default.Description, "My\nReports", Modifier.weight(1f), onOpenMyReports)
                }
            }
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    QuickAction(Icons.Default.Notifications, "Notifi-\ncations", Modifier.weight(1f), onOpenAlerts)
                    QuickAction(Icons.Default.Chat, "Ask\nCivicAI", Modifier.weight(1f), onOpenChat)
                }
            }

            item {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text("Problems near you", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.weight(1f))
                    TextButton(onClick = onOpenNearby) { Text("View all") }
                }
            }

            when {
                state.isLoading -> item { LoadingState(Modifier.height(200.dp)) }
                state.errorMessage != null -> item {
                    ErrorState(state.errorMessage, onRetry = { viewModel.load() }, modifier = Modifier.height(200.dp))
                }
                state.nearbyIncidents.isEmpty() -> item {
                    EmptyState("No open incidents nearby yet — be the first to report one.", Modifier.height(160.dp))
                }
                else -> items(state.nearbyIncidents.take(6)) { incident ->
                    Card(shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .clickable { onOpenIncident(incident.id) }
                                .padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                Modifier.size(44.dp).clip(RoundedCornerShape(10.dp))
                                    .background(severityColor(incident.severity).copy(alpha = 0.15f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(categoryIcon(incident.category), null, tint = severityColor(incident.severity))
                            }
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(categoryLabel(incident.category), fontWeight = FontWeight.SemiBold)
                                val distance = state.userLat?.let { lat ->
                                    state.userLng?.let { lng ->
                                        formatDistance(distanceMeters(lat, lng, incident.lat, incident.lng))
                                    }
                                } ?: "Distance unknown"
                                Text(distance, color = TextSecondary, fontSize = 13.sp)
                            }
                            StatusChip(incident.status)
                        }
                    }
                }
            }

            item {
                OutlinedButton(
                    onClick = onOpenChat,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Icon(Icons.Default.Chat, null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Ask CivicAI: any flooding near me?")
                }
            }
            item { Spacer(Modifier.height(8.dp)) }
        }
    }
}

@Composable
private fun WeatherBanner(state: HomeUiState) {
    val weather = state.weather
    Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = CivicTeal.copy(alpha = 0.12f))) {
        Row(Modifier.padding(16.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.WbSunny, null, tint = CivicTeal, modifier = Modifier.size(30.dp))
            Spacer(Modifier.width(14.dp))
            if (weather != null) {
                Column(Modifier.weight(1f)) {
                    Text("${weather.temperature_c.toInt()}°C · ${weather.area}", fontWeight = FontWeight.SemiBold)
                    Text(
                        "AQI ${weather.aqi ?: "—"} · Humidity ${weather.humidity_pct?.toInt() ?: "—"}%",
                        color = TextSecondary, fontSize = 13.sp
                    )
                }
            } else {
                Text("Weather data unavailable", color = TextSecondary, modifier = Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun QuickAction(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, modifier: Modifier, onClick: () -> Unit) {
    Card(
        modifier = modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            Modifier.fillMaxWidth().padding(vertical = 18.dp, horizontal = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                Modifier.size(44.dp).clip(CircleShape).background(CivicNavy.copy(alpha = 0.08f)),
                contentAlignment = Alignment.Center
            ) { Icon(icon, null, tint = CivicNavy) }
            Spacer(Modifier.height(8.dp))
            Text(label, textAlign = androidx.compose.ui.text.style.TextAlign.Center, fontSize = 12.sp, fontWeight = FontWeight.Medium)
        }
    }
}

private fun categoryIcon(category: String) = when (category.lowercase()) {
    "pothole", "road_damage" -> Icons.Default.Warning
    "flooding", "water_leak" -> Icons.Default.WaterDrop
    "waste" -> Icons.Default.Delete
    "streetlight" -> Icons.Default.LightMode
    else -> Icons.Default.ReportProblem
}
