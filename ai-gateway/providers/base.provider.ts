/**
 * base.provider.ts - Abstract Base AI Provider Class
 * Provides common file validation, EXIF stripping, timeout guards, and health tracking.
 */

import { AICapability, AIProviderMetadata, ProviderHealth, ProviderHealthStatus } from '../types/capabilities';
import { IAIProcessRequest, IAIProcessResponse, IAIProvider, IProviderQuota } from '../types/provider.interface';
import { AIErrorCode, AIGatewayError } from '../types/errors';
import { FileSecurityValidator } from '../security/fileValidator';
import { ExifMetadataStripper } from '../security/exifStripper';
import { QuotaTracker } from '../quota/quotaTracker';
import { GatewayConfig } from '../config/gateway.config';

export abstract class BaseAIProvider implements IAIProvider {
  public abstract readonly metadata: AIProviderMetadata;

  public getMetadata(): AIProviderMetadata {
    return this.metadata;
  }

  public getCapabilities(): AICapability[] {
    return this.metadata.capabilities;
  }

  public async isAvailable(): Promise<boolean> {
    if (!this.metadata.enabled) return false;

    // Free-only mode guard
    if (GatewayConfig.get().freeOnlyMode && !this.metadata.freeOnly) {
      return false;
    }

    // Rate-limit guard
    const { limited } = QuotaTracker.isRateLimited(this.metadata.providerId);
    if (limited) return false;

    // API Key existence guard if provider requires one
    if (this.metadata.requiresApiKey && !this.hasValidApiKey()) {
      return false;
    }

    return true;
  }

  public async getStatus(): Promise<ProviderHealth> {
    if (!this.metadata.enabled) {
      return {
        providerId: this.metadata.providerId,
        status: 'Disabled',
        freeOnly: this.metadata.freeOnly,
        lastChecked: Date.now(),
        message: 'Provider is administratively disabled.',
      };
    }

    if (this.metadata.requiresApiKey && !this.hasValidApiKey()) {
      return {
        providerId: this.metadata.providerId,
        status: 'InvalidCredentials',
        freeOnly: this.metadata.freeOnly,
        lastChecked: Date.now(),
        message: 'API key is not configured in backend environment.',
      };
    }

    const { limited, secondsRemaining } = QuotaTracker.isRateLimited(this.metadata.providerId);
    if (limited) {
      return {
        providerId: this.metadata.providerId,
        status: 'RateLimited',
        freeOnly: this.metadata.freeOnly,
        lastChecked: Date.now(),
        retryAfterSeconds: secondsRemaining,
        message: `Provider encountered HTTP 429. Cooldown in effect (${secondsRemaining}s remaining).`,
      };
    }

    const quota = await this.getRemainingQuota();
    if (quota.requestsRemaining <= 0) {
      return {
        providerId: this.metadata.providerId,
        status: 'QuotaExceeded',
        freeOnly: this.metadata.freeOnly,
        lastChecked: Date.now(),
        message: 'Free quota limit exhausted for this period.',
      };
    }

    return {
      providerId: this.metadata.providerId,
      status: 'Available',
      freeOnly: this.metadata.freeOnly,
      lastChecked: Date.now(),
      message: 'Provider is healthy and ready for processing.',
    };
  }

  public async getRemainingQuota(): Promise<IProviderQuota> {
    return QuotaTracker.getQuota(this.metadata.providerId, 9999);
  }

  /**
   * Pre-process file buffer: validates magic bytes, strips EXIF if enabled
   */
  protected prepareBuffer(
    buffer: Buffer | undefined,
    allowedFormats = this.metadata.supportedFormats
  ): { buffer: Buffer; mimeType: string } {
    if (!buffer) {
      throw new AIGatewayError('No file buffer provided for processing.', AIErrorCode.INVALID_FILE);
    }

    const validation = FileSecurityValidator.validate(buffer, allowedFormats, this.metadata.maxFileSizeBytes);

    let prepared = buffer;
    if (GatewayConfig.get().stripExif) {
      prepared = ExifMetadataStripper.strip(prepared);
    }

    return {
      buffer: prepared,
      mimeType: validation.mimeType,
    };
  }

  protected abstract hasValidApiKey(): boolean;

  public abstract processAsync(request: IAIProcessRequest): Promise<IAIProcessResponse>;
}
