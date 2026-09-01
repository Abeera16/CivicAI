package com.civicai.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BrokenImage
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.SubcomposeAsyncImage
import com.civicai.app.data.remote.dto.CivicReportDto
import com.civicai.app.data.remote.dto.UrbanIncidentDto
import com.civicai.app.ui.theme.CivicTeal
import com.civicai.app.ui.theme.TextSecondary
import kotlin.math.roundToInt

/** Thumbnail that resolves relative `/media/...` paths against the API base URL. */
@Composable
fun ReportThumbnail(imageUrl: String, baseUrl: String, size: Int = 56) {
    val resolved = if (imageUrl.startsWith("http")) imageUrl else baseUrl.trimEnd('/') + imageUrl
    SubcomposeAsyncImage(
        model = resolved,
        contentDescription = null,
        contentScale = ContentScale.Crop,
        loading = {
            Box(
                Modifier
                    .size(size.dp)
                    .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(10.dp))
            )
        },
        error = {
            Box(
                Modifier
                    .size(size.dp)
                    .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(10.dp)),
                contentAlignment = Alignment.Center
            ) { Icon(Icons.Default.BrokenImage, null, tint = TextSecondary) }
        },
        modifier = Modifier
            .size(size.dp)
            .clip(RoundedCornerShape(10.dp))
    )
}

@Composable
fun IncidentListRow(
    incident: UrbanIncidentDto,
    baseUrl: String,
    onClick: () -> Unit
) {
    val thumb = incident.reports?.firstOrNull()?.image_url
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        if (thumb != null) {
            ReportThumbnail(thumb, baseUrl, size = 56)
        } else {
            Box(
                Modifier
                    .size(56.dp)
                    .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(10.dp))
            )
        }
        Column(Modifier.weight(1f)) {
            Text(categoryLabel(incident.category), fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(4.dp))
            Text(
                "${incident.report_count} report${if (incident.report_count == 1) "" else "s"} · ${incident.impact_explanation}",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
            SeverityChip(incident.severity)
            ImpactBadge(incident.impact_score)
        }
    }
}

@Composable
fun ReportListRow(report: CivicReportDto, baseUrl: String, onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        ReportThumbnail(report.image_url, baseUrl, size = 56)
        Column(Modifier.weight(1f)) {
            Text(categoryLabel(report.category), fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(4.dp))
            Text(
                report.description ?: "No description provided",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        StatusChip(report.status)
    }
}

@Composable
fun LoadingState(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = CivicTeal)
    }
}

@Composable
fun ErrorState(message: String, onRetry: (() -> Unit)? = null, modifier: Modifier = Modifier) {
    Column(
        modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(Icons.Default.ErrorOutline, null, tint = TextSecondary, modifier = Modifier.size(40.dp))
        Spacer(Modifier.height(12.dp))
        Text(message, textAlign = androidx.compose.ui.text.style.TextAlign.Center, color = TextSecondary)
        if (onRetry != null) {
            Spacer(Modifier.height(16.dp))
            OutlinedButton(onClick = onRetry) {
                Icon(Icons.Default.Refresh, null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("Retry")
            }
        }
    }
}

@Composable
fun EmptyState(message: String, modifier: Modifier = Modifier) {
    Column(
        modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(Icons.Default.Inbox, null, tint = TextSecondary, modifier = Modifier.size(40.dp))
        Spacer(Modifier.height(12.dp))
        Text(message, textAlign = androidx.compose.ui.text.style.TextAlign.Center, color = TextSecondary)
    }
}

/** Straight-line distance in meters between two lat/lng points (haversine). */
fun distanceMeters(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Int {
    val r = 6371000.0
    val dLat = Math.toRadians(lat2 - lat1)
    val dLng = Math.toRadians(lng2 - lng1)
    val a = kotlin.math.sin(dLat / 2) * kotlin.math.sin(dLat / 2) +
            kotlin.math.cos(Math.toRadians(lat1)) * kotlin.math.cos(Math.toRadians(lat2)) *
            kotlin.math.sin(dLng / 2) * kotlin.math.sin(dLng / 2)
    val c = 2 * kotlin.math.atan2(kotlin.math.sqrt(a), kotlin.math.sqrt(1 - a))
    return (r * c).roundToInt()
}

fun formatDistance(meters: Int): String =
    if (meters >= 1000) "%.1fkm".format(meters / 1000.0) else "${meters}m"
