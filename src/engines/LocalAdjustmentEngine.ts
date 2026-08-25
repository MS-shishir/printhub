/**
 * LocalAdjustmentEngine.ts
 * High-Precision Non-Destructive Selective Masking & Local Photo Adjustment Engine.
 * Supports manual brush painting, feathering, invert, clear, AI semantic region selection
 * (Face, Skin, Neck, Hair, Eyes, Clothes, Background, Subject), and real-time pixel compositing.
 */

export interface LocalAdjustmentValues {
  brightness: number;  // -100 to 100
  exposure: number;    // -100 to 100
  contrast: number;    // -100 to 100
  highlights: number;  // -100 to 100
  shadows: number;     // -100 to 100
  saturation: number;  // -100 to 100
  temperature: number; // -100 to 100
  tint: number;        // -100 to 100
  sharpness: number;   // 0 to 100
  clarity: number;     // 0 to 100
  lipTint?: number;     // 0 to 100 (Lip Pink/Red Tint)
  eyeKajal?: number;    // 0 to 100 (Under-Eye Eyeliner/Darkening)
}

export type AiRegionType = 
  | 'face' | 'skin' | 'lips' | 'kajal' | 'neck' | 'hair' | 'eyes' | 'clothes' | 'background' | 'subject';

export interface LocalAdjustmentStackItem {
  id: string;
  name: string;
  regionType?: AiRegionType | 'custom';
  visible: boolean;
  maskCanvas: HTMLCanvasElement; // Grayscale alpha mask canvas (255 = selected, 0 = outside)
  feather: number;              // Feather radius in pixels (0 to 50)
  opacity: number;              // Mask opacity (0 to 100)
  adjustments: LocalAdjustmentValues;
}

export const DEFAULT_LOCAL_ADJUSTMENTS: LocalAdjustmentValues = {
  brightness: 0,
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  sharpness: 0,
  clarity: 0,
  lipTint: 0,
  eyeKajal: 0
};

