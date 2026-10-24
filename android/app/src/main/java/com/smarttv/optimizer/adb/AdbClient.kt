package com.smarttv.optimizer.adb

import android.content.Context
import android.util.Base64
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.InputStream
import java.io.OutputStream
import java.math.BigInteger
import java.net.InetSocketAddress
import java.net.Socket
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.security.KeyFactory
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.Signature
import java.security.interfaces.RSAPrivateCrtKey
import java.security.interfaces.RSAPublicKey
import java.security.spec.PKCS8EncodedKeySpec
import java.security.spec.X509EncodedKeySpec

class AdbClient(private val context: Context) {

    companion object {
        const val A_SYNC = 0x434e5953
        const val A_CNXN = 0x4e584e43
        const val A_OPEN = 0x4e45504f
        const val A_OKAY = 0x59414b4f
        const val A_CLSE = 0x45534c43
        const val A_WRTE = 0x45545257
        const val A_AUTH = 0x48545541

        const val ADB_VERSION = 0x01000000
        const val MAX_DATA = 4096

        const val AUTH_TYPE_TOKEN = 1
        const val AUTH_TYPE_SIGNATURE = 2
        const val AUTH_TYPE_RSA_PUBLIC_KEY = 3
    }

    private var socket: Socket? = null
    private var inStream: InputStream? = null
    private var outStream: OutputStream? = null
    private var isConnected = false
    private var localIdCounter = 1

    private val keyPair: KeyPair by lazy { getOrCreateKeyPair() }

    private fun getOrCreateKeyPair(): KeyPair {
        val prefs = context.getSharedPreferences("adb_keys", Context.MODE_PRIVATE)
        val privStr = prefs.getString("private_key", null)
        val pubStr = prefs.getString("public_key", null)

        if (privStr != null && pubStr != null) {
            try {
                val kf = KeyFactory.getInstance("RSA")
                val privBytes = Base64.decode(privStr, Base64.DEFAULT)
                val pubBytes = Base64.decode(pubStr, Base64.DEFAULT)
                val privKey = kf.generatePrivate(PKCS8EncodedKeySpec(privBytes))
                val pubKey = kf.generatePublic(X509EncodedKeySpec(pubBytes))
                return KeyPair(pubKey, privKey)
            } catch (_: Exception) {}
        }

        val kpg = KeyPairGenerator.getInstance("RSA")
        kpg.initialize(2048)
        val newKp = kpg.generateKeyPair()

        prefs.edit()
            .putString("private_key", Base64.encodeToString(newKp.private.encoded, Base64.DEFAULT))
            .putString("public_key", Base64.encodeToString(newKp.public.encoded, Base64.DEFAULT))
            .apply()

        return newKp
    }

    suspend fun connect(ip: String, port: Int = 5555): Boolean = withContext(Dispatchers.IO) {
        disconnect()
        try {
            val sock = Socket()
            sock.connect(InetSocketAddress(ip, port), 5000)
            sock.soTimeout = 8000
            socket = sock
            inStream = sock.getInputStream()
            outStream = sock.getOutputStream()

            // 1. Send CNXN
            val banner = "host::SmartTvOptimizerPhone\u0000".toByteArray(Charsets.UTF_8)
            writeMessage(A_CNXN, ADB_VERSION, MAX_DATA, banner)

            // 2. Read response
            var response = readMessage()
            if (response.command == A_AUTH && response.arg0 == AUTH_TYPE_TOKEN) {
                // Device sent challenge token
                val token = response.data

                // Try signature first
                try {
                    val sig = Signature.getInstance("SHA1withRSA")
                    sig.initSign(keyPair.private)
                    sig.update(token)
                    val signed = sig.sign()
                    writeMessage(A_AUTH, AUTH_TYPE_SIGNATURE, 0, signed)
                    response = readMessage()
                } catch (_: Exception) {}

                // If still A_AUTH, send public key to prompt TV on screen
                if (response.command == A_AUTH) {
                    val pubBytes = buildAdbPublicKey(keyPair.public as RSAPublicKey)
                    writeMessage(A_AUTH, AUTH_TYPE_RSA_PUBLIC_KEY, 0, pubBytes)
                    response = readMessage()
                }
            }

            if (response.command == A_CNXN) {
                isConnected = true
                return@withContext true
            }
        } catch (_: Exception) {
            disconnect()
        }
        false
    }

