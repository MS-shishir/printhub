/**
 * Resizer.ts - Production Multi-Algorithm High-Quality Image Resizing Engine
 * Implements Lanczos-3 windowed sinc filtering, Bicubic spline, Area averaging,
 * cascading step-down downscaling, and DPI-to-pixel physical calculations.
 */

import {
  ImageDimensions,
  ResizeOptions,
  ResampleFilter,
  FitMode
} from './types';

export class Resizer {
  /**
   * Calculate output dimensions based on constraints and fit mode
   */
  public static calculateTargetDimensions(
    srcWidth: number,
    srcHeight: number,
    options: ResizeOptions
  ): ImageDimensions {
    if (!options.enabled) {
      return { width: srcWidth, height: srcHeight };
    }

    const {
      mode = 'fit',
      targetWidth,
      targetHeight,
      percentage,
      keepAspectRatio = true,
      allowUpscaling = true
    } = options;

    if (percentage && percentage > 0) {
      const factor = percentage / 100;
      return {
        width: Math.max(1, Math.round(srcWidth * factor)),
        height: Math.max(1, Math.round(srcHeight * factor))
      };
    }

    if (!targetWidth && !targetHeight) {
      return { width: srcWidth, height: srcHeight };
    }

    const reqW = targetWidth || srcWidth;
    const reqH = targetHeight || srcHeight;

    if (!keepAspectRatio) {
      return {
        width: Math.max(1, Math.round(reqW)),
        height: Math.max(1, Math.round(reqH))
      };
    }

    const aspect = srcWidth / srcHeight;

    if (mode === 'width_only' || (targetWidth && !targetHeight)) {
      let finalW = targetWidth || srcWidth;
      if (!allowUpscaling && finalW > srcWidth) finalW = srcWidth;
      return {
        width: Math.max(1, Math.round(finalW)),
        height: Math.max(1, Math.round(finalW / aspect))
      };
    }

    if (mode === 'height_only' || (!targetWidth && targetHeight)) {
      let finalH = targetHeight || srcHeight;
      if (!allowUpscaling && finalH > srcHeight) finalH = srcHeight;
      return {
        width: Math.max(1, Math.round(finalH * aspect)),
        height: Math.max(1, Math.round(finalH))
      };
    }

    // Default 'fit': Scale down to fit inside box without exceeding bounds
    let finalW = reqW;
    let finalH = reqH;

    const scaleW = reqW / srcWidth;
    const scaleH = reqH / srcHeight;
    const scale = Math.min(scaleW, scaleH);

    if (!allowUpscaling && scale > 1) {
      return { width: srcWidth, height: srcHeight };
    }

    finalW = Math.max(1, Math.round(srcWidth * scale));
    finalH = Math.max(1, Math.round(srcHeight * scale));

    return { width: finalW, height: finalH };
  }

