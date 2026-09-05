/**
 * SmartSharpen.ts - Content-Aware Adaptive Image Sharpening Engine
 * Restores edge clarity post-downscaling using adaptive unsharp masking without halo artifacts.
 */

import { ImageClassification, SharpenOptions } from './types';

export class SmartSharpen {
  /**
   * Applies content-aware unsharp mask to a canvas
   */
  public static applyAdaptiveSharpen(
    canvas: HTMLCanvasElement,
    classification: ImageClassification,
    downscaleFactor: number = 1.0,
    userOptions?: SharpenOptions
  ): HTMLCanvasElement {
    if (userOptions && !userOptions.enabled) {
      return canvas;
    }

    // Determine optimal sharpen parameters based on classification & downscaling
    let amount = 25;      // 0 - 100
    let radius = 1.0;     // 0.5 - 2.5
    let threshold = 4;    // 0 - 25

    if (userOptions?.mode === 'manual' && userOptions.amount !== undefined) {
      amount = userOptions.amount;
      radius = userOptions.radius ?? 1.0;
      threshold = userOptions.threshold ?? 4;
    } else {
      // Content-Aware Adaptive Tuning
      switch (classification) {
        case 'document':
        case 'screenshot':
          // Crisp text & high-contrast line edge preservation
          amount = downscaleFactor > 1.5 ? 45 : 30;
          radius = 1.0;
          threshold = 2;
          break;

        case 'portrait':
          // Subtle skin-friendly sharpening to avoid pores/noise exaggeration & halos
          amount = downscaleFactor > 1.5 ? 20 : 12;
          radius = 0.8;
          threshold = 7;
          break;

        case 'landscape':
        case 'photograph':
          // Balanced foliage & architectural edge recovery
          amount = downscaleFactor > 1.5 ? 30 : 18;
          radius = 1.1;
          threshold = 4;
          break;

        case 'logo':
        case 'graphic':
        case 'illustration':
          amount = downscaleFactor > 1.5 ? 35 : 22;
          radius = 0.9;
          threshold = 3;
          break;

        default:
          amount = 20;
          radius = 1.0;
          threshold = 4;
      }
    }

    if (amount <= 0) return canvas;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return canvas;

    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const src = imgData.data;

    // Create blurred copy for unsharp mask
    const blurred = this.gaussianBlur(src, width, height, radius);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = width;
    outCanvas.height = height;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return canvas;

    const outData = outCtx.createImageData(width, height);
    const dst = outData.data;

    const strength = amount / 100;

    for (let i = 0; i < src.length; i += 4) {
      const a = src[i + 3];
      if (a === 0) {
        dst[i] = 0;
        dst[i + 1] = 0;
        dst[i + 2] = 0;
        dst[i + 3] = 0;
        continue;
      }

      for (let c = 0; c < 3; c++) {
        const orig = src[i + c];
        const blur = blurred[i + c];
        const diff = orig - blur;

        // Apply thresholding to avoid sharpening noise in flat regions
        if (Math.abs(diff) > threshold) {
          const sharpened = orig + diff * strength;
          dst[i + c] = Math.min(255, Math.max(0, Math.round(sharpened)));
        } else {
          dst[i + c] = orig;
        }
      }
      dst[i + 3] = a;
    }

    outCtx.putImageData(outData, 0, 0);
    return outCanvas;
  }

  /**
   * Fast separable Gaussian Blur for unsharp mask
   */
  private static gaussianBlur(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    radius: number
  ): Uint8ClampedArray {
    const r = Math.max(1, Math.round(radius));
    const size = r * 2 + 1;
    const kernel: number[] = new Array(size);
    const sigma = radius;
    let sum = 0;

    for (let i = -r; i <= r; i++) {
      const g = Math.exp(-(i * i) / (2 * sigma * sigma));
      kernel[i + r] = g;
      sum += g;
    }
    for (let i = 0; i < size; i++) kernel[i] /= sum;

    const temp = new Uint8ClampedArray(data.length);
    const output = new Uint8ClampedArray(data.length);

    // Horizontal pass
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        let rVal = 0, gVal = 0, bVal = 0, aVal = 0;
        for (let k = -r; k <= r; k++) {
          const px = Math.min(width - 1, Math.max(0, x + k));
          const idx = (rowOffset + px) * 4;
          const w = kernel[k + r];
          rVal += data[idx] * w;
          gVal += data[idx + 1] * w;
          bVal += data[idx + 2] * w;
          aVal += data[idx + 3] * w;
        }
        const outIdx = (rowOffset + x) * 4;
        temp[outIdx] = rVal;
        temp[outIdx + 1] = gVal;
        temp[outIdx + 2] = bVal;
        temp[outIdx + 3] = aVal;
      }
    }

    // Vertical pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let rVal = 0, gVal = 0, bVal = 0, aVal = 0;
        for (let k = -r; k <= r; k++) {
          const py = Math.min(height - 1, Math.max(0, y + k));
          const idx = (py * width + x) * 4;
          const w = kernel[k + r];
          rVal += temp[idx] * w;
          gVal += temp[idx + 1] * w;
          bVal += temp[idx + 2] * w;
          aVal += temp[idx + 3] * w;
        }
        const outIdx = (y * width + x) * 4;
        output[outIdx] = rVal;
        output[outIdx + 1] = gVal;
        output[outIdx + 2] = bVal;
        output[outIdx + 3] = aVal;
      }
    }

    return output;
  }
}
