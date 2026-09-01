package com.civicai.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = CivicNavy,
    onPrimary = Color.White,
    secondary = CivicSecondary,
    onSecondary = TextPrimary,
    secondaryContainer = CivicSecondary,
    onSecondaryContainer = TextPrimary,
    tertiary = CivicTeal,
    onTertiary = TextPrimary,
    background = CivicBackground,
    surface = CivicCard,
    surfaceVariant = CivicMuted,
    onSurfaceVariant = TextSecondary,
    onBackground = TextPrimary,
    onSurface = TextPrimary,
    error = CivicDestructive,
    onError = Color.White,
    outline = Divider,
    outlineVariant = Divider
)

// CivicAI always ships this single warm-ivory light palette, regardless of the
// device's system dark-mode setting, to match the approved design tokens.
@Composable
fun CivicAITheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = LightColors,
        typography = CivicTypography,
        content = content
    )
}
