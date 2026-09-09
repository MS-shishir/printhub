/**
 * CropEngine.ts - Enterprise Mathematical Crop & Transform Engine for PrintHub Studio
 * 
 * Re-exports the modular Enterprise Crop Engine:
 * - 2D Affine Inversion & Master Coordinate Mapping
 * - Anchor Pinning & Aspect Ratio Constraint Solver
 * - Subpixel Rotated Image Crop Extractor & Straighten Tool
 * - 3x3 Projective Homography & Bilinear Perspective Warping
 * - Classical Saliency & Smart Composition Engine
 * - Physical DPI & Multi-Step Downsampling Engine
 */

export * from './crop';

import { CROP_PRESETS, CropPreset, CropRect } from './crop/CropTypes';
import { CropConstraintSolver } from './crop/CropConstraintSolver';
import { CropRotationEngine } from './crop/CropRotationEngine';
import { CropExportEngine } from './crop/CropExportEngine';
import { CropCoordinateMapper } from './crop/CropCoordinateMapper';

export class CropEngine {
  public static PRESETS = CROP_PRESETS;

  /**
   * Calculate fitted crop box coordinates inside container based on target preset
   */
  public static getCropRect(
    containerWidth: number,
    containerHeight: number,
    presetKey: string = 'passport_bd'
  ): { x: number; y: number; width: number; height: number } {
    const preset = this.PRESETS[presetKey] || this.PRESETS.passport_bd;
    const targetRatio = preset.aspectRatio;

    const res = CropConstraintSolver.getFittedCenterRect(
      { left: 0, top: 0, width: containerWidth, height: containerHeight },
      targetRatio,
      0.80
    );

    return { x: res.left, y: res.top, width: res.width, height: res.height };
  }

  /**
   * Simple flat rectangular canvas crop helper
   */
  public static cropCanvas(
    sourceCanvas: HTMLCanvasElement,
    cropBounds: { x: number; y: number; width: number; height: number }
  ): HTMLCanvasElement {
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = Math.max(1, cropBounds.width);
    outputCanvas.height = Math.max(1, cropBounds.height);

    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return sourceCanvas;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      sourceCanvas,
      cropBounds.x,
      cropBounds.y,
      cropBounds.width,
      cropBounds.height,
      0,
      0,
      cropBounds.width,
      cropBounds.height
    );

    return outputCanvas;
  }
}
