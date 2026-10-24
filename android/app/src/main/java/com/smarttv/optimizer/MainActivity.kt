package com.smarttv.optimizer

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import androidx.lifecycle.lifecycleScope
import com.smarttv.optimizer.adb.AdbClient
import com.smarttv.optimizer.adb.TvScanner
import com.smarttv.optimizer.data.Preset
import com.smarttv.optimizer.ui.MainScreen
import com.smarttv.optimizer.ui.SmartTvOptimizerTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {

    private lateinit var adbClient: AdbClient

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        adbClient = AdbClient(applicationContext)

        setContent {
            SmartTvOptimizerTheme {
                var isConnected by remember { mutableStateOf(false) }
                var isScanning by remember { mutableStateOf(false) }
                var deviceModel by remember { mutableStateOf("") }
                var androidVersion by remember { mutableStateOf("") }
                val logs = remember { mutableStateListOf<String>() }
                val discoveredIps = remember { mutableStateListOf<String>() }

                fun addLog(msg: String) {
                    val timestamp = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())
                    logs.add("[$timestamp] $msg")
                    if (logs.size > 80) logs.removeAt(0)
                }

                MainScreen(
                    isConnected = isConnected,
                    isScanning = isScanning,
                    deviceModel = deviceModel,
                    androidVersion = androidVersion,
                    logs = logs,
                    discoveredIps = discoveredIps,
                    onScan = {
                        val prefix = TvScanner.getLocalSubnetPrefix()
                        if (prefix == null) {
                            Toast.makeText(this, "Connect to Wi-Fi first", Toast.LENGTH_SHORT).show()
                            addLog("Error: No active Wi-Fi subnet detected.")
                            return@MainScreen
                        }

                        isScanning = true
                        addLog("Scanning Wi-Fi subnet ${prefix}0/24 on port 5555...")
                        discoveredIps.clear()

                        lifecycleScope.launch {
                            val ips = TvScanner.scanSubnet(prefix)
                            isScanning = false
                            discoveredIps.addAll(ips)
                            if (ips.isEmpty()) {
                                addLog("Scan finished: No active ADB TVs found. Ensure Network Debugging is ON.")
                            } else {
                                addLog("Found ${ips.size} device(s): ${ips.joinToString()}")
                            }
                        }
                    },
                    onConnect = { ip ->
                        addLog("Connecting to $ip:5555...")
                        lifecycleScope.launch {
                            val ok = adbClient.connect(ip, 5555)
                            if (ok) {
                                isConnected = true
                                addLog("Connected! Querying device specifications...")
                                try {
                                    val model = adbClient.executeShell("getprop ro.product.model").trim()
                                    val os = adbClient.executeShell("getprop ro.build.version.release").trim()
                                    deviceModel = model
                                    androidVersion = "Android $os"
                                    addLog("Device: $model | Android $os")
                                } catch (e: Exception) {
                                    addLog("Info query error: ${e.message}")
                                }
                            } else {
                                addLog("Connection failed. Check IP and confirm 'Allow Debugging' on TV screen.")
                                Toast.makeText(this@MainActivity, "Connection failed or timed out", Toast.LENGTH_SHORT).show()
                            }
                        }
                    },
                    onDisconnect = {
                        adbClient.disconnect()
                        isConnected = false
                        deviceModel = ""
                        androidVersion = ""
                        addLog("Disconnected from TV.")
                    },
                    onApplyPreset = { preset ->
                        addLog("Applying preset: ${preset.title}...")
                        lifecycleScope.launch {
                            for (pkg in preset.packagesToDisable) {
                                try {
                                    val res = adbClient.executeShell("pm disable-user --user 0 $pkg").trim()
                                    addLog("Disable $pkg -> $res")
                                } catch (e: Exception) {
                                    addLog("Error disabling $pkg: ${e.message}")
                                }
                            }

                            // Apply animation scale
                            try {
                                adbClient.executeShell("settings put global window_animation_scale ${preset.animationScale}")
                                adbClient.executeShell("settings put global transition_animation_scale ${preset.animationScale}")
                                adbClient.executeShell("settings put global animator_duration_scale ${preset.animationScale}")
                                addLog("Set animation scale to ${preset.animationScale}x")
                            } catch (_: Exception) {}

                            // Trim caches
                            try {
                                adbClient.executeShell("pm trim-caches 2000M")
                                addLog("RAM caches trimmed.")
                            } catch (_: Exception) {}

                            addLog("Preset ${preset.title} applied successfully!")
                            Toast.makeText(this@MainActivity, "${preset.title} Applied!", Toast.LENGTH_SHORT).show()
                        }
                    },
                    onSetAnimation = { scale ->
                        lifecycleScope.launch {
                            try {
                                adbClient.executeShell("settings put global window_animation_scale $scale")
                                adbClient.executeShell("settings put global transition_animation_scale $scale")
                                adbClient.executeShell("settings put global animator_duration_scale $scale")
                                addLog("Animation speed updated to ${scale}x")
                                Toast.makeText(this@MainActivity, "Animations set to ${scale}x", Toast.LENGTH_SHORT).show()
                            } catch (e: Exception) {
                                addLog("Animation tweak failed: ${e.message}")
                            }
                        }
                    },
                    onTrimCaches = {
                        lifecycleScope.launch {
                            try {
                                val res = adbClient.executeShell("pm trim-caches 2000M").trim()
                                addLog("Caches trimmed: $res")
                                Toast.makeText(this@MainActivity, "TV RAM Caches Trimmed!", Toast.LENGTH_SHORT).show()
                            } catch (e: Exception) {
                                addLog("Trim cache failed: ${e.message}")
                            }
                        }
                    },
                    onOpenPlayStore = {
                        lifecycleScope.launch {
                            try {
                                val cmd = "am start -a android.intent.action.VIEW -d \"market://details?id=com.spocky.projengmenu\""
                                adbClient.executeShell(cmd)
                                addLog("Triggered Google Play Store for Projectivy Launcher on TV!")
                                Toast.makeText(this@MainActivity, "Opened on TV Screen!", Toast.LENGTH_SHORT).show()
                            } catch (e: Exception) {
                                addLog("Failed to open Play Store: ${e.message}")
                            }
                        }
                    },
                    onReboot = {
                        lifecycleScope.launch {
                            try {
                                addLog("Sending reboot signal to TV...")
                                adbClient.executeShell("reboot")
                                adbClient.disconnect()
                                isConnected = false
                                addLog("Reboot command sent. TV is restarting.")
                            } catch (e: Exception) {
                                addLog("Reboot failed: ${e.message}")
                            }
                        }
                    }
                )
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        adbClient.disconnect()
    }
}
