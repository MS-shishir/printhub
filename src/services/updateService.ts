/**
 * updateService.ts
 * Frontend service bridge for Electron Auto-Update Engine.
 * Handles update status tracking, download progress, and bilingual messaging.
 */

export type UpdateStatus = 
  | 'idle' 
  | 'checking' 
  | 'available' 
  | 'not-available' 
  | 'downloading' 
  | 'downloaded' 
  | 'error';

export interface UpdateProgress {
  percent: number;
  bytesPerSecond?: number;
  transferred?: number;
  total?: number;
}

export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

export interface UpdateState {
  status: UpdateStatus;
  currentVersion: string;
  info: UpdateInfo | null;
  progress: UpdateProgress | null;
  error: string | null;
  isPackaged?: boolean;
}

type UpdateListener = (state: UpdateState) => void;

class UpdateService {
  private state: UpdateState = {
    status: 'idle',
    currentVersion: '1.1.0',
    info: null,
    progress: null,
    error: null,
    isPackaged: false,
  };

  private listeners: Set<UpdateListener> = new Set();
  private initialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    const electron = (window as any).electronAPI;
    if (electron) {
      if (electron.getAppVersion) {
        electron.getAppVersion().then((ver: string) => {
          if (ver) {
            this.state.currentVersion = ver;
            this.notify();
          }
        }).catch(() => {});
      }

      if (electron.getUpdaterStatus) {
        electron.getUpdaterStatus().then((status: any) => {
          if (status) {
            this.state = {
              ...this.state,
              ...status,
            };
            this.notify();
          }
        }).catch(() => {});
      }

      if (electron.onUpdaterStatus && !this.initialized) {
        this.initialized = true;
        electron.onUpdaterStatus((statusPayload: any) => {
          this.state = {
            ...this.state,
            ...statusPayload,
          };
          this.notify();
        });
      }
    }
  }

  public getState(): UpdateState {
    return this.state;
  }

  public subscribe(listener: UpdateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (err) {
        console.error('UpdateListener error:', err);
      }
    });
  }

  public async checkForUpdates(): Promise<{ success: boolean; message?: string; error?: string }> {
    const electron = (window as any).electronAPI;
    if (!electron || !electron.checkForUpdates) {
      this.state.status = 'error';
      this.state.error = 'Auto-update is only available in the PrintHub Desktop Application.';
      this.notify();
      return { success: false, error: this.state.error };
    }

    this.state.status = 'checking';
    this.state.error = null;
    this.notify();

    try {
      const res = await electron.checkForUpdates();
      return res || { success: true };
    } catch (err: any) {
      this.state.status = 'error';
      this.state.error = err?.message || 'Network error while checking for updates';
      this.notify();
      return { success: false, error: this.state.error };
    }
  }

  public async startDownloadUpdate(): Promise<boolean> {
    const electron = (window as any).electronAPI;
    if (!electron || !electron.startDownloadUpdate) return false;

    this.state.status = 'downloading';
    this.notify();

    try {
      const res = await electron.startDownloadUpdate();
      return res?.success !== false;
    } catch {
      return false;
    }
  }

  public async quitAndInstallUpdate(): Promise<void> {
    const electron = (window as any).electronAPI;
    if (electron && electron.quitAndInstallUpdate) {
      await electron.quitAndInstallUpdate();
    }
  }
}

export const updateService = new UpdateService();
