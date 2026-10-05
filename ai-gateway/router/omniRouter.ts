/**
 * omniRouter.ts - PrintHub AI Omni Router Core Engine
 * Coordinates capability dispatch, failover cascading, rate limit backoff,
 * free-only enforcement, and ephemeral file janitor cleanup.
 */

import { AICapability, ProviderHealth } from '../types/capabilities';
import { IAIProcessRequest, IAIProcessResponse } from '../types/provider.interface';
import { AIErrorCode, AIGatewayError } from '../types/errors';
import { ProviderRegistry } from '../registry/providerRegistry';
import { TempAIStorage } from '../cleanup/tempManager';
import { SecureLogger } from '../security/secureLogger';
import { GatewayConfig } from '../config/gateway.config';

export class AIOmniRouterEngine {
  /**
   * Universal Dispatcher with Multi-Tier Failover
   */
  public async route(request: IAIProcessRequest): Promise<IAIProcessResponse> {
    const startTime = performance.now();
    const requestId = request.requestId || SecureLogger.generateRequestId();
    request.requestId = requestId;

    // 1. Ephemeral disk write for processing tracking
    let inputTempPath: string | null = null;
    if (request.fileBuffer) {
      inputTempPath = TempAIStorage.writeInput(requestId, request.fileBuffer);
    }

    try {
      // 2. Discover eligible providers for capability
      const candidateProviders = await ProviderRegistry.getAvailableProvidersForCapability(request.capability);

      if (candidateProviders.length === 0) {
        if (GatewayConfig.get().freeOnlyMode) {
          throw new AIGatewayError(
            'No free AI provider is currently available for this capability.',
            AIErrorCode.NO_FREE_PROVIDER_AVAILABLE
          );
        } else {
          throw new AIGatewayError(
            `No provider found capable of handling '${request.capability}'.`,
            AIErrorCode.CAPABILITY_NOT_SUPPORTED
          );
        }
      }

      let lastError: Error | null = null;
      let executedResponse: IAIProcessResponse | null = null;

      // 3. Failover Execution Loop
      for (const provider of candidateProviders) {
        const pMeta = provider.getMetadata();
        SecureLogger.info({
          requestId,
          provider: pMeta.providerName,
          capability: request.capability,
          message: `Attempting execution with priority #${pMeta.priority} provider: ${pMeta.providerName}`,
        });

        try {
          const response = await provider.processAsync(request);
          if (response && response.success) {
            executedResponse = response;
            break; // Succeeded! Exit failover loop.
          }
        } catch (providerError: any) {
          lastError = providerError;
          SecureLogger.warn({
            requestId,
            provider: pMeta.providerName,
            capability: request.capability,
            errorCode: providerError.code || 'PROVIDER_FAILED',
            message: `Provider ${pMeta.providerName} failed: ${providerError.message}. Checking next eligible provider...`,
          });

          // Permanent validation errors (file format, corrupt file) must not failover
          if (
            providerError.code === AIErrorCode.INVALID_FILE ||
            providerError.code === AIErrorCode.FILE_TOO_LARGE ||
            providerError.code === AIErrorCode.UNSUPPORTED_FORMAT
          ) {
            throw providerError;
          }

          // Otherwise continue to next fallback candidate
        }
      }

      if (!executedResponse) {
        if (lastError instanceof AIGatewayError) {
          throw lastError;
        }
        throw new AIGatewayError(
          lastError?.message || 'All eligible AI providers failed or were unavailable.',
          AIErrorCode.PROCESSING_FAILED
        );
      }

      // Write output buffer to temp for verification if needed
      if (executedResponse.resultBuffer) {
        TempAIStorage.writeOutput(requestId, executedResponse.resultBuffer);
      }

      return executedResponse;
    } finally {
      // 4. Guaranteed Ephemeral Cleanup: Delete temporary files for this request immediately
      TempAIStorage.deleteRequestFiles(requestId);
    }
  }

  /**
   * Provider Health Status
   */
  public async getHealthStatuses(): Promise<ProviderHealth[]> {
    return await ProviderRegistry.getAllStatuses();
  }
}

export const OmniRouter = new AIOmniRouterEngine();
