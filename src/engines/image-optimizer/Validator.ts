/**
 * Validator.ts - Non-Destructive Image Verification & Integrity Engine
 * Validates decoded buffers, dimension constraints, byte bounds, and visual integrity.
 */

import { SupportedImageFormat, QualityMetrics } from './types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  decodedWidth?: number;
  decodedHeight?: number;
}

export class Validator {
  /**
   * Validates an encoded Blob to ensure it is decodable, uncorrupted, and meets specifications
   */
  public static async validateOutput(
    blob: Blob,
    expectedFormat: SupportedImageFormat,
    expectedWidth: number,
    expectedHeight: number,
    qualityMetrics?: QualityMetrics
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Check byte size
    if (!blob || blob.size === 0) {
      errors.push('Encoded output file is empty (0 bytes).');
      return { isValid: false, errors, warnings };
    }

    // 2. Decode test: load blob into Image
    let decodedWidth = 0;
    let decodedHeight = 0;

    try {
      const url = URL.createObjectURL(blob);
      const img = new Image();

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          decodedWidth = img.naturalWidth || img.width;
          decodedHeight = img.naturalHeight || img.height;
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Encoded blob could not be decoded by image rasterizer.'));
        };
        img.src = url;
      });
    } catch (err: any) {
      errors.push(`Integrity verification failed: ${err.message}`);
      return { isValid: false, errors, warnings };
    }

    // 3. Dimension accuracy check (allow +/- 1px rounding)
    if (Math.abs(decodedWidth - expectedWidth) > 1 || Math.abs(decodedHeight - expectedHeight) > 1) {
      errors.push(
        `Dimension mismatch: Expected ${expectedWidth}x${expectedHeight}, got ${decodedWidth}x${decodedHeight}.`
      );
    }

    // 4. Quality threshold check
    if (qualityMetrics) {
      if (qualityMetrics.ssim < 0.70) {
        warnings.push(`Low visual similarity score (SSIM: ${qualityMetrics.ssim}). Compression may be visible.`);
      }
      if (qualityMetrics.psnr < 25.0) {
        warnings.push(`Low PSNR (${qualityMetrics.psnr} dB). Noticeable compression artifacts detected.`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      decodedWidth,
      decodedHeight
    };
  }
}
