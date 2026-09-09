/**
 * CropRotationEngine.ts
 * Enterprise Rotation, Straightening, and Subpixel Rotated Canvas Extraction.
 * 
 * Solves the core bug where cropping a rotated or slanted image previously
 * resulted in an un-rotated or displaced output.
 */

import { Point2D, CropRect } from './CropTypes';
import { CropCoordinateMapper, ImageTransformState, ViewportTransformState } from './CropCoordinateMapper';

export class CropRotationEngine {
  /**
   * Calculate exact angle to straighten an image based on a user-drawn baseline between P1 and P2
   */
  public static calculateStraightenAngle(
    p1: Point2D,
    p2: Point2D,
    orientation: 'horizontal' | 'vertical' = 'horizontal'
  ): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) {
      return 0;
    }

    const angleRad = Math.atan2(dy, dx);
    const angleDeg = (angleRad * 180) / Math.PI;

    if (orientation === 'horizontal') {
      // Rotate image opposite to measured baseline tilt so line becomes 0° level
      let straightenDeg = -angleDeg;
      // Keep in range [-180, 180]
      while (straightenDeg > 180) straightenDeg -= 360;
      while (straightenDeg < -180) straightenDeg += 360;
      return straightenDeg;
    } else {
      // Rotate so line becomes 90° vertical
      let straightenDeg = 90 - angleDeg;
      while (straightenDeg > 180) straightenDeg -= 360;
      while (straightenDeg < -180) straightenDeg += 360;
      return straightenDeg;
    }
  }

  /**
   * Calculate the outer Axis-Aligned Bounding Box (AABB) for an image of dimensions (w, h) rotated by angleDeg
   */
  public static getRotatedBoundingBox(
    w: number,
    h: number,
    angleDeg: number
  ): { width: number; height: number } {
    const rad = Math.abs((angleDeg * Math.PI) / 180);
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));

    return {
      width: Math.round(w * cos + h * sin),
      height: Math.round(w * sin + h * cos)
    };
  }

  /**
   * Extract a high-precision, sub-pixel accurate cropped canvas from an image
   * that may be rotated, flipped, scaled, or viewed under viewport zoom/pan.
   * 
   * This guarantees that whatever is framed inside the crop box on screen is extracted
   * with 100% geometric fidelity.
   */
  public static extractSubpixelCrop(
    masterCanvas: HTMLCanvasElement | HTMLImageElement,
    screenCropRect: CropRect,
    imgState: ImageTransformState,
    vptState: ViewportTransformState,
    targetWidth?: number,
    targetHeight?: number
  ): HTMLCanvasElement {
    const natW = imgState.naturalWidth || (masterCanvas as any).width || (masterCanvas as any).naturalWidth || 800;
    const natH = imgState.naturalHeight || (masterCanvas as any).height || (masterCanvas as any).naturalHeight || 600;

    // 1. Calculate the 4 corner points of the screen crop rectangle
    const screenTL: Point2D = { x: screenCropRect.left, y: screenCropRect.top };
    const screenTR: Point2D = { x: screenCropRect.left + screenCropRect.width, y: screenCropRect.top };
    const screenBR: Point2D = { x: screenCropRect.left + screenCropRect.width, y: screenCropRect.top + screenCropRect.height };
    const screenBL: Point2D = { x: screenCropRect.left, y: screenCropRect.top + screenCropRect.height };

    // 2. Map all 4 screen corners to Master High-Resolution Pixel Space using the 2D Affine Inversion Matrix
    const masterTL = CropCoordinateMapper.screenToMaster(screenTL, imgState, vptState);
    const masterTR = CropCoordinateMapper.screenToMaster(screenTR, imgState, vptState);
    const masterBR = CropCoordinateMapper.screenToMaster(screenBR, imgState, vptState);
    const masterBL = CropCoordinateMapper.screenToMaster(screenBL, imgState, vptState);

    // 3. Measure physical pixel lengths along top edge and left edge in master pixel space
    const masterTopW = Math.hypot(masterTR.x - masterTL.x, masterTR.y - masterTL.y);
    const masterBotW = Math.hypot(masterBR.x - masterBL.x, masterBR.y - masterBL.y);
    const masterLeftH = Math.hypot(masterBL.x - masterTL.x, masterBL.y - masterTL.y);
    const masterRightH = Math.hypot(masterBR.x - masterTR.x, masterBR.y - masterTR.y);

    const calcMasterW = Math.max(10, Math.round((masterTopW + masterBotW) / 2));
    const calcMasterH = Math.max(10, Math.round((masterLeftH + masterRightH) / 2));

    const finalOutW = targetWidth && targetWidth > 0 ? targetWidth : calcMasterW;
    const finalOutH = targetHeight && targetHeight > 0 ? targetHeight : calcMasterH;

    // 4. Create destination canvas
    const outCanvas = document.createElement('canvas');
    outCanvas.width = finalOutW;
    outCanvas.height = finalOutH;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return outCanvas;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 5. Center of crop in screen space
    const screenCenterX = screenCropRect.left + screenCropRect.width / 2;
    const screenCenterY = screenCropRect.top + screenCropRect.height / 2;
    const masterCenter = CropCoordinateMapper.screenToMaster(
      { x: screenCenterX, y: screenCenterY },
      imgState,
      vptState
    );

    // 6. Total angle of the image relative to the screen
    const angleRad = (imgState.angleDeg * Math.PI) / 180;
    const scaleFactorX = finalOutW / (calcMasterW || 1);
    const scaleFactorY = finalOutH / (calcMasterH || 1);

    // 7. Perform High-Precision Canvas Affine Transformation:
    // Move origin to output canvas center -> Rotate opposite to image tilt -> Scale to target -> Draw centered master
    ctx.save();
    ctx.translate(finalOutW / 2, finalOutH / 2);
    ctx.scale(scaleFactorX, scaleFactorY);
    ctx.rotate(angleRad);

    if (imgState.flipX) ctx.scale(-1, 1);
    if (imgState.flipY) ctx.scale(1, -1);

    ctx.drawImage(masterCanvas, -masterCenter.x, -masterCenter.y);
    ctx.restore();

    return outCanvas;
  }
}
