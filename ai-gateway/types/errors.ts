/**
 * errors.ts - Standardized Error Codes and Classes for AI Omni Router
 */

export enum AIErrorCode {
  NO_FREE_PROVIDER_AVAILABLE = 'NO_FREE_PROVIDER_AVAILABLE',
  PROVIDER_TIMEOUT = 'PROVIDER_TIMEOUT',
  PROVIDER_RATE_LIMIT = 'PROVIDER_RATE_LIMIT',
  PROVIDER_QUOTA_EXHAUSTED = 'PROVIDER_QUOTA_EXHAUSTED',
  INVALID_FILE = 'INVALID_FILE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  INVALID_API_KEY = 'INVALID_API_KEY',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  CAPABILITY_NOT_SUPPORTED = 'CAPABILITY_NOT_SUPPORTED',
  OFFLINE_MODE = 'OFFLINE_MODE',
  CONSENT_REQUIRED = 'CONSENT_REQUIRED',
}

export class AIGatewayError extends Error {
  public readonly code: AIErrorCode;
  public readonly providerId?: string;
  public readonly retryable: boolean;
  public readonly status?: number;

  constructor(
    message: string,
    code: AIErrorCode,
    options: {
      providerId?: string;
      retryable?: boolean;
      status?: number;
      cause?: unknown;
    } = {}
  ) {
    super(message);
    this.name = 'AIGatewayError';
    this.code = code;
    this.providerId = options.providerId;
    this.retryable = options.retryable ?? false;
    this.status = options.status;
    if (options.cause) {
      this.cause = options.cause;
    }
    Object.setPrototypeOf(this, AIGatewayError.prototype);
  }
}
