package com.smarttv.optimizer.adb

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.withContext
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.net.Socket

object TvScanner {

    fun getLocalSubnetPrefix(): String? {
        try {
            val interfaces = NetworkInterface.getNetworkInterfaces().toList()
            for (intf in interfaces) {
                if (intf.isLoopback || !intf.isUp) continue
                for (addr in intf.inetAddresses) {
                    if (!addr.isLoopbackAddress && addr.hostAddress?.contains(":") == false) {
                        val host = addr.hostAddress ?: continue
                        if (host.startsWith("192.168.") || host.startsWith("10.") || host.startsWith("172.")) {
                            val lastDot = host.lastIndexOf('.')
                            if (lastDot != -1) {
                                return host.substring(0, lastDot + 1)
                            }
                        }
                    }
                }
            }
        } catch (_: Exception) {}
        return null
    }

    suspend fun scanSubnet(
        prefix: String,
        port: Int = 5555,
        onProgress: (Int, Int) -> Unit = { _, _ -> }
    ): List<String> = withContext(Dispatchers.IO) {
        val foundDevices = mutableListOf<String>()
        val total = 254
        val batchSize = 32

        for (chunkStart in 1..total step batchSize) {
            val chunkEnd = minOf(chunkStart + batchSize - 1, total)
            val deferreds = (chunkStart..chunkEnd).map { i ->
                async {
                    val ip = "$prefix$i"
                    if (isPortOpen(ip, port, timeoutMs = 350)) {
                        ip
                    } else null
                }
            }

            val results = deferreds.awaitAll()
            results.filterNotNull().forEach { foundDevices.add(it) }
            onProgress(chunkEnd, total)
        }

        foundDevices
    }

    private fun isPortOpen(ip: String, port: Int, timeoutMs: Int): Boolean {
        return try {
            Socket().use { socket ->
                socket.connect(InetSocketAddress(ip, port), timeoutMs)
                true
            }
        } catch (_: Exception) {
            false
        }
    }
}
