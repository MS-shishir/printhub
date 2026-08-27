/**
 * ExportEngine.ts - Production File Export Engine
 * Exports canvas content to high-res PNG, JPEG, SVG, or PDF with DPI scaling.
 */

import { PDFDocument } from 'pdf-lib';

export interface ExportOptions {
  fileName: string;
  format: 'png' | 'jpeg' | 'pdf' | 'svg';
  quality?: number; // 0.1 to 1.0
  dpiScale?: number; // 1 = 72DPI, 4.16 = 300DPI
}

export class ExportEngine {
  /**
   * Export an HTMLCanvasElement to a downloadable file
   */
  public static async exportCanvas(
    sourceCanvas: HTMLCanvasElement,
    options: ExportOptions
  ): Promise<void> {
    const fileName = options.fileName || 'export_file';
    const quality = options.quality !== undefined ? options.quality : 0.95;
    const dpiScale = options.dpiScale || 1;

    let canvasToExport = sourceCanvas;

    // Scale canvas if high DPI is requested
    if (dpiScale > 1) {
      const scaled = document.createElement('canvas');
      scaled.width = sourceCanvas.width * dpiScale;
      scaled.height = sourceCanvas.height * dpiScale;
      const ctx = scaled.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(sourceCanvas, 0, 0, scaled.width, scaled.height);
        canvasToExport = scaled;
      }
    }

    if (options.format === 'pdf') {
      const imgDataUrl = canvasToExport.toDataURL('image/jpeg', quality);
      const base64Data = imgDataUrl.split(',')[1];
      const imgBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      const pdfDoc = await PDFDocument.create();
      const image = await pdfDoc.embedJpg(imgBytes);
      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      this.triggerDownload(blob, `${fileName}.pdf`);
      return;
    }

    const mimeType = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
    canvasToExport.toBlob((blob) => {
      if (blob) {
        this.triggerDownload(blob, `${fileName}.${options.format}`);
      }
    }, mimeType, quality);
  }

  private static triggerDownload(blob: Blob, fileName: string) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }
}
