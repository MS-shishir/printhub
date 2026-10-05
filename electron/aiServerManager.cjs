/**
/**
 * aiServerManager.cjs - Electron Python AI Server Lifecycle Manager
 * Automatically manages the FastAPI Hair-Matting Microservice in the background.
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

let pythonProcess = null;

/**
 * Checks if the AI server is already running on port 8000
 */
function isAiServerRunning(port = 8000) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/health`, { timeout: 800 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Resolves the appropriate python executable:
 * 1. Local virtual environment (python_backend/venv/Scripts/python.exe)
 * 2. Root virtual environment (.venv/Scripts/python.exe)
 * 3. System 'python'
 */
function getPythonExecutable(projectRoot) {
  const candidates = [
    path.join(projectRoot, 'python_backend', 'venv', 'Scripts', 'python.exe'),
    path.join(projectRoot, '.venv', 'Scripts', 'python.exe'),
    path.join(projectRoot, 'venv', 'Scripts', 'python.exe'),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }

  return 'python';
}

/**
 * Starts the Python AI server if not already running
 */
async function startPythonAiServer() {
  const isRunning = await isAiServerRunning(8000);
  if (isRunning) {
    console.log('[AI Server Manager] Python AI Server is already running on port 8000.');
    return;
  }

  const projectRoot = path.join(__dirname, '..');
  const pythonExe = getPythonExecutable(projectRoot);
  const serverScript = path.join(projectRoot, 'python_backend', 'server.py');

  if (!fs.existsSync(serverScript)) {
    console.warn(`[AI Server Manager] server.py not found at: ${serverScript}`);
    return;
  }

  console.log(`[AI Server Manager] Launching Python AI Server...`);
  console.log(`[AI Server Manager] Executable: ${pythonExe}`);
  console.log(`[AI Server Manager] Script: ${serverScript}`);

  try {
    pythonProcess = spawn(pythonExe, [serverScript], {
      cwd: path.join(projectRoot, 'python_backend'),
      windowsHide: true, // Sits silently in background without popping up black cmd window
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
    });

    pythonProcess.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) console.log(`[Python AI] ${msg}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) console.warn(`[Python AI Warn] ${msg}`);
    });

    pythonProcess.on('error', (err) => {
      console.error('[AI Server Manager] Failed to spawn Python process:', err.message);
      pythonProcess = null;
    });

    pythonProcess.on('exit', (code, signal) => {
      console.log(`[AI Server Manager] Python AI process exited (code: ${code}, signal: ${signal})`);
      pythonProcess = null;
    });
  } catch (err) {
    console.error('[AI Server Manager] Exception starting Python AI server:', err);
  }
}

/**
 * Stops the Python AI server when Electron closes
 */
function stopPythonAiServer() {
  if (!pythonProcess || !pythonProcess.pid) return;

  const pid = pythonProcess.pid;
  console.log(`[AI Server Manager] Terminating Python AI server (PID: ${pid})...`);

  try {
    if (process.platform === 'win32') {
      // Force kill process tree on Windows
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
    } else {
      pythonProcess.kill('SIGTERM');
    }
  } catch (e) {
    // Process might already be terminated
  }
  pythonProcess = null;
}

module.exports = {
  startPythonAiServer,
  stopPythonAiServer,
  isAiServerRunning,
};
