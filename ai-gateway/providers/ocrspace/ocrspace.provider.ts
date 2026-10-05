/**
 * ocrspace.provider.ts - OCR.space Document & Text Extraction Provider Adapter
 * Multi-Language (English, Bengali), PDF & Image Support.
 * CRITICAL PRIVACY: OCR extracted text is NEVER logged to stdout or files.
 */

import { BaseAIProvider } from '../base.provider';
import { AICapability, AIProviderMetadata } from '../../types/capabilities';
import { IAIProcessRequest, IAIProcessResponse, IProviderQuota } from '../../types/provider.interface';
import { AIErrorCode, AIGatewayError } from '../../types/errors';
import { GatewayConfig } from '../../config/gateway.config';
import { QuotaTracker } from '../../quota/quotaTracker';
import { SecureLogger } from '../../security/secureLogger';

export class OCRSpaceProvider extends BaseAIProvider {
  public readonly metadata: AIProviderMetadata;

  constructor() {
    super();
    const cfg = GatewayConfig.get().ocrspace;
    this.metadata = {
      providerId: 'ocrspace',
      providerName: 'OCR.space',
      capabilities: [AICapability.OCR, AICapability.DocumentUnderstanding],
      enabled: cfg.enabled,
      priority: cfg.priority,
      freeOnly: true,
      requiresApiKey: false, // Free tier works with 'helloworld' or registered free key
      endpoint: cfg.endpoint,
      timeoutMs: cfg.timeoutMs,
      maxFileSizeBytes: 10 * 1024 * 1024, // 10MB free tier max
      supportedFormats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
      privacyPolicyUrl: 'https://ocr.space/privacypolicy',
      termsUrl: 'https://ocr.space/terms',
      retentionPolicy: 'Files are deleted immediately after OCR processing completes. Zero permanent cloud archive.',
      retentionPolicyGuaranteedZero: true,
    };
  }

  protected hasValidApiKey(): boolean {
    const key = GatewayConfig.get().ocrspace.apiKey;
    return Boolean(key && key.trim().length > 0);
  }

  public override async getRemainingQuota(): Promise<IProviderQuota> {
    const dailyLimit = 500; // Free API key allows ~500 calls/day
    const tracked = QuotaTracker.getQuota(this.metadata.providerId, dailyLimit);
    return {
      ...tracked,
      requestsRemaining: Math.max(0, dailyLimit - tracked.requestsUsed),
    };
  }

  public async processAsync(request: IAIProcessRequest): Promise<IAIProcessResponse> {
    const startTime = performance.now();
    const apiKey = GatewayConfig.get().ocrspace.apiKey || 'helloworld';
    const lang = request.options?.language === 'ben' ? 'ben' : 'eng';

    const { buffer: cleanBuffer, mimeType } = this.prepareBuffer(request.fileBuffer);

    SecureLogger.info({
      requestId: request.requestId,
      provider: this.metadata.providerName,
      capability: request.capability,
      fileSizeBytes: cleanBuffer.length,
      message: `Dispatching document to OCR.space API (language: ${lang})`,
    });

    try {
      const base64Data = `data:${mimeType};base64,${cleanBuffer.toString('base64')}`;
      const formData = new FormData();
      formData.append('base64Image', base64Data);
      formData.append('language', lang);
      formData.append('isOverlayRequired', 'false');
      formData.append('detectOrientation', 'true');
      formData.append('scale', 'true');
      formData.append('OCREngine', '2'); // Engine 2 performs better on Bengali and rotated documents
      formData.append('apikey', apiKey);

      const response = await fetch(this.metadata.endpoint, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(this.metadata.timeoutMs),
      });

      if (response.status === 429) {
        QuotaTracker.recordRateLimit(this.metadata.providerId, 60);
        throw new AIGatewayError(
          'OCR.space rate limit exceeded. Cooling down for 60 seconds.',
          AIErrorCode.PROVIDER_RATE_LIMIT,
          { providerId: this.metadata.providerId, retryable: true, status: 429 }
        );
      }

      if (!response.ok) {
        throw new AIGatewayError(
          `OCR.space returned HTTP error ${response.status}: ${response.statusText}`,
          AIErrorCode.PROVIDER_ERROR,
          { providerId: this.metadata.providerId, retryable: response.status >= 500, status: response.status }
        );
      }

      const data = await response.json();

      if (data.IsErroredOnProcessing) {
        const errorMsg = Array.isArray(data.ErrorMessage) ? data.ErrorMessage.join('; ') : data.ErrorMessage;
        throw new AIGatewayError(errorMsg || 'OCR processing encountered an internal error.', AIErrorCode.PROCESSING_FAILED, {
          providerId: this.metadata.providerId,
        });
      }

      const parsedResults = data.ParsedResults || [];
      const extractedText = parsedResults.map((r: any) => r.ParsedText || '').join('\n');

      const durationMs = Math.round(performance.now() - startTime);
      const quota = QuotaTracker.updateQuota(this.metadata.providerId, 1, 499);

      // NOTICE: We log duration and character count, but NEVER the extracted text itself
      SecureLogger.info({
        requestId: request.requestId,
        provider: this.metadata.providerName,
        capability: request.capability,
        durationMs,
        success: true,
        message: `OCR succeeded: Extracted ${extractedText.length} characters without logging text`,
      });

      return {
        success: true,
        requestId: request.requestId,
        provider: this.metadata.providerName,
        capability: request.capability,
        durationMs,
        mimeType: 'text/plain',
        text: extractedText,
        data: {
          exitCode: data.OCRExitCode,
          processingTimeInMilliseconds: data.ProcessingTimeInMilliseconds,
          parsedPageCount: parsedResults.length,
        },
        quotaRemaining: quota.requestsRemaining,
        info: `OCR.space Free Engine (${lang.toUpperCase()})`,
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
        throw new AIGatewayError('OCR.space request timed out.', AIErrorCode.PROVIDER_TIMEOUT, {
          providerId: this.metadata.providerId,
          retryable: true,
        });
      }

      if (err instanceof AIGatewayError) throw err;

      throw new AIGatewayError(err.message || 'OCR.space request failed', AIErrorCode.NETWORK_ERROR, {
        providerId: this.metadata.providerId,
        retryable: true,
        cause: err,
      });
    }
  }
}
