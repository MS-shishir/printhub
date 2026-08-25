/**
 * PrintEngine.ts - Production Print Spooling & Grid Engine
 * Paper sheet layout calculator, Passport 4R/A4 photo auto-tiling & cut markers.
 */

import { calculateLayout } from '../passport-studio/services/layout.service';
import { PassportTemplate, LayoutConfig, PaperSize } from '../passport-studio/types/passport-types';

export interface PrintGridConfig {
  paperSize: '4R' | 'A4' | 'Legal' | 'Stamp';
  photoCount: number;
  copies: number;
  showCutGuides?: boolean;
}

const PAPER_SIZES: Record<string, PaperSize> = {
  '4R': { id: '4r', name: '4R (4"×6")', widthMm: 102, heightMm: 152 },
  'A4': { id: 'a4', name: 'A4 Paper', widthMm: 210, heightMm: 297 },
  'Legal': { id: 'custom', name: 'Legal Paper', widthMm: 216, heightMm: 356 },
  'Stamp': { id: 'custom', name: 'Stamp Sheet', widthMm: 210, heightMm: 297 },
};

const DEFAULT_TEMPLATE: PassportTemplate = {
  id: 'bd_pp',
  country: 'Bangladesh',
  name: 'BD Passport (35×45mm)',
  flag: '🇧🇩',
  widthMm: 35,
  heightMm: 45,
  dpi: 300,
  faceHeightRatio: 0.75,
  eyePosition: { xRatio: 0.5, yRatio: 0.42 },
  headMargin: { topRatio: 0.08, bottomRatio: 0.12, leftRatio: 0.10, rightRatio: 0.10 },
  bgColor: '#ffffff',
  bgColorName: 'White',
  rules: '',
  category: 'bangladesh',
};

export class PrintEngine {
  /**
   * Render multiple passport photo copies onto a high-res paper sheet canvas (300 DPI)
   * Consumes single-source calculateLayout math from layout.service.ts
   */
  public static generatePrintSheet(
    photoCanvas: HTMLCanvasElement,
    config: PrintGridConfig
  ): HTMLCanvasElement {
    const paperSize = PAPER_SIZES[config.paperSize] || PAPER_SIZES['4R'];
    const layoutConfig: LayoutConfig = {
      copies: (config.photoCount || config.copies || 8) as any,
      paperSize,
      customWidthMm: paperSize.widthMm,
      customHeightMm: paperSize.heightMm,
      gapMm: 3,
      marginMm: 8,
      alignPos: 'top-left',
      showCutlines: config.showCutGuides !== false,
      showPrintHeader: false,
      autoFit: true,
    };

    const layout = calculateLayout(DEFAULT_TEMPLATE, layoutConfig);
    const dpi = 300;
    const mmToPx = (mm: number) => Math.round((mm / 25.4) * dpi);

    const sheetCanvas = document.createElement('canvas');
    sheetCanvas.width = mmToPx(layout.paperWidthMm);
    sheetCanvas.height = mmToPx(layout.paperHeightMm);

    const ctx = sheetCanvas.getContext('2d');
    if (!ctx) return photoCanvas;

    // Fill clean white paper background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);

    for (const item of layout.placed) {
      const x = mmToPx(item.xMm);
      const y = mmToPx(item.yMm);
      const w = mmToPx(item.widthMm);
      const h = mmToPx(item.heightMm);

      // Draw photo
      ctx.drawImage(photoCanvas, x, y, w, h);

      // Draw thin cut border
      ctx.strokeStyle = '#D1D5DB';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);

      // Draw cut guides if enabled
      if (config.showCutGuides !== false) {
        ctx.strokeStyle = '#9CA3AF';
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
        ctx.setLineDash([]);
      }
    }

    return sheetCanvas;
  }

  /**
   * Execute browser print command for target canvas
   */
  public static printCanvas(canvas: HTMLCanvasElement): void {
    const dataUrl = canvas.toDataURL('image/png');
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>PrintHub Studio - Print Spool</title>
          <style>
            @page { margin: 0; size: auto; }
            body { margin: 0; padding: 0; background: #fff; text-align: center; }
            img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" onload="window.print(); window.close();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}
