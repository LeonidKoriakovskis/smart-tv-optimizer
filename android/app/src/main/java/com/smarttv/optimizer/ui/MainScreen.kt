package com.smarttv.optimizer.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smarttv.optimizer.data.Catalog
import com.smarttv.optimizer.data.Preset

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    isConnected: Boolean,
    isScanning: Boolean,
    deviceModel: String,
    androidVersion: String,
    logs: List<String>,
    discoveredIps: List<String>,
    onScan: () -> Unit,
    onConnect: (String) -> Unit,
    onDisconnect: () -> Unit,
    onApplyPreset: (Preset) -> Unit,
    onSetAnimation: (String) -> Unit,
    onTrimCaches: () -> Unit,
    onOpenPlayStore: () -> Unit,
    onReboot: () -> Unit
) {
    var ipInput by remember { mutableStateOf("") }

    Scaffold(
        containerColor = DarkBackground,
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Tv,
                            contentDescription = "Logo",
                            tint = CyanGlow,
                            modifier = Modifier.size(28.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            "Smart TV Optimizer",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = DarkSurface
                )
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 1. Connection Card
            item {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = DarkCard),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "Target TV Connection",
                                color = Color.White,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 16.sp
                            )
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(if (isConnected) EmeraldGreen.copy(alpha = 0.2f) else TextMuted.copy(alpha = 0.15f))
                                    .padding(horizontal = 10.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    if (isConnected) "CONNECTED" else "DISCONNECTED",
                                    color = if (isConnected) EmeraldGreen else TextMuted,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = ipInput,
                            onValueChange = { ipInput = it },
                            label = { Text("TV Local IP (e.g. 192.168.1.150)", color = TextMuted) },
                            singleLine = true,
                            enabled = !isConnected,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White,
                                focusedBorderColor = CyanGlow,
                                unfocusedBorderColor = TextMuted.copy(alpha = 0.5f)
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Button(
                                onClick = onScan,
                                enabled = !isConnected && !isScanning,
                                colors = ButtonDefaults.buttonColors(containerColor = DarkSurface),
                                modifier = Modifier.weight(1f)
                            ) {
                                if (isScanning) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(16.dp),
                                        color = CyanGlow,
                                        strokeWidth = 2.dp
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Scanning...", color = CyanGlow)
                                } else {
                                    Icon(Icons.Default.WifiFind, contentDescription = null, tint = CyanGlow)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Scan Wi-Fi", color = CyanGlow)
                                }
                            }

                            Button(
                                onClick = {
                                    if (isConnected) onDisconnect() else onConnect(ipInput)
                                },
                                enabled = isConnected || ipInput.isNotBlank(),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (isConnected) DangerRed else CyanGlow
                                ),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text(
                                    if (isConnected) "Disconnect" else "Connect",
                                    color = if (isConnected) Color.White else Color.Black,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        // Discovered devices chips
                        if (discoveredIps.isNotEmpty() && !isConnected) {
                            Spacer(modifier = Modifier.height(12.dp))
                            Text("Discovered on Wi-Fi:", color = TextMuted, fontSize = 12.sp)
                            Spacer(modifier = Modifier.height(6.dp))
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                items(discoveredIps) { ip ->
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(DarkSurface)
                                            .border(1.dp, CyanGlow.copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                                            .clickable {
                                                ipInput = ip
                                                onConnect(ip)
                                            }
                                            .padding(horizontal = 10.dp, vertical = 6.dp)
                                    ) {
                                        Text(ip, color = CyanGlow, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 2. Device Specs Card (when connected)
            if (isConnected) {
                item {
                    Card(
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = DarkCard),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                "Connected Device Specs",
                                color = TextMuted,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column {
                                    Text("Model", color = TextMuted, fontSize = 11.sp)
                                    Text(deviceModel.ifBlank { "Smart TV" }, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                }
                                Column {
                                    Text("OS", color = TextMuted, fontSize = 11.sp)
                                    Text(androidVersion.ifBlank { "Android TV" }, color = EmeraldGreen, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                }
                                Column {
                                    Text("Status", color = TextMuted, fontSize = 11.sp)
                                    Text("Online", color = CyanGlow, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                }
                            }
                        }
                    }
                }
            }

            // 3. 1-Click Presets
            item {
                Text(
                    "1-Click Optimization Presets",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            }

            items(Catalog.PRESETS) { preset ->
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (preset.recommended) DarkSurface else DarkCard
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .then(
                            if (preset.recommended) Modifier.border(1.dp, CyanGlow, RoundedCornerShape(16.dp))
                            else Modifier
                        )
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    preset.title,
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 17.sp
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(if (preset.recommended) CyanGlow.copy(alpha = 0.2f) else TextMuted.copy(alpha = 0.15f))
                                        .padding(horizontal = 8.dp, vertical = 2.dp)
                                ) {
                                    Text(
                                        preset.badge,
                                        color = if (preset.recommended) CyanGlow else TextMuted,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            preset.description,
                            color = TextMuted,
                            fontSize = 13.sp,
                            lineHeight = 18.sp
                        )

                        Spacer(modifier = Modifier.height(12.dp))
                        Button(
                            onClick = { onApplyPreset(preset) },
                            enabled = isConnected,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (preset.recommended) CyanGlow else EmeraldGreen
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                "Apply ${preset.title}",
                                color = Color.Black,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            // 4. Quick Tweaks Section
            item {
                Text(
                    "Quick Tweaks & Tools",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            }

            item {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = DarkCard),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("UI Animation Speed", color = TextMuted, fontSize = 13.sp)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            listOf("0.5" to "0.5x (Fast)", "0.25" to "0.25x", "0.0" to "Off (0x)").forEach { (scale, label) ->
                                OutlinedButton(
                                    onClick = { onSetAnimation(scale) },
                                    enabled = isConnected,
                                    modifier = Modifier.weight(1f),
                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = CyanGlow)
                                ) {
                                    Text(label, fontSize = 12.sp)
                                }
                            }
                        }

                        Divider(color = TextMuted.copy(alpha = 0.2f))

                        Button(
                            onClick = onTrimCaches,
                            enabled = isConnected,
                            colors = ButtonDefaults.buttonColors(containerColor = DarkSurface),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.CleaningServices, contentDescription = null, tint = EmeraldGreen)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Trim TV RAM Caches", color = EmeraldGreen)
                        }

                        Button(
                            onClick = onOpenPlayStore,
                            enabled = isConnected,
                            colors = ButtonDefaults.buttonColors(containerColor = DarkSurface),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.Storefront, contentDescription = null, tint = PurpleAccent)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Open Projectivy Launcher in TV Play Store", color = PurpleAccent)
                        }

                        Button(
                            onClick = onReboot,
                            enabled = isConnected,
                            colors = ButtonDefaults.buttonColors(containerColor = DarkSurface),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.RestartAlt, contentDescription = null, tint = DangerRed)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Reboot Smart TV", color = DangerRed)
                        }
                    }
                }
            }

            // 5. Activity Log Console
            item {
                Text(
                    "Activity Log",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            }

            item {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.Black),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(180.dp)
                ) {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(12.dp)
                    ) {
                        if (logs.isEmpty()) {
                            item {
                                Text("Ready. Connect to a Smart TV to begin.", color = TextMuted, fontSize = 12.sp, fontFamily = FontFamily.Monospace)
                            }
                        } else {
                            items(logs) { log ->
                                Text(log, color = EmeraldGreen, fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                            }
                        }
                    }
                }
            }
        }
    }
}
