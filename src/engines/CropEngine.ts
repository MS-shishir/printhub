/**
 * CropEngine.ts - Production Crop & Aspect Ratio Engine
 * Identity photo aspect ratios (Passport, Stamp, Visa) and non-destructive canvas clipping.
 */

export interface CropPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  aspectRatio: number; // width / height
}

export class CropEngine {
  public static PRESETS: Record<string, CropPreset> = {
    passport_bd: {
      id: 'passport_bd',
      name: '📸 পাসপোর্ট সাইজ (35x45mm)',
      widthMm: 35,
      heightMm: 45,
      aspectRatio: 35 / 45,
    },
    stamp: {
      id: 'stamp',
      name: '🔖 স্ট্যাম্প সাইজ (20x25mm)',
      widthMm: 20,
      heightMm: 25,
      aspectRatio: 20 / 25,
    },
    visa_us: {
      id: 'visa_us',
      name: '🌐 ইউএস / গ্লোবাল ভিসা (50x50mm)',
      widthMm: 50,
      heightMm: 50,
      aspectRatio: 1.0,
    },
    square: {
      id: 'square',
      name: '⬛ স্কয়ার (1:1)',
      widthMm: 30,
      heightMm: 30,
      aspectRatio: 1.0,
    },
    standard_3x4: {
      id: 'standard_3x4',
      name: '🖼️ স্ট্যান্ডার্ড (30x40mm)',
      widthMm: 30,
      heightMm: 40,
      aspectRatio: 30 / 40,
    },
  };

  /**
   * Calculate crop box coordinates inside container based on target preset
   */
  public static getCropRect(
    containerWidth: number,
    containerHeight: number,
    presetKey: string = 'passport_bd'
  ): { x: number; y: number; width: number; height: number } {
    const preset = this.PRESETS[presetKey] || this.PRESETS.passport_bd;
    const targetRatio = preset.aspectRatio;

    let width = containerWidth * 0.8;
    let height = width / targetRatio;

    if (height > containerHeight * 0.8) {
      height = containerHeight * 0.8;
      width = height * targetRatio;
    }

    const x = (containerWidth - width) / 2;
    const y = (containerHeight - height) / 2;

    return { x, y, width, height };
  }

  /**
   * Crop an HTMLCanvasElement using crop bounds and return cropped canvas
   */
  public static cropCanvas(
    sourceCanvas: HTMLCanvasElement,
    cropBounds: { x: number; y: number; width: number; height: number }
  ): HTMLCanvasElement {
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = cropBounds.width;
    outputCanvas.height = cropBounds.height;

    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return sourceCanvas;

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
