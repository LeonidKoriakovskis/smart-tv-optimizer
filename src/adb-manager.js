const { exec, execFile } = require("child_process");
const path = require("path");
const fs = require("fs");
const net = require("net");
const os = require("os");
const { KNOWN_PACKAGES } = require("./catalog");

class AdbManager {
  constructor() {
    this.binDir = this.resolveBinDir();
    this.adbPath = "adb"; // default fallback
    this.connectedDevice = null;
    this.isReady = false;
    this.lastLogs = [];
  }

  resolveBinDir() {
    if (process.env.ADB_BIN_DIR && fs.existsSync(process.env.ADB_BIN_DIR)) {
      return process.env.ADB_BIN_DIR;
    }
    // Electron packaged extraResources
    if (process.resourcesPath) {
      const resourceBin = path.join(process.resourcesPath, "bin");
      if (fs.existsSync(resourceBin)) {
        return resourceBin;
      }
    }
    const localBin = path.join(__dirname, "..", "bin");
    if (fs.existsSync(localBin)) {
      return localBin;
    }
    if (process.env.APPDATA) {
      return path.join(process.env.APPDATA, "SmartTVOptimizer", "bin");
    }
    return localBin;
  }

  log(msg) {
    const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
    console.log(entry);
    this.lastLogs.push(entry);
    if (this.lastLogs.length > 100) this.lastLogs.shift();
  }

  async init() {
    this.binDir = this.resolveBinDir();
    this.log(`Initializing ADB Manager (BinDir: ${this.binDir})...`);
    // Check if system adb exists
    const hasSystemAdb = await this.testAdbCommand("adb");
    if (hasSystemAdb) {
      this.adbPath = "adb";
      this.isReady = true;
      this.log("Using system-installed ADB.");
      return { ready: true, path: "adb", source: "system" };
    }

    // Check if local bin/platform-tools/adb.exe exists
    const localAdb = path.join(this.binDir, "platform-tools", "adb.exe");
    if (fs.existsSync(localAdb)) {
      this.adbPath = localAdb;
      this.isReady = true;
      this.log(`Using bundled ADB at: ${localAdb}`);
      return { ready: true, path: localAdb, source: "bundled" };
    }

    this.log("No ADB binary found. Automated download required.");
    return { ready: false, path: null, source: "none" };
  }

