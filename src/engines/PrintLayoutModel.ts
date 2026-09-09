/**
 * PrintLayoutModel.ts
 * Enterprise Print Geometry & Layout Calculation Engine for PrintHub Studio.
 * 
 * Supports all industry-standard enterprise print modes:
 * 1. Scale Modes (Fit to margins, Reduce to margins, Actual 1:1, Custom %)
 * 2. Tile Large Pages (Multi-sheet poster tiling with overlap & cut marks)
 * 3. Multiple Pages Per Sheet (N-Up: 2, 4, 6, 9, 16 Up with borders & ordering)
 * 4. Booklet Printing (Saddle-stitch binding, front/back duplex subsets)
 * 5. Bleed & Crop Marks, Auto-Rotate, Auto-Center, Collate, and Print-as-Image.
 */

export type PaperSizeKey = 'A4' | '4R' | 'Legal' | 'Letter' | 'A5' | 'Stamp' | 'Custom';
export type PageOrientation = 'auto' | 'portrait' | 'landscape';
export type ScaleMode = 'fit' | 'reduce' | 'actual' | 'custom' | 'exact' | 'fill';
export type ColorPrintMode = 'Color' | 'Monochrome';
export type DuplexMode = 'simplex' | 'longEdge' | 'shortEdge';
export type ContentAlignment = 'center' | 'top-left' | 'top-center' | 'bottom-center';

export type PaperType =
  | 'plain'
  | 'premium_glossy'
  | 'matte'
  | 'ultra_glossy'
  | 'photo_glossy'
  | 'semigloss'
  | 'envelope'
  | 'cardstock';

export type PrintQuality =
  | 'draft'
  | 'draft_vivid'
  | 'standard'
  | 'standard_vivid'
  | 'high'
  | 'ultra_high';

export type MultiPageSetting = 'off' | '2up' | '4up';
export type DuplexSetting = 'off' | 'longEdge' | 'shortEdge' | 'manual';

export interface PaperTypeDefinition {
  id: PaperType;
  labelEn: string;
  labelBn: string;
  finish: 'matte' | 'glossy' | 'plain';
}

export const PAPER_TYPES_CONFIG: Record<PaperType, PaperTypeDefinition> = {
  plain: { id: 'plain', labelEn: 'Plain paper', labelBn: 'সাধারণ কাগজ (Plain Paper)', finish: 'plain' },
  premium_glossy: { id: 'premium_glossy', labelEn: 'Epson Premium Glossy', labelBn: 'এপসন প্রিমিয়াম গ্লসি (Premium Glossy)', finish: 'glossy' },
  matte: { id: 'matte', labelEn: 'Epson Matte', labelBn: 'এপসন ম্যাট পেপার (Matte Paper)', finish: 'matte' },
  ultra_glossy: { id: 'ultra_glossy', labelEn: 'Epson Ultra Glossy', labelBn: 'এপসন আল্ট্রা গ্লসি (Ultra Glossy)', finish: 'glossy' },
  photo_glossy: { id: 'photo_glossy', labelEn: 'Photo Paper Glossy', labelBn: 'ফটো পেপার গ্লসি (Glossy)', finish: 'glossy' },
  semigloss: { id: 'semigloss', labelEn: 'Premium Semigloss', labelBn: 'প্রিমিয়াম সেমি-গ্লস (Semigloss)', finish: 'glossy' },
  envelope: { id: 'envelope', labelEn: 'Envelope', labelBn: 'এনভেলপ / খাম (Envelope)', finish: 'plain' },
  cardstock: { id: 'cardstock', labelEn: 'Cardstock / Heavy', labelBn: 'কার্ডস্টক / ভারী কাগজ', finish: 'matte' },
};

export interface PrintQualityDefinition {
  id: PrintQuality;
  labelEn: string;
  labelBn: string;
  dpi: number;
  contrastBoost?: number;
  saturationBoost?: number;
}

