/**
 * Types & Interfaces for PrintHub Studio Smart Image Processing & Optimization Engine
 */

export type SupportedImageFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'bmp' | 'gif';
export type OutputImageFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'auto';
export type AppLanguage = 'bn' | 'en';

export type ProcessingMode =
  | 'smart'       // Auto-decides best dimensions, format, quality & compression
  | 'target_size' // Strict/adaptive target file size (e.g. <= 500 KB)
  | 'resize'      // Exact or bounded width/height, percentage, DPI scaling
  | 'compress'    // Quality presets or custom quality slider
  | 'convert';    // Format transcoding with transparency handling

export type QualityPresetLevel =
  | 'maximum'     // Q95-Q98, minimal compression
  | 'high'        // Q85-Q90
  | 'balanced'    // Q75-Q82
  | 'aggressive'  // Q60-Q70
  | 'custom';

export type ImageClassification =
  | 'photograph'
  | 'portrait'
  | 'landscape'
  | 'document'
  | 'screenshot'
  | 'graphic'
  | 'logo'
  | 'illustration'
  | 'transparent';

export type ResampleFilter = 'lanczos3' | 'bicubic' | 'mitchell' | 'area_average' | 'bilinear';

export type FitMode = 'fit' | 'fill' | 'exact' | 'width_only' | 'height_only' | 'percentage';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface PhysicalDimensions {
  widthMm: number;
  heightMm: number;
  dpi: number;
}

export interface ImageAnalysisResult {
  format: SupportedImageFormat;
  dimensions: ImageDimensions;
  aspectRatio: number;
  hasAlpha: boolean;
  isFullyOpaque: boolean;
  entropy: number;            // 0 - 8 (Shannon entropy)
  noiseLevel: number;         // 0 - 100 (MAD of high pass Laplacian)
  edgeDensity: number;        // 0 - 100 (% of high gradient pixels)
  sharpnessScore: number;     // Variance of Laplacian
  colorCountApprox: number;
  classification: ImageClassification;
  dpi: number;
  colorSpace: 'srgb' | 'display-p3' | 'cmyk-approx' | 'grayscale';
  estimatedComplexity: 'low' | 'medium' | 'high' | 'ultra';
}

export interface ResizeOptions {
  enabled: boolean;
  mode?: FitMode;
  targetWidth?: number;
  targetHeight?: number;
  percentage?: number;         // e.g. 50%
  keepAspectRatio: boolean;
  allowUpscaling?: boolean;
  filter?: ResampleFilter;
  targetDpi?: number;          // e.g. 300 DPI
}

export interface SharpenOptions {
  enabled: boolean;
  mode: 'auto' | 'manual';
  amount?: number;             // 0 - 100
  radius?: number;             // 0.5 - 3.0
  threshold?: number;          // 0 - 50
}

export interface CompressionOptions {
  mode: ProcessingMode;
  qualityLevel?: QualityPresetLevel;
  quality?: number;            // 1 - 100
  targetSizeBytes?: number;    // In bytes (e.g. 500 * 1024 for 500 KB)
  minimumQuality?: number;     // 1 - 100 (e.g. 50 - never go below this)
  twoStageDownscale?: boolean; // If true, allows gentle downscale if target size cannot be reached
  maxDownscaleAttempts?: number;
}

export interface OutputOptions {
  format: OutputImageFormat;
  fallbackToJpegIfNoAlpha?: boolean;
  preserveMetadata?: boolean;
  stripExif?: boolean;
  customBackgroundColorForJpeg?: string; // e.g. '#ffffff' for alpha to JPEG conversion
  dpi?: number;
  fileName?: string;
}

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OptimizationRequest {
  id?: string;
  source: File | Blob | HTMLCanvasElement | ImageData | string; // file, canvas, or base64 data url
  fileName?: string;
  fileSizeBytes?: number;
  mode: ProcessingMode;
  crop?: CropRegion;
  resize?: ResizeOptions;
  compression?: CompressionOptions;
  sharpen?: SharpenOptions;
  output?: OutputOptions;
  presetId?: string;
}

export interface QualityMetrics {
  psnr: number;                // Peak Signal-to-Noise Ratio in dB (e.g. 35 - 50 dB)
  ssim: number;                // Structural Similarity Index (0.000 to 1.000)
  mse: number;                 // Mean Squared Error
  edgePreservationRatio: number; // 0.0 - 1.0
  visualScore: 'Flawless' | 'Excellent' | 'Good' | 'Fair' | 'Degraded';
}

export interface OptimizationCandidate {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  format: SupportedImageFormat;
  sizeBytes: number;
  quality: number;
  qualityMetrics: QualityMetrics;
  downscaleFactor: number;
}

export interface OptimizationReport {
  id: string;
  status: 'success' | 'warning' | 'error';
  timestamp: string;
  processingTimeMs: number;
  input: {
    fileName: string;
    format: SupportedImageFormat;
    width: number;
    height: number;
    sizeBytes: number;
    dpi: number;
    classification: ImageClassification;
    entropy: number;
  };
  output: {
    fileName: string;
    format: SupportedImageFormat;
    width: number;
    height: number;
    sizeBytes: number;
    dpi: number;
    blob: Blob;
    dataUrl: string;
  };
  compression: {
    appliedQuality: number;
    targetSizeBytes?: number;
    achievedSizeBytes: number;
    targetAchieved: boolean;
    iterationsRun: number;
  };
  quality: QualityMetrics;
  reduction: {
    bytesSaved: number;
    percentage: number;
    ratio: string; // e.g. "4.8x smaller"
  };
  warnings: string[];
}

export interface BatchItem {
  id: string;
  file: File;
  previewUrl: string;
  status: 'idle' | 'analyzing' | 'processing' | 'completed' | 'failed';
  progress: number;
  request: OptimizationRequest;
  report?: OptimizationReport;
  error?: string;
}

export interface BatchProgressCallback {
  (current: number, total: number, activeItem: BatchItem): void;
}

export interface StudioPreset {
  id: string;
  name: string;
  nameBn: string;
  description: string;
  category: 'general' | 'web' | 'official' | 'print';
  mode: ProcessingMode;
  targetMaxBytes?: number;
  targetWidth?: number;
  targetHeight?: number;
  targetDpi?: number;
  format: OutputImageFormat;
  qualityLevel: QualityPresetLevel;
  keepAspectRatio: boolean;
  smartSharpen: boolean;
}
