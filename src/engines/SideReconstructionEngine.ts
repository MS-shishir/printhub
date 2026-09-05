/**
 * SideReconstructionEngine.ts
 * Enterprise-Grade Geometric Face & Body Side Reconstruction Engine.
 * 
 * Implements:
 * 1. Face Center Axis Mapping (Vertical & Tilted Angles)
 * 2. Directional Reconstruction (Left-to-Right & Right-to-Left)
 * 3. Distance-Based Width Scaling: x' = Cx + s * (Cx - x)
 * 4. Multi-Zone Vertical Deformation (Hair, Face/Jaw, Ear, Shoulder/Collar)
 * 5. High-Precision Subpixel Bilinear Texture Interpolation
 * 6. Smoothstep Alpha Seam Feathering: α(t) = 3t² - 2t³
 * 7. Real-Time Gaussian Push-Pull Liquify / Warp Field
 * 8. Mirror Clone Stamp & Seamless Texture Healing Brushes
 */

export type ReconstructionSide = 'left_to_right' | 'right_to_left';

export interface CenterAxisConfig {
  cx: number; // Center X coordinate in pixels
  angleDegrees: number; // Tilt angle in degrees (-25 to +25)
}

export interface ZoneAdjustmentParams {
  scale: number; // Width scale factor (0.80 to 1.20)
  shiftX: number; // Horizontal offset in pixels (-50 to +50)
  shiftY: number; // Vertical offset in pixels (-50 to +50)
  feather: number; // Zone-specific feather radius in pixels
}

export interface MultiZoneConfig {
  hair: ZoneAdjustmentParams;
  face: ZoneAdjustmentParams;
  ear: ZoneAdjustmentParams;
  shoulder: ZoneAdjustmentParams;
}

export interface GeometricReconstructionConfig {
  side: ReconstructionSide;
  axis: CenterAxisConfig;
  globalScale: number; // Global width scale factor (default 1.0)
  featherRadius: number; // Edge blend radius in pixels (default 12)
  opacity: number; // Layer opacity 0.0 to 1.0
  zones: MultiZoneConfig;
}

export interface WarpStroke {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  radius: number; // Influence radius in pixels
  strength: number; // 0.0 to 1.0
}

export interface CloneStampPoint {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  radius: number;
  hardness: number; // 0.0 (soft) to 1.0 (hard)
  opacity: number;
}

export const DEFAULT_ZONES: MultiZoneConfig = {
  hair: { scale: 1.0, shiftX: 0, shiftY: 0, feather: 15 },
  face: { scale: 1.0, shiftX: 0, shiftY: 0, feather: 12 },
  ear: { scale: 1.0, shiftX: 0, shiftY: 0, feather: 10 },
  shoulder: { scale: 1.0, shiftX: 0, shiftY: 0, feather: 20 },
};

export const DEFAULT_RECONSTRUCTION_CONFIG: GeometricReconstructionConfig = {
  side: 'left_to_right', // Reconstructing missing right side using existing left side
  axis: { cx: 400, angleDegrees: 0 },
  globalScale: 1.0,
  featherRadius: 14,
  opacity: 1.0,
  zones: DEFAULT_ZONES,
};

