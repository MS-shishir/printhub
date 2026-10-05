/**
 * gatewayApp.ts - HTTP REST Gateway Router for PrintHub AI Omni Router
 * Compatible with Express and Vite Connect middleware.
 */

import { IncomingMessage, ServerResponse } from 'http';
import { OmniRouter } from '../router/omniRouter';
import { ProviderRegistry } from '../registry/providerRegistry';
import { QuotaTracker } from '../quota/quotaTracker';
import { AICapability } from '../types/capabilities';
import { AIErrorCode, AIGatewayError } from '../types/errors';
import { SecureLogger } from '../security/secureLogger';
import { GatewayConfig } from '../config/gateway.config';

export function createAIGatewayMiddleware() {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url || '';

    if (!url.startsWith('/api/ai/')) {
      return next();
    }

    const sendJson = (status: number, data: unknown) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.end(JSON.stringify(data));
    };

    // 1. GET /api/ai/providers
    if (req.method === 'GET' && url === '/api/ai/providers') {
      const providers = ProviderRegistry.getAll().map((p) => {
        const m = p.getMetadata();
        // NEVER expose API keys, internal secrets or tokens
        return {
          id: m.providerId,
          name: m.providerName,
          capabilities: m.capabilities,
          priority: m.priority,
          freeOnly: m.freeOnly,
          requiresApiKey: m.requiresApiKey,
          maxFileSizeMb: Math.round(m.maxFileSizeBytes / (1024 * 1024)),
          supportedFormats: m.supportedFormats,
          privacyPolicyUrl: m.privacyPolicyUrl,
          retentionPolicy: m.retentionPolicy,
          retentionPolicyGuaranteedZero: m.retentionPolicyGuaranteedZero,
        };
      });
      return sendJson(200, { success: true, providers });
    }

    // 2. GET /api/ai/providers/status
    if (req.method === 'GET' && (url === '/api/ai/providers/status' || url === '/api/ai/status')) {
      const statuses = await ProviderRegistry.getAllStatuses();
      return sendJson(200, { success: true, providers: statuses });
    }

    // 3. GET /api/ai/capabilities
    if (req.method === 'GET' && url === '/api/ai/capabilities') {
      return sendJson(200, {
        success: true,
        capabilities: Object.values(AICapability),
        freeOnlyMode: GatewayConfig.get().freeOnlyMode,
      });
    }

    // 4. GET /api/ai/quota
    if (req.method === 'GET' && url === '/api/ai/quota') {
      const quotas = QuotaTracker.getAllQuotas();
      return sendJson(200, { success: true, quotas });
    }

    // Process POST payloads
    if (req.method === 'POST') {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });

      req.on('end', async () => {
        const requestId = SecureLogger.generateRequestId();
        try {
          const rawBody = Buffer.concat(chunks).toString('utf-8');
          const body = rawBody ? JSON.parse(rawBody) : {};

          let capability: AICapability;
          if (url === '/api/ai/background-remove' || url === '/api/ai/remove-bg') {
            capability = AICapability.BackgroundRemoval;
          } else if (url === '/api/ai/ocr') {
            capability = AICapability.OCR;
          } else if (url === '/api/ai/document') {
            capability = AICapability.DocumentUnderstanding;
          } else if (url === '/api/ai/generate') {
            capability = AICapability.ImageGeneration;
          } else if (url === '/api/ai/enhance') {
            capability = AICapability.ImageEnhancement;
          } else if (url === '/api/ai/upscale') {
            capability = AICapability.ImageUpscaling;
          } else if (url === '/api/ai/edit') {
            capability = AICapability.ImageEditing;
          } else {
            return sendJson(404, {
              success: false,
              requestId,
              code: 'NOT_FOUND',
              message: `Unknown AI endpoint: ${url}`,
            });
          }

          // Extract image buffer from imageBase64 or multipart
          let fileBuffer: Buffer | undefined;
          if (body.imageBase64) {
            const clean = body.imageBase64.replace(/^data:.*?;base64,/, '');
            fileBuffer = Buffer.from(clean, 'base64');
          }

          const result = await OmniRouter.route({
            requestId,
            capability,
            fileBuffer,
            prompt: body.prompt,
            options: body.options || {},
          });

          return sendJson(200, {
            success: true,
            requestId: result.requestId,
            provider: result.provider,
            capability: result.capability,
            durationMs: result.durationMs,
            mimeType: result.mimeType,
            dataUrl: result.resultDataUrl,
            text: result.text,
            data: result.data,
            quotaRemaining: result.quotaRemaining,
            info: result.info,
          });
        } catch (err: any) {
          const status = err.status || (err.code === AIErrorCode.NO_FREE_PROVIDER_AVAILABLE ? 503 : 500);
          return sendJson(status, {
            success: false,
            requestId,
            code: err.code || AIErrorCode.PROCESSING_FAILED,
            message: err.message || 'AI request failed.',
          });
        }
      });

      return;
    }

    next();
  };
}
