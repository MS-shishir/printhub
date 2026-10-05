/**
 * providerRegistry.ts - Central Registry for all AI Provider Adapters
 */

import { AICapability, ProviderHealth } from '../types/capabilities';
import { IAIProvider } from '../types/provider.interface';
import { GatewayConfig } from '../config/gateway.config';

class ProviderRegistryManager {
  private providers: Map<string, IAIProvider> = new Map();

  /**
   * Registers a provider adapter
   */
  public register(provider: IAIProvider): void {
    this.providers.set(provider.getMetadata().providerId, provider);
  }

  /**
   * Unregisters a provider
   */
  public unregister(providerId: string): boolean {
    return this.providers.delete(providerId);
  }

  /**
   * Gets a specific provider by ID
   */
  public get(providerId: string): IAIProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Gets all registered providers
   */
  public getAll(): IAIProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Finds all available providers supporting a capability, ordered by priority
   */
  public async getAvailableProvidersForCapability(capability: AICapability): Promise<IAIProvider[]> {
    const isFreeOnly = GatewayConfig.get().freeOnlyMode;
    const all = Array.from(this.providers.values());

    const matching: IAIProvider[] = [];

    for (const p of all) {
      const meta = p.getMetadata();
      // Check capability support
      if (!meta.capabilities.includes(capability)) continue;
      // Check free-only compliance
      if (isFreeOnly && !meta.freeOnly) continue;
      // Check availability (enabled, key configured, not rate-limited)
      if (await p.isAvailable()) {
        matching.push(p);
      }
    }

    // Sort by priority ascending (1 = highest priority)
    return matching.sort((a, b) => a.getMetadata().priority - b.getMetadata().priority);
  }

  /**
   * Checks health status of all registered providers
   */
  public async getAllStatuses(): Promise<ProviderHealth[]> {
    const statuses: ProviderHealth[] = [];
    for (const p of this.providers.values()) {
      statuses.push(await p.getStatus());
    }
    return statuses;
  }
}

export const ProviderRegistry = new ProviderRegistryManager();
