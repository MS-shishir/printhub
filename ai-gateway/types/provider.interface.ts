/**
 * provider.interface.ts - Common Abstraction for AI Providers in PrintHub Studio
 */

import { AICapability, AIProviderMetadata, ProviderHealth, ProviderHealthStatus } from './capabilities';

export interface IAIProcessRequest {
  requestId: string;
  capability: AICapability;
  fileBuffer?: Buffer;
  mimeType?: string;
  fileName?: string;
  prompt?: string;
  options?: {
    outputFormat?: 'PNG' | 'JPG' | 'WEBP';
    language?: 'eng' | 'ben' | 'auto';
    quality?: 'standard' | 'high';
    parseNid?: boolean;
    timeoutMs?: number;
    [key: string]: unknown;
  };
}

export interface IAIProcessResponse {
  success: boolean;
  requestId: string;
  provider: string;
  capability: AICapability;
  durationMs: number;
  mimeType: string;
  resultBuffer?: Buffer;
  resultDataUrl?: string;
  text?: string;
  data?: Record<string, unknown>;
  quotaRemaining?: number;
  info?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface IProviderQuota {
  providerId: string;
  requestsUsed: number;
  requestsRemaining: number;
  resetTime?: number;
  lastChecked: number;
}

export interface IAIProvider {
  readonly metadata: AIProviderMetadata;

  getMetadata(): AIProviderMetadata;
  getCapabilities(): AICapability[];
  isAvailable(): Promise<boolean>;
  getStatus(): Promise<ProviderHealth>;
  getRemainingQuota(): Promise<IProviderQuota>;
  processAsync(request: IAIProcessRequest): Promise<IAIProcessResponse>;
}