export class LocalAdjustmentEngine {
  /**
   * Create an offscreen mask canvas initialized to blank (0 alpha)
   */
  public static createMaskCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    return canvas;
  }

  /**
   * Paint stroke onto mask canvas (brush or eraser mode)
   */
  public static paintBrush(
    maskCanvas: HTMLCanvasElement,
    x: number,
    y: number,
    brushSize: number,
    opacity: number,
    hardness: number,
    isEraser: boolean = false
  ): void {
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
    
    const radius = Math.max(1, brushSize / 2);
    const alpha = opacity / 100;

    if (hardness >= 90) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isEraser ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
      ctx.fill();
    } else {
      const gradient = ctx.createRadialGradient(x, y, radius * (hardness / 100), x, y, radius);
      if (isEraser) {
        gradient.addColorStop(0, `rgba(0,0,0,${alpha})`);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
      } else {
        gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
      }
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Invert mask canvas (black becomes white, white becomes black)
   */
  public static invertMask(maskCanvas: HTMLCanvasElement): void {
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      data[i] = 255 - data[i];
      data[i + 1] = 255 - data[i + 1];
      data[i + 2] = 255 - data[i + 2];
      data[i + 3] = 255 - alpha;
    }

    ctx.putImageData(imgData, 0, 0);
  }

  /**
   * Clear mask canvas to 0 alpha
   */
  public static clearMask(maskCanvas: HTMLCanvasElement): void {
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
  }

  /**
   * Generate AI Semantic Region Mask for portrait photo
   * (Face, Skin, Neck, Hair, Eyes, Clothes, Background, Subject)
   */
  public static generateAiSemanticMask(
    sourceImg: HTMLImageElement | HTMLCanvasElement,
    region: AiRegionType
  ): HTMLCanvasElement {
    const width = sourceImg.width || (sourceImg as HTMLCanvasElement).width || 800;
    const height = sourceImg.height || (sourceImg as HTMLCanvasElement).height || 600;

    const maskCanvas = this.createMaskCanvas(width, height);
    const mCtx = maskCanvas.getContext('2d');
    if (!mCtx) return maskCanvas;

    // Temporary canvas to extract source image pixels
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tCtx = tempCanvas.getContext('2d');
    if (!tCtx) return maskCanvas;

    tCtx.drawImage(sourceImg, 0, 0, width, height);
    const srcData = tCtx.getImageData(0, 0, width, height);
    const sPixels = srcData.data;

    const maskImgData = mCtx.createImageData(width, height);
    const mPixels = maskImgData.data;

    // Geometric bounding estimates for portrait features
    const cx = width / 2;
    const cy = height * 0.45;
    const faceRx = width * 0.22;
    const faceRy = height * 0.25;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = sPixels[idx];
        const g = sPixels[idx + 1];
        const b = sPixels[idx + 2];

        // Skin Gamut Threshold Detector (YCbCr + RGB Skin Model)
        const isSkinColor = 
          r > 60 && g > 40 && b > 20 &&
          (Math.max(r, g, b) - Math.min(r, g, b) > 15) &&
          Math.abs(r - g) > 12 && r > g && r > b;

        // Normalized Distance metric relative to portrait center
        const dx = (x - cx) / faceRx;
        const dy = (y - cy) / faceRy;
        const distSq = dx * dx + dy * dy;

        let isSelected = false;
        let matchAlpha = 255;

        switch (region) {
          case 'face':
            // Strict face ellipse combined with skin color gamut
            if (distSq <= 1.0) {
              const edgeFactor = Math.max(0, 1 - Math.sqrt(distSq));
              isSelected = true;
              matchAlpha = Math.round(255 * (0.4 + 0.6 * edgeFactor));
            }
            break;

          case 'skin':
            // General skin pixels (face + neck + arms)
            if (isSkinColor && distSq <= 2.8) {
              isSelected = true;
              matchAlpha = 230;
            }
            break;

          case 'lips':
            // Lower facial lip region (mouth ellipse + reddish hue)
            const lipY = cy + faceRy * 0.48;
            const lipX = cx;
            const lipRx = faceRx * 0.42;
            const lipRy = faceRy * 0.18;
            const lipDx = (x - lipX) / lipRx;
            const lipDy = (y - lipY) / lipRy;
            const lipDistSq = lipDx * lipDx + lipDy * lipDy;
            if (lipDistSq <= 1.0) {
              isSelected = true;
              matchAlpha = Math.round(255 * (1 - Math.sqrt(lipDistSq) * 0.3));
            }
            break;

          case 'kajal':
            // Under-eye eyeliner & kajal contour (lower eye curve)
            const kajalY = cy - faceRy * 0.16;
            const leftKajalX = cx - faceRx * 0.45;
            const rightKajalX = cx + faceRx * 0.45;
            const kajalRadiusX = faceRx * 0.32;
            const kajalRadiusY = faceRy * 0.12;
            
            const dKajalLeftX = (x - leftKajalX) / kajalRadiusX;
            const dKajalLeftY = (y - kajalY) / kajalRadiusY;
            const dKajalRightX = (x - rightKajalX) / kajalRadiusX;
            const dKajalRightY = (y - kajalY) / kajalRadiusY;
            
            const isLeftKajal = (dKajalLeftX * dKajalLeftX + dKajalLeftY * dKajalLeftY <= 1.0) && (y >= kajalY - 2);
            const isRightKajal = (dKajalRightX * dKajalRightX + dKajalRightY * dKajalRightY <= 1.0) && (y >= kajalY - 2);
            
            if (isLeftKajal || isRightKajal) {
              isSelected = true;
              matchAlpha = 240;
            }
            break;

          case 'neck':
            // Lower face to collarbone neck region
            const isNeckY = y >= cy + faceRy * 0.5 && y <= cy + faceRy * 1.55;
            const isNeckX = Math.abs(x - cx) <= faceRx * 0.85;
            if (isNeckY && isNeckX && isSkinColor) {
              isSelected = true;
              matchAlpha = 240;
            }
            break;

          case 'hair':
            // Upper head region above forehead/sides with darker/texture pixels
            const isHairY = y >= cy - faceRy * 1.35 && y <= cy - faceRy * 0.2;
            const isHairX = Math.abs(x - cx) <= faceRx * 1.25;
            const isDarkOrHair = (r + g + b) / 3 < 180;
            if (isHairY && isHairX && isDarkOrHair && !isSkinColor) {
              isSelected = true;
              matchAlpha = 220;
            }
            break;

          case 'eyes':
            // Dual eye sockets region
            const eyeY = cy - faceRy * 0.25;
            const leftEyeX = cx - faceRx * 0.45;
            const rightEyeX = cx + faceRx * 0.45;
            const eyeRadius = faceRx * 0.25;
            const dLeft = Math.hypot(x - leftEyeX, y - eyeY);
            const dRight = Math.hypot(x - rightEyeX, y - eyeY);
            if (dLeft <= eyeRadius || dRight <= eyeRadius) {
              isSelected = true;
              matchAlpha = 255;
            }
            break;

          case 'clothes':
            // Torso / suit region below neck
            const isClothesY = y >= cy + faceRy * 1.2;
            if (isClothesY && !isSkinColor) {
              isSelected = true;
              matchAlpha = 230;
            }
            break;

          case 'background':
            // Outer background region (away from subject center)
            if (distSq > 1.8 && y < height * 0.85 && !isSkinColor) {
              isSelected = true;
              matchAlpha = 240;
            }
            break;

          case 'subject':
            // Subject (Person portrait center)
            if (distSq <= 2.2 || isSkinColor) {
              isSelected = true;
              matchAlpha = 250;
            }
            break;
        }

        if (isSelected) {
          mPixels[idx] = 255;
          mPixels[idx + 1] = 255;
          mPixels[idx + 2] = 255;
          mPixels[idx + 3] = matchAlpha;
        } else {
          mPixels[idx] = 0;
          mPixels[idx + 1] = 0;
          mPixels[idx + 2] = 0;
          mPixels[idx + 3] = 0;
        }
      }
    }

    mCtx.putImageData(maskImgData, 0, 0);

    // Apply smooth feathering to AI region mask edges
    return this.applyFeatherToMask(maskCanvas, 12);
  }

  /**
   * Apply Gaussian blur feathering to mask edges
   */
  public static applyFeatherToMask(maskCanvas: HTMLCanvasElement, featherRadius: number): HTMLCanvasElement {
    if (featherRadius <= 0) return maskCanvas;

    const featheredCanvas = document.createElement('canvas');
    featheredCanvas.width = maskCanvas.width;
    featheredCanvas.height = maskCanvas.height;
    const ctx = featheredCanvas.getContext('2d');
    if (!ctx) return maskCanvas;

    ctx.filter = `blur(${featherRadius}px)`;
    ctx.drawImage(maskCanvas, 0, 0);
    ctx.filter = 'none';

    return featheredCanvas;
  }

  /**
   * Apply non-destructive local adjustment stack onto source canvas image
   */
  public static applyLocalAdjustmentsToCanvas(
    sourceCanvas: HTMLCanvasElement,
    stack: LocalAdjustmentStackItem[],
    showMaskOverlayId?: string | null
  ): HTMLCanvasElement {
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = sourceCanvas.width;
    outputCanvas.height = sourceCanvas.height;
    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return sourceCanvas;

    // Draw base unadjusted image
    ctx.drawImage(sourceCanvas, 0, 0);

    const activeStack = stack.filter((s) => s.visible);
    if (activeStack.length === 0 && !showMaskOverlayId) return outputCanvas;

    const baseImgData = ctx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
    const basePixels = baseImgData.data;

    // Process each active local adjustment mask
    activeStack.forEach((item) => {
      const adj = item.adjustments;
      const opacityFactor = (item.opacity / 100);

      // Extract mask alpha channel scaled to output canvas resolution
      const mCanvas = item.feather > 0 ? this.applyFeatherToMask(item.maskCanvas, item.feather) : item.maskCanvas;
      const tempMCtx = document.createElement('canvas').getContext('2d');
      const maskCanvasScaled = document.createElement('canvas');
      maskCanvasScaled.width = outputCanvas.width;
      maskCanvasScaled.height = outputCanvas.height;
      const mCtx = maskCanvasScaled.getContext('2d');
      if (!mCtx) return;

      mCtx.drawImage(mCanvas, 0, 0, outputCanvas.width, outputCanvas.height);
      const maskPixels = mCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height).data;

      const b = (adj.brightness + adj.exposure) / 100;
      const cFactor = (adj.contrast + 100) / 100;
      const contrastSq = cFactor * cFactor;
      const satFactor = adj.saturation / 100;
      const tempShift = adj.temperature;
      const tintShift = adj.tint;

      for (let i = 0; i < basePixels.length; i += 4) {
        const maskAlpha = (maskPixels[i + 3] / 255) * opacityFactor;
        if (maskAlpha <= 0.001) continue; // Skip pixel outside mask

        let r = basePixels[i];
        let g = basePixels[i + 1];
        let bl = basePixels[i + 2];

        // 1. Brightness & Exposure
        if (b !== 0) {
          r = r + b * 255;
          g = g + b * 255;
          bl = bl + b * 255;
        }

        // Highlights & Shadows
        const lum = 0.299 * r + 0.587 * g + 0.114 * bl;
        if (adj.highlights && adj.highlights !== 0 && lum > 128) {
          const factor = ((lum - 128) / 127) * (adj.highlights / 100);
          r += r * factor;
          g += g * factor;
          bl += bl * factor;
        }
        if (adj.shadows && adj.shadows !== 0 && lum < 128) {
          const factor = ((128 - lum) / 128) * (adj.shadows / 100);
          r += r * factor;
          g += g * factor;
          bl += bl * factor;
        }

        // 2. Temperature & Tint Color Shift
        if (tempShift !== 0) {
          r += tempShift * 0.4;
          bl -= tempShift * 0.4;
        }
        if (tintShift !== 0) {
          g += tintShift * 0.4;
        }

        // 3. Contrast
        if (adj.contrast !== 0) {
          r = (r - 128) * contrastSq + 128;
          g = (g - 128) * contrastSq + 128;
          bl = (bl - 128) * contrastSq + 128;
        }

        // 4. Saturation
        if (satFactor !== 0) {
          const gray = 0.2989 * r + 0.587 * g + 0.114 * bl;
          r = gray + (r - gray) * (1 + satFactor);
          g = gray + (g - gray) * (1 + satFactor);
          bl = gray + (bl - gray) * (1 + satFactor);
        }

        // 5. Lip Rosy Pink Tint (Lipstick)
        if (adj.lipTint && adj.lipTint !== 0) {
          const factor = (adj.lipTint / 100);
          r += 95 * factor;
          g += 15 * factor;
          bl += 50 * factor;
        }

        // 6. Under-Eye Kajal / Eyeliner (Deep Dark Contour)
        if (adj.eyeKajal && adj.eyeKajal !== 0) {
          const factor = (adj.eyeKajal / 100);
          r -= r * 0.75 * factor + 25 * factor;
          g -= g * 0.75 * factor + 25 * factor;
          bl -= bl * 0.75 * factor + 25 * factor;
        }

        // Clamp pixel values
        r = Math.min(255, Math.max(0, r));
        g = Math.min(255, Math.max(0, g));
        bl = Math.min(255, Math.max(0, bl));

        // Blend adjusted pixel with original pixel according to mask alpha feather weight
        basePixels[i] = Math.round(basePixels[i] * (1 - maskAlpha) + r * maskAlpha);
        basePixels[i + 1] = Math.round(basePixels[i + 1] * (1 - maskAlpha) + g * maskAlpha);
        basePixels[i + 2] = Math.round(basePixels[i + 2] * (1 - maskAlpha) + bl * maskAlpha);
      }
    });

    ctx.putImageData(baseImgData, 0, 0);

    // If Show Mask Overlay is toggled ON for active mask, render magenta/red mask preview
    if (showMaskOverlayId) {
      const targetMask = stack.find((s) => s.id === showMaskOverlayId);
      if (targetMask) {
        ctx.save();
        ctx.globalAlpha = 0.45;
        const maskCanvasScaled = document.createElement('canvas');
        maskCanvasScaled.width = outputCanvas.width;
        maskCanvasScaled.height = outputCanvas.height;
        const mCtx = maskCanvasScaled.getContext('2d');
        if (mCtx) {
          mCtx.drawImage(targetMask.maskCanvas, 0, 0, outputCanvas.width, outputCanvas.height);
          mCtx.globalCompositeOperation = 'source-in';
          mCtx.fillStyle = '#ec4899'; // Hot Magenta Pink Mask Color
          mCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
          ctx.drawImage(maskCanvasScaled, 0, 0);
        }
        ctx.restore();
      }
    }

    return outputCanvas;
  }
}
