/**
 * nativeHardwareService.ts
 * Enterprise Hardware Bridge for PrintHub Desktop & Studio
 * Connects React UI to native Windows Printers, Spooler, and Scanner Folder Watcher
 */

export interface NativePrinterCapabilities {
  color: boolean;
  duplex: boolean;
  copies: boolean;
  collate: boolean;
  paperSizes: string[];
  resolutions?: string[];
}

export interface NativePrinter {
  name: string;
  displayName: string;
  description: string;
  isDefault: boolean;
  status: 'Ready' | 'Online' | 'Offline' | 'Busy' | 'Error' | 'Paper Jam' | 'Paper Out';
  isOffline: boolean;
  jobCount?: number;
  capabilities: NativePrinterCapabilities;
}

export interface PrintDirectOptions {
  silent?: boolean;
  deviceName?: string;
  copies?: number;
  pageSize?: string;
  landscape?: boolean;
  color?: boolean;
  duplexMode?: 'simplex' | 'longEdge' | 'shortEdge';
  scaleFactor?: number;
  dpi?: { horizontal: number; vertical: number } | number;
  paperType?: string;
  quality?: string;
  multiPage?: string;
  collate?: boolean;
  reverseOrder?: boolean;
  quietMode?: boolean;
  dataUrl?: string;
  htmlContent?: string;
  margins?: { marginType: string; top?: number; bottom?: number; left?: number; right?: number };
}

export interface PrintJobResult {
  success: boolean;
  deviceName?: string;
  error?: string;
}

export interface NewScanEvent {
  fileName: string;
  filePath: string;
  dataUrl: string;
  timestamp: number;
}

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      getPrinters: () => Promise<NativePrinter[]>;
      printDirect: (options: PrintDirectOptions) => Promise<PrintJobResult>;
      selectScanFolder: () => Promise<string | null>;
      getScanFolder: () => Promise<string>;
      onNewScan: (callback: (data: NewScanEvent) => void) => () => void;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
    };
  }
}

// Simulated fallback printers for Web / Browser Development environment
const MOCK_WINDOWS_PRINTERS: NativePrinter[] = [
  {
    name: 'EPSON L8050 Series',
    displayName: 'EPSON L8050 Series (6-Color Photo InkTank)',
    description: 'High-Definition 6-Color Photo & PVC ID Card Printer',
    isDefault: true,
    status: 'Ready',
    isOffline: false,
    capabilities: {
      color: true,
      duplex: false,
      copies: true,
      collate: true,
      paperSizes: ['A4', '4R', 'Legal', 'Letter', 'A5', 'Stamp', 'Custom'],
    },
  },
  {
    name: 'EPSON L3250 Series',
    displayName: 'EPSON L3250 Series (Wi-Fi EcoTank)',
    description: 'All-in-One InkTank Color Printer',
    isDefault: false,
    status: 'Ready',
    isOffline: false,
    capabilities: {
      color: true,
      duplex: false,
      copies: true,
      collate: true,
      paperSizes: ['A4', '4R', 'Legal', 'Letter', 'A5', 'Stamp', 'Custom'],
    },
  },
  {
    name: 'Canon LBP6230/6240',
    displayName: 'Canon LBP6230/6240 Laser Printer',
    description: 'High-Speed Auto-Duplex Laser Printer',
    isDefault: false,
    status: 'Ready',
    isOffline: false,
    capabilities: {
      color: false, // Monochrome laser
      duplex: true, // Hardware Auto-Duplex
      copies: true,
      collate: true,
      paperSizes: ['A4', 'Legal', 'Letter', 'A5', 'Custom'],
    },
  },
  {
    name: 'Microsoft Print to PDF',
    displayName: 'Microsoft Print to PDF',
    description: 'Windows Built-in PDF Virtual Spooler',
    isDefault: false,
    status: 'Ready',
    isOffline: false,
    capabilities: {
      color: true,
      duplex: true,
      copies: true,
      collate: true,
      paperSizes: ['A4', '4R', 'Legal', 'Letter', 'A5', 'Stamp', 'Custom'],
    },
  },
];

class NativeHardwareService {
  private static instance: NativeHardwareService | null = null;
  private cachedPrinters: NativePrinter[] = [];

  private constructor() {}

  public static getInstance(): NativeHardwareService {
    if (!NativeHardwareService.instance) {
      NativeHardwareService.instance = new NativeHardwareService();
    }
    return NativeHardwareService.instance;
  }

