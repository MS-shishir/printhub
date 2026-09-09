/**
 * CropConstraintSolver.ts
 * Deterministic Constraint Solver for Aspect Ratios, Anchor Corners,
 * Boundary Clamping, Center Resizing (Alt Key), and Magnetic Snapping.
 */

import { CropRect, Point2D, HandleType } from './CropTypes';

export interface ConstraintOptions {
  aspectRatio: number | null; // width / height or null for free
  isCenterAnchor?: boolean; // Alt key held
  bounds?: { left: number; top: number; width: number; height: number };
  minSize?: number; // default 15px
  snapThreshold?: number; // default 6px
  snapGuides?: { x: number[]; y: number[] };
}

export class CropConstraintSolver {
  /**
   * Solve new CropRect based on handle drag delta, anchor point, and aspect ratio constraint.
   */
  public static solveHandleDrag(
    startRect: CropRect,
    handle: HandleType,
    dx: number,
    dy: number,
    options: ConstraintOptions
  ): { rect: CropRect; snappedX: boolean; snappedY: boolean } {
    const {
      aspectRatio,
      isCenterAnchor = false,
      bounds,
      minSize = 15,
      snapThreshold = 6,
      snapGuides
    } = options;

    let { left, top, width, height } = startRect;
    let snappedX = false;
    let snappedY = false;

    // Center Move Tool ('all' or 'center')
    if (handle === 'all' || handle === 'center') {
      left += dx;
      top += dy;

      // Magnetic Snapping for Center Move
      if (snapGuides && snapThreshold > 0) {
        const cx = left + width / 2;
        const cy = top + height / 2;

        for (const gx of snapGuides.x) {
          if (Math.abs(cx - gx) <= snapThreshold) {
            left = gx - width / 2;
            snappedX = true;
            break;
          }
        }
        for (const gy of snapGuides.y) {
          if (Math.abs(cy - gy) <= snapThreshold) {
            top = gy - height / 2;
            snappedY = true;
            break;
          }
        }
      }

      // Boundary Clamping (Safe clamping without freezing if box extends beyond bounds)
      if (bounds) {
        if (width <= bounds.width) {
          left = Math.max(bounds.left, Math.min(bounds.left + bounds.width - width, left));
        }
        if (height <= bounds.height) {
          top = Math.max(bounds.top, Math.min(bounds.top + bounds.height - height, top));
        }
      }

      return {
        rect: { left: Math.round(left), top: Math.round(top), width: Math.round(width), height: Math.round(height) },
        snappedX,
        snappedY
      };
    }

    // Center-based Resize Mode (Alt Key held)
    if (isCenterAnchor) {
      const startCenterX = startRect.left + startRect.width / 2;
      const startCenterY = startRect.top + startRect.height / 2;

      let newW = startRect.width;
      let newH = startRect.height;

      if (handle === 'tl' || handle === 'br') {
        newW = Math.max(minSize, startRect.width + (handle === 'br' ? 2 * dx : -2 * dx));
        newH = aspectRatio ? newW / aspectRatio : Math.max(minSize, startRect.height + (handle === 'br' ? 2 * dy : -2 * dy));
      } else if (handle === 'tr' || handle === 'bl') {
        newW = Math.max(minSize, startRect.width + (handle === 'tr' ? 2 * dx : -2 * dx));
        newH = aspectRatio ? newW / aspectRatio : Math.max(minSize, startRect.height + (handle === 'bl' ? 2 * dy : -2 * dy));
      } else if (handle === 'top' || handle === 'bottom') {
        newH = Math.max(minSize, startRect.height + (handle === 'bottom' ? 2 * dy : -2 * dy));
        newW = aspectRatio ? newH * aspectRatio : startRect.width;
      } else if (handle === 'left' || handle === 'right') {
        newW = Math.max(minSize, startRect.width + (handle === 'right' ? 2 * dx : -2 * dx));
        newH = aspectRatio ? newW / aspectRatio : startRect.height;
      }

      left = startCenterX - newW / 2;
      top = startCenterY - newH / 2;
      width = newW;
      height = newH;

      return {
        rect: { left: Math.round(left), top: Math.round(top), width: Math.round(width), height: Math.round(height) },
        snappedX: false,
        snappedY: false
      };
    }

    // Standard 8-Handle Dragging
    switch (handle) {
      case 'br': {
        // Anchor Top-Left (Fixed)
        let newW = Math.max(minSize, startRect.width + dx);
        let newH = Math.max(minSize, startRect.height + dy);

        if (aspectRatio) {
          // Determine dominant delta axis
          if (Math.abs(dx) >= Math.abs(dy) * aspectRatio) {
            newH = newW / aspectRatio;
          } else {
            newW = newH * aspectRatio;
          }
        }
        width = newW;
        height = newH;
        break;
      }

      case 'tl': {
        // Anchor Bottom-Right (Fixed)
        let newW = Math.max(minSize, startRect.width - dx);
        let newH = Math.max(minSize, startRect.height - dy);

        if (aspectRatio) {
          if (Math.abs(dx) >= Math.abs(dy) * aspectRatio) {
            newH = newW / aspectRatio;
          } else {
            newW = newH * aspectRatio;
          }
        }
        left = startRect.left + (startRect.width - newW);
        top = startRect.top + (startRect.height - newH);
        width = newW;
        height = newH;
        break;
      }

      case 'tr': {
        // Anchor Bottom-Left (Fixed)
        let newW = Math.max(minSize, startRect.width + dx);
        let newH = Math.max(minSize, startRect.height - dy);

        if (aspectRatio) {
          if (Math.abs(dx) >= Math.abs(dy) * aspectRatio) {
            newH = newW / aspectRatio;
          } else {
            newW = newH * aspectRatio;
          }
        }
        top = startRect.top + (startRect.height - newH);
        width = newW;
        height = newH;
        break;
      }

      case 'bl': {
        // Anchor Top-Right (Fixed)
        let newW = Math.max(minSize, startRect.width - dx);
        let newH = Math.max(minSize, startRect.height + dy);

        if (aspectRatio) {
          if (Math.abs(dx) >= Math.abs(dy) * aspectRatio) {
            newH = newW / aspectRatio;
          } else {
            newW = newH * aspectRatio;
          }
        }
        left = startRect.left + (startRect.width - newW);
        width = newW;
        height = newH;
        break;
      }

      case 'top': {
        let newH = Math.max(minSize, startRect.height - dy);
        let newW = startRect.width;

        if (aspectRatio) {
          newW = newH * aspectRatio;
          left = startRect.left + (startRect.width - newW) / 2;
        }
        top = startRect.top + (startRect.height - newH);
        width = newW;
        height = newH;
        break;
      }

      case 'bottom': {
        let newH = Math.max(minSize, startRect.height + dy);
        let newW = startRect.width;

        if (aspectRatio) {
          newW = newH * aspectRatio;
          left = startRect.left + (startRect.width - newW) / 2;
        }
        width = newW;
        height = newH;
        break;
      }

      case 'left': {
        let newW = Math.max(minSize, startRect.width - dx);
        let newH = startRect.height;

        if (aspectRatio) {
          newH = newW / aspectRatio;
          top = startRect.top + (startRect.height - newH) / 2;
        }
        left = startRect.left + (startRect.width - newW);
        width = newW;
        height = newH;
        break;
      }

      case 'right': {
        let newW = Math.max(minSize, startRect.width + dx);
        let newH = startRect.height;

        if (aspectRatio) {
          newH = newW / aspectRatio;
          top = startRect.top + (startRect.height - newH) / 2;
        }
        width = newW;
        height = newH;
        break;
      }
    }

    return {
      rect: {
        left: Math.round(left),
        top: Math.round(top),
        width: Math.round(Math.max(minSize, width)),
        height: Math.round(Math.max(minSize, height))
      },
      snappedX,
      snappedY
    };
  }

  /**
   * Fit and center a target aspect ratio rectangle within a given container/image bounds.
   */
  public static getFittedCenterRect(
    container: { left: number; top: number; width: number; height: number },
    ratio: number | null,
    scaleFactor: number = 0.80
  ): CropRect {
    if (!ratio || ratio <= 0) {
      const padW = container.width * (1 - scaleFactor) * 0.5;
      const padH = container.height * (1 - scaleFactor) * 0.5;
      return {
        left: Math.round(container.left + padW),
        top: Math.round(container.top + padH),
        width: Math.round(container.width - 2 * padW),
        height: Math.round(container.height - 2 * padH)
      };
    }

    let targetW = container.width * scaleFactor;
    let targetH = targetW / ratio;

    if (targetH > container.height * scaleFactor) {
      targetH = container.height * scaleFactor;
      targetW = targetH * ratio;
    }

    const cLeft = container.left + (container.width - targetW) / 2;
    const cTop = container.top + (container.height - targetH) / 2;

    return {
      left: Math.round(cLeft),
      top: Math.round(cTop),
      width: Math.round(targetW),
      height: Math.round(targetH)
    };
  }
}
