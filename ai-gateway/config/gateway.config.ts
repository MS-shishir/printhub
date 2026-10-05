/**
 * gateway.config.ts - Centralized Configuration for PrintHub AI Gateway
 */

import path from 'path';
import os from 'os';

export interface AIGatewayConfiguration {
  freeOnlyMode: boolean;
  maxFileSizeBytes: number;
  requestTimeoutMs: number;
  maxRetries: number;
  tempRetentionMinutes: number;
  stripExif: boolean;
  tempStoragePath: string;
  requireConsentForEveryCloudRequest: boolean;
  bgninja: {
    endpoint: string;
    timeoutMs: number;
    dailyLimit: number;
    enabled: boolean;
    priority: number;
  };
  withoutbg: {
    endpoint: string;
    apiKey: string;
    timeoutMs: number;
    enabled: boolean;
    priority: number;
  };
  ocrspace: {
    endpoint: string;
    apiKey: string;
    timeoutMs: number;
    enabled: boolean;
    priority: number;
  };
  cloudflare: {
    accountId: string;
    apiToken: string;
    timeoutMs: number;
    enabled: boolean;
    priority: number;
    defaultImageModel: string;
  };
}

class ConfigManager {
  private config: AIGatewayConfiguration;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): AIGatewayConfiguration {
    const isFreeOnly = process.env.AI_FREE_ONLY !== 'false'; // Default to true
    const maxMb = Number(process.env.AI_MAX_FILE_SIZE_MB) || 25;
    const defaultTemp = path.join(os.tmpdir(), 'PrintHub_TempAI');

    return {
      freeOnlyMode: isFreeOnly,
      maxFileSizeBytes: maxMb * 1024 * 1024,
      requestTimeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS) || 30000,
      maxRetries: Number(process.env.AI_MAX_RETRIES) || 1,
      tempRetentionMinutes: Number(process.env.AI_TEMP_RETENTION_MINUTES) || 5,
      stripExif: process.env.AI_STRIP_EXIF !== 'false', // Default to true
      tempStoragePath: process.env.AI_TEMP_DIR || defaultTemp,
      requireConsentForEveryCloudRequest: process.env.AI_REQUIRE_CONSENT === 'true',

      bgninja: {
        endpoint: process.env.BGNINJA_ENDPOINT || 'https://bgninja.com/api/remove',
        timeoutMs: Number(process.env.BGNINJA_TIMEOUT_MS) || 20000,
        dailyLimit: 10,
        enabled: process.env.BGNINJA_ENABLED !== 'false',
        priority: 1,
      },

      withoutbg: {
        endpoint: process.env.WITHOUTBG_ENDPOINT || 'https://api.withoutbg.com/v1.0/image-without-background',
        apiKey: process.env.WITHOUTBG_API_KEY || '',
        timeoutMs: Number(process.env.WITHOUTBG_TIMEOUT_MS) || 20000,
        enabled: process.env.WITHOUTBG_ENABLED !== 'false',
        priority: 2,
      },

      ocrspace: {
        endpoint: process.env.OCRSPACE_ENDPOINT || 'https://api.ocr.space/parse/image',
        apiKey: process.env.OCRSPACE_API_KEY || 'helloworld',
        timeoutMs: Number(process.env.OCRSPACE_TIMEOUT_MS) || 25000,
        enabled: process.env.OCRSPACE_ENABLED !== 'false',
        priority: 1,
      },

      cloudflare: {
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
        apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
        timeoutMs: Number(process.env.CLOUDFLARE_TIMEOUT_MS) || 35000,
        enabled: process.env.CLOUDFLARE_ENABLED !== 'false',
        priority: 1,
        // Verified free allocation text-to-image model
        defaultImageModel: '@cf/bytedance/stable-diffusion-xl-base-1.0',
      },
    };
  }

  public get(): AIGatewayConfiguration {
    return this.config;
  }

  public update(partial: Partial<AIGatewayConfiguration>): void {
    this.config = {
      ...this.config,
      ...partial,
      bgninja: { ...this.config.bgninja, ...partial.bgninja },
      withoutbg: { ...this.config.withoutbg, ...partial.withoutbg },
      ocrspace: { ...this.config.ocrspace, ...partial.ocrspace },
      cloudflare: { ...this.config.cloudflare, ...partial.cloudflare },
    };
  }

  public reloadFromEnv(): void {
    this.config = this.loadConfig();
  }
}

export const GatewayConfig = new ConfigManager();
