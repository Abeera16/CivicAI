package com.civicai.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.civicai.app.ui.theme.*

fun severityColor(severity: String): Color = when (severity.lowercase()) {
    "low" -> SeverityLow
    "medium" -> SeverityMedium
    "high" -> SeverityHigh
    "critical" -> SeverityCritical
    else -> TextSecondary
}

fun impactColor(score: Int): Color = when {
    score < 40 -> ImpactGreen
    score < 70 -> ImpactYellow
    else -> ImpactRed
}

fun statusLabel(status: String): String = when (status.lowercase()) {
    "open" -> "Reported"
    "in_progress" -> "Investigating"
    "resolved" -> "Resolved"
    else -> status
}

fun statusColor(status: String): Color = when (status.lowercase()) {
    "open" -> SeverityHigh
    "in_progress" -> CivicTeal
    "resolved" -> ImpactGreen
    else -> TextSecondary
}

fun categoryLabel(category: String): String = category
    .replace("_", " ")
    .replaceFirstChar { it.uppercase() }

@Composable
fun SeverityChip(severity: String, modifier: Modifier = Modifier) {
    val color = severityColor(severity)
    Text(
        text = severity.replaceFirstChar { it.uppercase() },
        color = color,
        fontWeight = FontWeight.SemiBold,
        fontSize = 11.sp,
        modifier = modifier
            .background(color.copy(alpha = 0.14f), RoundedCornerShape(20.dp))
            .padding(horizontal = 10.dp, vertical = 4.dp)
    )
}

@Composable
fun StatusChip(status: String, modifier: Modifier = Modifier) {
    val color = statusColor(status)
    Text(
        text = statusLabel(status),
        color = color,
        fontWeight = FontWeight.SemiBold,
        fontSize = 11.sp,
        modifier = modifier
            .background(color.copy(alpha = 0.14f), RoundedCornerShape(20.dp))
            .padding(horizontal = 10.dp, vertical = 4.dp)
    )
}

@Composable
fun ImpactBadge(score: Int, modifier: Modifier = Modifier) {
    val color = impactColor(score)
    Text(
        text = "Impact $score",
        color = color,
        fontWeight = FontWeight.Bold,
        fontSize = 11.sp,
        modifier = modifier
            .background(color.copy(alpha = 0.14f), RoundedCornerShape(20.dp))
            .padding(horizontal = 10.dp, vertical = 4.dp)
    )
}
