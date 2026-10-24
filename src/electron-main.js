const { app, BrowserWindow, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");

process.env.ELECTRON_RUN = "true";
process.env.NO_OPEN = "true";

// Ensure single instance of the application
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let expressServer = null;

// Determine writable data dir for ADB platform-tools if not packaged with them
const userDataPath = app.getPath("userData");
const appDataBinDir = path.join(userDataPath, "bin");
if (!fs.existsSync(appDataBinDir)) {
  try {
    fs.mkdirSync(appDataBinDir, { recursive: true });
  } catch (_) {}
}
if (!process.env.ADB_BIN_DIR) {
  // Check if packaged extraResources has bin/platform-tools
  const packagedBin = process.resourcesPath ? path.join(process.resourcesPath, "bin") : null;
  if (packagedBin && fs.existsSync(packagedBin)) {
    process.env.ADB_BIN_DIR = packagedBin;
  } else {
    const localBin = path.join(__dirname, "..", "bin");
    process.env.ADB_BIN_DIR = fs.existsSync(localBin) ? localBin : appDataBinDir;
  }
}

const { startServer, adb } = require("./server");

async function createWindow() {
  const iconPath = path.join(__dirname, "..", "assets", "icon.ico");
  const fallbackIcon = path.join(__dirname, "..", "assets", "icon.png");
  const windowIcon = fs.existsSync(iconPath) ? iconPath : fallbackIcon;

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: "Smart TV Optimizer",
    icon: windowIcon,
    backgroundColor: "#080c14",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  mainWindow.setMenuBarVisibility(false);

  // Open external links in default system browser rather than in electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  try {
    const { url, server } = await startServer(3456);
    expressServer = server;

    await mainWindow.loadURL(url);

    mainWindow.once("ready-to-show", () => {
      mainWindow.show();
      mainWindow.focus();
    });
  } catch (err) {
    dialog.showErrorBox(
      "Failed to launch Smart TV Optimizer",
      `Error starting internal server: ${err.message}`
    );
    app.quit();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  if (expressServer && expressServer.close) {
    expressServer.close();
  }
});
