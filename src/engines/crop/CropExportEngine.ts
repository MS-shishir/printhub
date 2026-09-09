/**
 * CropExportEngine.ts
 * High-Precision Physical DPI, Multi-Step Area Downsampling, and Output Validation Engine.
 */

import { CropPreset, Point2D, CropRect } from './CropTypes';

export interface PhysicalDimensionConfig {
  widthMm?: number;
  heightMm?: number;
  widthInch?: number;
  heightInch?: number;
  dpi?: number;
}

export class CropExportEngine {
  /**
   * Convert physical millimeters to exact target pixels at given DPI
   */
  public static mmToPixels(mm: number, dpi: number = 300): number {
    return Math.round((mm / 25.4) * dpi);
  }

  /**
   * Convert physical inches to exact target pixels at given DPI
   */
  public static inchesToPixels(inches: number, dpi: number = 300): number {
    return Math.round(inches * dpi);
  }

  /**
   * Calculate pixel dimensions for any preset at a target DPI
   */
  public static getPresetPixelDimensions(
    preset: CropPreset,
    dpi: number = 300
  ): { width: number; height: number; dpi: number } {
    if (preset.widthMm && preset.heightMm) {
      return {
        width: this.mmToPixels(preset.widthMm, dpi),
        height: this.mmToPixels(preset.heightMm, dpi),
        dpi
      };
    }

    // Default standard reference size (e.g. 1200px based on ratio)
    const refW = 1200;
    const refH = preset.aspectRatio > 0 ? Math.round(refW / preset.aspectRatio) : 1200;
    return {
      width: refW,
      height: refH,
      dpi
    };
  }

  /**
   * Multi-Step Area Downsampling (Mipmapping/Pyramid) for ultra-sharp downscaling.
   * Prevents aliasing and moire artifacts when scaling high-resolution DSLR photos down to passport size.
   */
  public static multiStepDownscale(
    sourceCanvas: HTMLCanvasElement,
    targetWidth: number,
    targetHeight: number
  ): HTMLCanvasElement {
    let curCanvas = sourceCanvas;
    let curW = sourceCanvas.width;
    let curH = sourceCanvas.height;

    // Step down by half iteratively until within 2x of target size
    while (curW > targetWidth * 2 && curH > targetHeight * 2) {
      const nextW = Math.max(targetWidth, Math.floor(curW / 2));
      const nextH = Math.max(targetHeight, Math.floor(curH / 2));

      const stepCanvas = document.createElement('canvas');
      stepCanvas.width = nextW;
      stepCanvas.height = nextH;
      const stepCtx = stepCanvas.getContext('2d');
      if (!stepCtx) break;

      stepCtx.imageSmoothingEnabled = true;
      stepCtx.imageSmoothingQuality = 'high';
      stepCtx.drawImage(curCanvas, 0, 0, nextW, nextH);

      curCanvas = stepCanvas;
      curW = nextW;
      curH = nextH;
    }

    // Final high-quality pass
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = targetWidth;
    finalCanvas.height = targetHeight;
    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx) return curCanvas;

    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = 'high';
    finalCtx.drawImage(curCanvas, 0, 0, targetWidth, targetHeight);

    return finalCanvas;
  }

  /**
   * Validate that a proposed crop rectangle and export parameters are geometrically sound
   */
  public static validateCropOutput(
    rect: CropRect,
    outputW: number,
    outputH: number,
    targetRatio?: number | null
  ): { isValid: boolean; error?: string } {
    if (rect.width <= 0 || rect.height <= 0) {
      return { isValid: false, error: 'Crop rectangle must have positive width and height' };
    }
    if (outputW <= 0 || outputH <= 0) {
      return { isValid: false, error: 'Output dimensions must be greater than 0' };
    }
    if (targetRatio && targetRatio > 0) {
      const currentRatio = outputW / outputH;
      const errorRatio = Math.abs(currentRatio - targetRatio);
      if (errorRatio > 0.05) {
        return { isValid: false, error: `Aspect ratio drift exceeds tolerance (${errorRatio.toFixed(4)})` };
      }
    }
    return { isValid: true };
  }
}