  /**
   * Check if application is running in Windows Electron desktop mode
   */
  public isDesktop(): boolean {
    return typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);
  }

  /**
   * Fetch connected physical Windows printers with real-time status & capabilities
   */
  public async getPrinters(forceRefresh: boolean = false): Promise<NativePrinter[]> {
    if (this.cachedPrinters.length > 0 && !forceRefresh) {
      return this.cachedPrinters;
    }

    // 1. First priority: Native Electron IPC bridge
    if (this.isDesktop() && window.electronAPI) {
      try {
        const printers = await window.electronAPI.getPrinters();
        if (printers && printers.length > 0) {
          this.cachedPrinters = printers;
          return this.cachedPrinters;
        }
      } catch (err) {
        console.warn('Native Electron printer fetch error:', err);
      }
    }

    // 2. Second priority: Local Vite / Express dev server endpoint connected to Windows PowerShell
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/printers');
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            this.cachedPrinters = list;
            return this.cachedPrinters;
          }
        }
      } catch (e) {
        // Not in local dev server or endpoint unavailable
      }
    }

    // 3. Fallback mock printers
    this.cachedPrinters = MOCK_WINDOWS_PRINTERS;
    return this.cachedPrinters;
  }

  /**
   * Get default printer name if available
   */
  public getDefaultPrinterName(): string | null {
    const def = this.cachedPrinters.find(p => p.isDefault) || this.cachedPrinters[0];
    return def ? def.name : null;
  }

  /**
   * Find printer by exact name
   */
  public getPrinterByName(name: string): NativePrinter | undefined {
    return this.cachedPrinters.find(p => p.name === name || p.displayName === name);
  }

  /**
   * Send silent or direct print to hardware printer without opening OS print dialog (Electron)
   * or open high-precision native browser print dialog (Web)
   */
  public async printDirect(options: PrintDirectOptions): Promise<PrintJobResult> {
    if (this.isDesktop() && window.electronAPI) {
      return window.electronAPI.printDirect({
        silent: options.silent !== false, // Always defaults to silent direct print in Electron
        ...options,
      });
    }

    // Web Browser execution: real iframe-based 1:1 print
    return this.printInBrowser(options);
  }

  /**
   * Real browser print execution using an isolated hidden high-DPI iframe
   */
  private async printInBrowser(options: PrintDirectOptions): Promise<PrintJobResult> {
    return new Promise((resolve) => {
      try {
        const {
          dataUrl,
          htmlContent,
          pageSize = 'A4',
          landscape = false,
          color = true,
        } = options;

        const isLand = Boolean(landscape);
        const pw = pageSize === '4R' ? (isLand ? '152mm' : '102mm') : pageSize === 'Legal' ? (isLand ? '356mm' : '216mm') : pageSize === 'Letter' ? (isLand ? '279mm' : '216mm') : pageSize === 'A5' ? (isLand ? '210mm' : '148mm') : (isLand ? '297mm' : '210mm');
        const ph = pageSize === '4R' ? (isLand ? '102mm' : '152mm') : pageSize === 'Legal' ? (isLand ? '216mm' : '356mm') : pageSize === 'Letter' ? (isLand ? '216mm' : '279mm') : pageSize === 'A5' ? (isLand ? '148mm' : '210mm') : (isLand ? '210mm' : '297mm');

        const isGrayscale = color === false;

        let iframe = document.getElementById('printhub-browser-print-iframe') as HTMLIFrameElement;
        if (!iframe) {
          iframe = document.createElement('iframe');
          iframe.id = 'printhub-browser-print-iframe';
          iframe.style.position = 'fixed';
          iframe.style.right = '0';
          iframe.style.bottom = '0';
          iframe.style.width = '0px';
          iframe.style.height = '0px';
          iframe.style.border = 'none';
          iframe.style.zIndex = '-99999';
          iframe.style.visibility = 'hidden';
          document.body.appendChild(iframe);
        }

        const doc = iframe.contentWindow?.document || iframe.contentDocument;
        if (!doc) {
          resolve({ success: false, error: 'Could not access browser print frame.' });
          return;
        }

        const pageHtml = htmlContent || `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8" />
            <title>PrintHub Studio</title>
            <style>
              @page {
                size: ${pw} ${ph};
                margin: 0mm !important;
              }
              *, *:before, *:after {
                margin: 0 !important;
                padding: 0 !important;
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
              img#printSheetImg {
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
            <img id="printSheetImg" src="${dataUrl}" />
          </body>
          </html>
        `;

        doc.open();
        doc.write(pageHtml);
        doc.close();

        const imgEl = doc.getElementById('printSheetImg') as HTMLImageElement;
        const triggerPrint = () => {
          setTimeout(() => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
              resolve({ success: true, deviceName: 'Browser Native Spooler' });
            } catch (err: any) {
              resolve({ success: false, error: err?.message || 'Browser print failed.' });
            }
          }, 300);
        };

        if (imgEl) {
          if (imgEl.complete && imgEl.naturalWidth > 0) {
            triggerPrint();
          } else {
            imgEl.onload = triggerPrint;
            imgEl.onerror = triggerPrint;
          }
        } else {
          triggerPrint();
        }
      } catch (e: any) {
        resolve({ success: false, error: e?.message || 'Browser print execution failed.' });
      }
    });
  }

  /**
   * Open Windows folder picker to choose scanner output folder
   */
  public async selectScanFolder(): Promise<string | null> {
    if (!this.isDesktop() || !window.electronAPI) return null;
    return window.electronAPI.selectScanFolder();
  }

  /**
   * Get current watched scanner directory
   */
  public async getScanFolder(): Promise<string | null> {
    if (!this.isDesktop() || !window.electronAPI) return null;
    return window.electronAPI.getScanFolder();
  }

  /**
   * Subscribe to new auto-detected scanner documents in real time
   */
  public onNewScan(callback: (data: NewScanEvent) => void): () => void {
    if (!this.isDesktop() || !window.electronAPI) {
      return () => {};
    }
    return window.electronAPI.onNewScan(callback);
  }
}

export const nativeHardwareService = NativeHardwareService.getInstance();
