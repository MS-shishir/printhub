/**
 * tempManager.ts - Ephemeral File Storage Janitor with Guaranteed Auto-Purge
 * Manages TempAI/requests, TempAI/responses, TempAI/failed with zero permanent retention.
 */

import fs from 'fs';
import path from 'path';
import { GatewayConfig } from '../config/gateway.config';

export class TempFileManager {
  private baseDir: string;
  private requestsDir: string;
  private responsesDir: string;
  private failedDir: string;
  private janitorTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.baseDir = GatewayConfig.get().tempStoragePath;
    this.requestsDir = path.join(this.baseDir, 'requests');
    this.responsesDir = path.join(this.baseDir, 'responses');
    this.failedDir = path.join(this.baseDir, 'failed');

    this.ensureDirectories();
    this.startJanitor();
  }

  private ensureDirectories(): void {
    try {
      if (!fs.existsSync(this.baseDir)) fs.mkdirSync(this.baseDir, { recursive: true });
      if (!fs.existsSync(this.requestsDir)) fs.mkdirSync(this.requestsDir, { recursive: true });
      if (!fs.existsSync(this.responsesDir)) fs.mkdirSync(this.responsesDir, { recursive: true });
      if (!fs.existsSync(this.failedDir)) fs.mkdirSync(this.failedDir, { recursive: true });
    } catch (e) {
      console.warn('[TempFileManager] Warning initializing temp directories:', e);
    }
  }

  /**
   * Writes input file to ephemeral storage with secure randomized name
   */
  public writeInput(requestId: string, buffer: Buffer): string {
    this.ensureDirectories();
    const shortId = requestId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
    const targetPath = path.join(this.requestsDir, `request_${shortId}_input.tmp`);
    fs.writeFileSync(targetPath, buffer);
    return targetPath;
  }

  /**
   * Writes output file to ephemeral storage
   */
  public writeOutput(requestId: string, buffer: Buffer): string {
    this.ensureDirectories();
    const shortId = requestId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
    const targetPath = path.join(this.responsesDir, `request_${shortId}_output.tmp`);
    fs.writeFileSync(targetPath, buffer);
    return targetPath;
  }

  /**
   * Deletes all temporary files for a specific request ID immediately
   */
  public deleteRequestFiles(requestId: string): void {
    const shortId = requestId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
    const dirs = [this.requestsDir, this.responsesDir, this.failedDir];

    for (const d of dirs) {
      try {
        if (!fs.existsSync(d)) continue;
        const files = fs.readdirSync(d);
        for (const file of files) {
          if (file.includes(shortId)) {
            try {
              fs.unlinkSync(path.join(d, file));
            } catch {}
          }
        }
      } catch {}
    }
  }

  /**
   * Sweeps expired files older than configured retention period
   */
  public sweepExpired(): number {
    const retentionMs = GatewayConfig.get().tempRetentionMinutes * 60 * 1000;
    const now = Date.now();
    let deletedCount = 0;
    const dirs = [this.requestsDir, this.responsesDir, this.failedDir];

    for (const d of dirs) {
      try {
        if (!fs.existsSync(d)) continue;
        const files = fs.readdirSync(d);
        for (const file of files) {
          const filePath = path.join(d, file);
          try {
            const stat = fs.statSync(filePath);
            if (now - stat.mtimeMs > retentionMs) {
              fs.unlinkSync(filePath);
              deletedCount++;
            }
          } catch {}
        }
      } catch {}
    }

    return deletedCount;
  }

  /**
   * Completely purges all temporary files (used on startup & application exit)
   */
  public purgeAll(): void {
    const dirs = [this.requestsDir, this.responsesDir, this.failedDir];
    for (const d of dirs) {
      try {
        if (!fs.existsSync(d)) continue;
        const files = fs.readdirSync(d);
        for (const file of files) {
          try {
            fs.unlinkSync(path.join(d, file));
          } catch {}
        }
      } catch {}
    }
  }

  private startJanitor(): void {
    if (this.janitorTimer) clearInterval(this.janitorTimer);
    // Initial purge on initialization
    this.sweepExpired();
    // Run janitor every 60 seconds
    this.janitorTimer = setInterval(() => {
      this.sweepExpired();
    }, 60000);
    // Unref timer so it doesn't block node process exit
    if (this.janitorTimer.unref) {
      this.janitorTimer.unref();
    }
  }

  public destroy(): void {
    if (this.janitorTimer) {
      clearInterval(this.janitorTimer);
      this.janitorTimer = null;
    }
    this.purgeAll();
  }
}

export const TempAIStorage = new TempFileManager();
