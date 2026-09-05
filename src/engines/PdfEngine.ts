/**
 * PdfEngine.ts
 * High-Performance Client-Side PDF Rasterizer & Multi-Page Decoder.
 * Converts PDF pages into high-DPI (300 DPI) HTMLCanvasElement instances for Document Studio.
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Configure PDF.js Worker
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export interface PdfPageResult {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export class PdfEngine {
  /**
   * Check if a given file or mime type is a PDF
   */
  public static isPdf(file: File | Blob | string): boolean {
    if (typeof file === 'string') {
      return file.toLowerCase().endsWith('.pdf') || file.toLowerCase().startsWith('data:application/pdf');
    }
    const name = (file as File).name || '';
    return file.type === 'application/pdf' || name.toLowerCase().endsWith('.pdf');
  }

  /**
   * Load and render all pages of a PDF into high-resolution HTML5 Canvases (default 300 DPI)
   * @param source ArrayBuffer, Uint8Array, Blob, File, or base64 data URL
   * @param dpi Target rendering DPI (default 300 DPI, 72 pt is 1.0x scale, so 300 DPI = ~4.167x scale)
   */
  public static async renderPdfToCanvases(
    source: ArrayBuffer | Uint8Array | Blob | File | string,
    dpi: number = 300
  ): Promise<PdfPageResult[]> {
    let data: ArrayBuffer | Uint8Array;

    if (source instanceof Blob || source instanceof File) {
      data = await source.arrayBuffer();
    } else if (typeof source === 'string') {
      if (source.startsWith('data:')) {
        const base64 = source.split(',')[1];
        const binaryStr = atob(base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        data = bytes.buffer;
      } else {
        const res = await fetch(source);
        data = await res.arrayBuffer();
      }
    } else {
      data = source;
    }

    const loadingTask = pdfjsLib.getDocument({ data });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    const results: PdfPageResult[] = [];

    // Scale factor: standard PDF unit is 72 points/inch. Target DPI / 72 gives scale.
    // For 300 DPI, scale = 300 / 72 ≈ 4.166667
    // Cap maximum dimension to 4096 to prevent exceeding browser canvas limits on huge blueprints
    const targetScale = dpi / 72;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const unscaledViewport = page.getViewport({ scale: 1.0 });

      let scale = targetScale;
      const maxDim = Math.max(unscaledViewport.width, unscaledViewport.height);
      if (maxDim * scale > 4096) {
        scale = 4096 / maxDim;
      }

      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) continue;

      // Fill white background (PDFs often have transparent background)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      await (page.render(renderContext as any) as any).promise;

      results.push({
        pageNumber: pageNum,
        canvas,
        width: canvas.width,
        height: canvas.height,
      });
    }

    return results;
  }
}
