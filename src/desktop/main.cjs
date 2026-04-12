const path = require("path");
const { app, BrowserWindow, Menu, Tray, dialog, nativeImage, shell } = require("electron");
const { startServer } = require("../copilot/server.cjs");
const { loadConfig } = require("../copilot/service.cjs");
const { ensureDesktopWorkspace } = require("./workspace.cjs");

let mainWindow = null;
let voiceWindow = null;
let serverInstance = null;
let tray = null;
let isQuitting = false;

function createTrayIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
      <rect width="64" height="64" rx="18" fill="#b85c38"/>
      <circle cx="32" cy="23" r="10" fill="#fffaf5"/>
      <rect x="28" y="33" width="8" height="16" rx="4" fill="#fffaf5"/>
      <rect x="20" y="45" width="24" height="5" rx="2.5" fill="#fffaf5"/>
    </svg>
  `;

  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
}

function createWindow(url, config) {
  const window = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 1024,
    minHeight: 700,
    title: config.name || "Smart Testing Copilot",
    backgroundColor: "#efe4d5",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  window.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === "media" || permission === "audioCapture") {
      callback(true);
      return;
    }

    callback(false);
  });

  window.loadURL(url);

  window.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    shell.openExternal(targetUrl);
    return { action: "deny" };
  });

  return window;
}

function createVoiceWindow(url) {
  const window = new BrowserWindow({
    width: 320,
    height: 160,
    show: false,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    focusable: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: false,
    },
  });

  window.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === "media" || permission === "audioCapture") {
      callback(true);
      return;
    }

    callback(false);
  });

  window.loadURL(`${url}/voice`);
  return window;
}

function showMainWindow() {
  if (!mainWindow && serverInstance) {
    mainWindow = createWindow(serverInstance.url, loadConfig());
    attachMainWindowHandlers();
  }

  if (!mainWindow) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

function attachMainWindowHandlers() {
  if (!mainWindow) {
    return;
  }

  mainWindow.on("close", (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.on("did-finish-load", () => {
    if (voiceWindow) {
      voiceWindow.webContents.executeJavaScript(`
        window.__copilotNotifyForeground = true;
      `).catch(() => {});
    }
  });
}

function createTray(config) {
  tray = new Tray(createTrayIcon());
  tray.setToolTip(config.name || "Smart Testing Copilot");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Open Copilot",
        click: () => showMainWindow(),
      },
      {
        label: "Quit",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ])
  );

  tray.on("click", () => {
    showMainWindow();
  });
}

async function bootDesktopApp() {
  if (app.isPackaged) {
    process.env.COPILOT_BUNDLE_ROOT = path.join(process.resourcesPath, "bundle");
  }

  const workspaceRoot = ensureDesktopWorkspace(path.join(app.getPath("userData"), "workspace"));
  process.env.COPILOT_WORKSPACE = workspaceRoot;

  const config = loadConfig();
  serverInstance = await startServer({
    config,
    host: config.webHost || "127.0.0.1",
    port: config.webPort || 3210,
  });

  mainWindow = createWindow(serverInstance.url, config);
  attachMainWindowHandlers();
  createTray(config);

  if (config.backgroundVoiceEnabled !== false) {
    voiceWindow = createVoiceWindow(serverInstance.url);
    voiceWindow.webContents.on("did-finish-load", () => {
      voiceWindow.webContents.executeJavaScript(`
        const channel = new BroadcastChannel("smart-testing-copilot");
        channel.addEventListener("message", (event) => {
          const message = event.data || {};
          if (message.source === "voice-listener" && message.type === "wake-command") {
            console.log("wake-command");
          }
        });
      `).catch(() => {});
    });

    voiceWindow.webContents.on("console-message", (event, level, message) => {
      if (message === "wake-command") {
        showMainWindow();
      }
    });
  }
}

app.whenReady().then(async () => {
  try {
    await bootDesktopApp();
  } catch (error) {
    dialog.showErrorBox("Desktop Copilot Failed to Start", `${error.message}`);
    app.quit();
    return;
  }

  app.on("activate", async () => {
    if (!mainWindow && serverInstance) {
      mainWindow = createWindow(serverInstance.url, loadConfig());
      attachMainWindowHandlers();
    } else {
      showMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && isQuitting) {
    app.quit();
  }
});

app.on("before-quit", async () => {
  isQuitting = true;

  if (voiceWindow) {
    voiceWindow.destroy();
    voiceWindow = null;
  }

  if (tray) {
    tray.destroy();
    tray = null;
  }

  if (serverInstance && serverInstance.server) {
    await new Promise((resolve) => {
      serverInstance.server.close(() => resolve());
    });
  }
});
