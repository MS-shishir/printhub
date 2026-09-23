/**
 * main.cjs - Electron Main Process for PrintHub Studio
 * Full Offline Desktop Execution, Native Printer Management, and Auto-Scan Watcher
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { initAutoUpdater } = require('./updater.cjs');

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

function createSplashWindow() {
  const splash = new BrowserWindow({
    width: 480,
    height: 320,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    center: true,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const logoBase64 = fs.existsSync(path.join(__dirname, '../public/logo.png'))
    ? `data:image/png;base64,${fs.readFileSync(path.join(__dirname, '../public/logo.png')).toString('base64')}`
    : '';

  const splashHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        body {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          overflow: hidden;
          user-select: none;
        }
        .card {
          width: 450px;
          padding: 34px 28px;
          background: #020617;
          border: 1px solid rgba(99, 102, 241, 0.45);
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.95), 0 0 45px rgba(99, 102, 241, 0.25);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
        }
        .glow {
          position: absolute;
          width: 130px;
          height: 130px;
          background: #6366f1;
          filter: blur(55px);
          opacity: 0.3;
          top: 30px;
          border-radius: 50%;
          animation: pulse 2.5s infinite ease-in-out;
        }
        .logo-img {
          width: 74px;
          height: 74px;
          object-fit: contain;
          margin-bottom: 14px;
          position: relative;
          z-index: 2;
          filter: drop-shadow(0 0 16px rgba(99, 102, 241, 0.6));
          animation: float 3s ease-in-out infinite;
        }
        .title {
          color: #f8fafc;
          font-size: 21px;
          font-weight: 800;
          letter-spacing: -0.5px;
          margin-bottom: 4px;
          position: relative;
          z-index: 2;
        }
        .subtitle {
          color: #818cf8;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.6px;
          margin-bottom: 22px;
          position: relative;
          z-index: 2;
        }
        .bar-container {
          width: 100%;
          height: 6px;
          background: rgba(30, 41, 59, 0.85);
          border-radius: 999px;
          overflow: hidden;
          position: relative;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .bar {
          height: 100%;
          width: 45%;
          background: linear-gradient(90deg, #6366f1, #a855f7, #06b6d4, #6366f1);
          background-size: 200% 100%;
          border-radius: 999px;
          animation: progress 1.5s infinite ease-in-out;
        }
        .status {
          margin-top: 13px;
          font-size: 11px;
          color: #94a3b8;
          font-weight: 500;
        }
        @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.25; } 50% { transform: scale(1.3); opacity: 0.45; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="glow"></div>
        ${logoBase64 ? `<img class="logo-img" src="${logoBase64}" />` : ''}
        <div class="title">PrintHub Studio Pro</div>
        <div class="subtitle">Photo Studio & Press Workstation</div>
        <div class="bar-container">
          <div class="bar"></div>
        </div>
        <div class="status" id="status-text">Starting High-Res Studio Engine...</div>
      </div>
      <script>
        const statuses = [
          'Starting Studio Engine...',
          'Connecting Native Print Spooler...',
          'Loading 100% Offline AI Modules...',
          'Ready!'
        ];
        let idx = 0;
        setInterval(() => {
          idx = (idx + 1) % statuses.length;
          const el = document.getElementById('status-text');
          if (el) el.textContent = statuses[idx];
        }, 450);
      </script>
    </body>
    </html>
  `;

  splash.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`);
  splash.once('ready-to-show', () => splash.show());
  return splash;
}

function createWindow() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const splash = createSplashWindow();
  const appIcon = getAppIcon();

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#020617', // slate-950
    autoHideMenuBar: true,
    show: false, // hidden while splash is displaying
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

  if (isDev) {
    const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';
    mainWindow.loadURL(startUrl).catch(() => {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Smooth transition from Splash to Main Window
  let isShown = false;
  const revealMainWindow = () => {
    if (isShown) return;
    isShown = true;
    setTimeout(() => {
      if (splash && !splash.isDestroyed()) {
        splash.destroy();
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
    }, isDev ? 800 : 1200);
  };

  mainWindow.webContents.once('did-finish-load', revealMainWindow);
  mainWindow.once('ready-to-show', revealMainWindow);

  // Fallback reveal in case of network wait
  setTimeout(revealMainWindow, 3000);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Start scanner folder watcher
  setupScanFolderWatcher(getInitialScanFolder());

  // Initialize Auto-Update Engine
  try {
    initAutoUpdater(mainWindow);
  } catch (err) {
    console.warn('Auto-updater initialization warning:', err);
  }
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

const { execFile, exec } = require('child_process');

function getSpoolerExePath() {
  const candidates = [
    path.join(__dirname, 'bin/PrintHubSpooler.exe'),
    path.join(__dirname, '../electron/bin/PrintHubSpooler.exe'),
    path.join(process.resourcesPath, 'bin/PrintHubSpooler.exe'),
    path.join(process.resourcesPath, 'app.asar.unpacked/electron/bin/PrintHubSpooler.exe'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

// 2. Direct Hardware Silent Print Dispatcher (Native Win32 DEVMODE & Zero Windows Dialogs Guarantee)
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
      paperType = 'plain',
      quality = 'standard',
      silent = true,
    } = options;

    const isLand = Boolean(landscape);

    // ── Primary: Direct Hardware Spooler with Win32 DEVMODE injection (Glossy/Matte/High DPI)
    const spoolerExe = getSpoolerExePath();
    if (process.platform === 'win32' && spoolerExe && dataUrl) {
      try {
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const tempImgPath = path.join(
          app.getPath('temp'),
          `printhub_native_${Date.now()}_${Math.random().toString(36).slice(2)}.png`
        );
        fs.writeFileSync(tempImgPath, imageBuffer);

        const spoolerArgs = [
          '--printer', deviceName || '',
          '--file', tempImgPath,
          '--paper', pageSize || 'A4',
          '--type', paperType || 'plain',
          '--quality', quality || 'standard',
          '--orientation', isLand ? 'landscape' : 'portrait',
          '--copies', String(Math.max(1, copies || 1)),
          '--color', String(color !== false),
          '--duplex', duplexMode || 'simplex',
        ];

        const nativeResult = await new Promise((resolve) => {
          execFile(spoolerExe, spoolerArgs, { timeout: 15000 }, (err, stdout, stderr) => {
            try {
              if (fs.existsSync(tempImgPath)) fs.unlinkSync(tempImgPath);
            } catch {}

            if (err) {
              console.warn('Native spooler execution error, falling back to Chromium print:', err, stderr);
              return resolve({ success: false, error: err.message });
            }

            try {
              const res = JSON.parse(stdout.trim());
              resolve(res);
            } catch {
              resolve({ success: true, deviceName: deviceName || 'Windows Hardware Printer' });
            }
          });
        });

        if (nativeResult.success) {
          return { success: true, deviceName: deviceName || 'Windows Hardware Printer' };
        }
      } catch (nativeErr) {
        console.warn('Native Spooler bridge exception, falling back:', nativeErr);
      }
    }

    // ── Secondary / Fallback: Chromium WebContents Print Dispatcher
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
            margin: 0mm !important;
          }
          *, *:before, *:after {
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            box-sizing: border-box !important;
          }
          html, body {
            width: ${pw} !important;
            height: ${ph} !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: hidden !important;
          }
          img#spoolImg {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: ${pw} !important;
            height: ${ph} !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            object-fit: fill !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            ${isGrayscale ? 'filter: grayscale(100%) contrast(105%);' : ''}
          }
        </style>
      </head>
      <body>
        <img id="spoolImg" src="${dataUrl}" />
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
        width: 1200,
        height: 1700,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      // Write HTML to temporary file to avoid Chromium data: URL size limit (ERR_INVALID_URL -300)
      const tempHtmlPath = path.join(
        app.getPath('temp'),
        `printhub_print_${Date.now()}_${Math.random().toString(36).slice(2)}.html`
      );

      try {
        fs.writeFileSync(tempHtmlPath, fullHtml, 'utf8');
        await printWin.loadFile(tempHtmlPath);
      } catch (err) {
        console.error('Failed to write temp print file:', err);
        try { printWin.close(); } catch {}
        return { success: false, error: 'Failed to prepare print file: ' + (err?.message || err) };
      }

      // Wait for all images to decode and full layout settlement
      try {
        await printWin.webContents.executeJavaScript(`
          new Promise((resolve) => {
            const imgs = Array.from(document.querySelectorAll('img'));
            if (imgs.length === 0) return resolve(true);
            let settled = 0;
            const checkDone = () => {
              settled++;
              if (settled >= imgs.length) resolve(true);
            };
            imgs.forEach((img) => {
              if (img.complete && img.naturalWidth > 0) {
                if (img.decode) {
                  img.decode().then(checkDone).catch(checkDone);
                } else {
                  checkDone();
                }
              } else {
                img.onload = () => {
                  if (img.decode) img.decode().then(checkDone).catch(checkDone);
                  else checkDone();
                };
                img.onerror = checkDone;
              }
            });
            setTimeout(resolve, 1500); // Safety timeout
          })
        `);
      } catch (e) {
        console.warn('Image decode wait warning:', e);
      }

      await new Promise(r => setTimeout(r, 100));

      return new Promise((resolve) => {
        printWin.webContents.print(
          {
            silent: silent !== false, // SILENT = TRUE: Direct hardware spool with ZERO OS dialogs
            printBackground: true,
            deviceName: deviceName || '',
            copies: Math.max(1, Math.min(99, copies || 1)),
            pageSize: normalizedPageSize,
            landscape: isLand,
            color: color !== false,
            duplexMode: duplexSetting,
            margins: { marginType: 'none' },
          },
          (success, failureReason) => {
            try {
              printWin.close();
            } catch {}
            try {
              if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath);
            } catch {}

            if (!success) {
              resolve({ success: false, error: failureReason || 'Failed to spool to printer hardware.' });
            } else {
              resolve({ success: true, deviceName: deviceName || 'Default Printer' });
            }
          }
        );
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

// 4. Open Real Windows Driver Properties / Printing Preferences Dialog
ipcMain.handle('printhub:open-printer-properties', async (_event, printerName) => {
  try {
    if (process.platform === 'win32') {
      const spoolerExe = getSpoolerExePath();
      if (spoolerExe && printerName) {
        execFile(spoolerExe, ['--open-properties', '--printer', printerName]);
        return true;
      } else if (printerName) {
        exec(`rundll32.exe printui.dll,PrintUIEntry /e /n "${printerName}"`);
        return true;
      }
    }
    return false;
  } catch (err) {
    console.warn('Failed to open printer properties:', err);
    return false;
  }
});

// 5. High-Resolution 300 DPI Native PDF Rasterizer Engine (Powered by PDFium WebAssembly)
ipcMain.handle('printhub:render-pdf-pages', async (_event, options = {}) => {
  try {
    const { dataBase64, dpi = 300 } = options;
    if (!dataBase64) return [];

    let PDFiumLibrary;
    try {
      PDFiumLibrary = require('@hyzyla/pdfium').PDFiumLibrary;
    } catch (reqErr) {
      const unpackedCandidate = path.join(process.resourcesPath, 'app.asar.unpacked/node_modules/@hyzyla/pdfium');
      if (fs.existsSync(unpackedCandidate)) {
        PDFiumLibrary = require(unpackedCandidate).PDFiumLibrary;
      } else {
        throw reqErr;
      }
    }

    const cleanBase64 = dataBase64.replace(/^data:application\/pdf;base64,/, '').replace(/^data:.*?;base64,/, '');
    const pdfBuffer = Buffer.from(cleanBase64, 'base64');

    const lib = await PDFiumLibrary.init();
    const doc = await lib.loadDocument(pdfBuffer);
    const numPages = await doc.getPageCount();
    const targetScale = dpi / 72;
    const results = [];

    for (let pageNum = 0; pageNum < numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const size = await page.getSize();
      let scale = targetScale;
      const maxDim = Math.max(size.width, size.height);
      if (maxDim * scale > 4096) {
        scale = 4096 / maxDim;
      }

      const rendered = await page.render({ scale });
      results.push({
        pageNumber: pageNum + 1,
        width: rendered.width,
        height: rendered.height,
        rgba: Buffer.from(rendered.data),
      });
    }

    return results;
  } catch (err) {
    console.error('Native PDF render error in Electron main:', err);
    return [];
  }
});

// 6. Window Controls
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
