/**
 * HeadStraightenerEngine.ts
 * Biomechanical Human Portrait Straightening & Tilt-Correction Engine.
 * 
 * Accurately mimics Adobe Photoshop Puppet Warp:
 * 1. Generates 6-Point Portrait Skeleton:
 *    - Head Crown Pin (Top Center)
 *    - Left & Right Temple Pins (Locks rigid width of the head during tilt)
 *    - Chin Pin (Lower Jaw)
 *    - Neck Pivot Pin (Rotational Fulcrum)
 *    - Left & Right Shoulder Anchors (Locked at 0% movement)
 *    - Bottom Torso Anchor (Locked)
 * 2. Unconstrained Head & Crown (No restrictive top boundary anchors that squash hair/head).
 * 3. Exact Rigid Head Rotation around Neck Fulcrum.
 */

import { DeformPin } from './DeformationEngine';

export interface PortraitBounds {
  width: number;
  height: number;
}

export interface HeadStraightenPresetOptions {
  headRatioY?: number;       // Default ~0.18 of height
  chinRatioY?: number;       // Default ~0.42 of height
  neckRatioY?: number;       // Default ~0.54 of height
  shoulderRatioY?: number;   // Default ~0.68 of height
  shoulderSpanRatio?: number;// Default ~0.65 of width
  faceSpanRatio?: number;    // Default ~0.25 of width
}

export class HeadStraightenerEngine {
  /**
   * Generates standard anatomical anchor & control pins for a portrait.
   */
  public static generatePortraitPins(
    bounds: PortraitBounds,
    options?: HeadStraightenPresetOptions
  ): DeformPin[] {
    const { width, height } = bounds;
    const centerX = width * 0.5;

    const headY = height * (options?.headRatioY ?? 0.16);
    const templeY = height * ((options?.headRatioY ?? 0.16) + 0.12);
    const chinY = height * (options?.chinRatioY ?? 0.42);
    const neckY = height * (options?.neckRatioY ?? 0.54);
    const shoulderY = height * (options?.shoulderRatioY ?? 0.68);
    
    const faceSpan = width * (options?.faceSpanRatio ?? 0.26);
    const shoulderSpan = width * (options?.shoulderSpanRatio ?? 0.65);

    const shLeftX = centerX - shoulderSpan * 0.5;
    const shRightX = centerX + shoulderSpan * 0.5;

    const templeLeftX = centerX - faceSpan * 0.5;
    const templeRightX = centerX + faceSpan * 0.5;

    const pins: DeformPin[] = [
      // 1. Control Pin: Head / Crown
      {
        id: 'pin_head',
        x: centerX,
        y: headY,
        originalX: centerX,
        originalY: headY,
        isLocked: false,
        label: 'Crown',
        depth: 2,
      },
      // 2. Control Pin: Left Temple
      {
        id: 'pin_temple_l',
        x: templeLeftX,
        y: templeY,
        originalX: templeLeftX,
        originalY: templeY,
        isLocked: false,
        label: 'Left Face',
        depth: 2,
      },
      // 3. Control Pin: Right Temple
      {
        id: 'pin_temple_r',
        x: templeRightX,
        y: templeY,
        originalX: templeRightX,
        originalY: templeY,
        isLocked: false,
        label: 'Right Face',
        depth: 2,
      },
      // 4. Control Pin: Chin / Jaw
      {
        id: 'pin_chin',
        x: centerX,
        y: chinY,
        originalX: centerX,
        originalY: chinY,
        isLocked: false,
        label: 'Chin',
        depth: 2,
      },
      // 5. Pivot Pin: Neck
      {
        id: 'pin_neck',
        x: centerX,
        y: neckY,
        originalX: centerX,
        originalY: neckY,
        isLocked: false,
        isPivot: true,
        label: 'Neck Pivot',
        depth: 1,
      },
      // 6. Anchor Pin: Left Shoulder (Locked)
      {
        id: 'pin_shoulder_l',
        x: shLeftX,
        y: shoulderY,
        originalX: shLeftX,
        originalY: shoulderY,
        isLocked: true,
        label: 'Left Shoulder',
        depth: 0,
      },
      // 7. Anchor Pin: Right Shoulder (Locked)
      {
        id: 'pin_shoulder_r',
        x: shRightX,
        y: shoulderY,
        originalX: shRightX,
        originalY: shoulderY,
        isLocked: true,
        label: 'Right Shoulder',
        depth: 0,
      },
      // 8. Lower Body / Torso Bottom Anchors (Only lock the bottom, NEVER the top head area)
      {
        id: 'b_bl',
        x: 0,
        y: height,
        originalX: 0,
        originalY: height,
        isLocked: true,
        label: 'Bottom Anchor',
      },
      {
        id: 'b_br',
        x: width,
        y: height,
        originalX: width,
        originalY: height,
        isLocked: true,
        label: 'Bottom Anchor',
      },
      {
        id: 'b_bc',
        x: centerX,
        y: height,
        originalX: centerX,
        originalY: height,
        isLocked: true,
        label: 'Torso Lock',
      },
    ];

    return pins;
  }

  /**
   * Applies a tilt rotation angle (in degrees) to all head/face pins around the neck pivot.
   * Keeps shoulder pins and bottom torso anchors completely stationary.
   */
  public static applyHeadRotation(
    pins: DeformPin[],
    angleDegrees: number
  ): DeformPin[] {
    const rad = (angleDegrees * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);

    const neckPin = pins.find((p) => p.id === 'pin_neck' || p.isPivot) || {
      originalX: pins[0]?.originalX || 0,
      originalY: pins[0]?.originalY || 0,
    };

    const pivotX = neckPin.originalX;
    const pivotY = neckPin.originalY;

    return pins.map((pin) => {
      // Locked pins (shoulders, torso bottom) never move
      if (pin.isLocked) {
        return {
          ...pin,
          x: pin.originalX,
          y: pin.originalY,
        };
      }

      // Neck pivot itself stays at pivot location
      if (pin.id === 'pin_neck' || pin.isPivot) {
        return {
          ...pin,
          x: pin.originalX,
          y: pin.originalY,
        };
      }

      // Rotate head, temples, and chin control pins around pivot
      const dx = pin.originalX - pivotX;
      const dy = pin.originalY - pivotY;

      const rotatedX = pivotX + (dx * cosA - dy * sinA);
      const rotatedY = pivotY + (dx * sinA + dy * cosA);

      return {
        ...pin,
        x: rotatedX,
        y: rotatedY,
      };
    });
  }

  /**
   * Translates head & chin pins horizontally / vertically with elastic neck falloff.
   */
  public static applyHeadShift(
    pins: DeformPin[],
    shiftX: number,
    shiftY: number
  ): DeformPin[] {
    return pins.map((pin) => {
      if (pin.isLocked) {
        return { ...pin, x: pin.originalX, y: pin.originalY };
      }

      if (pin.id === 'pin_head' || pin.id === 'pin_temple_l' || pin.id === 'pin_temple_r') {
        return {
          ...pin,
          x: pin.x + shiftX,
          y: pin.y + shiftY,
        };
      }

      if (pin.id === 'pin_chin') {
        return {
          ...pin,
          x: pin.x + shiftX * 0.75,
          y: pin.y + shiftY * 0.75,
        };
      }

      if (pin.id === 'pin_neck' || pin.isPivot) {
        return {
          ...pin,
          x: pin.x + shiftX * 0.25,
          y: pin.y + shiftY * 0.25,
        };
      }

      return pin;
    });
  }
}