  /**
   * Resizes an HTMLCanvasElement using the selected algorithm
   */
  public static resizeCanvas(
    sourceCanvas: HTMLCanvasElement,
    targetDimensions: ImageDimensions,
    filter: ResampleFilter = 'lanczos3'
  ): HTMLCanvasElement {
    const { width: dstW, height: dstH } = targetDimensions;
    const srcW = sourceCanvas.width;
    const srcH = sourceCanvas.height;

    // No resize needed
    if (srcW === dstW && srcH === dstH) {
      return sourceCanvas;
    }

    // Extreme downscale (> 2x downscale): use cascading step-down downscaling
    // to prevent moire and aliasing before final pass
    const scaleX = dstW / srcW;
    const scaleY = dstH / srcH;

    if (scaleX < 0.5 || scaleY < 0.5) {
      return this.stepDownResize(sourceCanvas, dstW, dstH, filter);
    }

    if (filter === 'lanczos3') {
      return this.lanczos3Resize(sourceCanvas, dstW, dstH);
    } else if (filter === 'area_average') {
      return this.areaAverageResize(sourceCanvas, dstW, dstH);
    } else {
      // High-quality native bicubic canvas resampling
      const output = document.createElement('canvas');
      output.width = dstW;
      output.height = dstH;
      const ctx = output.getContext('2d', { willReadFrequently: true });
      if (!ctx) return sourceCanvas;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sourceCanvas, 0, 0, dstW, dstH);
      return output;
    }
  }

  /**
   * Cascading Step-Down Downscale for large reductions (e.g. 4000px -> 800px)
   */
  private static stepDownResize(
    sourceCanvas: HTMLCanvasElement,
    targetW: number,
    targetH: number,
    finalFilter: ResampleFilter
  ): HTMLCanvasElement {
    let currentCanvas = sourceCanvas;
    let curW = sourceCanvas.width;
    let curH = sourceCanvas.height;

    // Step down by half until within 2x of target
    while (curW * 0.5 > targetW && curH * 0.5 > targetH) {
      const nextW = Math.max(targetW, Math.floor(curW * 0.5));
      const nextH = Math.max(targetH, Math.floor(curH * 0.5));

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = nextW;
      tempCanvas.height = nextH;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) break;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(currentCanvas, 0, 0, nextW, nextH);

      currentCanvas = tempCanvas;
      curW = nextW;
      curH = nextH;
    }

    // Final accurate pass with requested filter
    if (finalFilter === 'lanczos3') {
      return this.lanczos3Resize(currentCanvas, targetW, targetH);
    }

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = targetW;
    finalCanvas.height = targetH;
    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx) return currentCanvas;

    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = 'high';
    finalCtx.drawImage(currentCanvas, 0, 0, targetW, targetH);
    return finalCanvas;
  }

  /**
   * Lanczos-3 Resampling Algorithm
   * Sinc(x) * Sinc(x / 3) for x in [-3, 3]
   */
  public static lanczos3Resize(
    sourceCanvas: HTMLCanvasElement,
    targetW: number,
    targetH: number
  ): HTMLCanvasElement {
    const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    if (!srcCtx) return sourceCanvas;

    const srcW = sourceCanvas.width;
    const srcH = sourceCanvas.height;
    const srcData = srcCtx.getImageData(0, 0, srcW, srcH);
    const srcPixels = srcData.data;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = targetW;
    outCanvas.height = targetH;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return sourceCanvas;

    const outData = outCtx.createImageData(targetW, targetH);
    const outPixels = outData.data;

    // Precompute Lanczos-3 weights
    const sinc = (x: number) => {
      if (x === 0) return 1.0;
      const pix = Math.PI * x;
      return Math.sin(pix) / pix;
    };

    const lanczos3 = (x: number) => {
      const ax = Math.abs(x);
      if (ax < 0.0001) return 1.0;
      if (ax >= 3.0) return 0.0;
      return sinc(ax) * sinc(ax / 3.0);
    };

    const scaleX = srcW / targetW;
    const scaleY = srcH / targetH;
    const radiusX = Math.max(1, scaleX) * 3;
    const radiusY = Math.max(1, scaleY) * 3;

    for (let y = 0; y < targetH; y++) {
      const srcCenterY = (y + 0.5) * scaleY - 0.5;
      const minY = Math.max(0, Math.floor(srcCenterY - radiusY));
      const maxY = Math.min(srcH - 1, Math.ceil(srcCenterY + radiusY));

      for (let x = 0; x < targetW; x++) {
        const srcCenterX = (x + 0.5) * scaleX - 0.5;
        const minX = Math.max(0, Math.floor(srcCenterX - radiusX));
        const maxX = Math.min(srcW - 1, Math.ceil(srcCenterX + radiusX));

        let r = 0, g = 0, b = 0, a = 0;
        let totalWeight = 0;

        for (let sy = minY; sy <= maxY; sy++) {
          const dy = (sy - srcCenterY) / (scaleY > 1 ? scaleY : 1);
          const wy = lanczos3(dy);
          if (wy === 0) continue;

          const rowOffset = sy * srcW;

          for (let sx = minX; sx <= maxX; sx++) {
            const dx = (sx - srcCenterX) / (scaleX > 1 ? scaleX : 1);
            const wx = lanczos3(dx);
            const w = wx * wy;
            if (w === 0) continue;

            const idx = (rowOffset + sx) * 4;
            const alphaVal = srcPixels[idx + 3] / 255;

            r += srcPixels[idx] * w * alphaVal;
            g += srcPixels[idx + 1] * w * alphaVal;
            b += srcPixels[idx + 2] * w * alphaVal;
            a += srcPixels[idx + 3] * w;
            totalWeight += w;
          }
        }

        const outIdx = (y * targetW + x) * 4;
        if (totalWeight > 0) {
          const normA = Math.min(255, Math.max(0, a / totalWeight));
          const alphaFactor = normA > 0 ? (255 / normA) : 1;

          outPixels[outIdx] = Math.min(255, Math.max(0, Math.round((r / totalWeight) * alphaFactor)));
          outPixels[outIdx + 1] = Math.min(255, Math.max(0, Math.round((g / totalWeight) * alphaFactor)));
          outPixels[outIdx + 2] = Math.min(255, Math.max(0, Math.round((b / totalWeight) * alphaFactor)));
          outPixels[outIdx + 3] = Math.round(normA);
        }
      }
    }

    outCtx.putImageData(outData, 0, 0);
    return outCanvas;
  }

  /**
   * Area Average Resampling (Ideal for fast clean downsampling)
   */
  public static areaAverageResize(
    sourceCanvas: HTMLCanvasElement,
    targetW: number,
    targetH: number
  ): HTMLCanvasElement {
    const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    if (!srcCtx) return sourceCanvas;

    const srcW = sourceCanvas.width;
    const srcH = sourceCanvas.height;
    const srcData = srcCtx.getImageData(0, 0, srcW, srcH).data;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = targetW;
    outCanvas.height = targetH;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return sourceCanvas;

    const outImgData = outCtx.createImageData(targetW, targetH);
    const outData = outImgData.data;

    const scaleX = srcW / targetW;
    const scaleY = srcH / targetH;

    for (let y = 0; y < targetH; y++) {
      const srcStartY = Math.floor(y * scaleY);
      const srcEndY = Math.min(srcH, Math.ceil((y + 1) * scaleY));

      for (let x = 0; x < targetW; x++) {
        const srcStartX = Math.floor(x * scaleX);
        const srcEndX = Math.min(srcW, Math.ceil((x + 1) * scaleX));

        let r = 0, g = 0, b = 0, a = 0, count = 0;

        for (let sy = srcStartY; sy < srcEndY; sy++) {
          const rowOffset = sy * srcW;
          for (let sx = srcStartX; sx < srcEndX; sx++) {
            const idx = (rowOffset + sx) * 4;
            r += srcData[idx];
            g += srcData[idx + 1];
            b += srcData[idx + 2];
            a += srcData[idx + 3];
            count++;
          }
        }

        const outIdx = (y * targetW + x) * 4;
        if (count > 0) {
          outData[outIdx] = Math.round(r / count);
          outData[outIdx + 1] = Math.round(g / count);
          outData[outIdx + 2] = Math.round(b / count);
          outData[outIdx + 3] = Math.round(a / count);
        }
      }
    }

    outCtx.putImageData(outImgData, 0, 0);
    return outCanvas;
  }

  /**
   * Convert Millimeters to Pixels at given DPI
   */
  public static mmToPx(mm: number, dpi: number = 300): number {
    return Math.round((mm / 25.4) * dpi);
  }

  /**
   * Convert Pixels to Millimeters at given DPI
   */
  public static pxToMm(px: number, dpi: number = 300): number {
    return Math.round((px / dpi) * 25.4 * 10) / 10;
  }

  /**
   * Convert Inches to Pixels at given DPI
   */
  public static inToPx(inches: number, dpi: number = 300): number {
    return Math.round(inches * dpi);
  }

  /**
   * Convert Pixels to Inches at given DPI
   */
  public static pxToIn(px: number, dpi: number = 300): number {
    return Math.round((px / dpi) * 100) / 100;
  }
}