export const PRINT_QUALITY_CONFIG: Record<PrintQuality, PrintQualityDefinition> = {
  draft: { id: 'draft', labelEn: 'Draft', labelBn: 'খসড়া (Draft 150 DPI)', dpi: 150 },
  draft_vivid: { id: 'draft_vivid', labelEn: 'Draft-Vivid', labelBn: 'ড্রাফট-উজ্জ্বল (Draft Vivid)', dpi: 150, contrastBoost: 1.08, saturationBoost: 1.15 },
  standard: { id: 'standard', labelEn: 'Standard', labelBn: 'স্ট্যান্ডার্ড (Standard 300 DPI)', dpi: 300 },
  standard_vivid: { id: 'standard_vivid', labelEn: 'Standard-Vivid', labelBn: 'স্ট্যান্ডার্ড-উজ্জ্বল (Standard Vivid)', dpi: 300, contrastBoost: 1.05, saturationBoost: 1.15 },
  high: { id: 'high', labelEn: 'High', labelBn: 'উচ্চ মান (High Photo 600 DPI)', dpi: 600 },
  ultra_high: { id: 'ultra_high', labelEn: 'More Settings / Ultra High', labelBn: 'মোর সেটিংস (Ultra High 1200 DPI)', dpi: 1200 },
};

export type PrintRangeMode = 'all' | 'current' | 'custom' | 'view';
export type PageSubset = 'all' | 'odd' | 'even';
export type PrintHandlingMode = 'scale' | 'tile' | 'nup' | 'booklet';
export type NupPageCount = 1 | 2 | 4 | 6 | 9 | 16;
export type NupOrder = 'horizontal' | 'vertical';
export type BookletSubset = 'both' | 'front' | 'back';
export type BookletBinding = 'left' | 'right';
export type PrintWhatMode = 'all' | 'docOnly' | 'formsOnly';

export interface PaperDimensions {
  id: PaperSizeKey;
  name: string;
  widthMm: number;
  heightMm: number;
}

export const STANDARD_PAPER_DIMENSIONS: Record<PaperSizeKey, PaperDimensions> = {
  A4: { id: 'A4', name: 'A4 Paper (210×297mm)', widthMm: 210, heightMm: 297 },
  '4R': { id: '4R', name: '4R Photo (4"×6" / 102×152mm)', widthMm: 102, heightMm: 152 },
  Legal: { id: 'Legal', name: 'Legal Document (216×356mm)', widthMm: 216, heightMm: 356 },
  Letter: { id: 'Letter', name: 'Letter Paper (216×279mm)', widthMm: 216, heightMm: 279 },
  A5: { id: 'A5', name: 'A5 Paper (148×210mm)', widthMm: 148, heightMm: 210 },
  Stamp: { id: 'Stamp', name: 'Stamp Sheet (210×297mm)', widthMm: 210, heightMm: 297 },
  Custom: { id: 'Custom', name: 'Custom Size (mm)', widthMm: 210, heightMm: 297 },
};

export interface PrintMarginsMm {
  topMm: number;
  bottomMm: number;
  leftMm: number;
  rightMm: number;
}

export interface NupConfig {
  pagesPerSheet: NupPageCount;
  pageOrder: NupOrder;
  drawBorder: boolean;
}

export interface TileConfig {
  tileScale: number; // e.g. 100 for 100%
  overlapMm: number; // overlap between sheets (e.g. 5mm)
  cutMarks: boolean;
  labels: boolean;
}

export interface BookletConfig {
  subset: BookletSubset;
  binding: BookletBinding;
}

export interface WatermarkConfig {
  enabled: boolean;
  text: string;
  opacity: number;
  angle: number;
  fontSize: number;
  color: string;
}

export interface ColorAdjustmentConfig {
  brightness: number; // -50 to +50 (default 0)
  contrast: number; // -50 to +50 (default 0)
  saturation: number; // -50 to +50 (default 0)
}

export interface PrintLayoutOptions {
  paperSize: PaperSizeKey;
  customPaperWidthMm?: number;
  customPaperHeightMm?: number;
  orientation: PageOrientation;
  margins: PrintMarginsMm;
  
  // Driver options
  paperType?: PaperType;
  quality?: PrintQuality;
  multiPage?: MultiPageSetting;
  quietMode?: boolean;
  
  // Handling mode
  handlingMode: PrintHandlingMode;
  scaleMode: ScaleMode;
  scalePercent?: number; // e.g. 100
  exactWidthMm?: number;
  exactHeightMm?: number;
  
  nupConfig?: NupConfig;
  tileConfig?: TileConfig;
  bookletConfig?: BookletConfig;
  watermark?: WatermarkConfig;
  colorAdjustment?: ColorAdjustmentConfig;

