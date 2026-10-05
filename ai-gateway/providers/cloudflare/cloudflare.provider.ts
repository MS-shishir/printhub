/**
 * cloudflare.provider.ts - Cloudflare Workers AI Provider Adapter
 * Utilizes Cloudflare 10,000 Free Daily Neurons for verified open-source models.
 * Capabilities: ImageGeneration (Stable Diffusion XL Base)
 */

import { BaseAIProvider } from '../base.provider';
import { AICapability, AIProviderMetadata } from '../../types/capabilities';
import { IAIProcessRequest, IAIProcessResponse, IProviderQuota } from '../../types/provider.interface';
import { AIErrorCode, AIGatewayError } from '../../types/errors';
import { GatewayConfig } from '../../config/gateway.config';
import { QuotaTracker } from '../../quota/quotaTracker';
import { SecureLogger } from '../../security/secureLogger';

export class CloudflareWorkersAIProvider extends BaseAIProvider {
  public readonly metadata: AIProviderMetadata;

  constructor() {
    super();
    const cfg = GatewayConfig.get().cloudflare;
    this.metadata = {
      providerId: 'cloudflare',
      providerName: 'Cloudflare Workers AI',
      capabilities: [AICapability.ImageGeneration],
      enabled: cfg.enabled,
      priority: cfg.priority,
      freeOnly: true, // Operating within the 10,000 free Neurons/day allocation
      requiresApiKey: true,
      endpoint: 'https://api.cloudflare.com/client/v4/accounts',
      timeoutMs: cfg.timeoutMs,
      maxFileSizeBytes: 10 * 1024 * 1024,
      supportedFormats: ['jpg', 'jpeg', 'png', 'webp'],
      privacyPolicyUrl: 'https://www.cloudflare.com/privacypolicy/',
      termsUrl: 'https://www.cloudflare.com/website-terms/',
      retentionPolicy: 'Cloudflare does not use customer data to train models or retain inputs/outputs permanently.',
      retentionPolicyGuaranteedZero: true,
    };
  }

  protected hasValidApiKey(): boolean {
    const { accountId, apiToken } = GatewayConfig.get().cloudflare;
    return Boolean(accountId && apiToken && accountId.trim().length > 0 && apiToken.trim().length > 0);
  }

  public override async getRemainingQuota(): Promise<IProviderQuota> {
    const dailyLimit = 100; // ~100 standard generations within 10,000 Neurons/day
    const tracked = QuotaTracker.getQuota(this.metadata.providerId, dailyLimit);
    return {
      ...tracked,
      requestsRemaining: Math.max(0, dailyLimit - tracked.requestsUsed),
    };
  }

  public async processAsync(request: IAIProcessRequest): Promise<IAIProcessResponse> {
    const startTime = performance.now();
    const { accountId, apiToken, defaultImageModel } = GatewayConfig.get().cloudflare;

    if (!accountId || !apiToken) {
      throw new AIGatewayError(
        'Cloudflare Account ID or API Token is missing in environment.',
        AIErrorCode.INVALID_API_KEY,
        { providerId: this.metadata.providerId, retryable: false }
      );
    }

    if (request.capability !== AICapability.ImageGeneration) {
      throw new AIGatewayError(
        `Capability '${request.capability}' is not supported by Cloudflare Workers AI free allocation adapter.`,
        AIErrorCode.CAPABILITY_NOT_SUPPORTED,
        { providerId: this.metadata.providerId, retryable: false }
      );
    }

    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new AIGatewayError('Text prompt is required for ImageGeneration.', AIErrorCode.INVALID_FILE, {
        providerId: this.metadata.providerId,
      });
    }

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${defaultImageModel}`;

    SecureLogger.info({
      requestId: request.requestId,
      provider: this.metadata.providerName,
      capability: request.capability,
      message: `Generating image via Cloudflare Workers AI model: ${defaultImageModel}`,
    });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: request.prompt,
          num_steps: 20,
        }),
        signal: AbortSignal.timeout(this.metadata.timeoutMs),
      });

      if (response.status === 401 || response.status === 403) {
        throw new AIGatewayError(
          'Cloudflare API authentication failed. Verify Account ID and API Token.',
          AIErrorCode.INVALID_API_KEY,
          { providerId: this.metadata.providerId, retryable: false, status: response.status }
        );
      }

      if (response.status === 429) {
        QuotaTracker.recordRateLimit(this.metadata.providerId, 60);
        throw new AIGatewayError(
          'Cloudflare free neuron rate limit exceeded. Cooling down.',
          AIErrorCode.PROVIDER_RATE_LIMIT,
          { providerId: this.metadata.providerId, retryable: true, status: 429 }
        );
      }

      if (!response.ok) {
        throw new AIGatewayError(
          `Cloudflare Workers AI returned status ${response.status}: ${response.statusText}`,
          AIErrorCode.PROVIDER_ERROR,
          { providerId: this.metadata.providerId, retryable: response.status >= 500, status: response.status }
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const resultBuffer = Buffer.from(arrayBuffer);

      if (resultBuffer.length === 0) {
        throw new AIGatewayError('Cloudflare returned empty image data.', AIErrorCode.PROCESSING_FAILED, {
          providerId: this.metadata.providerId,
        });
      }

      const durationMs = Math.round(performance.now() - startTime);
      const quota = QuotaTracker.updateQuota(this.metadata.providerId, 1, 99);

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
        info: `Cloudflare Workers AI (${defaultImageModel})`,
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
        throw new AIGatewayError('Cloudflare request timed out.', AIErrorCode.PROVIDER_TIMEOUT, {
          providerId: this.metadata.providerId,
          retryable: true,
        });
      }

      if (err instanceof AIGatewayError) throw err;

      throw new AIGatewayError(err.message || 'Cloudflare image generation failed', AIErrorCode.NETWORK_ERROR, {
        providerId: this.metadata.providerId,
        retryable: true,
        cause: err,
      });
    }
  }
}
