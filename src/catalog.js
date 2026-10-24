// Database of known Xiaomi TV / Android TV / Google TV packages
// Categorized by safety level and impact

const KNOWN_PACKAGES = [
  // --- XIAOMI AD SERVICES & PATCHWALL ---
  {
    id: "com.xiaomi.mitv.advert",
    name: "Xiaomi TV Ad Daemon",
    category: "ads",
    risk: "safe",
    recommendation: "remove",
    description: "Displays boot splash ads, banner ads, and screen-saver advertisements. Disabling this eliminates Xiaomi popups.",
    tags: ["xiaomi", "ads", "speedup"]
  },
  {
    id: "com.miui.tv.analytics",
    name: "Xiaomi TV Analytics & Telemetry",
    category: "telemetry",
    risk: "safe",
    recommendation: "remove",
    description: "Tracks user interaction, remote button presses, and content viewing habits. Constantly sends network pings.",
    tags: ["xiaomi", "telemetry", "privacy"]
  },
  {
    id: "com.xiaomi.mitv.upgrade",
    name: "Xiaomi System App Auto-Updater",
    category: "bloat",
    risk: "safe",
    recommendation: "remove",
    description: "Silently re-downloads and updates unwanted PatchWall widgets and sponsored apps in the background.",
    tags: ["xiaomi", "bloat"]
  },
  {
    id: "com.mitv.tvhome",
    name: "PatchWall Home Screen",
    category: "patchwall",
    risk: "safe",
    recommendation: "remove",
    description: "The heavy, ad-laden PatchWall launcher. Consumes massive RAM. Recommended to disable if using Projectivy Launcher or standard Android TV Home.",
    tags: ["xiaomi", "launcher", "patchwall"]
  },
  {
    id: "com.xiaomi.mitv.shop",
    name: "Xiaomi TV Store / Mi Shop",
    category: "bloat",
    risk: "safe",
    recommendation: "remove",
    description: "Built-in promotional shopping app with banner recommendations.",
    tags: ["xiaomi", "bloat"]
  },
  {
    id: "com.xiaomi.mitv.tvpush.tvpushservice",
    name: "Xiaomi Push Notification Service",
    category: "ads",
    risk: "safe",
    recommendation: "remove",
    description: "Pushes promotional notifications and suggestions to the notification bar.",
    tags: ["xiaomi", "ads"]
  },
  {
    id: "com.xiaomi.mitv.gallery",
    name: "Xiaomi TV Gallery",
    category: "bloat",
    risk: "safe",
    recommendation: "remove",
    description: "Stock media gallery. Rarely used on TV boxes; VLC or Nova Player are superior.",
    tags: ["xiaomi", "bloat"]
  },
  {
    id: "com.xiaomi.mitv.mediaexplorer",
    name: "Xiaomi Media Explorer",
    category: "bloat",
    risk: "safe",
    recommendation: "remove",
    description: "Default file/media browser. Heavy and contains promotional suggestions.",
    tags: ["xiaomi", "bloat"]
  },
  {
    id: "com.xiaomi.mitv.calendar",
    name: "Xiaomi TV Calendar",
    category: "bloat",
    risk: "safe",
    recommendation: "remove",
    description: "Calendar app that runs background alarms and consumes memory.",
    tags: ["xiaomi", "bloat"]
  },
  {
    id: "com.xiaomi.mitv.care",
    name: "Xiaomi TV Care / Feedback",
    category: "telemetry",
    risk: "safe",
    recommendation: "remove",
    description: "Diagnostics and feedback collector running background services.",
    tags: ["xiaomi", "telemetry"]
  },
  {
    id: "com.xiaomi.mitv.voice",
    name: "PatchWall Voice Assistant",
    category: "bloat",
    risk: "safe",
    recommendation: "remove",
    description: "Xiaomi's internal voice assistant (separate from Google Assistant). Safe to remove if you use Google Assistant or standard voice search.",
    tags: ["xiaomi", "bloat"]
  },
  {
    id: "com.xiaomi.mitv.smartshare",
    name: "Xiaomi Smart Share",
    category: "bloat",
    risk: "safe",
    recommendation: "remove",
    description: "Xiaomi-specific screen mirroring tool. Standard Google Cast / Chromecast is built-in and far better.",
    tags: ["xiaomi", "bloat"]
  },
  {
    id: "com.xiaomi.mitv.video",
    name: "Xiaomi TV Video Player",
    category: "bloat",
    risk: "safe",
    recommendation: "remove",
    description: "Integrated video app displaying online promotional feeds.",
    tags: ["xiaomi", "bloat"]
  },
  {
    id: "com.xiaomi.devicelist",
    name: "Xiaomi Device List Service",
    category: "bloat",
    risk: "safe",
    recommendation: "remove",
    description: "Scans local network for other Xiaomi smart appliances (vacuum, lights, etc.).",
    tags: ["xiaomi", "bloat"]
  },
  {
    id: "com.xiaomi.mitv.screensaver",
    name: "Xiaomi Ad Screensaver",
    category: "ads",
    risk: "safe",
    recommendation: "remove",
    description: "Displays promotional wallpapers and ads when idle. Android's native backdrop works better.",
    tags: ["xiaomi", "ads"]
  },

  // --- GOOGLE TV / ANDROID TV SPONSORED CLUTTER ---
  {
    id: "com.google.android.videos",
    name: "Google TV / Play Movies",
    category: "google",
    risk: "safe",
    recommendation: "remove",
    description: "Promotional movie store. Disabling it speeds up the home screen by removing row recommendations.",
    tags: ["google", "speedup"]
  },
  {
    id: "com.google.android.apps.youtube.music",
    name: "YouTube Music for TV",
    category: "google",
    risk: "safe",
    recommendation: "optional",
    description: "Pre-installed YouTube Music TV app. Safe to remove if you use Spotify or standard YouTube.",
    tags: ["google", "streaming"]
  },
  {
    id: "com.google.android.tv.bugreportsender",
    name: "Google TV Bug Report Sender",
    category: "telemetry",
    risk: "safe",
    recommendation: "remove",
    description: "Background diagnostic log collector that uploads crash logs to Google.",
    tags: ["google", "telemetry"]
  },
  {
    id: "com.google.android.play.games",
    name: "Google Play Games TV",
    category: "google",
    risk: "safe",
    recommendation: "remove",
    description: "Game service for TV. Safe to disable if you do not play Android games on the TV box.",
    tags: ["google", "gaming"]
  },
  {
    id: "com.android.providers.partnerbookmarks",
    name: "Partner Bookmarks Provider",
    category: "bloat",
    risk: "safe",
    recommendation: "remove",
    description: "Injects sponsor bookmarks and partner links into browsers.",
    tags: ["system", "bloat"]
  },
  {
    id: "com.android.printspooler",
    name: "Android Print Spooler",
    category: "bloat",
    risk: "safe",
    recommendation: "remove",
    description: "Printer service running on TV. You never print documents from a TV box.",
    tags: ["system", "bloat"]
  },
  {
    id: "com.android.dreams.basic",
    name: "Basic Dreams Screensaver",
    category: "bloat",
    risk: "safe",
    recommendation: "optional",
    description: "Stock Android daydream screensaver.",
    tags: ["system"]
  },

  // --- PRE-INSTALLED THIRD-PARTY SPONSORS ---
  {
    id: "com.amazon.amazonvideo.livingroom",
    name: "Amazon Prime Video",
    category: "streaming",
    risk: "optional",
    recommendation: "keep",
    description: "Pre-installed Prime Video app. Disable only if you do not have an Amazon Prime subscription.",
    tags: ["streaming"]
  },
  {
    id: "com.netflix.ninja",
    name: "Netflix for Android TV",
    category: "streaming",
    risk: "optional",
    recommendation: "keep",
    description: "Pre-installed Netflix app. Keep if you watch Netflix.",
    tags: ["streaming"]
  },

  // --- CRITICAL / PROTECTED SYSTEM SERVICES (NEVER REMOVE) ---
  {
    id: "com.google.android.katniss",
    name: "Google Search & Assistant",
    category: "system_core",
    risk: "critical",
    recommendation: "keep",
    description: "Voice remote mic listener and Assistant functionality. Keep to ensure the remote mic button works.",
    tags: ["core", "voice"]
  },
  {
    id: "com.google.android.inputmethod.latin",
    name: "Gboard / Leanback Keyboard",
    category: "system_core",
    risk: "critical",
    recommendation: "keep",
    description: "The on-screen TV keyboard. Removing this will prevent typing passwords or search terms.",
    tags: ["core", "input"]
  },
  {
    id: "com.google.android.tv.remote.service",
    name: "Android TV Remote Service",
    category: "system_core",
    risk: "critical",
    recommendation: "keep",
    description: "Bluetooth remote communication and Google TV phone remote app pairing.",
    tags: ["core", "remote"]
  },
  {
    id: "com.google.android.packageinstaller",
    name: "Package Installer",
    category: "system_core",
    risk: "critical",
    recommendation: "keep",
    description: "Android system service required to install and update apps.",
    tags: ["core"]
  },
  {
    id: "com.google.android.apps.tv.launcherx",
    name: "Google TV Home Screen",
    category: "system_core",
    risk: "critical",
    recommendation: "keep",
    description: "Google TV system home launcher. Protected to ensure zero recovery screens.",
    tags: ["core", "launcher"]
  },
  {
    id: "com.google.android.tvlauncher",
    name: "Android TV Home Launcher",
    category: "system_core",
    risk: "critical",
    recommendation: "keep",
    description: "Stock Android TV home launcher.",
    tags: ["core", "launcher"]
  },
  {
    id: "com.android.systemui",
    name: "Android System UI",
    category: "system_core",
    risk: "critical",
    recommendation: "keep",
    description: "Core Android status bar, volume bar, and notification framework.",
    tags: ["core"]
  },
  {
    id: "com.google.android.gms",
    name: "Google Play Services",
    category: "system_core",
    risk: "critical",
    recommendation: "keep",
    description: "Required for Google Play Store, DRM Widevine licensing, and streaming apps.",
    tags: ["core"]
  },
  {
    id: "com.android.vending",
    name: "Google Play Store",
    category: "system_core",
    risk: "critical",
    recommendation: "keep",
    description: "App store for updates and app installations.",
    tags: ["core"]
  }
];

