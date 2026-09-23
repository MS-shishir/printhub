/**
 * PdfEngine.ts
 * High-Performance Client-Side & Native PDF Rasterizer Engine.
 * Converts PDF pages into high-DPI (300 DPI) HTMLCanvasElement instances for Document Studio.
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure GlobalWorkerOptions for Vite & Web Browser
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  } catch (err) {
    console.warn('PDF.js worker initialization note:', err);
  }
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
   * Convert file/blob/buffer to base64 data URL
   */
  private static async toBase64(source: ArrayBuffer | Uint8Array | Blob | File | string): Promise<string> {
    if (typeof source === 'string') {
      if (source.startsWith('data:')) return source;
      const res = await fetch(source);
      const blob = await res.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else if (source instanceof Blob || source instanceof File) {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(source);
      });
    } else {
      const bytes = source instanceof Uint8Array ? source : new Uint8Array(source);
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return `data:application/pdf;base64,${btoa(binary)}`;
    }
  }

  /**
   * Load and render all pages of a PDF into high-resolution HTML5 Canvases (default 300 DPI)
   * Supports both Electron Native Bridge (PDFium) and In-Process Client-Side Rendering.
   */
  public static async renderPdfToCanvases(
    source: ArrayBuffer | Uint8Array | Blob | File | string,
    dpi: number = 300
  ): Promise<PdfPageResult[]> {
    // ── 1. Try Native Electron Bridge (100% Reliable & Fast in Desktop .exe via PDFium) ──
    if (typeof window !== 'undefined' && (window as any).electronAPI?.renderPdfPages) {
      try {
        const base64Data = await PdfEngine.toBase64(source);
        const nativePages = await (window as any).electronAPI.renderPdfPages({
          dataBase64: base64Data,
          dpi,
        });

        if (nativePages && Array.isArray(nativePages) && nativePages.length > 0) {
          const results: PdfPageResult[] = [];
          for (const p of nativePages) {
            const canvas = document.createElement('canvas');
            canvas.width = p.width;
            canvas.height = p.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              if (p.rgba) {
                let rawBytes: Uint8Array;
                if (p.rgba instanceof Uint8Array) {
                  rawBytes = p.rgba;
                } else if (p.rgba?.data && (Array.isArray(p.rgba.data) || p.rgba.data instanceof Uint8Array)) {
                  rawBytes = new Uint8Array(p.rgba.data);
                } else if (Array.isArray(p.rgba)) {
                  rawBytes = new Uint8Array(p.rgba);
                } else {
                  rawBytes = new Uint8Array(p.rgba);
                }
                const imgData = ctx.createImageData(p.width, p.height);
                imgData.data.set(rawBytes);
                ctx.putImageData(imgData, 0, 0);
              } else if (p.dataUrl) {
                const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                  const image = new Image();
                  image.onload = () => resolve(image);
                  image.onerror = reject;
                  image.src = p.dataUrl;
                });
                ctx.drawImage(img, 0, 0);
              }
            }

            results.push({
              pageNumber: p.pageNumber,
              canvas,
              width: canvas.width,
              height: canvas.height,
            });
          }
          return results;
        }
      } catch (nativeErr) {
        console.warn('Native Electron PDF bridge exception, falling back to in-browser engine:', nativeErr);
      }
    }

    // ── 2. In-Process Client-Side Renderer (Browser / Fallback) ──
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

    const uint8Data = data instanceof Uint8Array ? data : new Uint8Array(data);
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Data,
      cMapPacked: true,
      useSystemFonts: true,
    });

    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    const results: PdfPageResult[] = [];
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

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvas,
        canvasContext: ctx,
        viewport,
      } as any).promise;

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
