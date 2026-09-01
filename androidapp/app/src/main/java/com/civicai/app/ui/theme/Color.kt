package com.civicai.app.ui.theme

import androidx.compose.ui.graphics.Color

// Brand palette — matches the CivicAI design tokens exactly
val CivicBackground = Color(0xFFFBF8F0)   // --background: page background, warm ivory/cream
val CivicForeground = Color(0xFF111B27)   // --foreground: main text, near-black navy
val CivicCard = Color(0xFFFFFFFF)         // --card: card surfaces, pure white
val CivicNavy = Color(0xFF003A65)         // --primary: deep navy for buttons, active nav items
val CivicSecondary = Color(0xFFF2EBD7)    // --secondary: subtle warm-beige background
val CivicMuted = Color(0xFFF3EEE1)        // --muted: subtle warm-beige background
val CivicTeal = Color(0xFF9BE2D1)         // --accent: teal/mint for "Live"/status tags
val Divider = Color(0xFFCFD9E3)           // --border: card and input borders
val CivicDestructive = Color(0xFFE7000B)  // --destructive: error/critical states

// Kept for backward compatibility with existing screen code
val CivicNavyDark = Color(0xFF111B27)
val CivicOrange = CivicSecondary
val CivicOrangeDark = CivicMuted

val SeverityLow = Color(0xFF2E9E5B)
val SeverityMedium = Color(0xFFE0B400)
val SeverityHigh = Color(0xFFE8791A)
val SeverityCritical = CivicDestructive

val ImpactGreen = Color(0xFF2E9E5B)
val ImpactYellow = Color(0xFFE0B400)
val ImpactRed = CivicDestructive

val SurfaceLight = CivicBackground
val SurfaceCard = CivicCard
val TextPrimary = CivicForeground
val TextSecondary = Color(0xFF6B7785)
