/**
 * capabilities.ts - PrintHub AI Omni Router Capability Categories
 */

export enum AICapability {
  BackgroundRemoval = 'BackgroundRemoval',
  ImageEnhancement = 'ImageEnhancement',
  ImageUpscaling = 'ImageUpscaling',
  Denoising = 'Denoising',
  FaceRestoration = 'FaceRestoration',
  OCR = 'OCR',
  DocumentUnderstanding = 'DocumentUnderstanding',
  ImageEditing = 'ImageEditing',
  ImageGeneration = 'ImageGeneration',
}

export type SupportedImageFormat = 'jpg' | 'jpeg' | 'png' | 'webp' | 'bmp' | 'tiff' | 'pdf';

export interface AIProviderMetadata {
  providerId: string;
  providerName: string;
  capabilities: AICapability[];
  enabled: boolean;
  priority: number; // Lower number = higher priority
  freeOnly: boolean;
  requiresApiKey: boolean;
  endpoint: string;
  timeoutMs: number;
  maxFileSizeBytes: number;
  supportedFormats: SupportedImageFormat[];
  privacyPolicyUrl: string;
  termsUrl: string;
  retentionPolicy: string;
  retentionPolicyGuaranteedZero: boolean;
}

export type ProviderHealthStatus =
  | 'Available'
  | 'RateLimited'
  | 'QuotaExceeded'
  | 'Unavailable'
  | 'Disabled'
  | 'InvalidCredentials'
  | 'Unknown';

export interface ProviderHealth {
  providerId: string;
  status: ProviderHealthStatus;
  freeOnly: boolean;
  lastChecked: number;
  retryAfterSeconds?: number;
  message?: string;
}
