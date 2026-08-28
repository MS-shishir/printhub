// ============================================================
// PASSPORT STUDIO — COMPLETE TYPE DEFINITIONS
// ============================================================

export type ThemeMode = 'light' | 'dark' | 'glass';
export type AppLanguage = 'bn' | 'en';
export type ToolMode = 'select' | 'crop' | 'move' | 'zoom' | 'eyedropper';
export type ExportFormat = 'png' | 'jpeg' | 'pdf' | 'print';
export type BackgroundType = 'solid' | 'gradient' | 'removed' | 'ai_removed';
export type PaperSizeId = 'a4' | 'letter' | '4r' | '5r' | 'custom';
export type CopyCount = 1 | 2 | 4 | 6 | 8 | 12 | 16;

// ─── Template ────────────────────────────────────────────────
export interface PassportTemplate {
  id: string;
  country: string;
  name: string;
  flag: string;
  widthMm: number;
  heightMm: number;
  dpi: number;
  faceHeightRatio: number;    // face height / photo height
  eyePosition: {
    xRatio: number;           // horizontal center of eyes (0–1)
    yRatio: number;           // vertical position of eyes (0–1 from top)
  };
  headMargin: {
    topRatio: number;
    bottomRatio: number;
    leftRatio: number;
    rightRatio: number;
  };
  bgColor: string;
  bgColorName: string;
  rules: string;
  category: 'bangladesh' | 'international' | 'custom';
}

// ─── Paper ───────────────────────────────────────────────────
export interface PaperSize {
  id: PaperSizeId;
  name: string;
  widthMm: number;
  heightMm: number;
}

// ─── Face Detection ──────────────────────────────────────────
export interface FaceDetectionResult {
  boundingBox: {
    x: number;      // 0–1 normalized
    y: number;
    width: number;
    height: number;
  };
  landmarks: {
    leftEye: { x: number; y: number };
    rightEye: { x: number; y: number };
    noseTip: { x: number; y: number };
    mouthCenter: { x: number; y: number };
    leftEar: { x: number; y: number };
    rightEar: { x: number; y: number };
  };
  confidence: number;
}

// ─── Crop ─────────────────────────────────────────────────────
export interface CropArea {
  x: number;       // pixels on original image
  y: number;
  width: number;
  height: number;
}

// ─── Background ──────────────────────────────────────────────
export interface BackgroundConfig {
  type: BackgroundType;
  color: string;              // hex
  gradient?: {
    startColor: string;
    endColor: string;
    angle: number;
  };
  keyColor: { r: number; g: number; b: number };
  tolerance: number;          // 0–100
  feather: number;            // 0–20
  isEnabled: boolean;
}

// ─── Transform ───────────────────────────────────────────────
export interface ImageTransform {
  zoom: number;               // 0.1 – 5
  pan: { x: number; y: number };
  rotation: number;           // degrees
  flipX: boolean;
  flipY: boolean;
}

export type CutlineStyle = 'none' | 'box' | 'extended' | 'corner';

// ─── Layout ──────────────────────────────────────────────────
export interface LayoutConfig {
  copies: CopyCount;
  paperSize: PaperSize;
  customWidthMm: number;
  customHeightMm: number;
  gapMm: number;
  marginMm: number;
  marginTopMm?: number;
  marginBottomMm?: number;
  marginLeftMm?: number;
  marginRightMm?: number;
  rollerSafeMarginMm?: number; // Non-printable paper feed roller margin (e.g. 5–12mm)
  showRollerGuide?: boolean;   // Visual roller safe zone indicator
  alignPos?: 'top-left' | 'top-center' | 'center';
  showCutlines: boolean;
  cutlineOffsetMm?: number;    // 0mm = tight against image, 1–3mm = white space before cutline
  cutlineExtensionMm?: number; // Distance cutline extends beyond corners (e.g. 0–5mm)
  cutlineColor?: string;
  showPrintHeader: boolean;    // Sheet header title (default false)
  autoFit: boolean;
  rotatePhotoDegrees?: number;
}

export interface PlacedImage {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

export interface LayoutResult {
  placed: PlacedImage[];
  columns: number;
  rows: number;
  totalFit: number;
  paperWidthMm: number;
  paperHeightMm: number;
}

// ─── Export ──────────────────────────────────────────────────
export interface ExportOptions {
  format: ExportFormat;
  dpi: number;
  quality: number;            // 0–1 for JPEG
  includeBackground: boolean;
}

// ─── Undo / Redo ─────────────────────────────────────────────
export interface HistoryEntry {
  transform: ImageTransform;
  cropArea: CropArea | null;
  bgConfig: BackgroundConfig;
  timestamp: number;
}

// ─── Toast ───────────────────────────────────────────────────
export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error' | 'warning';
  duration?: number;
}

// ─── Processed Photo Print Tray ──────────────────────────────
export interface ProcessedTrayItem {
  id: string;
  name: string;
  croppedUrl: string;
  templateId: string;
  widthMm: number;
  heightMm: number;
  copies: number;
  addedAt: string;
  rotateDegrees?: number;
}

// ─── Full App State ──────────────────────────────────────────
export interface PassportState {
  // Image
  originalImage: string | null;     // Data URL or blob URL
  processedImage: string | null;    // After bg removal
  croppedImage: string | null;      // Final cropped output
  photoName: string;
  imageNaturalWidth: number;
  imageNaturalHeight: number;

  // Processed Print Tray (Multi-image batch layout)
  processedTray: ProcessedTrayItem[];

  // Template
  selectedTemplateId: string;
  customWidth: number;
  customHeight: number;

  // Background
  bgConfig: BackgroundConfig;

  // Face Detection
  faceDetection: FaceDetectionResult | null;
  isDetectingFace: boolean;
  faceDetectionError: string | null;

  // Crop
  cropArea: CropArea | null;
  autoCropApplied: boolean;

  // Transform
  transform: ImageTransform;

  // Layout
  layoutConfig: LayoutConfig;

  // UI State
  activeStep: number;               // 1–8
  activePanel: string;              // 'upload' | 'crop' | 'background' | etc.
  activeTool: ToolMode;
  showFaceGuide: boolean;
  showSafeArea: boolean;
  showGrid: boolean;
  showEyeLine: boolean;
  showShoulderGuide: boolean;
  faceGuideScale: number;
  faceGuideYOffset: number;
  shoulderGuideYOffset: number;

  // Processing
  isProcessing: boolean;
  processingMessage: string;

  // Toast
  toasts: ToastMessage[];

  // History
  history: HistoryEntry[];
  historyIndex: number;
}

// ─── Props ───────────────────────────────────────────────────
export interface PassportStudioProps {
  onAddRecentFile?: (name: string, type: string) => void;
  language?: AppLanguage;
  theme?: ThemeMode;
}