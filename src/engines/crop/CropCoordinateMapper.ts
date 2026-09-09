/**
 * CropCoordinateMapper.ts
 * Enterprise-Grade 2D Affine Coordinate Transformation & Inversion Engine.
 * 
 * Maps seamlessly between:
 * 1. Screen / UI Viewport Pixels (x_u, y_u)
 * 2. Fabric.js Canvas Scene Space (x_s, y_s)
 * 3. Rotated/Scaled Image Object Local Space (x_l, y_l)
 * 4. High-Resolution Master Original Image Pixels (x_m, y_m)
 */

import { Point2D, AffineMatrix2D, CropRect, DocumentQuad } from './CropTypes';

export interface ImageTransformState {
  centerX: number; // scene center x
  centerY: number; // scene center y
  width: number; // unscaled object width
  height: number; // unscaled object height
  scaleX: number;
  scaleY: number;
  angleDeg: number;
  flipX?: boolean;
  flipY?: boolean;
  naturalWidth: number; // master image raw pixel width
  naturalHeight: number; // master image raw pixel height
}

export interface ViewportTransformState {
  zoom: number;
  panX: number; // vpt[4]
  panY: number; // vpt[5]
}

export class CropCoordinateMapper {
  /**
   * Multiply two 2D Affine Transformation Matrices [a, b, c, d, tx, ty]
   */
  public static multiply(m1: AffineMatrix2D, m2: AffineMatrix2D): AffineMatrix2D {
    const [a1, b1, c1, d1, tx1, ty1] = m1;
    const [a2, b2, c2, d2, tx2, ty2] = m2;

    return [
      a1 * a2 + c1 * b2,
      b1 * a2 + d1 * b2,
      a1 * c2 + c1 * d2,
      b1 * c2 + d1 * d2,
      a1 * tx2 + c1 * ty2 + tx1,
      b1 * tx2 + d1 * ty2 + ty1
    ];
  }

  /**
   * Invert a 2D Affine Transformation Matrix
   */
  public static invert(m: AffineMatrix2D): AffineMatrix2D {
    const [a, b, c, d, tx, ty] = m;
    const det = a * d - b * c;

    if (Math.abs(det) < 1e-12) {
      // Degenerate matrix fallback to identity
      return [1, 0, 0, 1, 0, 0];
    }

    const invDet = 1.0 / det;

    return [
      d * invDet,
      -b * invDet,
      -c * invDet,
      a * invDet,
      (c * ty - d * tx) * invDet,
      (b * tx - a * ty) * invDet
    ];
  }

  /**
   * Transform a 2D point using an Affine Matrix
   */
  public static transformPoint(m: AffineMatrix2D, pt: Point2D): Point2D {
    return {
      x: m[0] * pt.x + m[2] * pt.y + m[4],
      y: m[1] * pt.x + m[3] * pt.y + m[5]
    };
  }