  testAdbCommand(cmdPath) {
    return new Promise((resolve) => {
      exec(`"${cmdPath}" version`, { timeout: 3000 }, (err, stdout) => {
        if (!err && stdout.includes("Android Debug Bridge")) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }

  async downloadAdb(progressCallback = () => {}) {
    this.log("Starting automatic download of Google Android Platform-Tools...");
    progressCallback("Creating bin directory...");

    if (!fs.existsSync(this.binDir)) {
      fs.mkdirSync(this.binDir, { recursive: true });
    }

    const zipPath = path.join(this.binDir, "platform-tools.zip");
    const downloadUrl = "https://dl.google.com/android/repository/platform-tools-latest-windows.zip";

    progressCallback("Downloading official Google platform-tools zip (~15 MB)...");
    const res = await fetch(downloadUrl);
    if (!res.ok) throw new Error(`Download failed with HTTP ${res.status}`);

    const fileStream = fs.createWriteStream(zipPath);
    const reader = res.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fileStream.write(Buffer.from(value));
    }
    fileStream.end();

    await new Promise((resolve, reject) => {
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });

    progressCallback("Extracting platform-tools with PowerShell...");
    await new Promise((resolve, reject) => {
      const psCmd = `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${this.binDir}' -Force"`;
      exec(psCmd, { timeout: 60000 }, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    try {
      fs.unlinkSync(zipPath);
    } catch (_) {}

    const localAdb = path.join(this.binDir, "platform-tools", "adb.exe");
    if (!fs.existsSync(localAdb)) {
      throw new Error("ADB executable not found after extraction.");
    }

    this.adbPath = localAdb;
    this.isReady = true;
    this.log("Platform-tools ready and initialized successfully.");
    progressCallback("ADB ready!");
    return true;
  }

  execAdb(args, timeout = 12000) {
    return new Promise((resolve, reject) => {
      const fullCmd = `"${this.adbPath}" ${args}`;
      exec(fullCmd, { timeout }, (err, stdout, stderr) => {
        if (err) {
          // Even if err exists, stdout/stderr might contain meaningful info
          return resolve({ ok: false, error: err.message, stdout: stdout?.trim() || "", stderr: stderr?.trim() || "" });
        }
        resolve({ ok: true, stdout: stdout?.trim() || "", stderr: stderr?.trim() || "" });
      });
    });
  }

  async connect(ip, port = 5555) {
    if (!this.isReady) throw new Error("ADB binary is not initialized yet.");
    const target = `${ip.trim()}:${port}`;
    this.log(`Attempting ADB connection to ${target}...`);

    const res = await this.execAdb(`connect ${target}`);
    const out = (res.stdout + " " + res.stderr).toLowerCase();

    // Check devices state
    let devs = await this.getDevices();
    let dev = devs.find(d => d.id === target);

    if (dev && dev.state === "device") {
      this.connectedDevice = target;
      this.log(`Successfully connected to ${target}`);
      return { success: true, target, message: "Connected successfully!" };
    }

    if (out.includes("unauthorized") || out.includes("authenticate") || (dev && dev.state === "unauthorized")) {
      return {
        success: false,
        target,
        unauthorized: true,
        message: "Look at your TV screen now! Check 'Always allow from this computer' and press OK with your remote, then click Connect again."
      };
    }

    if (out.includes("connected to") || out.includes("already connected")) {
      this.connectedDevice = target;
      this.log(`Successfully connected to ${target}`);
      return { success: true, target, message: res.stdout };
    }

    return {
      success: false,
      target,
      message: res.stdout || res.stderr || "Connection timed out. Check IP and ensure USB Debugging is ON in TV Developer Options."
    };
  }

  async disconnect(ip) {
    const target = ip || this.connectedDevice;
    if (target) {
      await this.execAdb(`disconnect ${target}`);
      if (this.connectedDevice === target) {
        this.connectedDevice = null;
      }
    }
    return { success: true };
  }

  async getDevices() {
    const res = await this.execAdb("devices -l");
    if (!res.ok) return [];

    const lines = res.stdout.split("\n").slice(1);
    const devices = [];
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const id = parts[0];
        const state = parts[1];
        devices.push({ id, state, details: line.trim() });
      }
    }
    return devices;
  }

  async getDeviceInfo() {
    if (!this.connectedDevice) {
      const devs = await this.getDevices();
      const connected = devs.find(d => d.state === "device");
      if (connected) {
        this.connectedDevice = connected.id;
      } else {
        throw new Error("No device currently connected.");
      }
    }

    const d = this.connectedDevice;
    const [modelRes, manRes, verRes, sdkRes, memRes, animRes] = await Promise.all([
      this.execAdb(`-s ${d} shell getprop ro.product.model`),
      this.execAdb(`-s ${d} shell getprop ro.product.manufacturer`),
      this.execAdb(`-s ${d} shell getprop ro.build.version.release`),
      this.execAdb(`-s ${d} shell getprop ro.build.version.sdk`),
      this.execAdb(`-s ${d} shell "cat /proc/meminfo | head -n 4"`),
      this.execAdb(`-s ${d} shell settings get global window_animation_scale`)
    ]);

    // Parse RAM
    let totalRamMb = "Unknown";
    let freeRamMb = "Unknown";
    if (memRes.stdout) {
      const totalMatch = memRes.stdout.match(/MemTotal:\s+(\d+)\s+kB/i);
      const freeMatch = memRes.stdout.match(/MemAvailable:\s+(\d+)\s+kB/i) || memRes.stdout.match(/MemFree:\s+(\d+)\s+kB/i);
      if (totalMatch) totalRamMb = Math.round(parseInt(totalMatch[1], 10) / 1024);
      if (freeMatch) freeRamMb = Math.round(parseInt(freeMatch[1], 10) / 1024);
    }

    return {
      connected: true,
      id: d,
      model: modelRes.stdout || "Android TV",
      manufacturer: manRes.stdout || "Xiaomi",
      androidVersion: verRes.stdout || "N/A",
      sdkLevel: sdkRes.stdout || "N/A",
      totalRamMb,
      freeRamMb,
      animationScale: animRes.stdout?.trim() || "1.0"
    };
  }

  async listPackages() {
    if (!this.connectedDevice) throw new Error("No TV connected.");
    const d = this.connectedDevice;

    // Get all packages (including disabled/uninstalled for user 0)
    const [allPkgRes, disabledPkgRes] = await Promise.all([
      this.execAdb(`-s ${d} shell pm list packages -u`),
      this.execAdb(`-s ${d} shell pm list packages -d`)
    ]);

    const installedIds = new Set(
      allPkgRes.stdout
        .split("\n")
        .map(l => l.replace(/^package:/, "").trim())
        .filter(Boolean)
    );

    const disabledIds = new Set(
      disabledPkgRes.stdout
        .split("\n")
        .map(l => l.replace(/^package:/, "").trim())
        .filter(Boolean)
    );

    // Also check which packages in our catalog are actually absent/uninstalled
    const catalogMap = new Map();
    KNOWN_PACKAGES.forEach(pkg => catalogMap.set(pkg.id, pkg));

    const result = [];

    // First process all known packages that are relevant or installed
    for (const [id, pkg] of catalogMap.entries()) {
      const isPresent = installedIds.has(id);
      const isDisabled = disabledIds.has(id);

      result.push({
        ...pkg,
        installed: isPresent,
        disabled: isDisabled,
        isCustom: false,
        status: !isPresent ? "uninstalled" : isDisabled ? "disabled" : "enabled"
      });
    }

    // Next add installed packages not in catalog (marked as unknown/third-party)
    for (const id of installedIds) {
      if (!catalogMap.has(id)) {
        // filter out internal android system components unless user wants all
        const isCore = id.startsWith("android") || id.startsWith("com.android.internal");
        result.push({
          id,
          name: id,
          category: id.includes("xiaomi") || id.includes("miui") ? "xiaomi_extra" : "other",
          risk: isCore ? "critical" : "optional",
          recommendation: "review",
          description: "Uncataloged system or third-party package found on this device.",
          tags: ["uncataloged"],
          installed: true,
          disabled: disabledIds.has(id),
          isCustom: true,
          status: disabledIds.has(id) ? "disabled" : "enabled"
        });
      }
    }

    return result;
  }

  async disablePackage(pkgId) {
    if (!this.connectedDevice) throw new Error("No TV connected.");
    const d = this.connectedDevice;

    // Check safety guard
    const pkg = KNOWN_PACKAGES.find(p => p.id === pkgId);
    if (pkg && pkg.risk === "critical") {
      throw new Error(`Safety block: "${pkg.name}" is a critical system service and cannot be disabled.`);
    }

    this.log(`Disabling package: ${pkgId}...`);
    // First try disable-user
    let res = await this.execAdb(`-s ${d} shell pm disable-user --user 0 ${pkgId}`);
    // If that fails or isn't supported, try uninstall -k --user 0
    if (!res.ok || res.stdout.includes("Error") || res.stdout.includes("not allowed")) {
      res = await this.execAdb(`-s ${d} shell pm uninstall -k --user 0 ${pkgId}`);
    }

    return {
      success: res.ok,
      output: res.stdout || res.stderr
    };
  }

  async restorePackage(pkgId) {
    if (!this.connectedDevice) throw new Error("No TV connected.");
    const d = this.connectedDevice;
    this.log(`Restoring package: ${pkgId}...`);

    // Enable if disabled
    await this.execAdb(`-s ${d} shell pm enable ${pkgId}`);
    // Reinstall if uninstalled --user 0
    const res = await this.execAdb(`-s ${d} shell cmd package install-existing ${pkgId}`);

    return {
      success: res.ok,
      output: res.stdout || res.stderr
    };
  }

  async applyPreset(presetId) {
    const { PRESETS } = require("./catalog");
    const preset = PRESETS[presetId];
    if (!preset) throw new Error(`Preset ${presetId} not found`);

    const packages = await this.listPackages();
    const toDisable = packages.filter(p => {
      if (p.risk === "critical") return false;
      if (preset.targetRisk.includes(p.risk) && preset.includeCategories.includes(p.category)) {
        return p.installed && !p.disabled;
      }
      return false;
    });

    const results = [];
    for (const pkg of toDisable) {
      try {
        const r = await this.disablePackage(pkg.id);
        results.push({ id: pkg.id, name: pkg.name, success: r.success });
      } catch (e) {
        results.push({ id: pkg.id, name: pkg.name, success: false, error: e.message });
      }
    }

    // Set animation scale if specified
    if (preset.animationScale !== undefined) {
      await this.setAnimationSpeed(preset.animationScale);
    }

    // Clean background caches
    await this.trimCaches();

    return {
      preset: preset.name,
      disabledCount: results.filter(r => r.success).length,
      details: results
    };
  }

  async setAnimationSpeed(scale) {
    if (!this.connectedDevice) throw new Error("No TV connected.");
    const d = this.connectedDevice;
    const s = String(scale);
    await Promise.all([
      this.execAdb(`-s ${d} shell settings put global window_animation_scale ${s}`),
      this.execAdb(`-s ${d} shell settings put global transition_animation_scale ${s}`),
      this.execAdb(`-s ${d} shell settings put global animator_duration_scale ${s}`)
    ]);
    return { success: true, scale: s };
  }

  async trimCaches() {
    if (!this.connectedDevice) return { success: false };
    const d = this.connectedDevice;
    await this.execAdb(`-s ${d} shell pm trim-caches 1000M`);
    return { success: true };
  }

  async reboot() {
    if (!this.connectedDevice) throw new Error("No TV connected.");
    const d = this.connectedDevice;
    await this.execAdb(`-s ${d} reboot`);
    this.connectedDevice = null;
    return { success: true };
  }

  async openPlayStore(packageId = "com.spocky.projengmenu") {
    if (!this.connectedDevice) throw new Error("No TV connected.");
    const d = this.connectedDevice;
    this.log(`Opening Play Store on TV for ${packageId}...`);
    const res = await this.execAdb(`-s ${d} shell am start -a android.intent.action.VIEW -d "market://details?id=${packageId}"`);
    return { success: res.ok, output: res.stdout || res.stderr };
  }

  async setProjectivyAsDefault() {
    if (!this.connectedDevice) throw new Error("No TV connected.");
    const d = this.connectedDevice;

    // Verify Projectivy is installed first so we don't leave the user without a launcher!
    const checkRes = await this.execAdb(`-s ${d} shell pm path com.spocky.projengmenu`);
    if (!checkRes.stdout.includes("package:")) {
      throw new Error("Projectivy Launcher is not installed on the TV yet! Please install it first.");
    }

    this.log("Setting Projectivy as default launcher by disabling stock TV home...");
    await this.execAdb(`-s ${d} shell pm disable-user --user 0 com.google.android.tvlauncher`);
    await this.execAdb(`-s ${d} shell pm disable-user --user 0 com.google.android.apps.tv.launcherx`);
    await this.execAdb(`-s ${d} shell pm disable-user --user 0 com.mitv.tvhome.atv`);
    await this.execAdb(`-s ${d} shell pm disable-user --user 0 com.mitv.tvhome`);

    // Press home key to immediately activate Projectivy
    await this.execAdb(`-s ${d} shell input keyevent KEYCODE_HOME`);

    return { success: true, message: "Projectivy Launcher is now your permanent default home screen!" };
  }

  async restoreStockLauncher() {
    if (!this.connectedDevice) throw new Error("No TV connected.");
    const d = this.connectedDevice;
    this.log("Restoring stock Android TV launcher...");

    await this.execAdb(`-s ${d} shell pm enable com.google.android.tvlauncher`);
    await this.execAdb(`-s ${d} shell cmd package install-existing com.google.android.tvlauncher`);
    await this.execAdb(`-s ${d} shell pm enable com.google.android.apps.tv.launcherx`);
    await this.execAdb(`-s ${d} shell cmd package install-existing com.google.android.apps.tv.launcherx`);

    await this.execAdb(`-s ${d} shell input keyevent KEYCODE_HOME`);

    return { success: true, message: "Stock Android TV home screen restored!" };
  }

  // Scan local network for port 5555 open
  async scanSubnet() {
    const interfaces = os.networkInterfaces();
    let localIp = null;

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === "IPv4" && !iface.internal && iface.address.startsWith("192.168.")) {
          localIp = iface.address;
          break;
        }
      }
      if (localIp) break;
    }

    if (!localIp) return [];

    const base = localIp.substring(0, localIp.lastIndexOf("."));
    const found = [];

    // Probe common TV IP ranges (or current +/- 20 hosts for speed)
    const currentHost = parseInt(localIp.split(".")[3], 10);
    const hostsToProbe = [];

    for (let i = 1; i <= 254; i++) {
      if (i !== currentHost) hostsToProbe.push(`${base}.${i}`);
    }

    const probeIp = (ip) => {
      return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(350);
        socket.on("connect", () => {
          socket.destroy();
          resolve(ip);
        });
        socket.on("timeout", () => {
          socket.destroy();
          resolve(null);
        });
        socket.on("error", () => {
          socket.destroy();
          resolve(null);
        });
        socket.connect(5555, ip);
      });
    };

    // Run probes in chunks
    const chunkSize = 30;
    for (let i = 0; i < hostsToProbe.length; i += chunkSize) {
      const chunk = hostsToProbe.slice(i, i + chunkSize);
      const results = await Promise.all(chunk.map(probeIp));
      results.filter(Boolean).forEach(ip => found.push(ip));
    }

    return found;
  }
}

module.exports = new AdbManager();
