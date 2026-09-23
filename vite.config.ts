import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

function localPrinterApiPlugin(): Plugin {
  return {
    name: 'local-printer-api-plugin',
    configureServer(server) {
      // 1. Query real physical Windows printers
      server.middlewares.use('/api/printers', async (req, res, next) => {
        if (req.method !== 'GET') return next();
        try {
          const { getWindowsPrintersReal } = require('./electron/printers-helper.cjs');
          const printers = await getWindowsPrintersReal();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(printers));
        } catch (e: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: e?.message || 'Failed to query Windows hardware printers' }));
        }
      });

      // 2. Open Real Windows Driver Properties dialog
      server.middlewares.use('/api/printer-properties', async (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            const printerName = data.printerName;
            if (printerName) {
              const { exec } = require('child_process');
              const spoolerPath = path.resolve(__dirname, 'electron/bin/PrintHubSpooler.exe');
              if (require('fs').existsSync(spoolerPath)) {
                require('child_process').execFile(spoolerPath, ['--open-properties', '--printer', printerName]);
              } else {
                exec(`rundll32.exe printui.dll,PrintUIEntry /e /n "${printerName}"`);
              }
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, opened: printerName }));
              return;
            }
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: 'Printer name required' }));
          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: e?.message }));
          }
        });
      });

      // 3. Direct Hardware Print Spooler with Win32 DEVMODE (Glossy/Matte/High DPI)
      server.middlewares.use('/api/print', async (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const options = JSON.parse(body || '{}');
            const {
              deviceName,
              dataUrl,
              copies = 1,
              pageSize = 'A4',
              landscape = false,
              color = true,
              duplexMode = 'simplex',
              paperType = 'plain',
              quality = 'standard',
            } = options;

            if (!dataUrl) {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: 'Image dataUrl required for hardware printing' }));
              return;
            }

            const fs = require('fs');
            const os = require('os');
            const { execFile } = require('child_process');

            const spoolerExe = path.resolve(__dirname, 'electron/bin/PrintHubSpooler.exe');
            if (!fs.existsSync(spoolerExe)) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: 'PrintHubSpooler.exe not found at ' + spoolerExe }));
              return;
            }

            const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');
            const tempImgPath = path.join(
              os.tmpdir(),
              `printhub_web_${Date.now()}_${Math.random().toString(36).slice(2)}.png`
            );
            fs.writeFileSync(tempImgPath, imageBuffer);

            const isLand = Boolean(landscape);
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

            execFile(spoolerExe, spoolerArgs, { timeout: 20000 }, (err: any, stdout: string, stderr: string) => {
              try {
                if (fs.existsSync(tempImgPath)) fs.unlinkSync(tempImgPath);
              } catch {}

              if (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: err.message || stderr }));
                return;
              }

              try {
                const parsed = JSON.parse(stdout.trim());
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(parsed));
              } catch {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, deviceName: deviceName || 'Windows Hardware Printer' }));
              }
            });
          } catch (e: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: e?.message }));
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), localPrinterApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.json', '.mjs'],
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/release/**', '**/dist/**', '**/.git/**']
      },
    },
    build: {
      emptyOutDir: true,
    },
  };
});
