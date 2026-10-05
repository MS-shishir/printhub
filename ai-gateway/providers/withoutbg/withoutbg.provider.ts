/**
 * withoutbg.provider.ts - withoutBG Cloud AI Background Removal Adapter
 * 50 Free Cloud Credits. API Key securely stored only in server-side environment.
 */

import { BaseAIProvider } from '../base.provider';
import { AICapability, AIProviderMetadata } from '../../types/capabilities';
import { IAIProcessRequest, IAIProcessResponse, IProviderQuota } from '../../types/provider.interface';
import { AIErrorCode, AIGatewayError } from '../../types/errors';
import { GatewayConfig } from '../../config/gateway.config';
import { QuotaTracker } from '../../quota/quotaTracker';
import { SecureLogger } from '../../security/secureLogger';

export class WithoutBGProvider extends BaseAIProvider {
  public readonly metadata: AIProviderMetadata;

  constructor() {
    super();
    const cfg = GatewayConfig.get().withoutbg;
    this.metadata = {
      providerId: 'withoutbg',
      providerName: 'withoutBG',
      capabilities: [AICapability.BackgroundRemoval],
      enabled: cfg.enabled,
      priority: cfg.priority,
      freeOnly: true,
      requiresApiKey: true,
      endpoint: cfg.endpoint,
      timeoutMs: cfg.timeoutMs,
      maxFileSizeBytes: 25 * 1024 * 1024,
      supportedFormats: ['jpg', 'jpeg', 'png', 'webp'],
      privacyPolicyUrl: 'https://withoutbg.com/privacy-policy',
      termsUrl: 'https://withoutbg.com/terms-and-conditions',
      retentionPolicy: 'Processed images are kept in memory only during execution and purged afterwards.',
      retentionPolicyGuaranteedZero: false,
    };
  }

  protected hasValidApiKey(): boolean {
    const key = GatewayConfig.get().withoutbg.apiKey;
    return Boolean(key && key.trim().length > 0);
  }

  public override async getRemainingQuota(): Promise<IProviderQuota> {
    const tracked = QuotaTracker.getQuota(this.metadata.providerId, 50);
    return {
      ...tracked,
      requestsRemaining: Math.max(0, 50 - tracked.requestsUsed),
    };
  }

  public async processAsync(request: IAIProcessRequest): Promise<IAIProcessResponse> {
    const startTime = performance.now();
    const apiKey = GatewayConfig.get().withoutbg.apiKey;

    if (!apiKey) {
      throw new AIGatewayError(
        'withoutBG API key is missing in environment. Provider unavailable.',
        AIErrorCode.INVALID_API_KEY,
        { providerId: this.metadata.providerId, retryable: false }
      );
    }

    const { buffer: cleanBuffer } = this.prepareBuffer(request.fileBuffer);

    SecureLogger.info({
      requestId: request.requestId,
      provider: this.metadata.providerName,
      capability: request.capability,
      fileSizeBytes: cleanBuffer.length,
      message: 'Dispatching image to withoutBG Cloud API',
    });

    try {
      const blob = new Blob([cleanBuffer], { type: 'image/png' });
      const formData = new FormData();
      formData.append('image', blob, 'photo.png');

      const response = await fetch(this.metadata.endpoint, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
        },
        body: formData,
        signal: AbortSignal.timeout(this.metadata.timeoutMs),
      });

      if (response.status === 401 || response.status === 403) {
        throw new AIGatewayError(
          'withoutBG authentication failed. Invalid API Key.',
          AIErrorCode.INVALID_API_KEY,
          { providerId: this.metadata.providerId, retryable: false, status: response.status }
        );
      }

      if (response.status === 429) {
        QuotaTracker.recordRateLimit(this.metadata.providerId, 60);
        throw new AIGatewayError(
          'withoutBG rate limit exceeded (HTTP 429). Cooldown initiated.',
          AIErrorCode.PROVIDER_RATE_LIMIT,
          { providerId: this.metadata.providerId, retryable: true, status: 429 }
        );
      }

      if (response.status === 402) {
        throw new AIGatewayError(
          'withoutBG free credits exhausted.',
          AIErrorCode.PROVIDER_QUOTA_EXHAUSTED,
          { providerId: this.metadata.providerId, retryable: false, status: 402 }
        );
      }

      if (!response.ok) {
        throw new AIGatewayError(
          `withoutBG error ${response.status}: ${response.statusText}`,
          AIErrorCode.PROVIDER_ERROR,
          { providerId: this.metadata.providerId, retryable: response.status >= 500, status: response.status }
        );
      }

      let resultBuffer: Buffer;
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const json = await response.json();
        const base64Str = json.result || json.image || json.data;
        if (!base64Str) {
          throw new AIGatewayError('withoutBG response missing image payload.', AIErrorCode.PROCESSING_FAILED, {
            providerId: this.metadata.providerId,
          });
        }
        const cleanBase64 = base64Str.replace(/^data:image\/\w+;base64,/, '');
        resultBuffer = Buffer.from(cleanBase64, 'base64');
      } else {
        const arrayBuf = await response.arrayBuffer();
        resultBuffer = Buffer.from(arrayBuf);
      }

      const durationMs = Math.round(performance.now() - startTime);
      const quota = QuotaTracker.updateQuota(this.metadata.providerId, 1, 49);

      SecureLogger.info({
        requestId: request.requestId,
        provider: this.metadata.providerName,
        capability: request.capability,
        durationMs,
        success: true,
        fileSizeBytes: resultBuffer.length,
      });

      const mimeType = 'image/png';
      const resultDataUrl = `data:${mimeType};base64,${resultBuffer.toString('base64')}`;

      return {
        success: true,
        requestId: request.requestId,
        provider: this.metadata.providerName,
        capability: request.capability,
        durationMs,
        mimeType,
        resultBuffer,
        resultDataUrl,
        quotaRemaining: quota.requestsRemaining,
        info: 'withoutBG Cloud AI (Tier 2 Fallback)',
      };
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      SecureLogger.error(
        {
          requestId: request.requestId,
          provider: this.metadata.providerName,
          capability: request.capability,
          durationMs,
          success: false,
          errorCode: err.code || AIErrorCode.PROCESSING_FAILED,
        },
        err
      );

      if (err.name === 'TimeoutError' || err.message?.includes('timeout')) {
        throw new AIGatewayError('withoutBG request timed out.', AIErrorCode.PROVIDER_TIMEOUT, {
          providerId: this.metadata.providerId,
          retryable: true,
        });
      }

      if (err instanceof AIGatewayError) throw err;

      throw new AIGatewayError(err.message || 'withoutBG request failed', AIErrorCode.NETWORK_ERROR, {
        providerId: this.metadata.providerId,
        retryable: true,
        cause: err,
      });
    }
  }
}