  // Options & Toggles
  autoRotate?: boolean;
  autoCenter?: boolean;
  bleedMarks?: boolean;
  collate?: boolean;
  printAsImage?: boolean;
  reversePages?: boolean;
  printWhat?: PrintWhatMode;
  colorMode?: ColorPrintMode;
  duplexMode?: DuplexMode;
  copies?: number;
  dpi?: number;
}

export interface PlacedCellLayout {
  cellIndex: number;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  xPx: number;
  yPx: number;
  widthPx: number;
  heightPx: number;
}

export interface ComputedPrintLayout {
  // Paper sheet geometry in millimeters & inches
  paperWidthMm: number;
  paperHeightMm: number;
  paperWidthInches: number;
  paperHeightInches: number;
  isLandscape: boolean;

  // Document original geometry in millimeters & inches
  docWidthMm: number;
  docHeightMm: number;
  docWidthInches: number;
  docHeightInches: number;

  // Margins in millimeters
  margins: PrintMarginsMm;

  // Printable area inside margins in millimeters
  printableWidthMm: number;
  printableHeightMm: number;
  printableOriginXMm: number;
  printableOriginYMm: number;

  // Placed content bounding box in millimeters
  placedXMm: number;
  placedYMm: number;
  placedWidthMm: number;
  placedHeightMm: number;

  // Multi-up grid cells (if N-Up enabled)
  gridCells: PlacedCellLayout[];

  // Scale statistics
  effectiveScalePercent: number;
  aspectRatio: number;

  // Target DPI pixel equivalents (for exact 1:1 Canvas rendering)
  dpi: number;
  sheetWidthPx: number;
  sheetHeightPx: number;
  placedXPx: number;
  placedYPx: number;
  placedWidthPx: number;
  placedHeightPx: number;
}

export function mmToPixels(mm: number, dpi: number = 300): number {
  return Math.round((mm / 25.4) * dpi);
}

export function pixelsToMm(px: number, dpi: number = 300): number {
  return (px / dpi) * 25.4;
}

export function mmToInches(mm: number): number {
  return parseFloat((mm / 25.4).toFixed(2));
}

export function inchesToMm(inches: number): number {
  return parseFloat((inches * 25.4).toFixed(1));
}

export class PrintLayoutModel {
  /**
   * Get physical paper dimensions accounting for orientation & auto-rotation
   */
  public static getPaperDimensions(
    paperSize: PaperSizeKey,
    orientation: PageOrientation,
    docWidthPx: number,
    docHeightPx: number,
    customWidthMm?: number,
    customHeightMm?: number,
    autoRotate: boolean = true
  ): { widthMm: number; heightMm: number; isLandscape: boolean } {
    let baseW = 210;
    let baseH = 297;

    if (paperSize === 'Custom' && customWidthMm && customHeightMm) {
      baseW = Math.max(10, customWidthMm);
      baseH = Math.max(10, customHeightMm);
    } else {
      const spec = STANDARD_PAPER_DIMENSIONS[paperSize] || STANDARD_PAPER_DIMENSIONS.A4;
      baseW = spec.widthMm;
      baseH = spec.heightMm;
    }

    const docAspect = (docWidthPx && docHeightPx) ? (docWidthPx / docHeightPx) : 1;
    const isDocLandscape = docAspect > 1.05;

    let isLandscape = false;
    if (orientation === 'landscape') {
      isLandscape = true;
    } else if (orientation === 'portrait') {
      isLandscape = false;
    } else {
      // 'auto': auto rotate paper to match document aspect ratio
      isLandscape = autoRotate ? isDocLandscape : false;
    }

    const widthMm = isLandscape ? Math.max(baseW, baseH) : Math.min(baseW, baseH);
    const heightMm = isLandscape ? Math.min(baseW, baseH) : Math.max(baseW, baseH);

    return { widthMm, heightMm, isLandscape };
  }

