/**
 * index.ts - Main Export & Initialization Entrypoint for PrintHub AI Gateway
 */

import { ProviderRegistry } from './registry/providerRegistry';
import { BGNinjaProvider } from './providers/bgninja/bgninja.provider';
import { WithoutBGProvider } from './providers/withoutbg/withoutbg.provider';
import { OCRSpaceProvider } from './providers/ocrspace/ocrspace.provider';
import { CloudflareWorkersAIProvider } from './providers/cloudflare/cloudflare.provider';

// Auto-register initial 4 providers
const bgninja = new BGNinjaProvider();
const withoutbg = new WithoutBGProvider();
const ocrspace = new OCRSpaceProvider();
const cloudflare = new CloudflareWorkersAIProvider();

ProviderRegistry.register(bgninja);
ProviderRegistry.register(withoutbg);
ProviderRegistry.register(ocrspace);
ProviderRegistry.register(cloudflare);

export * from './types/capabilities';
export * from './types/provider.interface';
export * from './types/errors';
export * from './config/gateway.config';
export * from './security/fileValidator';
export * from './security/exifStripper';
export * from './security/secureLogger';
export * from './cleanup/tempManager';
export * from './quota/quotaTracker';
export * from './registry/providerRegistry';
export * from './router/omniRouter';
