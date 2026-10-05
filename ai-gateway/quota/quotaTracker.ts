/**
 * quotaTracker.ts - Local In-Memory & Metadata-Only Quota & Rate Limit Tracker
 * Strictly tracks numerical usage counts and rate limit backoff. Zero customer data stored.
 */

import { IProviderQuota } from '../types/provider.interface';

interface RateLimitState {
  isRateLimited: boolean;
  retryAfterUntil: number;
}

export class QuotaAndRateLimitTracker {
  private quotas: Map<string, IProviderQuota> = new Map();
  private rateLimits: Map<string, RateLimitState> = new Map();

  /**
   * Initializes or updates quota metadata for a provider
   */
  public updateQuota(
    providerId: string,
    deltaUsed: number,
    requestsRemaining: number,
    resetTime?: number
  ): IProviderQuota {
    const existing = this.quotas.get(providerId) || {
      providerId,
      requestsUsed: 0,
      requestsRemaining,
      lastChecked: Date.now(),
    };

    const updated: IProviderQuota = {
      providerId,
      requestsUsed: existing.requestsUsed + deltaUsed,
      requestsRemaining,
      resetTime: resetTime || existing.resetTime,
      lastChecked: Date.now(),
    };

    this.quotas.set(providerId, updated);
    return updated;
  }

  /**
   * Records an HTTP 429 Rate Limit encounter with backoff
   */
  public recordRateLimit(providerId: string, retryAfterSeconds: number = 60): void {
    const cooldownMs = Math.max(5, retryAfterSeconds) * 1000;
    this.rateLimits.set(providerId, {
      isRateLimited: true,
      retryAfterUntil: Date.now() + cooldownMs,
    });
  }

  /**
   * Checks if provider is currently in rate limit cooldown
   */
  public isRateLimited(providerId: string): { limited: boolean; secondsRemaining: number } {
    const state = this.rateLimits.get(providerId);
    if (!state || !state.isRateLimited) {
      return { limited: false, secondsRemaining: 0 };
    }

    const now = Date.now();
    if (now >= state.retryAfterUntil) {
      this.rateLimits.delete(providerId);
      return { limited: false, secondsRemaining: 0 };
    }

    const remainingSec = Math.ceil((state.retryAfterUntil - now) / 1000);
    return { limited: true, secondsRemaining: remainingSec };
  }

  /**
   * Gets quota metadata for a provider
   */
  public getQuota(providerId: string, defaultRemaining: number = 9999): IProviderQuota {
    const existing = this.quotas.get(providerId);
    if (existing) return existing;

    return {
      providerId,
      requestsUsed: 0,
      requestsRemaining: defaultRemaining,
      lastChecked: Date.now(),
    };
  }

  /**
   * Gets summary of all provider quotas for UI display
   */
  public getAllQuotas(): Record<string, IProviderQuota> {
    const out: Record<string, IProviderQuota> = {};
    for (const [id, q] of this.quotas.entries()) {
      out[id] = { ...q };
    }
    return out;
  }
}

export const QuotaTracker = new QuotaAndRateLimitTracker();
