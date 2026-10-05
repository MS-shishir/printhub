/**
 * aiOmniRouter.ts - PrintHub AI Omni Router Service
 * Multi-Tier Failover Engine for Background Removal, Document OCR & AI Intelligence
 *
 * Background Removal Tiers:
 * 1. BGNinja: Zero-Config, No Auth, Free 10/day, Max 99MB/30MP
 * 2. withoutBG: 50 Free Cloud Credits (API Key securely kept in Electron backend)
 * 3. Local Neural Matting: PrintHub 15-Stage MattingEngine / MediaPipe / WASM (100% offline safety net)
 *
 * OCR Tiers:
 * 1. OCR.space: Fast Image/PDF to Text
 * 2. Gemini Flash / Vision: Structured Bengali NID / Smart Card / Document Extraction
 */

export interface AiRemoveBgResult {
  success: boolean;
  dataUrl: string;
  provider: 'BGNinja' | 'withoutBG' | 'FastAPI' | 'LocalMatting';
  durationMs: number;
  quotaRemaining?: number;
  info?: string;
}

export interface AiOcrResult {
  success: boolean;
  provider: string;
  rawText: string;
  nidData?: ParsedNidData;
  error?: string;
}

export interface ParsedNidData {
  nidNumber?: string;
  pinNumber?: string;
  nameBangla?: string;
  nameEnglish?: string;
  fatherName?: string;
  motherName?: string;
  dob?: string;
  bloodGroup?: string;
  address?: string;
}

const BGNINJA_DAILY_LIMIT = 10;
const STORAGE_KEY_PREFIX = 'printhub_ai_quota_';

class AiOmniRouterService {
  /**
   * Tracks daily usage counts in localStorage for transparency to the user
   */
  private getTodayKey(): string {
    const today = new Date().toISOString().slice(0, 10);
    return `${STORAGE_KEY_PREFIX}${today}`;
  }

  public getDailyUsage(): { bgninjaUsed: number; bgninjaRemaining: number } {
    try {
      const key = this.getTodayKey();
      const raw = localStorage.getItem(key);
      const data = raw ? JSON.parse(raw) : { bgninja: 0 };
      const used = data.bgninja || 0;
      return {
        bgninjaUsed: used,
        bgninjaRemaining: Math.max(0, BGNINJA_DAILY_LIMIT - used),
      };
    } catch {
      return { bgninjaUsed: 0, bgninjaRemaining: BGNINJA_DAILY_LIMIT };
    }
  }

  private incrementUsage(provider: 'bgninja') {
    try {
      const key = this.getTodayKey();
      const raw = localStorage.getItem(key);
      const data = raw ? JSON.parse(raw) : { bgninja: 0 };
      data[provider] = (data[provider] || 0) + 1;
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // Storage unavailable, ignore
    }
  }

  private activeBgPromise: Promise<AiRemoveBgResult | null> | null = null;

  /**
   * Universal Background Removal with Cascading Fallback & Concurrency Lock
   */
  public async removeBackground(
    imageSource: string | Blob | File,
    options: { onProgress?: (status: string) => void } = {}
  ): Promise<AiRemoveBgResult | null> {
    if (this.activeBgPromise) {
      console.log('[AI Omni Router] Reusing existing in-flight background removal promise');
      return this.activeBgPromise;
    }

    this.activeBgPromise = this.executeRemoveBackground(imageSource, options);
    try {
      return await this.activeBgPromise;
    } finally {
      this.activeBgPromise = null;
    }
  }

  private async executeRemoveBackground(
    imageSource: string | Blob | File,
    options: { onProgress?: (status: string) => void } = {}
  ): Promise<AiRemoveBgResult | null> {
    const startTime = performance.now();

    // Convert source to Data URL for IPC transmission
    let dataUrl = '';
    if (typeof imageSource === 'string') {
      dataUrl = imageSource;
    } else {
      dataUrl = await this.blobToDataUrl(imageSource);
    }

    // ── Tier 1 & 2 via Electron IPC (Secure Gateway, no API keys exposed) ──
    if (typeof window !== 'undefined' && window.electronAPI?.aiRemoveBg) {
      options.onProgress?.('Contacting AI Omni Router Gateway...');
      try {
        const res = await window.electronAPI.aiRemoveBg({ imageBase64: dataUrl });
        if (res.success && res.dataUrl) {
          if (res.provider === 'BGNinja') {
            this.incrementUsage('bgninja');
          }
          const duration = Math.round(performance.now() - startTime);
          return {
            success: true,
            dataUrl: res.dataUrl,
            provider: (res.provider as any) || 'BGNinja',
            durationMs: duration,
            info: res.quotaInfo,
          };
        }
      } catch (ipcErr) {
        console.warn('[AI Omni Router IPC Failed, trying browser fallback]', ipcErr);
      }
    }

    // ── Tier 1 & 2 via Local/Dev Gateway (/api/ai/remove-bg) ──
    // Seamlessly handles requests in browser mode without triggering CORS errors
    try {
      options.onProgress?.('Processing via AI Omni Router Gateway...');
      const response = await fetch('/api/ai/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl }),
        signal: AbortSignal.timeout(22000),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.dataUrl) {
          if (result.provider === 'BGNinja') {
            this.incrementUsage('bgninja');
          }
          const duration = Math.round(performance.now() - startTime);
          return {
            success: true,
            dataUrl: result.dataUrl,
            provider: result.provider || 'BGNinja',
            durationMs: duration,
            info: `${result.provider} AI Engine`,
          };
        }
      }
    } catch (gatewayErr) {
      console.warn('[AI Omni Router Gateway Failed / Retrying fallback]', gatewayErr);
    }

