/**
 * FormatConverter.ts - Production Image Format Transcoding Engine
 * Handles JPEG, PNG, WebP, AVIF encoding with transparency-safe background matte compositing.
 */

import {
  SupportedImageFormat,
  OutputImageFormat,
  ImageClassification
} from './types';

export class FormatConverter {
  /**
   * Determine the most optimal output format automatically if set to 'auto'
   */
  public static resolveFormat(
    requestedFormat: OutputImageFormat,
    hasAlpha: boolean,
    classification: ImageClassification
  ): SupportedImageFormat {
    if (requestedFormat !== 'auto') {
      return requestedFormat;
    }

    // Auto-selection logic
    if (hasAlpha) {
      // Transparency requires PNG, WebP or AVIF
      return 'webp';
    }

    switch (classification) {
      case 'document':
      case 'screenshot':
      case 'logo':
      case 'graphic':
        return 'webp';

      case 'portrait':
      case 'landscape':
      case 'photograph':
      default:
        // Default to JPEG / WebP for maximum compatibility and efficiency
        return 'jpeg';
    }
  }

  /**
   * Encode an HTMLCanvasElement to a Blob with specific format and quality
   */
  public static async encodeCanvas(
    canvas: HTMLCanvasElement,
    format: SupportedImageFormat,
    quality: number = 85,
    customBgColor: string = '#ffffff'
  ): Promise<Blob> {
    const normQuality = Math.min(1.0, Math.max(0.01, quality / 100));

    let canvasToEncode = canvas;

    // Handle alpha transparency if encoding to JPEG (which lacks alpha channel)
    if (format === 'jpeg') {
      canvasToEncode = this.compositeOverSolidBackground(canvas, customBgColor);
    }

    const mimeType = this.getMimeType(format);

    return new Promise<Blob>((resolve, reject) => {
      canvasToEncode.toBlob(
        (blob) => {
          if (!blob) {
            // If AVIF is unsupported in current browser environment, fallback to WebP
            if (format === 'avif') {
              this.encodeCanvas(canvas, 'webp', quality, customBgColor)
                .then(resolve)
                .catch(reject);
              return;
            }
            return reject(new Error(`Failed to encode image to format ${format}`));
          }
          resolve(blob);
        },
        mimeType,
        normQuality
      );
    });
  }

  /**
   * Composites a canvas with transparent areas over a solid color background
   */
  public static compositeOverSolidBackground(
    sourceCanvas: HTMLCanvasElement,
    bgColor: string = '#ffffff'
  ): HTMLCanvasElement {
    const flatCanvas = document.createElement('canvas');
    flatCanvas.width = sourceCanvas.width;
    flatCanvas.height = sourceCanvas.height;
    const ctx = flatCanvas.getContext('2d');
    if (!ctx) return sourceCanvas;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, flatCanvas.width, flatCanvas.height);
    ctx.drawImage(sourceCanvas, 0, 0);

    return flatCanvas;
  }

  /**
   * Get standard MIME type from format name
   */
  public static getMimeType(format: SupportedImageFormat): string {
    switch (format) {
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'avif':
        return 'image/avif';
      case 'bmp':
        return 'image/bmp';
      case 'gif':
        return 'image/gif';
      default:
        return 'image/jpeg';
    }
  }

  /**
   * Get file extension from format
   */
  public static getExtension(format: SupportedImageFormat): string {
    switch (format) {
      case 'jpeg':
        return 'jpg';
      case 'png':
        return 'png';
      case 'webp':
        return 'webp';
      case 'avif':
        return 'avif';
      case 'bmp':
        return 'bmp';
      case 'gif':
        return 'gif';
      default:
        return 'jpg';
    }
  }
}
