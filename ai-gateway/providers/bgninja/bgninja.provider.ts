/**
 * bgninja.provider.ts - BGNinja AI Background Removal Provider Adapter
 * Zero-auth, no API key required, public free API.
 */

import { BaseAIProvider } from '../base.provider';
import { AICapability, AIProviderMetadata } from '../../types/capabilities';
import { IAIProcessRequest, IAIProcessResponse, IProviderQuota } from '../../types/provider.interface';
import { AIErrorCode, AIGatewayError } from '../../types/errors';
import { GatewayConfig } from '../../config/gateway.config';
import { QuotaTracker } from '../../quota/quotaTracker';
import { SecureLogger } from '../../security/secureLogger';

export class BGNinjaProvider extends BaseAIProvider {
  public readonly metadata: AIProviderMetadata;

  constructor() {
    super();
    const cfg = GatewayConfig.get().bgninja;
    this.metadata = {
      providerId: 'bgninja',
      providerName: 'BGNinja',
      capabilities: [AICapability.BackgroundRemoval],
      enabled: cfg.enabled,
      priority: cfg.priority,
      freeOnly: true,
      requiresApiKey: false,
      endpoint: cfg.endpoint,
      timeoutMs: cfg.timeoutMs,
      maxFileSizeBytes: 30 * 1024 * 1024, // 30 MB safe max
      supportedFormats: ['jpg', 'jpeg', 'png', 'webp'],
      privacyPolicyUrl: 'https://bgninja.com/privacy',
      termsUrl: 'https://bgninja.com/terms',
      retentionPolicy: 'Ephemeral in-memory processing. Images are not retained permanently on BGNinja servers.',
      retentionPolicyGuaranteedZero: false,
    };
  }

  protected hasValidApiKey(): boolean {
    return true; // No key required
  }

  public override async getRemainingQuota(): Promise<IProviderQuota> {
    const dailyLimit = GatewayConfig.get().bgninja.dailyLimit;
    const tracked = QuotaTracker.getQuota(this.metadata.providerId, dailyLimit);
    return {
      ...tracked,
      requestsRemaining: Math.max(0, dailyLimit - tracked.requestsUsed),
    };
  }

  public async processAsync(request: IAIProcessRequest): Promise<IAIProcessResponse> {
    const startTime = performance.now();
    const { buffer: cleanBuffer } = this.prepareBuffer(request.fileBuffer);

    SecureLogger.info({
      requestId: request.requestId,
      provider: this.metadata.providerName,
      capability: request.capability,
      fileSizeBytes: cleanBuffer.length,
      message: 'Dispatching image to BGNinja API',
    });

    try {
      const blob = new Blob([cleanBuffer], { type: 'image/png' });
      const formData = new FormData();
      formData.append('file', blob, 'portrait.png');

      const response = await fetch(this.metadata.endpoint, {
        method: 'POST',
        body: formData,
        headers: {
          'User-Agent': 'PrintHub-Studio-AI-Gateway/1.2.0',
        },
        signal: AbortSignal.timeout(this.metadata.timeoutMs),
      });

      if (response.status === 429) {
        QuotaTracker.recordRateLimit(this.metadata.providerId, 60);
        throw new AIGatewayError(
          'BGNinja rate limit exceeded (HTTP 429). Provider temporarily cooling down.',
          AIErrorCode.PROVIDER_RATE_LIMIT,
          { providerId: this.metadata.providerId, retryable: true, status: 429 }
        );
      }

      if (!response.ok) {
        throw new AIGatewayError(
          `BGNinja returned HTTP error ${response.status}: ${response.statusText}`,
          AIErrorCode.PROVIDER_ERROR,
          { providerId: this.metadata.providerId, retryable: response.status >= 500, status: response.status }
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const resultBuffer = Buffer.from(arrayBuffer);

      if (resultBuffer.length === 0) {
        throw new AIGatewayError('BGNinja returned an empty image response.', AIErrorCode.PROCESSING_FAILED, {
          providerId: this.metadata.providerId,
        });
      }

      const durationMs = Math.round(performance.now() - startTime);

      // Record quota usage
      const quota = QuotaTracker.updateQuota(
        this.metadata.providerId,
        1,
        Math.max(0, GatewayConfig.get().bgninja.dailyLimit - 1)
      );

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
        info: 'BGNinja Free Background Removal (Zero Key)',
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
        throw new AIGatewayError('BGNinja request timed out.', AIErrorCode.PROVIDER_TIMEOUT, {
          providerId: this.metadata.providerId,
          retryable: true,
        });
      }

      if (err instanceof AIGatewayError) throw err;

      throw new AIGatewayError(err.message || 'BGNinja processing failed', AIErrorCode.NETWORK_ERROR, {
        providerId: this.metadata.providerId,
        retryable: true,
        cause: err,
      });
    }
  }
}