    // ── Web Browser Direct Fallback (For direct client fetch) ──
    const { bgninjaRemaining } = this.getDailyUsage();
    if (bgninjaRemaining > 0) {
      options.onProgress?.('Attempting BGNinja Web Direct (Tier 1)...');
      try {
        const blob = await this.dataUrlToBlob(dataUrl);
        const formData = new FormData();
        formData.append('file', blob, 'portrait.png');

        const response = await fetch('https://bgninja.com/api/remove', {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(12000),
        });

        if (response.ok) {
          const resBlob = await response.blob();
          const resultUrl = await this.blobToDataUrl(resBlob);
          this.incrementUsage('bgninja');
          const duration = Math.round(performance.now() - startTime);
          return {
            success: true,
            dataUrl: resultUrl,
            provider: 'BGNinja',
            durationMs: duration,
            quotaRemaining: bgninjaRemaining - 1,
            info: 'BGNinja Free API',
          };
        }
      } catch (browserFetchErr) {
        console.warn('[BGNinja Web Direct Failed / CORS / Offline]', browserFetchErr);
      }
    }

    // Return null to allow caller to run local MattingEngine
    return null;
  }

  /**
   * Universal Document OCR with NID Parsing
   */
  public async performOcr(
    imageSource: string | Blob | File,
    options: { language?: 'bn' | 'eng'; parseNid?: boolean } = {}
  ): Promise<AiOcrResult> {
    let dataUrl = '';
    if (typeof imageSource === 'string') {
      dataUrl = imageSource;
    } else {
      dataUrl = await this.blobToDataUrl(imageSource);
    }

    let rawText = '';
    let provider = 'Unknown';

    // 1. Electron IPC Call
    if (typeof window !== 'undefined' && window.electronAPI?.aiOcr) {
      try {
        const res = await window.electronAPI.aiOcr({
          imageBase64: dataUrl,
          language: options.language || 'eng',
        });
        if (res.success && res.text) {
          rawText = res.text;
          provider = res.provider || 'OCR.space';
        }
      } catch (e) {
        console.warn('[AI Omni Router OCR IPC Failed]', e);
      }
    }

    // 2. Parse NID fields if requested
    let nidData: ParsedNidData | undefined;
    if (rawText && options.parseNid) {
      nidData = this.parseBangladeshiNid(rawText);
    }

    return {
      success: Boolean(rawText),
      provider,
      rawText,
      nidData,
    };
  }

  /**
   * Intelligent Bangladeshi NID (Smart Card & Old NID) Field Extractor
   */
  public parseBangladeshiNid(text: string): ParsedNidData {
    const data: ParsedNidData = {};

    // 1. NID Number (10 digit smart card or 13/17 digit traditional)
    const nidMatch = text.match(/(?:NID\s*No\.?|ID\s*NO\.?|National\s*ID\s*No\.?)\s*[:\s]*([0-9\s]{10,19})/i) ||
                     text.match(/\b(\d{10}|\d{13}|\d{17})\b/);
    if (nidMatch) {
      data.nidNumber = nidMatch[1].replace(/\s+/g, '');
    }

    // 2. Date of Birth (DD MMM YYYY or DD/MM/YYYY)
    const dobMatch = text.match(/(?:Date\s*of\s*Birth|DOB)\s*[:\s]*([0-9]{1,2}[\s./\-_][A-Za-z0-9]{2,4}[\s./\-_][0-9]{4})/i) ||
                     text.match(/\b(\d{2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})\b/i);
    if (dobMatch) {
      data.dob = dobMatch[1].trim();
    }

    // 3. Name (English)
    const nameEngMatch = text.match(/(?:Name\s*[:\s]*)([A-Z\s.]+)(?:\r?\n|Father|Mother|Date)/i);
    if (nameEngMatch && nameEngMatch[1].trim().length > 2) {
      data.nameEnglish = nameEngMatch[1].trim();
    }

    // 4. Father's Name
    const fatherMatch = text.match(/(?:Father(?:'s)?\s*Name\s*[:\s]*)([A-Z\s.]+)(?:\r?\n|Mother|Date)/i);
    if (fatherMatch) {
      data.fatherName = fatherMatch[1].trim();
    }

    // 5. Mother's Name
    const motherMatch = text.match(/(?:Mother(?:'s)?\s*Name\s*[:\s]*)([A-Z\s.]+)(?:\r?\n|Date|Place)/i);
    if (motherMatch) {
      data.motherName = motherMatch[1].trim();
    }

    // 6. Blood Group
    const bgMatch = text.match(/(?:Blood\s*Group\s*[:\s]*)([A|B|AB|O][+-])/i);
    if (bgMatch) {
      data.bloodGroup = bgMatch[1].toUpperCase();
    }

    return data;
  }

  private async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const res = await fetch(dataUrl);
    return await res.blob();
  }
}

export const AiOmniRouter = new AiOmniRouterService();
