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
  dpi?: { horizontal: number; vertical: number };
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
    name: 'Canon LBP6230/6240',
    displayName: 'Canon LBP6230/6240 Laser Printer',
    description: 'High-Speed Auto-Duplex Laser Printer',
    isDefault: true,
    status: 'Offline',
    isOffline: true,
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
   * Send silent or direct print to hardware printer without opening OS print dialog
   */
  public async printDirect(options: PrintDirectOptions): Promise<PrintJobResult> {
    if (this.isDesktop() && window.electronAPI) {
      return window.electronAPI.printDirect({
        silent: options.silent !== false, // Always defaults to silent direct print
        ...options,
      });
    }

    // Browser simulation
    await new Promise(r => setTimeout(r, 600));
    return {
      success: true,
      deviceName: options.deviceName || 'Virtual Print Spooler',
    };
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
