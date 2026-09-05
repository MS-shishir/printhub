/**
 * ImageEngine.ts - Production Image Processing Engine
 * Real pixel manipulation, brightness/contrast, saturation, color channels, rotation, flipping & DPI scaling.
 */

export interface ImageAdjustmentParams {
  brightness: number;  // -100 to 100
  contrast: number;    // -100 to 100
  saturation: number;  // -100 to 100
  sepia?: boolean;
  grayscale?: boolean;
  blurRadius?: number; // 0 to 20
}

export class ImageEngine {
  /**
   * Adjust pixel data on an HTMLCanvasElement context directly
   */
  public static applyAdjustments(
    sourceCanvas: HTMLCanvasElement,
    params: ImageAdjustmentParams
  ): HTMLCanvasElement {
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = sourceCanvas.width;
    outputCanvas.height = sourceCanvas.height;
    const ctx = outputCanvas.getContext('2d');

    if (!ctx) return sourceCanvas;

    // Draw original image
    ctx.drawImage(sourceCanvas, 0, 0);

    const imageData = ctx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
    const data = imageData.data;

    const b = params.brightness / 100;
    const c = (params.contrast + 100) / 100; // Factor
    const contrastFactor = c * c;
    const s = params.saturation / 100;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let bl = data[i + 2];

      // Brightness
      if (b !== 0) {
        r = Math.min(255, Math.max(0, r + b * 255));
        g = Math.min(255, Math.max(0, g + b * 255));
        bl = Math.min(255, Math.max(0, bl + b * 255));
      }

      // Contrast
      if (params.contrast !== 0) {
        r = Math.min(255, Math.max(0, (r - 128) * contrastFactor + 128));
        g = Math.min(255, Math.max(0, (g - 128) * contrastFactor + 128));
        bl = Math.min(255, Math.max(0, (bl - 128) * contrastFactor + 128));
      }

      // Grayscale
      if (params.grayscale) {
        const avg = 0.299 * r + 0.587 * g + 0.114 * bl;
        r = g = bl = avg;
      }

      // Sepia
      if (params.sepia) {
        const tr = 0.393 * r + 0.769 * g + 0.189 * bl;
        const tg = 0.349 * r + 0.686 * g + 0.168 * bl;
        const tb = 0.272 * r + 0.534 * g + 0.131 * bl;
        r = Math.min(255, tr);
        g = Math.min(255, tg);
        bl = Math.min(255, tb);
      }

      // Saturation Adjustment
      if (s !== 0 && !params.grayscale) {
        const gray = 0.2989 * r + 0.587 * g + 0.114 * bl;
        r = Math.min(255, Math.max(0, gray + (r - gray) * (1 + s)));
        g = Math.min(255, Math.max(0, gray + (g - gray) * (1 + s)));
        bl = Math.min(255, Math.max(0, gray + (bl - gray) * (1 + s)));
      }

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = bl;
    }

    ctx.putImageData(imageData, 0, 0);
    return outputCanvas;
  }

  /**
   * Rotate Canvas image by angle in degrees (90, 180, 270)
   */
  public static rotateCanvas(sourceCanvas: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
    const outputCanvas = document.createElement('canvas');
    const rad = (degrees * Math.PI) / 180;
    const isVertical = Math.abs(degrees) === 90 || Math.abs(degrees) === 270;

    outputCanvas.width = isVertical ? sourceCanvas.height : sourceCanvas.width;
    outputCanvas.height = isVertical ? sourceCanvas.width : sourceCanvas.height;

    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return sourceCanvas;

    ctx.translate(outputCanvas.width / 2, outputCanvas.height / 2);
    ctx.rotate(rad);
    ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);

    return outputCanvas;
  }

  /**
   * Flip canvas horizontally or vertically
   */
  public static flipCanvas(
    sourceCanvas: HTMLCanvasElement,
    horizontal: boolean = false,
    vertical: boolean = false
  ): HTMLCanvasElement {
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = sourceCanvas.width;
    outputCanvas.height = sourceCanvas.height;

    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return sourceCanvas;

    ctx.translate(horizontal ? sourceCanvas.width : 0, vertical ? sourceCanvas.height : 0);
    ctx.scale(horizontal ? -1 : 1, vertical ? -1 : 1);
    ctx.drawImage(sourceCanvas, 0, 0);

    return outputCanvas;
  }

  /**
   * High-DPI Upscaler (e.g. converting 72 DPI screen resolution to 300 DPI print quality)
   */
  public static scaleToDpi(
    sourceCanvas: HTMLCanvasElement,
    targetDpi: number = 300,
    currentDpi: number = 72
  ): HTMLCanvasElement {
    const factor = targetDpi / currentDpi;
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = Math.round(sourceCanvas.width * factor);
    outputCanvas.height = Math.round(sourceCanvas.height * factor);

    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return sourceCanvas;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceCanvas, 0, 0, outputCanvas.width, outputCanvas.height);

    return outputCanvas;
  }
}
