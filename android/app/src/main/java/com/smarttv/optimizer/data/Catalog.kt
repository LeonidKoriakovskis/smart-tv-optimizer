package com.smarttv.optimizer.data

data class BloatPackage(
    val packageId: String,
    val name: String,
    val description: String,
    val category: String,
    val safeToDisable: Boolean = true
)

data class Preset(
    val id: String,
    val title: String,
    val badge: String,
    val description: String,
    val recommended: Boolean = false,
    val packagesToDisable: List<String>,
    val animationScale: String = "0.5"
)

object Catalog {
    val KNOWN_PACKAGES = listOf(
        BloatPackage(
            "com.mitv.gallery",
            "PatchWall Recommendations",
            "Continuous background home feed banners and telemetry",
            "PatchWall"
        ),
        BloatPackage(
            "com.miui.tv.analytics",
            "Xiaomi Analytics Daemon",
            "Tracks user behavior, app launches and background metrics",
            "Telemetry"
        ),
        BloatPackage(
            "com.xiaomi.mitv.advert",
            "MiTV Advert Framework",
            "System splash screens and video ad downloader daemon",
            "Ads"
        ),
        BloatPackage(
            "com.xiaomi.mitv.upgrade",
            "PatchWall Force Updater",
            "Silently auto-updates home screen bloatware",
            "Updater"
        ),
        BloatPackage(
            "com.android.printspooler",
            "Android Print Spooler",
            "Unnecessary printer background service consuming RAM on TVs",
            "System"
        ),
        BloatPackage(
            "com.google.android.feedback",
            "Google Feedback Daemon",
            "Crash logging and background error reporting service",
            "Google"
        ),
        BloatPackage(
            "com.google.android.videos",
            "Google TV Movies & Shows",
            "Legacy Google Play Movies app and recommendation hooks",
            "Google"
        ),
        BloatPackage(
            "com.google.android.play.games",
            "Google Play Games",
            "Cloud syncing and achievement daemon for games",
            "Google"
        )
    )

    val PRESETS = listOf(
        Preset(
            id = "speed_demon",
            title = "Speed Demon",
            badge = "Recommended",
            recommended = true,
            description = "Disables PatchWall ads, Xiaomi analytics, and print spooler. Sets animations to 0.5x. Retains Netflix, Prime, Disney+ & YouTube.",
            packagesToDisable = listOf(
                "com.mitv.gallery",
                "com.miui.tv.analytics",
                "com.xiaomi.mitv.advert",
                "com.xiaomi.mitv.upgrade",
                "com.android.printspooler"
            ),
            animationScale = "0.5"
        ),
        Preset(
            id = "balanced",
            title = "Balanced & Clean",
            badge = "Privacy Focus",
            description = "Stops background analytics and promo splash screens. Leaves stock launcher completely intact.",
            packagesToDisable = listOf(
                "com.miui.tv.analytics",
                "com.xiaomi.mitv.advert"
            ),
            animationScale = "0.75"
        ),
        Preset(
            id = "ultra_minimal",
            title = "Ultra Minimalist",
            badge = "Max RAM",
            description = "Strips all manufacturer services and freezes animations (0.0x). Ideal when using Projectivy Launcher.",
            packagesToDisable = listOf(
                "com.mitv.gallery",
                "com.miui.tv.analytics",
                "com.xiaomi.mitv.advert",
                "com.xiaomi.mitv.upgrade",
                "com.android.printspooler",
                "com.google.android.feedback",
                "com.google.android.videos"
            ),
            animationScale = "0.0"
        )
    )
}
