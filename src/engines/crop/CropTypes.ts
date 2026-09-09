/**
 * CropTypes.ts
 * Type definitions and data contracts for PrintHub Studio Enterprise Crop Engine.
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface CropRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface DocumentQuad {
  tl: Point2D; // Top-Left
  tr: Point2D; // Top-Right
  br: Point2D; // Bottom-Right
  bl: Point2D; // Bottom-Left
}

/**
 * 2D Affine Transformation Matrix [a, b, c, d, tx, ty]
 * Corresponds to:
 * [ x' ]   [ a  c  tx ] [ x ]
 * [ y' ] = [ b  d  ty ] [ y ]
 * [ 1  ]   [ 0  0  1  ] [ 1 ]
 */
export type AffineMatrix2D = [number, number, number, number, number, number];

/**
 * 3x3 Homography Matrix for perspective transformations
 */
export type Matrix3x3 = [
  number, number, number,
  number, number, number,
  number, number, number
];

export type CropMode = 'free' | 'ratio' | 'fixed_size' | 'dpi_print' | 'perspective' | 'straighten';

export type CompositionGuide = 'thirds' | 'golden' | 'diagonal' | 'center' | 'none';

export type HandleType = 
  | 'all'
  | 'tl' | 'tr' | 'br' | 'bl'
  | 'top' | 'right' | 'bottom' | 'left'
  | 'center'
  | 'rotate'
  | 'canvas_pan';

export interface CropPreset {
  id: string;
  name: string;
  nameBn: string;
  widthMm?: number;
  heightMm?: number;
  aspectRatio: number; // width / height
  defaultDpi?: number;
  category?: 'passport' | 'photo' | 'social' | 'document';
}

export interface SmartCropCandidate {
  rect: CropRect;
  score: number;
  saliencyScore: number;
  edgeScore: number;
  compositionScore: number;
  centerScore: number;
  penalties: number;
}

export interface CropHistoryState {
  rect: CropRect | null;
  quad: DocumentQuad | null;
  rotationAngle: number;
  cropMode: CropMode;
  aspectRatio: number | null;
  presetId: string;
  targetWidth?: number;
  targetHeight?: number;
  targetDpi?: number;
}

export interface CropExtractionOptions {
  sourceElement: HTMLImageElement | HTMLCanvasElement;
  sourceRotationDeg?: number;
  cropRect: CropRect; // in container/screen space or normalized space
  coordinateMapper?: any;
  targetWidth?: number;
  targetHeight?: number;
  targetDpi?: number;
  interpolationQuality?: 'fast' | 'balanced' | 'high';
  maintainColorProfile?: boolean;
}

export const CROP_PRESETS: Record<string, CropPreset> = {
  free: {
    id: 'free',
    name: 'Freeform',
    nameBn: 'মুক্ত সাইজ',
    aspectRatio: 0,
    category: 'photo'
  },
  passport_bd: {
    id: 'passport_bd',
    name: 'BD Passport (40×50mm)',
    nameBn: '📸 বিডি পাসপোর্ট (৪০×৫০ মিমি)',
    widthMm: 40,
    heightMm: 50,
    aspectRatio: 40 / 50,
    defaultDpi: 300,
    category: 'passport'
  },
  passport_epassport: {
    id: 'passport_epassport',
    name: 'e-Passport / Visa (35×45mm)',
    nameBn: '🛂 ই-পাসপোর্ট / ভিসা (৩৫×৪৫ মিমি)',
    widthMm: 35,
    heightMm: 45,
    aspectRatio: 35 / 45,
    defaultDpi: 300,
    category: 'passport'
  },
  joint_photo: {
    id: 'joint_photo',
    name: 'Joint Photo (55×45mm)',
    nameBn: '👥 জয়েন্ট ছবি (৫৫×৪৫ মিমি)',
    widthMm: 55,
    heightMm: 45,
    aspectRatio: 55 / 45,
    defaultDpi: 300,
    category: 'passport'
  },
  stamp: {
    id: 'stamp',
    name: 'Stamp Size (25×30mm)',
    nameBn: '🔖 স্ট্যাম্প সাইজ (২৫×৩০ মিমি)',
    widthMm: 25,
    heightMm: 30,
    aspectRatio: 25 / 30,
    defaultDpi: 300,
    category: 'passport'
  },
  mini_stamp: {
    id: 'mini_stamp',
    name: 'Mini Stamp (20×25mm)',
    nameBn: '🔖 মিনি স্ট্যাম্প (২০×২৫ মিমি)',
    widthMm: 20,
    heightMm: 25,
    aspectRatio: 20 / 25,
    defaultDpi: 300,
    category: 'passport'
  },
  visa_us: {
    id: 'visa_us',
    name: 'US / Global Visa (2×2 in / 50×50mm)',
    nameBn: '🌐 ইউএস / গ্লোবাল ভিসা (২×২ ইঞ্চি)',
    widthMm: 50.8,
    heightMm: 50.8,
    aspectRatio: 1.0,
    defaultDpi: 300,
    category: 'passport'
  },
  photo_4r: {
    id: 'photo_4r',
    name: '4R Photo (4×6 in / 102×152mm)',
    nameBn: '🖼️ ৪R ছবি (৪×৬ ইঞ্চি)',
    widthMm: 101.6,
    heightMm: 152.4,
    aspectRatio: 4 / 6,
    defaultDpi: 300,
    category: 'photo'
  },
  square_1x1: {
    id: 'square_1x1',
    name: 'Square (1:1)',
    nameBn: '⬛ স্কয়ার (১:১)',
    aspectRatio: 1.0,
    category: 'social'
  },
  ratio_3x4: {
    id: 'ratio_3x4',
    name: 'Portrait (3:4)',
    nameBn: '📱 পোর্ট্রেট (৩:৪)',
    aspectRatio: 3 / 4,
    category: 'social'
  },
  ratio_4x3: {
    id: 'ratio_4x3',
    name: 'Standard Landscape (4:3)',
    nameBn: 'Standard Landscape (৪:৩)',
    aspectRatio: 4 / 3,
    category: 'photo'
  },
  ratio_16x9: {
    id: 'ratio_16x9',
    name: 'Widescreen (16:9)',
    nameBn: '🖥️ ওয়াইডস্ক্রিন (১৬:৯)',
    aspectRatio: 16 / 9,
    category: 'social'
  },
  ratio_9x16: {
    id: 'ratio_9x16',
    name: 'Story / Reel (9:16)',
    nameBn: '📱 স্টোরি / রিলস (৯:১৬)',
    aspectRatio: 9 / 16,
    category: 'social'
  },
  ratio_4x5: {
    id: 'ratio_4x5',
    name: 'Social Feed (4:5)',
    nameBn: '📷 সোশ্যাল ফিড (৪:৫)',
    aspectRatio: 4 / 5,
    category: 'social'
  }
};
