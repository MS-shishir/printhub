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
      server.middlewares.use('/api/printers', async (_req, res) => {
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
  };
});
