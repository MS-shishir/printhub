// ── Print Layout Service ──────────────────────────────────────────────────
// Calculates optimal multi-copy grid layouts for passport photo sheets.
// No stretching. Exact millimeter math. Auto-fits maximum copies.

import { LayoutConfig, LayoutResult, PlacedImage, PassportTemplate } from '../types/passport-types';

/**
 * Compute the full grid layout for a given template + layout config.
 * Returns all placed image positions in millimeters.
 */
export function calculateLayout(
  template: PassportTemplate,
  config: LayoutConfig
): LayoutResult {
  const paper = config.paperSize;
  const paperW = config.paperSize.id === 'custom' ? config.customWidthMm : paper.widthMm;
  const paperH = config.paperSize.id === 'custom' ? config.customHeightMm : paper.heightMm;
  const margin = config.marginMm ?? 3;
  const topMargin = config.marginTopMm ?? margin;
  const botMargin = Math.max(config.marginBottomMm ?? margin, config.rollerSafeMarginMm ?? 0);
  const leftMargin = config.marginLeftMm ?? margin;
  const rightMargin = config.marginRightMm ?? margin;
  const gap = config.gapMm ?? 3;

  const isRotated = config.rotatePhotoDegrees === 90;
  const photoW = isRotated ? template.heightMm : template.widthMm;
  const photoH = isRotated ? template.widthMm : template.heightMm;

  // Usable area inside margins & roller safe zone
  const usableW = Math.max(0, paperW - leftMargin - rightMargin);
  const usableH = Math.max(0, paperH - topMargin - botMargin);

  // Calculate standard grid cols & rows
  let cols = Math.floor((usableW + gap) / (photoW + gap));
  let rows = Math.floor((usableH + gap) / (photoH + gap));

  // If photo is large (e.g. A4 full size or album page) and fits on paper sheet:
  if (cols < 1 && photoW <= paperW) cols = 1;
  if (rows < 1 && photoH <= paperH) rows = 1;

  const maxFit = Math.max(1, cols * rows);

  // Actual copies to place (capped by what fits)
  const toPaint = Math.min(config.copies || 1, maxFit);
  const actualRows = Math.ceil(toPaint / Math.max(1, cols));

  // Compute grid offsets based on alignment preference
  const gridW = cols * photoW + (cols - 1) * gap;
  const gridH = actualRows * photoH + (actualRows - 1) * gap;

  let startX = leftMargin;
  let startY = topMargin;

  const align = config.alignPos || 'top-left';

  if (cols === 1 && photoW >= usableW) {
    startX = Math.max(0, (paperW - photoW) / 2);
  } else if (align === 'top-center' || align === 'center') {
    startX = Math.max(0, (paperW - gridW) / 2);
  } else {
    startX = leftMargin;
  }

  if (actualRows === 1 && photoH >= usableH) {
    startY = Math.max(0, (paperH - photoH) / 2);
  } else if (align === 'center') {
    startY = Math.max(0, (paperH - gridH) / 2);
  } else {
    startY = topMargin;
  }

  const placed: PlacedImage[] = [];
  for (let i = 0; i < toPaint; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    placed.push({
      xMm: startX + col * (photoW + gap),
      yMm: startY + row * (photoH + gap),
      widthMm: photoW,
      heightMm: photoH,
    });
  }

  return {
    placed,
    columns: cols,
    rows: actualRows,
    totalFit: maxFit,
    paperWidthMm: paperW,
    paperHeightMm: paperH,
  };
}

/**
 * Calculate how many copies fit on a given paper for a template.
 */
export function maxCopiesThatFit(
  template: PassportTemplate,
  config: LayoutConfig
): number {
  const paper = config.paperSize;
  const paperW = config.paperSize.id === 'custom' ? config.customWidthMm : paper.widthMm;
  const paperH = config.paperSize.id === 'custom' ? config.customHeightMm : paper.heightMm;
  const margin = config.marginMm ?? 3;
  const topMargin = config.marginTopMm ?? margin;
  const botMargin = Math.max(config.marginBottomMm ?? margin, config.rollerSafeMarginMm ?? 0);
  const leftMargin = config.marginLeftMm ?? margin;
  const rightMargin = config.marginRightMm ?? margin;
  const gap = config.gapMm ?? 3;

  const isRotated = config.rotatePhotoDegrees === 90;
  const photoW = isRotated ? template.heightMm : template.widthMm;
  const photoH = isRotated ? template.widthMm : template.heightMm;

  const usableW = Math.max(0, paperW - leftMargin - rightMargin);
  const usableH = Math.max(0, paperH - topMargin - botMargin);
  let cols = Math.floor((usableW + gap) / (photoW + gap));
  let rows = Math.floor((usableH + gap) / (photoH + gap));

  if (cols < 1 && photoW <= paperW) cols = 1;
  if (rows < 1 && photoH <= paperH) rows = 1;

  return Math.max(1, cols * rows);
}

/**
 * Render a layout grid onto a canvas at a given DPI.
 * Used for print preview and final PDF generation.
 */
export function renderLayoutToCanvas(
  canvas: HTMLCanvasElement,
  imageDataUrl: string,
  layout: LayoutResult,
  config: LayoutConfig,
  dpi: number = 96,
  bgColor: string = '#ffffff'
): void {
  const ctx = canvas.getContext('2d')!;
  const mmToPx = (mm: number) => (mm / 25.4) * dpi;

  const pxW = mmToPx(layout.paperWidthMm);
  const pxH = mmToPx(layout.paperHeightMm);
  canvas.width = pxW;
  canvas.height = pxH;

  // Paper background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, pxW, pxH);

  const img = new Image();
  img.onload = () => {
    for (const place of layout.placed) {
      const x = mmToPx(place.xMm);
      const y = mmToPx(place.yMm);
      const w = mmToPx(place.widthMm);
      const h = mmToPx(place.heightMm);

      // Background fill for photo
      ctx.fillStyle = bgColor;
      ctx.fillRect(x, y, w, h);

      // Draw photo
      ctx.drawImage(img, x, y, w, h);

      // Cut lines
      if (config.showCutlines) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
      }
    }

    // Print header
    if (config.showPrintHeader) {
      ctx.fillStyle = 'rgba(100,100,100,0.7)';
      ctx.font = `${mmToPx(3)}px sans-serif`;
      ctx.fillText(
        `PrintHub Passport Studio`,
        mmToPx(config.marginMm),
        mmToPx(config.marginMm * 0.6)
      );
    }
  };
  img.src = imageDataUrl;
}
