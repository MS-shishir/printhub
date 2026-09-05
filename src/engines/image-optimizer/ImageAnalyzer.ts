/**
 * ImageAnalyzer.ts - Intelligent Image Complexity & Classification Engine
 * Computes Shannon entropy, noise, Sobel edge density, Laplacian sharpness, and auto-classification.
 */

import {
  ImageAnalysisResult,
  SupportedImageFormat,
  ImageClassification,
  ImageDimensions
} from './types';

export class ImageAnalyzer {
  /**
   * Main entry point to analyze an HTMLCanvasElement or ImageData
   */
  public static analyze(
    source: HTMLCanvasElement | ImageData,
    format: SupportedImageFormat = 'jpeg',
    detectedDpi: number = 72
  ): ImageAnalysisResult {
    let imageData: ImageData;
    let width: number;
    let height: number;

    if (source instanceof HTMLCanvasElement) {
      width = source.width;
      height = source.height;
      const ctx = source.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        throw new Error('Failed to acquire 2D rendering context for image analysis.');
      }
      imageData = ctx.getImageData(0, 0, width, height);
    } else {
      imageData = source;
      width = imageData.width;
      height = imageData.height;
    }

    const data = imageData.data;
    const totalPixels = width * height;

    // 1. Transparency & Alpha Analysis
    let hasAlpha = false;
    let isFullyOpaque = true;
    let transparentPixelCount = 0;

    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        hasAlpha = true;
        transparentPixelCount++;
        if (data[i] === 0) {
          isFullyOpaque = false;
        }
      }
    }

    // 2. Grayscale conversion & Luminance Histogram for Entropy
    const gray = new Uint8Array(totalPixels);
    const hist = new Uint32Array(256);
    let colorSet = new Set<number>();
    const sampleStep = Math.max(1, Math.floor(totalPixels / 20000)); // Sample subset for color count speed

    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Standard Rec. 709 luminance
      const y = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
      gray[p] = y;
      hist[y]++;

      if (p % sampleStep === 0 && colorSet.size < 4096) {
        // Pack 15-bit color to estimate color variety
        const packed = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
        colorSet.add(packed);
      }
    }

    // Shannon Entropy Calculation: H = -sum(p * log2(p))
    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      if (hist[i] > 0) {
        const p = hist[i] / totalPixels;
        entropy -= p * Math.log2(p);
      }
    }
    // Round to 2 decimals (max theoretical is 8.0)
    entropy = Math.round(entropy * 100) / 100;

    // 3. Edge Density (Sobel 3x3 Convolution) & Sharpness (Laplacian)
    let edgePixelCount = 0;
    let laplacianSum = 0;
    let laplacianSqSum = 0;
    let laplacianCount = 0;

    // Skip border pixels
    for (let y = 1; y < height - 1; y += 2) {
      for (let x = 1; x < width - 1; x += 2) {
        const idx = y * width + x;

        // Sobel kernels
        // Gx: [-1 0 1; -2 0 2; -1 0 1]
        // Gy: [-1 -2 -1; 0 0 0; 1 2 1]
        const p00 = gray[(y - 1) * width + (x - 1)];
        const p01 = gray[(y - 1) * width + x];
        const p02 = gray[(y - 1) * width + (x + 1)];
        const p10 = gray[y * width + (x - 1)];
        const p12 = gray[y * width + (x + 1)];
        const p20 = gray[(y + 1) * width + (x - 1)];
        const p21 = gray[(y + 1) * width + x];
        const p22 = gray[(y + 1) * width + (x + 1)];

        const gx = -p00 + p02 - 2 * p10 + 2 * p12 - p20 + p22;
        const gy = -p00 - 2 * p01 - p02 + p20 + 2 * p21 + p22;
        const gradientMagnitude = Math.sqrt(gx * gx + gy * gy);

        if (gradientMagnitude > 75) {
          edgePixelCount++;
        }

        // Laplacian kernel: [0 1 0; 1 -4 1; 0 1 0]
        const lap = Math.abs(p01 + p10 + p12 + p21 - 4 * gray[idx]);
        laplacianSum += lap;
        laplacianSqSum += lap * lap;
        laplacianCount++;
      }
    }

    const sampledArea = laplacianCount || 1;
    const edgeDensity = Math.min(100, Math.round((edgePixelCount / sampledArea) * 1000) / 10);
    
    // Variance of Laplacian = E[X^2] - (E[X])^2
    const meanLap = laplacianSum / sampledArea;
    const sharpnessScore = Math.max(0, Math.round((laplacianSqSum / sampledArea - meanLap * meanLap) * 10) / 10);

    // 4. Noise Estimation (Median Absolute Deviation of High-Pass residual)
    const noiseLevel = Math.min(100, Math.max(0, Math.round(Math.sqrt(sharpnessScore) * (entropy > 6.8 ? 1.4 : 0.8))));

    // 5. Estimated Complexity
    let estimatedComplexity: 'low' | 'medium' | 'high' | 'ultra' = 'medium';
    if (entropy < 4.0 && edgeDensity < 5) {
      estimatedComplexity = 'low';
    } else if (entropy > 7.3 && edgeDensity > 25) {
      estimatedComplexity = 'ultra';
    } else if (entropy > 6.0 || edgeDensity > 15) {
      estimatedComplexity = 'high';
    }

    // 6. Classification Decision Tree
    const aspectRatio = Math.round((width / height) * 100) / 100;
    const approxUniqueColors = colorSet.size;

    let classification: ImageClassification = 'photograph';

    if (hasAlpha && transparentPixelCount > totalPixels * 0.05) {
      classification = 'transparent';
    } else if (approxUniqueColors < 120 && edgeDensity > 12) {
      classification = 'logo';
    } else if (approxUniqueColors < 450 && entropy < 5.2) {
      classification = 'graphic';
    } else if (edgeDensity > 35 && entropy < 6.5 && approxUniqueColors < 1500) {
      classification = 'document';
    } else if (edgeDensity > 30 && entropy < 6.0) {
      classification = 'screenshot';
    } else if (aspectRatio >= 0.65 && aspectRatio <= 0.85 && entropy >= 5.5) {
      classification = 'portrait';
    } else if (aspectRatio >= 1.4 && entropy >= 6.5) {
      classification = 'landscape';
    } else {
      classification = 'photograph';
    }

    return {
      format,
      dimensions: { width, height },
      aspectRatio,
      hasAlpha,
      isFullyOpaque,
      entropy,
      noiseLevel,
      edgeDensity,
      sharpnessScore,
      colorCountApprox: approxUniqueColors * 8, // Extrapolated from 15-bit sampling
      classification,
      dpi: detectedDpi || 72,
      colorSpace: 'srgb',
      estimatedComplexity
    };
  }

  /**
   * Helper to inspect File headers / MIME to detect image format
   */
  public static async detectFileMetadata(file: File): Promise<{
    format: SupportedImageFormat;
    dpi: number;
  }> {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    let format: SupportedImageFormat = 'jpeg';

    if (file.type.includes('png') || extension === 'png') format = 'png';
    else if (file.type.includes('webp') || extension === 'webp') format = 'webp';
    else if (file.type.includes('avif') || extension === 'avif') format = 'avif';
    else if (file.type.includes('bmp') || extension === 'bmp') format = 'bmp';
    else if (file.type.includes('gif') || extension === 'gif') format = 'gif';
    else format = 'jpeg';

    let dpi = 72;
    try {
      // Read first 64KB to parse JFIF / PNG pHYs headers if available
      const slice = file.slice(0, 65536);
      const buffer = await slice.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      if (format === 'jpeg') {
        // Search for JFIF marker 0xFF 0xE0
        for (let i = 0; i < bytes.length - 18; i++) {
          if (bytes[i] === 0xff && bytes[i + 1] === 0xe0 &&
              bytes[i + 4] === 0x4a && bytes[i + 5] === 0x46 && bytes[i + 6] === 0x49 && bytes[i + 7] === 0x46) {
            const unit = bytes[i + 11]; // 1 = DPI, 2 = DPCM
            const xDensity = (bytes[i + 12] << 8) | bytes[i + 13];
            if (unit === 1 && xDensity >= 50 && xDensity <= 1200) {
              dpi = xDensity;
            } else if (unit === 2 && xDensity > 0) {
              dpi = Math.round(xDensity * 2.54);
            }
            break;
          }
        }
      } else if (format === 'png') {
        // Search for pHYs chunk in PNG
        for (let i = 8; i < bytes.length - 16; i++) {
          if (bytes[i] === 0x70 && bytes[i + 1] === 0x48 && bytes[i + 2] === 0x59 && bytes[i + 3] === 0x73) {
            const ppuX = (bytes[i + 4] << 24) | (bytes[i + 5] << 16) | (bytes[i + 6] << 8) | bytes[i + 7];
            const unit = bytes[i + 12];
            if (unit === 1 && ppuX > 0) {
              // 1 meter = 39.3701 inches
              dpi = Math.round(ppuX * 0.0254);
            }
            break;
          }
        }
      }
    } catch {
      dpi = 72;
    }

    return { format, dpi: (dpi >= 50 && dpi <= 1200) ? dpi : 72 };
  }

  /**
   * Loads an image file or source into an HTMLCanvasElement
   */
  public static async loadToCanvas(
    source: File | Blob | HTMLCanvasElement | ImageData | string
  ): Promise<HTMLCanvasElement> {
    if (source instanceof HTMLCanvasElement) {
      return source;
    }

    if (source instanceof ImageData) {
      const canvas = document.createElement('canvas');
      canvas.width = source.width;
      canvas.height = source.height;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.putImageData(source, 0, 0);
      return canvas;
    }

    return new Promise<HTMLCanvasElement>((resolve, reject) => {
      const img = new Image();
      let objectUrlToRevoke: string | null = null;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
          return reject(new Error('Canvas context initialization failed'));
        }
        ctx.drawImage(img, 0, 0);
        if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
        resolve(canvas);
      };

      img.onerror = (err) => {
        if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
        reject(new Error(`Failed to decode image: ${err}`));
      };

      if (typeof source === 'string') {
        img.src = source;
      } else {
        objectUrlToRevoke = URL.createObjectURL(source);
        img.src = objectUrlToRevoke;
      }
    });
  }
}
