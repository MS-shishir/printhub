/**
 * SmartCropEngine.ts
 * Classical Deterministic Computer Vision & Energy-Based Saliency Crop Engine.
 * 
 * NO AI / Cloud APIs / External Models.
 * Uses classical local contrast, Sobel edge gradients, color saturation,
 * and Rule-of-Thirds centroid alignment to suggest optimal composition framing.
 */

import { CropRect, SmartCropCandidate } from './CropTypes';

export class SmartCropEngine {
  /**
   * Find the optimal smart crop rectangle for an input canvas given a target aspect ratio.
   */
  public static calculateSmartCrop(
    sourceCanvas: HTMLCanvasElement,
    aspectRatio: number,
    containerBounds?: { left: number; top: number; width: number; height: number }
  ): CropRect {
    const srcW = sourceCanvas.width;
    const srcH = sourceCanvas.height;

    // 1. Downscale to fast analysis proxy (approx 160 x 120)
    const proxyW = 160;
    const scale = proxyW / srcW;
    const proxyH = Math.max(20, Math.round(srcH * scale));

    const proxyCanvas = document.createElement('canvas');
    proxyCanvas.width = proxyW;
    proxyCanvas.height = proxyH;
    const pCtx = proxyCanvas.getContext('2d');

    if (!pCtx) {
      return this.fallbackCenterCrop(srcW, srcH, aspectRatio, containerBounds);
    }

    pCtx.drawImage(sourceCanvas, 0, 0, proxyW, proxyH);
    const imgData = pCtx.getImageData(0, 0, proxyW, proxyH);
    const pixels = imgData.data;

    // 2. Generate Classical Saliency Grid (Luminance + Saturation + Sobel Edges)
    const saliencyGrid = new Float32Array(proxyW * proxyH);
    const lum = new Float32Array(proxyW * proxyH);

    let totalEnergy = 0;

    for (let i = 0; i < proxyW * proxyH; i++) {
      const r = pixels[i * 4];
      const g = pixels[i * 4 + 1];
      const b = pixels[i * 4 + 2];

      // Luminance
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      lum[i] = l;

      // Color Saturation
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;

      saliencyGrid[i] = sat * 0.3;
    }

    // Sobel Edge Filter + Local Contrast
    for (let y = 1; y < proxyH - 1; y++) {
      for (let x = 1; x < proxyW - 1; x++) {
        const idx = y * proxyW + x;

        const gx =
          -lum[idx - proxyW - 1] + lum[idx - proxyW + 1] +
          -2 * lum[idx - 1] + 2 * lum[idx + 1] +
          -lum[idx + proxyW - 1] + lum[idx + proxyW + 1];

        const gy =
          -lum[idx - proxyW - 1] - 2 * lum[idx - proxyW] - lum[idx - proxyW + 1] +
          lum[idx + proxyW - 1] + 2 * lum[idx + proxyW] + lum[idx + proxyW + 1];

        const edgeMag = (Math.abs(gx) + Math.abs(gy)) / 1020; // normalize to [0, 1]

        // Center-weighted bias (subjects tend to be near center)
        const dx = (x - proxyW / 2) / (proxyW / 2);
        const dy = (y - proxyH / 2) / (proxyH / 2);
        const distFromCenter = Math.sqrt(dx * dx + dy * dy);
        const centerBias = Math.max(0, 1 - distFromCenter * 0.4);

        const energy = edgeMag * 0.5 + saliencyGrid[idx] * 0.3 + centerBias * 0.2;
        saliencyGrid[idx] = energy;
        totalEnergy += energy;
      }
    }

    // 3. Compute 2D Integral Image (Summed-Area Table) for O(1) rectangular energy queries
    const integral = new Float64Array((proxyW + 1) * (proxyH + 1));
    for (let y = 0; y < proxyH; y++) {
      for (let x = 0; x < proxyW; x++) {
        const val = saliencyGrid[y * proxyW + x];
        integral[(y + 1) * (proxyW + 1) + (x + 1)] =
          val +
          integral[y * (proxyW + 1) + (x + 1)] +
          integral[(y + 1) * (proxyW + 1) + x] -
          integral[y * (proxyW + 1) + x];
      }
    }

    const queryIntegral = (x0: number, y0: number, x1: number, y1: number): number => {
      const qx0 = Math.max(0, Math.min(proxyW, Math.floor(x0)));
      const qy0 = Math.max(0, Math.min(proxyH, Math.floor(y0)));
      const qx1 = Math.max(0, Math.min(proxyW, Math.ceil(x1)));
      const qy1 = Math.max(0, Math.min(proxyH, Math.ceil(y1)));

      return (
        integral[qy1 * (proxyW + 1) + qx1] -
        integral[qy0 * (proxyW + 1) + qx1] -
        integral[qy1 * (proxyW + 1) + qx0] +
        integral[qy0 * (proxyW + 1) + qx0]
      );
    };

    // 4. Candidate Search across Multi-Scale and Grid Positions
    const scales = [0.55, 0.65, 0.75, 0.85, 0.95, 1.0];
    let bestScore = -Infinity;
    let bestProxyRect = { left: 0, top: 0, width: proxyW, height: proxyH };

    for (const s of scales) {
      let candW = proxyW * s;
      let candH = candW / aspectRatio;

      if (candH > proxyH * s) {
        candH = proxyH * s;
        candW = candH * aspectRatio;
      }

      if (candW > proxyW || candH > proxyH) continue;

      const stepX = Math.max(2, (proxyW - candW) / 6);
      const stepY = Math.max(2, (proxyH - candH) / 6);

      for (let cx = 0; cx <= proxyW - candW; cx += stepX) {
        for (let cy = 0; cy <= proxyH - candH; cy += stepY) {
          const enclosedEnergy = queryIntegral(cx, cy, cx + candW, cy + candH);
          const energyRatio = totalEnergy > 0 ? enclosedEnergy / totalEnergy : 0.5;

          // Rule of thirds score
          const relCenterX = (cx + candW / 2) / proxyW;
          const relCenterY = (cy + candH / 2) / proxyH;
          const distThirdsX = Math.min(Math.abs(relCenterX - 0.333), Math.abs(relCenterX - 0.667));
          const distThirdsY = Math.min(Math.abs(relCenterY - 0.333), Math.abs(relCenterY - 0.667));
          const thirdsScore = 1 - (distThirdsX + distThirdsY);

          // Headroom bias: portrait subject top shouldn't touch crop ceiling abruptly
          const topMarginEnergy = queryIntegral(cx, cy, cx + candW, cy + candH * 0.12);
          const headroomBonus = topMarginEnergy < enclosedEnergy * 0.1 ? 0.15 : -0.1;

          // Candidate Final Score
          const score = energyRatio * 0.55 + thirdsScore * 0.30 + headroomBonus;

          if (score > bestScore) {
            bestScore = score;
            bestProxyRect = { left: cx, top: cy, width: candW, height: candH };
          }
        }
      }
    }

    // 5. Map best candidate from proxy space to source image & container bounds
    const normX = bestProxyRect.left / proxyW;
    const normY = bestProxyRect.top / proxyH;
    const normW = bestProxyRect.width / proxyW;
    const normH = bestProxyRect.height / proxyH;

    if (containerBounds) {
      return {
        left: Math.round(containerBounds.left + normX * containerBounds.width),
        top: Math.round(containerBounds.top + normY * containerBounds.height),
        width: Math.round(normW * containerBounds.width),
        height: Math.round(normH * containerBounds.height)
      };
    }

    return {
      left: Math.round(normX * srcW),
      top: Math.round(normY * srcH),
      width: Math.round(normW * srcW),
      height: Math.round(normH * srcH)
    };
  }

  private static fallbackCenterCrop(
    w: number,
    h: number,
    aspectRatio: number,
    containerBounds?: { left: number; top: number; width: number; height: number }
  ): CropRect {
    let cropW = w * 0.8;
    let cropH = cropW / aspectRatio;

    if (cropH > h * 0.8) {
      cropH = h * 0.8;
      cropW = cropH * aspectRatio;
    }

    const cX = (w - cropW) / 2;
    const cY = (h - cropH) / 2;

    if (containerBounds) {
      const scaleX = containerBounds.width / w;
      const scaleY = containerBounds.height / h;
      return {
        left: Math.round(containerBounds.left + cX * scaleX),
        top: Math.round(containerBounds.top + cY * scaleY),
        width: Math.round(cropW * scaleX),
        height: Math.round(cropH * scaleY)
      };
    }

    return {
      left: Math.round(cX),
      top: Math.round(cY),
      width: Math.round(cropW),
      height: Math.round(cropH)
    };
  }
}