    suspend fun executeShell(command: String): String = withContext(Dispatchers.IO) {
        if (!isConnected || socket == null) throw IllegalStateException("Not connected to TV")

        val localId = localIdCounter++
        val dest = "shell:$command\u0000".toByteArray(Charsets.UTF_8)
        writeMessage(A_OPEN, localId, 0, dest)

        val openResp = readMessage()
        if (openResp.command != A_OKAY) {
            throw IllegalStateException("Failed to open shell stream: cmd=0x${Integer.toHexString(openResp.command)}")
        }

        val remoteId = openResp.arg0
        val outputBuilder = StringBuilder()

        while (true) {
            val msg = readMessage()
            when (msg.command) {
                A_WRTE -> {
                    outputBuilder.append(String(msg.data, Charsets.UTF_8))
                    writeMessage(A_OKAY, localId, remoteId, ByteArray(0))
                }
                A_CLSE -> {
                    writeMessage(A_CLSE, localId, remoteId, ByteArray(0))
                    break
                }
                A_OKAY -> {
                    // Ack
                }
                else -> break
            }
        }

        outputBuilder.toString()
    }

    fun disconnect() {
        try {
            socket?.close()
        } catch (_: Exception) {}
        socket = null
        inStream = null
        outStream = null
        isConnected = false
    }

    private fun writeMessage(cmd: Int, arg0: Int, arg1: Int, data: ByteArray) {
        val stream = outStream ?: throw IllegalStateException("Stream closed")
        val crc = calculateCrc32(data)
        val magic = cmd xor -0x1

        val buf = ByteBuffer.allocate(24 + data.size).order(ByteOrder.LITTLE_ENDIAN)
        buf.putInt(cmd)
        buf.putInt(arg0)
        buf.putInt(arg1)
        buf.putInt(data.size)
        buf.putInt(crc)
        buf.putInt(magic)
        if (data.isNotEmpty()) buf.put(data)

        stream.write(buf.array())
        stream.flush()
    }

    private fun readMessage(): AdbMessage {
        val stream = inStream ?: throw IllegalStateException("Stream closed")
        val header = ByteArray(24)
        var read = 0
        while (read < 24) {
            val n = stream.read(header, read, 24 - read)
            if (n < 0) throw IllegalStateException("End of stream reached")
            read += n
        }

        val buf = ByteBuffer.wrap(header).order(ByteOrder.LITTLE_ENDIAN)
        val cmd = buf.getInt()
        val arg0 = buf.getInt()
        val arg1 = buf.getInt()
        val len = buf.getInt()
        val crc = buf.getInt()
        val magic = buf.getInt()

        val data = if (len > 0) {
            val payload = ByteArray(len)
            var pRead = 0
            while (pRead < len) {
                val n = stream.read(payload, pRead, len - pRead)
                if (n < 0) throw IllegalStateException("End of payload stream")
                pRead += n
            }
            payload
        } else ByteArray(0)

        return AdbMessage(cmd, arg0, arg1, len, crc, magic, data)
    }

    private fun calculateCrc32(data: ByteArray): Int {
        var sum = 0
        for (b in data) {
            sum += (b.toInt() and 0xFF)
        }
        return sum
    }

    private fun buildAdbPublicKey(pubKey: RSAPublicKey): ByteArray {
        val n = pubKey.modulus
        val r32 = BigInteger.valueOf(2).pow(32)
        val rr = BigInteger.valueOf(2).pow(4096).mod(n)
        val rem = n.mod(r32).toLong()
        val n0inv = (BigInteger.valueOf(rem).modInverse(r32)).toLong()

        val buf = ByteBuffer.allocate(524).order(ByteOrder.LITTLE_ENDIAN)
        buf.putInt(64) // 2048 / 32
        buf.putInt((-n0inv).toInt())
        val nBytes = getLittleEndianPadded(n, 256)
        val rrBytes = getLittleEndianPadded(rr, 256)
        buf.put(nBytes)
        buf.put(rrBytes)
        buf.putInt(pubKey.publicExponent.toInt())

        val b64 = Base64.encodeToString(buf.array(), Base64.NO_WRAP)
        return "$b64 smart_tv_optimizer@phone\u0000".toByteArray(Charsets.UTF_8)
    }

    private fun getLittleEndianPadded(bigInt: BigInteger, size: Int): ByteArray {
        val arr = bigInt.toByteArray()
        val res = ByteArray(size)
        var i = 0
        var j = arr.size - 1
        while (j >= 0 && i < size) {
            res[i] = arr[j]
            i++
            j--
        }
        return res
    }

    data class AdbMessage(
        val command: Int,
        val arg0: Int,
        val arg1: Int,
        val length: Int,
        val crc32: Int,
        val magic: Int,
        val data: ByteArray
    )
}
