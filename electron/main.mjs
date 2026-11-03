import { app, BrowserWindow, dialog } from "electron";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const preload = path.join(here, "preload.cjs");
const havitDeviceId = { vendorId: 0x05ac, productId: 0x024f };

function isAllowedUrl(candidate) {
  try {
    const url = new URL(candidate);
    if (process.env.ELECTRON_RENDERER_URL) {
      const dev = new URL(process.env.ELECTRON_RENDERER_URL);
      return url.origin === dev.origin;
    }
    const expected = pathToFileURL(path.resolve(app.getAppPath(), "dist", "index.html")).href;
    return candidate === expected;
  } catch {
    return false;
  }
}

function createWindow() {
  const window = new BrowserWindow({
    title: "HAVIT Gaming Control Center",
    width: 1440,
    height: 940,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: "#0d1017",
    show: false,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  const deviceSession = window.webContents.session;
  const isAppWindow = (webContents) => Boolean(webContents && isAllowedUrl(webContents.getURL()));

  deviceSession.setPermissionCheckHandler((webContents, permission) => {
    return permission === "hid" && isAppWindow(webContents);
  });
  deviceSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(permission === "hid" && isAppWindow(webContents));
  });
  deviceSession.on("select-hid-device", async (event, details, callback) => {
    event.preventDefault();
    if (!isAppWindow(window.webContents)) return callback();

    const candidates = details.deviceList.filter((device) =>
      device.vendorId === havitDeviceId.vendorId && device.productId === havitDeviceId.productId,
    );
    if (candidates.length === 1) return callback(candidates[0].deviceId);
    if (candidates.length === 0) return callback();

    const labels = candidates.map((device) => {
      const usages = (device.collections ?? [])
        .map((collection) => `${collection.usagePage}:${collection.usage}`)
        .join(", ");
      return `${device.productName || "KB874L interface"}${usages ? ` · usage ${usages}` : ""}`;
    });
    const choice = await dialog.showMessageBox(window, {
      type: "question",
      title: "Choose the KB874L interface",
      message: "Select the matching keyboard interface to open for read-only connection checks.",
      detail: "No lighting or key commands will be sent.",
      buttons: [...labels, "Cancel"],
      cancelId: labels.length,
      defaultId: 0,
      noLink: true,
    });
    callback(choice.response < candidates.length ? candidates[choice.response].deviceId : undefined);
  });

  window.once("ready-to-show", () => window.show());
  window.webContents.on("will-navigate", (event, url) => {
    if (!isAllowedUrl(url)) event.preventDefault();
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void window.loadFile(path.resolve(app.getAppPath(), "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
