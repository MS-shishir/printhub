/**
 * main.cjs - Electron Main Process for PrintHub Studio
 * Full Offline Desktop Execution, Native Printer Management, and Auto-Scan Watcher
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow = null;
let currentScanWatcher = null;
let currentWatchedFolder = null;

// Determine initial scanner hot-folder
function getInitialScanFolder() {
  const picturesDir = path.join(os.homedir(), 'Pictures');
  const scansDir = path.join(picturesDir, 'Scans');
  
  if (fs.existsSync(scansDir)) return scansDir;
  try {
    fs.mkdirSync(scansDir, { recursive: true });
    return scansDir;
  } catch {
    return picturesDir;
  }
}

function getAppIcon() {
  const iconPaths = [
    path.join(__dirname, '../public/logo.png'),
    path.join(__dirname, '../dist/favicon.png'),
    path.join(process.resourcesPath, 'app.asar/public/logo.png'),
    path.join(process.resourcesPath, 'public/logo.png'),
  ];
  for (const p of iconPaths) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

function createWindow() {
  const appIcon = getAppIcon();
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#020617', // slate-950
    autoHideMenuBar: true,
    title: 'PrintHub Studio — Professional Photo & Document Print Suite',
    icon: appIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false,
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev && process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else if (isDev && fs.existsSync(path.join(__dirname, '../dist/index.html'))) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Start scanner folder watcher
  setupScanFolderWatcher(getInitialScanFolder());
}

// ── Scanner Folder Watcher ───────────────────────────────────────────────────
function setupScanFolderWatcher(folderPath) {
  if (currentScanWatcher) {
    try {
      currentScanWatcher.close();
    } catch {}
    currentScanWatcher = null;
  }

  currentWatchedFolder = folderPath;
  if (!fs.existsSync(folderPath)) {
    try {
      fs.mkdirSync(folderPath, { recursive: true });
    } catch {
      return;
    }
  }

  const processedFiles = new Set();

  try {
    currentScanWatcher = fs.watch(folderPath, (eventType, filename) => {
      if (!filename || eventType !== 'rename') return;
      const ext = path.extname(filename).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'].includes(ext)) return;

      const fullPath = path.join(folderPath, filename);
      if (!fs.existsSync(fullPath)) return;

      // Avoid duplicate triggers within 2 seconds
      if (processedFiles.has(fullPath)) return;
      processedFiles.add(fullPath);
      setTimeout(() => processedFiles.delete(fullPath), 3000);

      // Wait 300ms for scanner software to finish writing file to disk
      setTimeout(() => {
        try {
          if (!fs.existsSync(fullPath)) return;
          const fileBuffer = fs.readFileSync(fullPath);
          const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
          const base64Data = fileBuffer.toString('base64');
          const dataUrl = `data:${mimeType};base64,${base64Data}`;

          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('printhub:on-new-scan', {
              fileName: filename,
              filePath: fullPath,
              dataUrl,
              timestamp: Date.now(),
            });
          }
        } catch (err) {
          console.warn('Scan read error:', err);
        }
      }, 350);
    });
  } catch (err) {
    console.warn('Failed to watch scan folder:', err);
  }
}

// ── Windows Printer Hardware Query Helper ────────────────────────────────────
const { getWindowsPrintersReal } = require('./printers-helper.cjs');

// ── IPC Handlers ─────────────────────────────────────────────────────────────

// 1. Get Live Hardware Printers from Windows with True Hardware Capabilities
ipcMain.handle('printhub:get-printers', async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return [];
  try {
    const realPrinters = await getWindowsPrintersReal();
    if (realPrinters && realPrinters.length > 0) {
      return realPrinters;
    }

    // Fallback to electron's native printer API if PowerShell returns empty
    const electronPrinters = await mainWindow.webContents.getPrintersAsync().catch(() => []);
    return electronPrinters.map(p => ({
      name: p.name,
      displayName: p.displayName || p.name,
      description: p.description || '',
      isDefault: Boolean(p.isDefault),
      status: p.status === 0 ? 'Ready' : 'Offline',
      isOffline: p.status !== 0,
      capabilities: {
        color: true,
        duplex: true,
        copies: true,
        collate: true,
        paperSizes: ['A4', '4R', 'Legal', 'Letter', 'A5', 'Stamp', 'Custom'],
      },
    }));
  } catch (err) {
    console.warn('Failed to fetch printers:', err);
    return [];
  }
});

// 2. Direct Hardware Silent Print Dispatcher (Zero Windows Dialogs Guarantee)
ipcMain.handle('printhub:print-direct', async (_event, options = {}) => {
  try {
    const {
      htmlContent,
      dataUrl,
      deviceName,
      copies = 1,
      pageSize = 'A4',
      landscape = false,
      color = true,
      duplexMode = 'simplex',
      silent = true,
      scaleFactor = 100,
      dpi = { horizontal: 300, vertical: 300 },
    } = options;

    const isLand = Boolean(landscape);
    const pw = pageSize === '4R' ? (isLand ? '152mm' : '102mm') : pageSize === 'Legal' ? (isLand ? '356mm' : '216mm') : pageSize === 'Letter' ? (isLand ? '279mm' : '216mm') : pageSize === 'A5' ? (isLand ? '210mm' : '148mm') : (isLand ? '297mm' : '210mm');
    const ph = pageSize === '4R' ? (isLand ? '102mm' : '152mm') : pageSize === 'Legal' ? (isLand ? '216mm' : '356mm') : pageSize === 'Letter' ? (isLand ? '216mm' : '279mm') : pageSize === 'A5' ? (isLand ? '148mm' : '210mm') : (isLand ? '210mm' : '297mm');

    const isGrayscale = color === false;

    const fullHtml = htmlContent || (dataUrl ? `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>PrintHub Direct Hardware Spool</title>
        <style>
          @page {
            size: ${pw} ${ph};
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          html, body {
            width: ${pw};
            height: ${ph};
            margin: 0;
            padding: 0;
            background: #ffffff;
            overflow: hidden;
          }
          .sheet-box {
            position: relative;
            width: ${pw};
            height: ${ph};
            background: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          img {
            width: 100%;
            height: 100%;
            object-fit: fill;
            display: block;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: high-quality;
            ${isGrayscale ? 'filter: grayscale(100%) contrast(105%);' : ''}
          }
        </style>
      </head>
      <body>
        <div class="sheet-box">
          <img src="${dataUrl}" />
        </div>
      </body>
      </html>
    ` : null);

    // Map duplex options to Chromium Print options
    let duplexSetting = 'simplex';
    if (duplexMode === 'longEdge' || duplexMode === 'duplex') duplexSetting = 'longEdge';
    else if (duplexMode === 'shortEdge') duplexSetting = 'shortEdge';

    // Map exact pageSize for Chromium print driver (with micron dimensions for custom sizes)
    let normalizedPageSize = 'A4';
    if (pageSize === '4R') {
      normalizedPageSize = isLand ? { width: 152000, height: 102000 } : { width: 102000, height: 152000 };
    } else if (pageSize === 'A5') {
      normalizedPageSize = 'A5';
    } else if (pageSize === 'Legal') {
      normalizedPageSize = 'Legal';
    } else if (pageSize === 'Letter') {
      normalizedPageSize = 'Letter';
    } else if (typeof pageSize === 'object' && pageSize.width && pageSize.height) {
      normalizedPageSize = pageSize;
    } else {
      normalizedPageSize = 'A4';
    }

    // Use offscreen print window for pristine 1:1 paper output with SILENT = TRUE
    if (fullHtml) {
      const printWin = new BrowserWindow({
        show: false,
        width: 800,
        height: 1100,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`);

      return new Promise((resolve) => {
        setTimeout(() => {
          printWin.webContents.print(
            {
              silent: silent !== false, // SILENT = TRUE: Dispatches directly to Windows Spooler with ZERO dialogs
              printBackground: true,
              deviceName: deviceName || '',
              copies: Math.max(1, Math.min(99, copies || 1)),
              pageSize: normalizedPageSize,
              landscape: isLand,
              color: color !== false,
              duplexMode: duplexSetting,
              scaleFactor: Math.max(10, Math.min(200, scaleFactor || 100)),
              dpi: dpi || { horizontal: 300, vertical: 300 },
              margins: { marginType: 'none' },
            },
            (success, failureReason) => {
              try {
                printWin.close();
              } catch {}
              if (!success) {
                resolve({ success: false, error: failureReason || 'Failed to spool to printer hardware.' });
              } else {
                resolve({ success: true, deviceName: deviceName || 'Default Printer' });
              }
            }
          );
        }, 280);
      });
    }

    // Fallback: print from mainWindow
    if (!mainWindow || mainWindow.isDestroyed()) return { success: false, error: 'Main window is not available.' };

    const printOptions = {
      silent: silent !== false,
      printBackground: true,
      deviceName: deviceName || '',
      copies: Math.max(1, copies || 1),
      pageSize: normalizedPageSize,
      landscape: isLand,
      color: color !== false,
      duplexMode: duplexSetting,
      margins: { marginType: 'none' },
    };

    return new Promise((resolve) => {
      mainWindow.webContents.print(printOptions, (success, failureReason) => {
        resolve({ success, error: failureReason });
      });
    });
  } catch (err) {
    return { success: false, error: err.message || 'Unknown printer spool error' };
  }
});

// 3. Select & Manage Scan Folder
ipcMain.handle('printhub:select-scan-folder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'স্ক্যানার আউটপুট ফোল্ডার নির্বাচন করুন (Select Scanner Folder)',
    defaultPath: currentWatchedFolder || getInitialScanFolder(),
    properties: ['openDirectory', 'createDirectory'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const selectedFolder = result.filePaths[0];
    setupScanFolderWatcher(selectedFolder);
    return selectedFolder;
  }
  return currentWatchedFolder;
});

ipcMain.handle('printhub:get-scan-folder', () => {
  return currentWatchedFolder || getInitialScanFolder();
});

// 4. Window Controls
ipcMain.on('printhub:window-minimize', () => mainWindow?.minimize());
ipcMain.on('printhub:window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('printhub:window-close', () => mainWindow?.close());

// ── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
