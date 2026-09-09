/**
 * updater.cjs - Electron Auto-Update Engine for PrintHub Studio
 * Governs automatic & manual updates, background downloading, progress reporting,
 * and zero-data-loss NSIS restart-and-update flow.
 */

const { app, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure structured logging for update diagnostics
log.transports.file.level = 'info';
autoUpdater.logger = log;

let targetWindow = null;
let currentUpdateStatus = {
  status: 'idle', // 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  info: null,
  progress: null,
  error: null,
  currentVersion: app.getVersion(),
};

function sendStatusToRenderer(statusPayload) {
  currentUpdateStatus = {
    ...currentUpdateStatus,
    ...statusPayload,
    currentVersion: app.getVersion(),
  };

  if (targetWindow && !targetWindow.isDestroyed()) {
    targetWindow.webContents.send('printhub:updater-status', currentUpdateStatus);
  }
}

function initAutoUpdater(mainWindow) {
  targetWindow = mainWindow;

  // Basic update settings
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;

  // ── AutoUpdater Event Handlers ──────────────────────────────────────────────

  autoUpdater.on('checking-for-update', () => {
    log.info('[Updater] Checking for update...');
    sendStatusToRenderer({
      status: 'checking',
      error: null,
    });
  });

  autoUpdater.on('update-available', (info) => {
    log.info('[Updater] Update available:', info?.version);
    sendStatusToRenderer({
      status: 'available',
      info: {
        version: info?.version,
        releaseDate: info?.releaseDate,
        releaseNotes: info?.releaseNotes || '',
      },
      error: null,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('[Updater] Update not available. Current version is up to date.');
    sendStatusToRenderer({
      status: 'not-available',
      info: {
        version: info?.version || app.getVersion(),
      },
      error: null,
    });
  });

  autoUpdater.on('error', (err) => {
    const errorMsg = err == null ? 'Unknown network error' : (err.message || String(err));
    log.warn('[Updater] Error during update check/download:', errorMsg);

    // Format user-friendly error message
    let friendlyMessage = 'Unable to check for updates. Please check your internet connection.';
    if (errorMsg.includes('net::ERR') || errorMsg.includes('ENOTFOUND') || errorMsg.includes('ECONNREFUSED')) {
      friendlyMessage = 'Network connection offline or server unreachable.';
    } else if (errorMsg.includes('404')) {
      friendlyMessage = 'No release package found on update server.';
    }

    sendStatusToRenderer({
      status: 'error',
      error: friendlyMessage,
    });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const percent = Math.min(100, Math.max(0, Math.round(progressObj.percent || 0)));
    const bytesPerSecond = progressObj.bytesPerSecond || 0;
    const transferred = progressObj.transferred || 0;
    const total = progressObj.total || 0;

    sendStatusToRenderer({
      status: 'downloading',
      progress: {
        percent,
        bytesPerSecond,
        transferred,
        total,
      },
      error: null,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('[Updater] Update downloaded successfully:', info?.version);
    sendStatusToRenderer({
      status: 'downloaded',
      info: {
        version: info?.version,
        releaseNotes: info?.releaseNotes || '',
      },
      error: null,
    });
  });

  // ── Background Startup Auto-Check ──────────────────────────────────────────
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (!isDev) {
    // Delay check by 4 seconds after app start to guarantee instantaneous UI load
    setTimeout(() => {
      try {
        log.info('[Updater] Running background startup update check...');
        autoUpdater.checkForUpdates().catch((err) => {
          log.warn('[Updater] Background update check caught error:', err?.message || err);
        });
      } catch (err) {
        log.warn('[Updater] Startup check exception:', err?.message || err);
      }
    }, 4000);
  } else {
    log.info('[Updater] Running in Development mode. Automatic startup update check disabled.');
  }
}

// ── IPC Handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('printhub:get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('printhub:get-updater-status', () => {
  return {
    ...currentUpdateStatus,
    currentVersion: app.getVersion(),
    isPackaged: app.isPackaged,
  };
});

ipcMain.handle('printhub:check-for-updates', async () => {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    sendStatusToRenderer({
      status: 'not-available',
      info: {
        version: app.getVersion() + ' (Dev Mode)',
      },
      error: null,
    });
    return { success: true, message: 'Development mode: Auto-updater is disabled in dev environment.' };
  }

  try {
    sendStatusToRenderer({ status: 'checking', error: null });
    const checkResult = await autoUpdater.checkForUpdates();
    return { success: true, result: checkResult };
  } catch (err) {
    const errorMsg = err?.message || 'Failed to check for updates';
    log.warn('[Updater] Manual check error:', errorMsg);
    sendStatusToRenderer({
      status: 'error',
      error: 'Unable to check for updates. You might be offline or update server is unavailable.',
    });
    return { success: false, error: errorMsg };
  }
});

ipcMain.handle('printhub:start-download-update', async () => {
  try {
    sendStatusToRenderer({ status: 'downloading', error: null });
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (err) {
    const errorMsg = err?.message || 'Failed to download update';
    log.error('[Updater] Download error:', errorMsg);
    sendStatusToRenderer({ status: 'error', error: errorMsg });
    return { success: false, error: errorMsg };
  }
});

ipcMain.handle('printhub:quit-and-install-update', () => {
  log.info('[Updater] Quitting and installing downloaded update...');
  try {
    // isSilent: false (shows standard NSIS installer progress), isForceRunAfter: true (re-launches PrintHub)
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  } catch (err) {
    log.error('[Updater] Quit and install failed:', err);
    return { success: false, error: err?.message };
  }
});

module.exports = {
  initAutoUpdater,
};