// Presets
const PRESETS = {
  speed_demon: {
    id: "speed_demon",
    name: "🚀 Speed Demon (Recommended)",
    description: "Removes all Xiaomi PatchWall bloat, telemetry, ad daemons, print spooler, and speeds up animations to 0.5x. Frees up maximum RAM while keeping remote, Google Play, and streaming intact.",
    targetRisk: ["safe"],
    includeCategories: ["ads", "telemetry", "patchwall", "bloat"],
    animationScale: "0.5"
  },
  balanced: {
    id: "balanced",
    name: "🛡️ Balanced & Clean",
    description: "Disables background tracking, telemetry, and banner ad services. Leaves default launcher untouched and sets animations to 0.5x.",
    targetRisk: ["safe"],
    includeCategories: ["ads", "telemetry"],
    animationScale: "0.5"
  },
  extreme_minimalist: {
    id: "extreme_minimalist",
    name: "⚡ Ultra Minimalist (For Projectivy Users)",
    description: "Aggressively strips all manufacturer services, unused Google apps, and disables all animations (0.0x) for instant instant response. Best paired with Projectivy Launcher.",
    targetRisk: ["safe"],
    includeCategories: ["ads", "telemetry", "patchwall", "bloat", "google"],
    animationScale: "0.0"
  }
};

module.exports = {
  KNOWN_PACKAGES,
  PRESETS
};
