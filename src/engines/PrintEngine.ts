/**
 * PrintEngine.ts - Production Print Spooling & Grid Engine
 * Paper sheet layout calculator, Passport 4R/A4 photo auto-tiling & cut markers.
 */

export interface PrintGridConfig {
  paperSize: '4R' | 'A4' | 'Legal' | 'Stamp';
  photoCount: 4 | 8 | 12 | 16 | 32;
  copies: number;
  showCutGuides?: boolean;
}

export class PrintEngine {
  /**
   * Render multiple passport photo copies onto a high-res paper sheet canvas (300 DPI)
   */
  public static generatePrintSheet(
    photoCanvas: HTMLCanvasElement,
    config: PrintGridConfig
  ): HTMLCanvasElement {
    // 300 DPI Paper Dimensions (in pixels)
    // 4R = 4" x 6" -> 1200px x 1800px
    // A4 = 8.27" x 11.69" -> 2480px x 3508px
    const paperDimensions = {
      '4R': { width: 1200, height: 1800 },
      'A4': { width: 2480, height: 3508 },
      'Legal': { width: 2550, height: 4200 },
      'Stamp': { width: 2480, height: 3508 },
    };

    const targetDim = paperDimensions[config.paperSize] || paperDimensions['4R'];
    const sheetCanvas = document.createElement('canvas');
    sheetCanvas.width = targetDim.width;
    sheetCanvas.height = targetDim.height;

    const ctx = sheetCanvas.getContext('2d');
    if (!ctx) return photoCanvas;

    // Fill clean white paper background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);

    // Standard BD Passport Photo @ 300 DPI: 35mm x 45mm -> 413px x 531px
    const photoWidth = 413;
    const photoHeight = 531;

    const marginX = 80;
    const marginY = 100;
    const gapX = 40;
    const gapY = 40;

    let maxCols = Math.floor((targetDim.width - marginX * 2 + gapX) / (photoWidth + gapX));
    if (maxCols < 1) maxCols = 1;

    const countToDraw = Math.min(config.photoCount, 32);

    for (let i = 0; i < countToDraw; i++) {
      const col = i % maxCols;
      const row = Math.floor(i / maxCols);

      const x = marginX + col * (photoWidth + gapX);
      const y = marginY + row * (photoHeight + gapY);

      // Draw photo
      ctx.drawImage(photoCanvas, x, y, photoWidth, photoHeight);

      // Draw thin cut border
      ctx.strokeStyle = '#D1D5DB';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, photoWidth, photoHeight);

      // Draw cut guides if enabled
      if (config.showCutGuides !== false) {
        ctx.strokeStyle = '#9CA3AF';
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x - 2, y - 2, photoWidth + 4, photoHeight + 4);
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
