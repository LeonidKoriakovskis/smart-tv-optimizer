package com.smarttv.optimizer.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val DarkBackground = Color(0xFF080C14)
val DarkSurface = Color(0xFF0F172A)
val DarkCard = Color(0xFF131D33)
val CyanGlow = Color(0xFF00E5FF)
val EmeraldGreen = Color(0xFF00E676)
val PurpleAccent = Color(0xFF7C4DFF)
val TextMuted = Color(0xFF94A3B8)
val DangerRed = Color(0xFFFF5252)

private val DarkColorScheme = darkColorScheme(
    primary = CyanGlow,
    secondary = EmeraldGreen,
    tertiary = PurpleAccent,
    background = DarkBackground,
    surface = DarkSurface,
    onPrimary = Color.Black,
    onSecondary = Color.Black,
    onBackground = Color.White,
    onSurface = Color.White
)

@Composable
fun SmartTvOptimizerTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content
    )
}