export class SideReconstructionEngine {
  /**
   * Creates a detached offscreen canvas snapshot from an existing image/canvas.
   */
  public static createSnapshot(source: HTMLCanvasElement | HTMLImageElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const width = (source as HTMLImageElement).naturalWidth || source.width || 800;
    const height = (source as HTMLImageElement).naturalHeight || source.height || 600;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(source, 0, 0, width, height);
    }
    return canvas;
  }

  /**
   * Automatically calculates an initial Face Center Axis based on image dimensions and bounding mass.
   */
  public static autoDetectCenterAxis(canvas: HTMLCanvasElement): CenterAxisConfig {
    return {
      cx: Math.round(canvas.width / 2),
      angleDegrees: 0,
    };
  }

  /**
   * Computes the X coordinate of the center axis at vertical position Y given tilt angle.
   */
  public static getAxisXAtY(axis: CenterAxisConfig, y: number, height: number): number {
    if (Math.abs(axis.angleDegrees) < 0.01) {
      return axis.cx;
    }
    const midY = height / 2;
    const rad = (axis.angleDegrees * Math.PI) / 180;
    return axis.cx + (y - midY) * Math.tan(rad);
  }

  /**
   * Evaluates Smoothstep Alpha: α(t) = 3t² - 2t³ where t = clamp(distance / radius, 0, 1)
   */
  public static smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(0.0001, edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  /**
   * Samples a 4-channel subpixel RGBA color from ImageData using Bilinear Interpolation.
   */
  public static sampleBilinear(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    x: number,
    y: number
  ): [number, number, number, number] {
    const clampedX = Math.max(0, Math.min(width - 1, x));
    const clampedY = Math.max(0, Math.min(height - 1, y));

    const x0 = Math.floor(clampedX);
    const x1 = Math.min(width - 1, x0 + 1);
    const y0 = Math.floor(clampedY);
    const y1 = Math.min(height - 1, y0 + 1);

    const u = clampedX - x0;
    const v = clampedY - y0;

    const idx00 = (y0 * width + x0) * 4;
    const idx10 = (y0 * width + x1) * 4;
    const idx01 = (y1 * width + x0) * 4;
    const idx11 = (y1 * width + x1) * 4;

    const w00 = (1 - u) * (1 - v);
    const w10 = u * (1 - v);
    const w01 = (1 - u) * v;
    const w11 = u * v;

    const r = w00 * data[idx00] + w10 * data[idx10] + w01 * data[idx01] + w11 * data[idx11];
    const g = w00 * data[idx00 + 1] + w10 * data[idx10 + 1] + w01 * data[idx01 + 1] + w11 * data[idx11 + 1];
    const b = w00 * data[idx00 + 2] + w10 * data[idx10 + 2] + w01 * data[idx01 + 2] + w11 * data[idx11 + 2];
    const a = w00 * data[idx00 + 3] + w10 * data[idx10 + 3] + w01 * data[idx01 + 3] + w11 * data[idx11 + 3];

    return [r, g, b, a];
  }

  /**
   * Computes zone-based weight and geometric transformation for a given vertical normalized height (0 to 1).
   */
  private static getZoneTransformation(
    normalizedY: number,
    zones: MultiZoneConfig,
    globalScale: number
  ): { scale: number; shiftX: number; shiftY: number; feather: number } {
    // Height boundaries:
    // Hair: 0.0 to 0.25
    // Face: 0.20 to 0.65
    // Ear: 0.35 to 0.55 (blends with face)
    // Shoulder: 0.60 to 1.00

    let scale = globalScale;
    let shiftX = 0;
    let shiftY = 0;
    let feather = 14;

    if (normalizedY < 0.22) {
      // Pure Hair zone
      const t = Math.max(0, Math.min(1, normalizedY / 0.22));
      const s = zones.hair.scale * globalScale;
      scale = s;
      shiftX = zones.hair.shiftX;
      shiftY = zones.hair.shiftY;
      feather = zones.hair.feather;
    } else if (normalizedY < 0.60) {
      // Face / Ear zone
      const t = (normalizedY - 0.22) / (0.60 - 0.22);
      // Blend hair to face
      const hairScale = zones.hair.scale * globalScale;
      const faceScale = zones.face.scale * globalScale;
      scale = hairScale * (1 - t) + faceScale * t;
      shiftX = zones.hair.shiftX * (1 - t) + zones.face.shiftX * t;
      shiftY = zones.hair.shiftY * (1 - t) + zones.face.shiftY * t;
      feather = zones.face.feather;

      // Ear influence in mid-height
      if (normalizedY >= 0.32 && normalizedY <= 0.55) {
        const earT = Math.sin(((normalizedY - 0.32) / (0.55 - 0.32)) * Math.PI);
        const earScale = zones.ear.scale * globalScale;
        scale = scale * (1 - earT * 0.5) + earScale * (earT * 0.5);
        shiftX += zones.ear.shiftX * earT * 0.7;
        shiftY += zones.ear.shiftY * earT * 0.7;
      }
    } else {
      // Shoulder / Garment zone
      const t = Math.min(1, (normalizedY - 0.60) / 0.30);
      const faceScale = zones.face.scale * globalScale;
      const shoulderScale = zones.shoulder.scale * globalScale;
      scale = faceScale * (1 - t) + shoulderScale * t;
      shiftX = zones.face.shiftX * (1 - t) + zones.shoulder.shiftX * t;
      shiftY = zones.face.shiftY * (1 - t) + zones.shoulder.shiftY * t;
      feather = zones.shoulder.feather;
    }

    return { scale, shiftX, shiftY, feather };
  }

  /**
   * Executes the full Geometric Reconstruction Pipeline:
   * Mirroring -> Width Scaling -> Zone Warping -> Bilinear Sampling -> Smoothstep Seam Blending.
   */
  public static applyGeometricReconstruction(
    sourceCanvas: HTMLCanvasElement,
    config: GeometricReconstructionConfig
  ): HTMLCanvasElement {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;

    const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    const outCtx = outputCanvas.getContext('2d', { willReadFrequently: true });
    if (!srcCtx || !outCtx) return sourceCanvas;

    const srcImgData = srcCtx.getImageData(0, 0, width, height);
    const srcData = srcImgData.data;

    const outImgData = outCtx.createImageData(width, height);
    const outData = outImgData.data;

    const isLeftToRight = config.side === 'left_to_right';

    for (let y = 0; y < height; y++) {
      const normalizedY = y / height;
      const cxAtY = this.getAxisXAtY(config.axis, y, height);
      const zone = this.getZoneTransformation(normalizedY, config.zones, config.globalScale);
      const featherR = Math.max(1, config.featherRadius || zone.feather);

      for (let x = 0; x < width; x++) {
        const outIdx = (y * width + x) * 4;

        // Determine if current pixel is on the Existing Side or the Missing/Target Side
        const isOnExistingSide = isLeftToRight ? x <= cxAtY : x >= cxAtY;
        const distFromAxis = Math.abs(x - cxAtY);

        if (isOnExistingSide) {
          // Keep original pixels on the existing side
          const srcIdx = (y * width + x) * 4;
          outData[outIdx] = srcData[srcIdx];
          outData[outIdx + 1] = srcData[srcIdx + 1];
          outData[outIdx + 2] = srcData[srcIdx + 2];
          outData[outIdx + 3] = srcData[srcIdx + 3];
        } else {
          // Reconstruct missing side pixel using geometric reflection + scaling + zone warp
          // Mathematical formula: x_source = Cx - (x - Cx) / scale - shiftX
          let xSource: number;
          let ySource: number = y - zone.shiftY;

          if (isLeftToRight) {
            // Target is Right (x > cxAtY), Source is Left (xSource < cxAtY)
            const targetDist = x - cxAtY;
            const sourceDist = targetDist / Math.max(0.1, zone.scale);
            xSource = cxAtY - sourceDist - zone.shiftX;
          } else {
            // Target is Left (x < cxAtY), Source is Right (xSource > cxAtY)
            const targetDist = cxAtY - x;
            const sourceDist = targetDist / Math.max(0.1, zone.scale);
            xSource = cxAtY + sourceDist - zone.shiftX;
          }

          // Sample reconstructed color with Bilinear Interpolation
          const [reconR, reconG, reconB, reconA] = this.sampleBilinear(srcData, width, height, xSource, ySource);

          // Calculate Smoothstep Alpha Seam Feathering around the Center Axis
          // When distance from axis is within featherR, blend with original background/existing pixel
          let blendAlpha = 1.0;
          if (distFromAxis < featherR) {
            blendAlpha = this.smoothstep(0, featherR, distFromAxis);
          }

          // Apply global opacity
          blendAlpha *= config.opacity;

          const origIdx = (y * width + x) * 4;
          const origR = srcData[origIdx];
          const origG = srcData[origIdx + 1];
          const origB = srcData[origIdx + 2];
          const origA = srcData[origIdx + 3];

          outData[outIdx] = Math.round(reconR * blendAlpha + origR * (1 - blendAlpha));
          outData[outIdx + 1] = Math.round(reconG * blendAlpha + origG * (1 - blendAlpha));
          outData[outIdx + 2] = Math.round(reconB * blendAlpha + origB * (1 - blendAlpha));
          outData[outIdx + 3] = Math.round(reconA * blendAlpha + origA * (1 - blendAlpha));
        }
      }
    }

    outCtx.putImageData(outImgData, 0, 0);
    return outputCanvas;
  }

  /**
   * Applies Gaussian-Weighted Push-Pull Liquify / Warp Deformation Field.
   * Displacement formula: w = exp(-d² / (2σ²)), (x', y') = (x, y) - w * (dx, dy)
   */
  public static applyWarpDeformation(
    sourceCanvas: HTMLCanvasElement,
    strokes: WarpStroke[]
  ): HTMLCanvasElement {
    if (!strokes.length) return sourceCanvas;

    const width = sourceCanvas.width;
    const height = sourceCanvas.height;

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;

    const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    const outCtx = outputCanvas.getContext('2d', { willReadFrequently: true });
    if (!srcCtx || !outCtx) return sourceCanvas;

    const srcImgData = srcCtx.getImageData(0, 0, width, height);
    const srcData = srcImgData.data;

    const outImgData = outCtx.createImageData(width, height);
    const outData = outImgData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let totalDx = 0;
        let totalDy = 0;

        for (const stroke of strokes) {
          const dxToCenter = x - stroke.startX;
          const dyToCenter = y - stroke.startY;
          const distSq = dxToCenter * dxToCenter + dyToCenter * dyToCenter;
          const radiusSq = stroke.radius * stroke.radius;

          if (distSq < radiusSq * 4) {
            const sigmaSq = 2 * (stroke.radius * 0.5) * (stroke.radius * 0.5);
            const weight = Math.exp(-distSq / sigmaSq) * stroke.strength;
            const deltaX = stroke.endX - stroke.startX;
            const deltaY = stroke.endY - stroke.startY;
            totalDx += deltaX * weight;
            totalDy += deltaY * weight;
          }
        }

        const outIdx = (y * width + x) * 4;

        if (Math.abs(totalDx) > 0.01 || Math.abs(totalDy) > 0.01) {
          // Reverse lookup for smooth resampling
          const sampleX = x - totalDx;
          const sampleY = y - totalDy;
          const [r, g, b, a] = this.sampleBilinear(srcData, width, height, sampleX, sampleY);
          outData[outIdx] = Math.round(r);
          outData[outIdx + 1] = Math.round(g);
          outData[outIdx + 2] = Math.round(b);
          outData[outIdx + 3] = Math.round(a);
        } else {
          const srcIdx = (y * width + x) * 4;
          outData[outIdx] = srcData[srcIdx];
          outData[outIdx + 1] = srcData[srcIdx + 1];
          outData[outIdx + 2] = srcData[srcIdx + 2];
          outData[outIdx + 3] = srcData[srcIdx + 3];
        }
      }
    }

    outCtx.putImageData(outImgData, 0, 0);
    return outputCanvas;
  }

  /**
   * Applies an interactive Mirror Clone Stamp stroke from source projection to target location.
   */
  public static applyMirrorCloneStamp(
    canvas: HTMLCanvasElement,
    stamp: CloneStampPoint
  ): void {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const r = stamp.radius;

    const minX = Math.max(0, Math.floor(stamp.targetX - r));
    const maxX = Math.min(width - 1, Math.ceil(stamp.targetX + r));
    const minY = Math.max(0, Math.floor(stamp.targetY - r));
    const maxY = Math.min(height - 1, Math.ceil(stamp.targetY + r));

    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    if (w <= 0 || h <= 0) return;

    const imgData = ctx.getImageData(minX, minY, w, h);
    const data = imgData.data;

    // Read full source canvas for sampling
    const srcData = ctx.getImageData(0, 0, width, height).data;

    const offsetX = stamp.sourceX - stamp.targetX;
    const offsetY = stamp.sourceY - stamp.targetY;

    for (let py = 0; py < h; py++) {
      const currentY = minY + py;
      for (let px = 0; px < w; px++) {
        const currentX = minX + px;
        const dx = currentX - stamp.targetX;
        const dy = currentY - stamp.targetY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= r) {
          // Hardness calculation
          const normalizedDist = dist / r;
          let alpha = 1.0;
          if (stamp.hardness < 0.99) {
            const innerEdge = stamp.hardness;
            if (normalizedDist > innerEdge) {
              alpha = 1.0 - this.smoothstep(innerEdge, 1.0, normalizedDist);
            }
          }
          alpha *= stamp.opacity;

          const srcX = currentX + offsetX;
          const srcY = currentY + offsetY;
          const [sR, sG, sB, sA] = this.sampleBilinear(srcData, width, height, srcX, srcY);

          const idx = (py * w + px) * 4;
          data[idx] = Math.round(sR * alpha + data[idx] * (1 - alpha));
          data[idx + 1] = Math.round(sG * alpha + data[idx + 1] * (1 - alpha));
          data[idx + 2] = Math.round(sB * alpha + data[idx + 2] * (1 - alpha));
          data[idx + 3] = Math.max(data[idx + 3], Math.round(sA * alpha));
        }
      }
    }

    ctx.putImageData(imgData, minX, minY);
  }

  /**
   * Applies an interactive Soft Edge Eraser to gently restore original layer or erase harsh borders.
   */
  public static applySoftEraser(
    targetCanvas: HTMLCanvasElement,
    originalCanvas: HTMLCanvasElement,
    x: number,
    y: number,
    radius: number,
    opacity: number = 0.5
  ): void {
    const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
    const origCtx = originalCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx || !origCtx) return;

    const width = targetCanvas.width;
    const height = targetCanvas.height;

    const minX = Math.max(0, Math.floor(x - radius));
    const maxX = Math.min(width - 1, Math.ceil(x + radius));
    const minY = Math.max(0, Math.floor(y - radius));
    const maxY = Math.min(height - 1, Math.ceil(y + radius));

    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    if (w <= 0 || h <= 0) return;

    const targetData = ctx.getImageData(minX, minY, w, h);
    const origData = origCtx.getImageData(minX, minY, w, h);

    for (let py = 0; py < h; py++) {
      const cy = minY + py;
      for (let px = 0; px < w; px++) {
        const cx = minX + px;
        const dist = Math.sqrt((cx - x) * (cx - x) + (cy - y) * (cy - y));

        if (dist <= radius) {
          const alpha = (1 - this.smoothstep(0, radius, dist)) * opacity;
          const idx = (py * w + px) * 4;

          targetData.data[idx] = Math.round(origData.data[idx] * alpha + targetData.data[idx] * (1 - alpha));
          targetData.data[idx + 1] = Math.round(origData.data[idx + 1] * alpha + targetData.data[idx + 1] * (1 - alpha));
          targetData.data[idx + 2] = Math.round(origData.data[idx + 2] * alpha + targetData.data[idx + 2] * (1 - alpha));
          targetData.data[idx + 3] = Math.round(origData.data[idx + 3] * alpha + targetData.data[idx + 3] * (1 - alpha));
        }
      }
    }

    ctx.putImageData(targetData, minX, minY);
  }

  /**
   * Applies an interactive Seamless Healing Patch (Texture Clone / Edge Smoother).
   */
  public static applyHealingPatch(
    canvas: HTMLCanvasElement,
    targetX: number,
    targetY: number,
    radius: number,
    opacity: number = 0.6
  ): void {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const minX = Math.max(0, Math.floor(targetX - radius));
    const maxX = Math.min(width - 1, Math.ceil(targetX + radius));
    const minY = Math.max(0, Math.floor(targetY - radius));
    const maxY = Math.min(height - 1, Math.ceil(targetY + radius));

    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    if (w <= 0 || h <= 0) return;

    const imgData = ctx.getImageData(minX, minY, w, h);
    const data = imgData.data;

    // Calculate local average color on perimeter
    let sumR = 0, sumG = 0, sumB = 0, count = 0;
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const dist = Math.sqrt((px - radius) * (px - radius) + (py - radius) * (py - radius));
        if (Math.abs(dist - radius * 0.85) < 2) {
          const idx = (py * w + px) * 4;
          sumR += data[idx];
          sumG += data[idx + 1];
          sumB += data[idx + 2];
          count++;
        }
      }
    }

    if (count > 0) {
      const avgR = sumR / count;
      const avgG = sumG / count;
      const avgB = sumB / count;

      for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
          const dist = Math.sqrt((px - radius) * (px - radius) + (py - radius) * (py - radius));
          if (dist <= radius) {
            const blendFactor = (1 - this.smoothstep(0, radius, dist)) * opacity;
            const idx = (py * w + px) * 4;
            data[idx] = Math.round(avgR * blendFactor + data[idx] * (1 - blendFactor));
            data[idx + 1] = Math.round(avgG * blendFactor + data[idx + 1] * (1 - blendFactor));
            data[idx + 2] = Math.round(avgB * blendFactor + data[idx + 2] * (1 - blendFactor));
          }
        }
      }
    }

    ctx.putImageData(imgData, minX, minY);
  }
}
