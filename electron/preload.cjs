/**
 * preload.cjs - Electron Preload Bridge for PrintHub Studio
 * Exposes native system printers, print dispatcher, and scanner folder watcher
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  // Printer Management
  getPrinters: () => ipcRenderer.invoke('printhub:get-printers'),
  printDirect: (options) => ipcRenderer.invoke('printhub:print-direct', options),

  // Scanner Hot Folder Watcher
  selectScanFolder: () => ipcRenderer.invoke('printhub:select-scan-folder'),
  getScanFolder: () => ipcRenderer.invoke('printhub:get-scan-folder'),
  onNewScan: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('printhub:on-new-scan', subscription);
    return () => ipcRenderer.removeListener('printhub:on-new-scan', subscription);
  },

  // Window Actions
  minimize: () => ipcRenderer.send('printhub:window-minimize'),
  maximize: () => ipcRenderer.send('printhub:window-maximize'),
  close: () => ipcRenderer.send('printhub:window-close'),

  // Auto-Update Engine
  getAppVersion: () => ipcRenderer.invoke('printhub:get-app-version'),
  getUpdaterStatus: () => ipcRenderer.invoke('printhub:get-updater-status'),
  checkForUpdates: () => ipcRenderer.invoke('printhub:check-for-updates'),
  startDownloadUpdate: () => ipcRenderer.invoke('printhub:start-download-update'),
  quitAndInstallUpdate: () => ipcRenderer.invoke('printhub:quit-and-install-update'),
  onUpdaterStatus: (callback) => {
    const subscription = (_event, status) => callback(status);
    ipcRenderer.on('printhub:updater-status', subscription);
    return () => ipcRenderer.removeListener('printhub:updater-status', subscription);
  },
});
