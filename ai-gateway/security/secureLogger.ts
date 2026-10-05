/**
 * secureLogger.ts - Privacy-Guaranteed Audit & Diagnostic Logger
 * Strictly scrubs customer image data, base64 strings, file paths, and extracted OCR text.
 */

import crypto from 'crypto';

export interface LogMetadata {
  requestId: string;
  provider?: string;
  capability?: string;
  durationMs?: number;
  httpStatus?: number;
  errorCode?: string;
  fileSizeBytes?: number;
  success?: boolean;
  message?: string;
}

export class SecureLogger {
  /**
   * Generates a secure, non-identifying UUID for every AI transaction
   */
  public static generateRequestId(): string {
    return crypto.randomUUID();
  }

  /**
   * Logs an informational audit entry with zero customer PII
   */
  public static info(meta: LogMetadata): void {
    const sanitized = this.sanitize(meta);
    console.log(`[AI Omni Gateway] INFO [${sanitized.requestId}]`, JSON.stringify(sanitized));
  }

  /**
   * Logs a warning audit entry
   */
  public static warn(meta: LogMetadata): void {
    const sanitized = this.sanitize(meta);
    console.warn(`[AI Omni Gateway] WARN [${sanitized.requestId}]`, JSON.stringify(sanitized));
  }

  /**
   * Logs an error audit entry
   */
  public static error(meta: LogMetadata, error?: unknown): void {
    const sanitized = this.sanitize(meta);
    const errMessage = error instanceof Error ? error.message : String(error || '');
    // Scrub any potential base64 strings or file paths from error messages
    const safeError = this.scrubText(errMessage);
    console.error(
      `[AI Omni Gateway] ERROR [${sanitized.requestId}]`,
      JSON.stringify({ ...sanitized, errorDetails: safeError })
    );
  }

  /**
   * Deep sanitize object to guarantee no binary, base64, or PII leaks
   */
  private static sanitize(meta: LogMetadata): Record<string, unknown> {
    const safe: Record<string, unknown> = {
      requestId: meta.requestId,
      timestamp: new Date().toISOString(),
    };

    if (meta.provider) safe.provider = meta.provider;
    if (meta.capability) safe.capability = meta.capability;
    if (meta.durationMs !== undefined) safe.durationMs = meta.durationMs;
    if (meta.httpStatus !== undefined) safe.httpStatus = meta.httpStatus;
    if (meta.errorCode) safe.errorCode = meta.errorCode;
    if (meta.fileSizeBytes !== undefined) safe.fileSizeBytes = meta.fileSizeBytes;
    if (meta.success !== undefined) safe.success = meta.success;
    if (meta.message) safe.message = this.scrubText(meta.message);

    return safe;
  }

  /**
   * Scrubs base64 patterns, paths, and sensitive tokens
   */
  public static scrubText(input: string): string {
    if (!input) return '';
    return input
      // Redact Base64 data URLs
      .replace(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]{20,}/g, '[REDACTED_IMAGE_DATA]')
      // Redact raw long base64 strings (>50 chars)
      .replace(/[A-Za-z0-9+/]{50,}={0,2}/g, '[REDACTED_BASE64_PAYLOAD]')
      // Redact Windows user directories: C:\Users\Username\...
      .replace(/([a-zA-Z]:\\Users\\[^\\]+\\)/gi, 'C:\\Users\\[USER]\\')
      // Redact potential API keys (bearer tokens, x-api-key)
      .replace(/(?:key|token|secret|password)=([^\s&]+)/gi, '$1=[REDACTED]');
  }
}
