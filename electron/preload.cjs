const { contextBridge } = require("electron");

// Expose version/platform metadata only. Renderer code receives no Node or IPC API.
contextBridge.exposeInMainWorld("desktopRuntime", Object.freeze({
  platform: process.platform,
  electronVersion: process.versions.electron,
}));
