const express = require("express");
const path = require("path");
const open = require("open");
const adb = require("./adb-manager");
const { PRESETS, KNOWN_PACKAGES } = require("./catalog");

const app = express();
const PORT = process.env.PORT || 3456;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

let downloadProgress = "Idle";

// ADB Status & Setup
app.get("/api/status", async (req, res) => {
  try {
    const devices = adb.isReady ? await adb.getDevices() : [];
    res.json({
      adbReady: adb.isReady,
      adbSource: adb.adbPath,
      connectedDevice: adb.connectedDevice,
      activeDevices: devices,
      downloadProgress
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/setup-adb", async (req, res) => {
  try {
    downloadProgress = "Starting download...";
    adb.downloadAdb((status) => {
      downloadProgress = status;
    }).then(() => {
      downloadProgress = "Ready";
    }).catch((err) => {
      downloadProgress = `Error: ${err.message}`;
    });

    res.json({ success: true, message: "Download initiated in background" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Device Connection
app.post("/api/connect", async (req, res) => {
  const { ip, port } = req.body;
  if (!ip) return res.status(400).json({ error: "IP address required" });

  try {
    const result = await adb.connect(ip, port || 5555);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/disconnect", async (req, res) => {
  try {
    await adb.disconnect();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/scan", async (req, res) => {
  try {
    const foundIps = await adb.scanSubnet();
    res.json({ ips: foundIps });
  } catch (err) {
    res.status(500).json({ error: err.message, ips: [] });
  }
});

// Device Specs
app.get("/api/device-info", async (req, res) => {
  try {
    const info = await adb.getDeviceInfo();
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Packages & Presets
app.get("/api/packages", async (req, res) => {
  try {
    const packages = await adb.listPackages();
    res.json({ packages, presets: PRESETS });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/packages/disable", async (req, res) => {
  const { packageId } = req.body;
  if (!packageId) return res.status(400).json({ error: "packageId required" });

  try {
    const result = await adb.disablePackage(packageId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/packages/restore", async (req, res) => {
  const { packageId } = req.body;
  if (!packageId) return res.status(400).json({ error: "packageId required" });

  try {
    const result = await adb.restorePackage(packageId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/presets/apply", async (req, res) => {
  const { presetId } = req.body;
  if (!presetId) return res.status(400).json({ error: "presetId required" });

  try {
    const result = await adb.applyPreset(presetId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tweaks
app.post("/api/animations", async (req, res) => {
  const { scale } = req.body;
  try {
    const result = await adb.setAnimationSpeed(scale || "0.5");
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/trim-caches", async (req, res) => {
  try {
    const result = await adb.trimCaches();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/reboot", async (req, res) => {
  try {
    const result = await adb.reboot();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/open-playstore", async (req, res) => {
  const { packageId } = req.body || {};
  try {
    const result = await adb.openPlayStore(packageId || "com.spocky.projengmenu");
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/launcher/set-default", async (req, res) => {
  try {
    const result = await adb.setProjectivyAsDefault();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/launcher/restore-stock", async (req, res) => {
  try {
    const result = await adb.restoreStockLauncher();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/logs", (req, res) => {
  res.json({ logs: adb.lastLogs });
});

// Start Server & Initialize ADB
function startServer(port = PORT) {
  return new Promise(async (resolve, reject) => {
    try {
      await adb.init();
      const server = app.listen(port, async () => {
        const actualPort = server.address().port;
        const url = `http://localhost:${actualPort}`;
        console.log(`\n==================================================`);
        console.log(`🚀 Smart TV Optimizer is running at: ${url}`);
        console.log(`==================================================\n`);

        if (!process.env.NO_OPEN && !process.env.ELECTRON_RUN) {
          try {
            await open(url);
          } catch (_) {}
        }
        resolve({ app, server, port: actualPort, url });
      });
      server.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
}

if (require.main === module) {
  startServer().catch(console.error);
}

module.exports = { app, startServer, adb };