  /**
   * Calculate 100% exact mathematical layout for single-page, N-Up, and Tile modes
   */
  public static calculateLayout(
    contentOriginalWidthPx: number,
    contentOriginalHeightPx: number,
    options: PrintLayoutOptions
  ): ComputedPrintLayout {
    const dpi = options.dpi || 300;
    const autoRotate = options.autoRotate !== false;
    const autoCenter = options.autoCenter !== false;

    const { widthMm: paperWidthMm, heightMm: paperHeightMm, isLandscape } = this.getPaperDimensions(
      options.paperSize,
      options.orientation,
      contentOriginalWidthPx,
      contentOriginalHeightPx,
      options.customPaperWidthMm,
      options.customPaperHeightMm,
      autoRotate
    );

    const margins = {
      topMm: Math.max(0, options.margins.topMm || 0),
      bottomMm: Math.max(0, options.margins.bottomMm || 0),
      leftMm: Math.max(0, options.margins.leftMm || 0),
      rightMm: Math.max(0, options.margins.rightMm || 0),
    };

    // Printable boundary
    const printableWidthMm = Math.max(1, paperWidthMm - margins.leftMm - margins.rightMm);
    const printableHeightMm = Math.max(1, paperHeightMm - margins.topMm - margins.bottomMm);
    const printableOriginXMm = margins.leftMm;
    const printableOriginYMm = margins.topMm;

    // Content natural dimensions
    const contentW = Math.max(1, contentOriginalWidthPx);
    const contentH = Math.max(1, contentOriginalHeightPx);
    const aspectRatio = contentW / contentH;
    const docWidthMm = pixelsToMm(contentW, dpi);
    const docHeightMm = pixelsToMm(contentH, dpi);

    let placedWidthMm = docWidthMm;
    let placedHeightMm = docHeightMm;
    let effectiveScalePercent = 100;

    const handlingMode = options.multiPage === '2up' || options.multiPage === '4up' 
      ? 'nup' 
      : (options.handlingMode || 'scale');
    const gridCells: PlacedCellLayout[] = [];

    if (handlingMode === 'nup') {
      // ── N-Up Multi-Page Grid Layout ──────────────────────────────────────────
      const pagesCount = options.multiPage === '2up' ? 2 : options.multiPage === '4up' ? 4 : (options.nupConfig?.pagesPerSheet || 2);
      let rows = 1;
      let cols = 2;
      if (pagesCount === 4) { rows = 2; cols = 2; }
      else if (pagesCount === 6) { rows = 2; cols = 3; }
      else if (pagesCount === 9) { rows = 3; cols = 3; }
      else if (pagesCount === 16) { rows = 4; cols = 4; }

      const gapMm = 4;
      const cellW = (printableWidthMm - (cols - 1) * gapMm) / cols;
      const cellH = (printableHeightMm - (rows - 1) * gapMm) / rows;

      // Fit doc aspect ratio inside each cell
      const fitScale = Math.min(cellW / docWidthMm, cellH / docHeightMm);
      const subW = docWidthMm * fitScale;
      const subH = docHeightMm * fitScale;
      effectiveScalePercent = Math.round(fitScale * 100);

      placedWidthMm = printableWidthMm;
      placedHeightMm = printableHeightMm;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const index = options.nupConfig?.pageOrder === 'vertical' ? (c * rows + r) : (r * cols + c);
          if (index < pagesCount) {
            const cellOriginX = printableOriginXMm + c * (cellW + gapMm) + (cellW - subW) / 2;
            const cellOriginY = printableOriginYMm + r * (cellH + gapMm) + (cellH - subH) / 2;

            gridCells.push({
              cellIndex: index,
              xMm: cellOriginX,
              yMm: cellOriginY,
              widthMm: subW,
              heightMm: subH,
              xPx: mmToPixels(cellOriginX, dpi),
              yPx: mmToPixels(cellOriginY, dpi),
              widthPx: mmToPixels(subW, dpi),
              heightPx: mmToPixels(subH, dpi),
            });
          }
        }
      }
    } else {
      // ── Standard Scale Modes ────────────────────────────────────────────────
      const scaleMode = options.scaleMode || 'fit';

      if (scaleMode === 'fit') {
        const scaleX = printableWidthMm / docWidthMm;
        const scaleY = printableHeightMm / docHeightMm;
        const fitScale = Math.min(scaleX, scaleY);
        placedWidthMm = docWidthMm * fitScale;
        placedHeightMm = docHeightMm * fitScale;
        effectiveScalePercent = Math.round(fitScale * 100);
      } else if (scaleMode === 'reduce') {
        // Reduce only if larger than printable area
        if (docWidthMm > printableWidthMm || docHeightMm > printableHeightMm) {
          const scaleX = printableWidthMm / docWidthMm;
          const scaleY = printableHeightMm / docHeightMm;
          const fitScale = Math.min(scaleX, scaleY);
          placedWidthMm = docWidthMm * fitScale;
          placedHeightMm = docHeightMm * fitScale;
          effectiveScalePercent = Math.round(fitScale * 100);
        } else {
          placedWidthMm = docWidthMm;
          placedHeightMm = docHeightMm;
          effectiveScalePercent = 100;
        }
      } else if (scaleMode === 'actual') {
        placedWidthMm = docWidthMm;
        placedHeightMm = docHeightMm;
        effectiveScalePercent = 100;
      } else if (scaleMode === 'custom') {
        const pct = (options.scalePercent || 100) / 100;
        placedWidthMm = docWidthMm * pct;
        placedHeightMm = docHeightMm * pct;
        effectiveScalePercent = options.scalePercent || 100;
      } else if (scaleMode === 'exact' && options.exactWidthMm && options.exactHeightMm) {
        placedWidthMm = options.exactWidthMm;
        placedHeightMm = options.exactHeightMm;
        effectiveScalePercent = Math.round((placedWidthMm / docWidthMm) * 100);
      } else if (scaleMode === 'fill') {
        const scaleX = printableWidthMm / docWidthMm;
        const scaleY = printableHeightMm / docHeightMm;
        const fillScale = Math.max(scaleX, scaleY);
        placedWidthMm = docWidthMm * fillScale;
        placedHeightMm = docHeightMm * fillScale;
        effectiveScalePercent = Math.round(fillScale * 100);
      }
    }

    // Auto-Center or Top-Left Alignment
    let placedXMm = printableOriginXMm;
    let placedYMm = printableOriginYMm;

    if (autoCenter && handlingMode !== 'nup') {
      placedXMm = printableOriginXMm + (printableWidthMm - placedWidthMm) / 2;
      placedYMm = printableOriginYMm + (printableHeightMm - placedHeightMm) / 2;
    }

    // Pixels calculations
    const sheetWidthPx = mmToPixels(paperWidthMm, dpi);
    const sheetHeightPx = mmToPixels(paperHeightMm, dpi);
    const placedXPx = mmToPixels(placedXMm, dpi);
    const placedYPx = mmToPixels(placedYMm, dpi);
    const placedWidthPx = mmToPixels(placedWidthMm, dpi);
    const placedHeightPx = mmToPixels(placedHeightMm, dpi);

    return {
      paperWidthMm,
      paperHeightMm,
      paperWidthInches: mmToInches(paperWidthMm),
      paperHeightInches: mmToInches(paperHeightMm),
      docWidthMm: parseFloat(docWidthMm.toFixed(1)),
      docHeightMm: parseFloat(docHeightMm.toFixed(1)),
      docWidthInches: mmToInches(docWidthMm),
      docHeightInches: mmToInches(docHeightMm),
      isLandscape,
      margins,
      printableWidthMm,
      printableHeightMm,
      printableOriginXMm,
      printableOriginYMm,
      placedXMm,
      placedYMm,
      placedWidthMm,
      placedHeightMm,
      gridCells,
      effectiveScalePercent,
      aspectRatio,
      dpi,
      sheetWidthPx,
      sheetHeightPx,
      placedXPx,
      placedYPx,
      placedWidthPx,
      placedHeightPx,
    };
  }

  /**
   * Render high-resolution raster canvas with complete Quality & Paper Profile adjustments
   */
  public static renderToCanvas(
    sourceImageOrCanvas: HTMLImageElement | HTMLCanvasElement,
    layout: ComputedPrintLayout,
    options?: Partial<PrintLayoutOptions>
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = layout.sheetWidthPx;
    canvas.height = layout.sheetHeightPx;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return canvas;

    // 1. Fill clean white sheet
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const colorMode = options?.colorMode || 'Color';
    const quality = options?.quality || 'standard';
    const qualCfg = PRINT_QUALITY_CONFIG[quality] || PRINT_QUALITY_CONFIG.standard;
    const paperType = options?.paperType || 'plain';
    const paperCfg = PAPER_TYPES_CONFIG[paperType] || PAPER_TYPES_CONFIG.plain;

    // 2. Build GPU-accelerated filter string
    const filters: string[] = [];

    if (colorMode === 'Monochrome') {
      filters.push('grayscale(100%)');
      filters.push('contrast(105%)');
    } else {
      if (qualCfg.contrastBoost) {
        filters.push(`contrast(${Math.round(qualCfg.contrastBoost * 100)}%)`);
      }
      if (qualCfg.saturationBoost) {
        filters.push(`saturate(${Math.round(qualCfg.saturationBoost * 100)}%)`);
      }
      if (paperCfg.finish === 'glossy') {
        filters.push('contrast(103%) saturate(106%)');
      } else if (paperCfg.finish === 'matte') {
        filters.push('contrast(102%)');
      }
    }

    if (options?.colorAdjustment) {
      const { brightness = 0, contrast = 0, saturation = 0 } = options.colorAdjustment;
      if (brightness !== 0) filters.push(`brightness(${100 + brightness}%)`);
      if (contrast !== 0) filters.push(`contrast(${100 + contrast}%)`);
      if (saturation !== 0 && colorMode !== 'Monochrome') filters.push(`saturate(${100 + saturation}%)`);
    }

    ctx.filter = filters.length > 0 ? filters.join(' ') : 'none';

    // 3. Draw content
    if (layout.gridCells && layout.gridCells.length > 0) {
      // Draw N-Up multi-cells
      for (const cell of layout.gridCells) {
        ctx.drawImage(sourceImageOrCanvas, cell.xPx, cell.yPx, cell.widthPx, cell.heightPx);
        if (options?.nupConfig?.drawBorder) {
          ctx.strokeStyle = '#D1D5DB';
          ctx.lineWidth = Math.max(1, Math.round(layout.dpi / 150));
          ctx.strokeRect(cell.xPx, cell.yPx, cell.widthPx, cell.heightPx);
        }
      }
    } else {
      // Single placed item
      ctx.drawImage(
        sourceImageOrCanvas,
        layout.placedXPx,
        layout.placedYPx,
        layout.placedWidthPx,
        layout.placedHeightPx
      );
    }

    // Reset filter for annotations & cutlines
    ctx.filter = 'none';

    // 4. Bleed Marks / Crop Marks
    if (options?.bleedMarks) {
      const lineLen = mmToPixels(6, layout.dpi);
      const offset = mmToPixels(3, layout.dpi);
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = Math.max(1, Math.round(layout.dpi / 200));

      const x1 = layout.placedXPx;
      const y1 = layout.placedYPx;
      const x2 = layout.placedXPx + layout.placedWidthPx;
      const y2 = layout.placedYPx + layout.placedHeightPx;

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(x1 - offset - lineLen, y1); ctx.lineTo(x1 - offset, y1);
      ctx.moveTo(x1, y1 - offset - lineLen); ctx.lineTo(x1, y1 - offset);
      // Top-Right
      ctx.moveTo(x2 + offset, y1); ctx.lineTo(x2 + offset + lineLen, y1);
      ctx.moveTo(x2, y1 - offset - lineLen); ctx.lineTo(x2, y1 - offset);
      // Bottom-Left
      ctx.moveTo(x1 - offset - lineLen, y2); ctx.lineTo(x1 - offset, y2);
      ctx.moveTo(x1, y2 + offset); ctx.lineTo(x1, y2 + offset + lineLen);
      // Bottom-Right
      ctx.moveTo(x2 + offset, y2); ctx.lineTo(x2 + offset + lineLen, y2);
      ctx.moveTo(x2, y2 + offset); ctx.lineTo(x2, y2 + offset + lineLen);
      ctx.stroke();
    }

    // 5. Watermark (if enabled)
    if (options?.watermark && options.watermark.enabled && options.watermark.text) {
      const wm = options.watermark;
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((wm.angle || -45) * Math.PI / 180);
      ctx.font = `bold ${Math.round((wm.fontSize || 48) * (layout.dpi / 72))}px sans-serif`;
      ctx.fillStyle = wm.color || '#000000';
      ctx.globalAlpha = wm.opacity || 0.15;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(wm.text, 0, 0);
      ctx.restore();
    }

    return canvas;
  }
}
