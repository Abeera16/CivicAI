package com.civicai.app.ui.screens.nearby

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.viewmodel.compose.viewModel
import com.civicai.app.ui.components.*
import com.civicai.app.ui.theme.CivicNavy
import com.civicai.app.ui.theme.SeverityHigh
import com.civicai.app.ui.theme.TextSecondary
import com.civicai.app.util.viewModelFactory
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polygon

private val LAHORE_CENTER = GeoPoint(31.5497, 74.3436)

@Composable
fun NearbyScreen(onOpenIncident: (String) -> Unit) {
    val viewModel: NearbyViewModel = viewModel(factory = viewModelFactory { NearbyViewModel(it.cityDataRepository) })
    val state = viewModel.uiState
    val context = LocalContext.current

    LaunchedEffect(Unit) { viewModel.load() }

    Column(Modifier.fillMaxSize()) {
        Row(
            Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Nearby", style = MaterialTheme.typography.titleLarge, color = CivicNavy)
            Spacer(Modifier.weight(1f))
            IconButton(onClick = { viewModel.load() }) {
                Icon(Icons.Default.Refresh, contentDescription = "Refresh")
            }
        }

        Box(
            Modifier
                .fillMaxWidth()
                .height(320.dp)
                .clip(RoundedCornerShape(16.dp))
        ) {
            // OSMDroid map — OpenStreetMap, free forever, no API key required.
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { ctx ->
                    // Initialize OSMDroid configuration (required once per process).
                    Configuration.getInstance().apply {
                        userAgentValue = ctx.packageName
                        load(ctx, ctx.getSharedPreferences("osmdroid", 0))
                    }
                    MapView(ctx).apply {
                        setTileSource(TileSourceFactory.MAPNIK)   // Standard OSM tiles
                        setMultiTouchControls(true)
                        controller.setZoom(12.5)
                        controller.setCenter(LAHORE_CENTER)
                        // Disable built-in zoom buttons; pinch-zoom is sufficient.
                        zoomController.setVisibility(
                            org.osmdroid.views.CustomZoomButtonsController.Visibility.NEVER
                        )
                    }
                },
                update = { mapView ->
                    mapView.overlays.clear()

                    // Incident markers — colour-coded by severity.
                    state.filteredIncidents.forEach { incident ->
                        val marker = Marker(mapView).apply {
                            position = GeoPoint(incident.lat, incident.lng)
                            title = categoryLabel(incident.category)
                            snippet = "Impact ${incident.impact_score} · ${statusLabel(incident.status)}"
                            icon = severityMarkerIcon(context, incident.severity)
                            setOnMarkerClickListener { _, _ ->
                                onOpenIncident(incident.id)
                                true
                            }
                        }
                        mapView.overlays.add(marker)
                    }

                    // Hotspot circles — translucent orange rings.
                    state.hotspots.forEach { hotspot ->
                        val circlePoints = buildCirclePoints(hotspot.lat, hotspot.lng, radiusMeters = 250.0)
                        val polygon = Polygon(mapView).apply {
                            points = circlePoints
                            fillColor = SeverityHigh.copy(alpha = 0.15f).toArgb()
                            strokeColor = SeverityHigh.copy(alpha = 0.6f).toArgb()
                            strokeWidth = 3f
                            title = hotspot.label
                        }
                        mapView.overlays.add(polygon)
                    }

                    mapView.invalidate()
                }
            )

            if (state.isLoading) {
                Box(
                    Modifier.fillMaxSize().background(Color.White.copy(alpha = 0.5f)),
                    contentAlignment = Alignment.Center
                ) { CircularProgressIndicator() }
            }
        }

        // Filter row
        Row(
            Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            FilterPill("All", state.filter == NearbyFilter.ALL) { viewModel.setFilter(NearbyFilter.ALL) }
            FilterPill("Critical", state.filter == NearbyFilter.CRITICAL) { viewModel.setFilter(NearbyFilter.CRITICAL) }
            FilterPill("In Progress", state.filter == NearbyFilter.IN_PROGRESS) { viewModel.setFilter(NearbyFilter.IN_PROGRESS) }
            FilterPill("Resolved", state.filter == NearbyFilter.RESOLVED) { viewModel.setFilter(NearbyFilter.RESOLVED) }
        }

        Text(
            "Problems around you",
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
        )

        when {
            state.errorMessage != null -> ErrorState(state.errorMessage, onRetry = { viewModel.load() })
            state.filteredIncidents.isEmpty() && !state.isLoading -> EmptyState("No incidents match this filter yet.")
            else -> LazyColumn(
                Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp)
            ) {
                items(state.filteredIncidents) { incident ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clickable { onOpenIncident(incident.id) }
                            .padding(vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(categoryLabel(incident.category), fontWeight = FontWeight.SemiBold)
                            Text(
                                "${incident.report_count} report${if (incident.report_count == 1) "" else "s"}",
                                color = TextSecondary, style = MaterialTheme.typography.bodyMedium
                            )
                        }
                        SeverityChip(incident.severity, modifier = Modifier.padding(end = 8.dp))
                        StatusChip(incident.status)
                    }
                    HorizontalDivider(color = com.civicai.app.ui.theme.Divider)
                }
            }
        }
    }
}

@Composable
private fun FilterPill(label: String, selected: Boolean, onClick: () -> Unit) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = { Text(label, maxLines = 1, softWrap = false) },
        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = CivicNavy.copy(alpha = 0.15f))
    )
}

/**
 * Build a circle polygon approximation around [lat]/[lng] with the given [radiusMeters].
 * OSMDroid doesn't have a built-in Circle overlay, so we approximate with 32 polygon points.
 */
private fun buildCirclePoints(lat: Double, lng: Double, radiusMeters: Double): List<GeoPoint> {
    val points = mutableListOf<GeoPoint>()
    val steps = 32
    val earthRadius = 6_371_000.0
    val latRad = Math.toRadians(lat)
    for (i in 0..steps) {
        val angle = Math.toRadians(i * 360.0 / steps)
        val dLat = radiusMeters / earthRadius
        val dLng = radiusMeters / (earthRadius * Math.cos(latRad))
        points.add(GeoPoint(lat + Math.toDegrees(dLat * Math.cos(angle)), lng + Math.toDegrees(dLng * Math.sin(angle))))
    }
    return points
}

/**
 * Returns an OSMDroid-compatible drawable tinted to the severity colour.
 * Falls back to the default OSMDroid marker if icon creation fails.
 */
private fun severityMarkerIcon(context: android.content.Context, severity: String): android.graphics.drawable.Drawable? {
    val color = when (severity.lowercase()) {
        "low" -> android.graphics.Color.parseColor("#22c55e")       // green-500
        "medium" -> android.graphics.Color.parseColor("#f59e0b")    // amber-500
        "high" -> android.graphics.Color.parseColor("#f97316")      // orange-500
        "critical" -> android.graphics.Color.parseColor("#ef4444")  // red-500
        else -> android.graphics.Color.parseColor("#6366f1")        // indigo-500
    }
    return try {
        val base = androidx.core.content.ContextCompat.getDrawable(
            context, org.osmdroid.library.R.drawable.marker_default
        )?.mutate()
        base?.setColorFilter(color, android.graphics.PorterDuff.Mode.SRC_IN)
        base
    } catch (_: Exception) {
        null   // OSMDroid will use its built-in default marker
    }
}