  /**
   * Build the complete Forward Transformation Matrix:
   * Master Image Pixel Space (0..natW, 0..natH) -> Screen Display Viewport Space
   */
  public static getMasterToViewportMatrix(
    img: ImageTransformState,
    vpt: ViewportTransformState
  ): AffineMatrix2D {
    const rad = (img.angleDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const flipSignX = img.flipX ? -1 : 1;
    const flipSignY = img.flipY ? -1 : 1;

    // 1. Shift master pixel origin (0..natW, 0..natH) to centered normalized object coords (-0.5..0.5)
    const sx = (img.width * img.scaleX * flipSignX) / (img.naturalWidth || 1);
    const sy = (img.height * img.scaleY * flipSignY) / (img.naturalHeight || 1);

    // Matrix transforming (x_master, y_master) -> Scene Point (x_scene, y_scene)
    // x_rel = x_master - natW / 2, y_rel = y_master - natH / 2
    // x_scene = cx + cos * (x_rel * sx) - sin * (y_rel * sy)
    // y_scene = cy + sin * (x_rel * sx) + cos * (y_rel * sy)
    const masterToScene: AffineMatrix2D = [
      cos * sx,
      sin * sx,
      -sin * sy,
      cos * sy,
      img.centerX - (cos * sx * img.naturalWidth * 0.5 - sin * sy * img.naturalHeight * 0.5),
      img.centerY - (sin * sx * img.naturalWidth * 0.5 + cos * sy * img.naturalHeight * 0.5)
    ];

    // 2. Viewport Transform (x_scene, y_scene) -> (x_viewport, y_viewport)
    const sceneToViewport: AffineMatrix2D = [
      vpt.zoom,
      0,
      0,
      vpt.zoom,
      vpt.panX,
      vpt.panY
    ];

    return this.multiply(sceneToViewport, masterToScene);
  }

  /**
   * Build the Backward Matrix:
   * Screen Viewport Space -> Master Image High-Res Pixel Space (0..natW, 0..natH)
   */
  public static getViewportToMasterMatrix(
    img: ImageTransformState,
    vpt: ViewportTransformState
  ): AffineMatrix2D {
    const forward = this.getMasterToViewportMatrix(img, vpt);
    return this.invert(forward);
  }

  /**
   * Convert Screen Viewport Point -> Master High-Res Pixel Point (Sub-pixel float accuracy)
   */
  public static screenToMaster(
    screenPt: Point2D,
    img: ImageTransformState,
    vpt: ViewportTransformState
  ): Point2D {
    const invMatrix = this.getViewportToMasterMatrix(img, vpt);
    return this.transformPoint(invMatrix, screenPt);
  }

  /**
   * Convert Master Image Pixel Point -> Screen Viewport Point
   */
  public static masterToScreen(
    masterPt: Point2D,
    img: ImageTransformState,
    vpt: ViewportTransformState
  ): Point2D {
    const fwdMatrix = this.getMasterToViewportMatrix(img, vpt);
    return this.transformPoint(fwdMatrix, masterPt);
  }

  /**
   * Get 4 corners of the image rendered on Screen Viewport (considering rotation angle)
   */
  public static getImageScreenQuad(
    img: ImageTransformState,
    vpt: ViewportTransformState
  ): DocumentQuad {
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;

    const tl = this.masterToScreen({ x: 0, y: 0 }, img, vpt);
    const tr = this.masterToScreen({ x: natW, y: 0 }, img, vpt);
    const br = this.masterToScreen({ x: natW, y: natH }, img, vpt);
    const bl = this.masterToScreen({ x: 0, y: natH }, img, vpt);

    return { tl, tr, br, bl };
  }

  /**
   * Get Axis-Aligned Bounding Box (AABB) of the rendered image in Screen Viewport Space
   */
  public static getImageScreenBoundingBox(
    img: ImageTransformState,
    vpt: ViewportTransformState
  ): CropRect {
    const quad = this.getImageScreenQuad(img, vpt);
    const minX = Math.min(quad.tl.x, quad.tr.x, quad.br.x, quad.bl.x);
    const maxX = Math.max(quad.tl.x, quad.tr.x, quad.br.x, quad.bl.x);
    const minY = Math.min(quad.tl.y, quad.tr.y, quad.br.y, quad.bl.y);
    const maxY = Math.max(quad.tl.y, quad.tr.y, quad.br.y, quad.bl.y);

    return {
      left: minX,
      top: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Check if a 2D point is inside a convex 4-point quadrilateral (Shoelace / Cross-Product test)
   */
  public static isPointInQuad(pt: Point2D, quad: DocumentQuad): boolean {
    const pts = [quad.tl, quad.tr, quad.br, quad.bl];
    let sign = 0;

    for (let i = 0; i < 4; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % 4];
      const cross = (p2.x - p1.x) * (pt.y - p1.y) - (p2.y - p1.y) * (pt.x - p1.x);

      if (cross !== 0) {
        if (sign === 0) {
          sign = cross > 0 ? 1 : -1;
        } else if ((cross > 0 ? 1 : -1) !== sign) {
          return false;
        }
      }
    }
    return true;
  }
}
