// ── Export Service ─────────────────────────────────────────────────────────
// Handles PDF, PNG, JPEG, and Print exports at precise 300 DPI.

import { PDFDocument, rgb, PDFPage } from 'pdf-lib';
import { PassportTemplate, LayoutConfig, LayoutResult } from '../types/passport-types';
import { calculateLayout } from './layout.service';
import { mmToPt, mmToPx, PRINT_DPI } from '../utils/mm-to-px';
import { loadImage, createOffscreenCanvas } from '../utils/canvas-utils';

// ── PNG / JPEG Single Photo Export ─────────────────────────────────────────

/**
 * Export a single passport photo as PNG or JPEG at 1200 DPI Ultra HD print resolution.
 * Preserves 100% crystal clear facial details, textures, and sharpness.
 * @param imageDataUrl  Cropped passport photo (data URL)
 * @param template      Active template for dimensions
 * @param format        'png' | 'jpeg'
 * @param quality       0–1 (JPEG only)
 * @param targetDpi     DPI target (default 1200 DPI Ultra HD)
 */
export async function exportSinglePhoto(
  imageDataUrl: string,
  template: PassportTemplate,
  format: 'png' | 'jpeg' = 'png',
  quality = 0.98,
  targetDpi = 1200
): Promise<void> {
  const widthPx = Math.round(mmToPx(template.widthMm, targetDpi));
  const heightPx = Math.round(mmToPx(template.heightMm, targetDpi));

  const img = await loadImage(imageDataUrl);
  // Ensure we keep the maximum available resolution between targetDpi and native image dimensions
  const finalW = Math.max(widthPx, img.naturalWidth || 0);
  const finalH = Math.max(heightPx, img.naturalHeight || 0);

  const { canvas, ctx } = createOffscreenCanvas(finalW, finalH);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, finalW, finalH);

  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const dataUrl = canvas.toDataURL(mimeType, quality);
  triggerDownload(dataUrl, `passport_${template.id}.${format}`);
}

// ── PDF Sheet Export ──────────────────────────────────────────────────────

/**
 * Export a full print sheet as PDF at exact mm dimensions and 300 DPI precision.
 */
export async function exportPDF(
  imageDataUrl: string,
  template: PassportTemplate,
  layoutConfig: LayoutConfig,
  bgColor = '#ffffff'
): Promise<void> {
  const { sharedLayoutState } = await import('../utils/shared-layout-state');
  const layout = calculateLayout(template, layoutConfig);
  const pdfDoc = await PDFDocument.create();

  const paperWMm = sharedLayoutState.paperWMm || layout.paperWidthMm;
  const paperHMm = sharedLayoutState.paperHMm || layout.paperHeightMm;

  // PDF page in points (1 pt = 1/72 inch)
  const pageWidthPt = mmToPt(paperWMm);
  const pageHeightPt = mmToPt(paperHMm);
  const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);

  const itemsToExport = (sharedLayoutState.items && sharedLayoutState.items.length > 0)
    ? sharedLayoutState.items
    : layout.placed.map((place, idx) => ({
        id: `single_${idx}`,
        url: imageDataUrl,
        name: template.name,
        xMm: place.xMm,
        yMm: place.yMm,
        widthMm: place.widthMm,
        heightMm: place.heightMm,
        rotateDegrees: layoutConfig.rotatePhotoDegrees || 0,
      }));

  // Cache embedded PDF images for unique URLs
  const imageEmbedCache = new Map<string, any>();
  const getEmbeddedImage = async (url: string) => {
    if (imageEmbedCache.has(url)) return imageEmbedCache.get(url)!;
    const imgBytes = await dataUrlToUint8Array(url);
    let embedded;
    if (url.startsWith('data:image/jpeg')) {
      embedded = await pdfDoc.embedJpg(imgBytes);
    } else {
      embedded = await pdfDoc.embedPng(imgBytes);
    }
    imageEmbedCache.set(url, embedded);
    return embedded;
  };

  const hasBorder = !!layoutConfig.showPhotoBorder && (layoutConfig.photoBorderMm ?? 1.2) > 0;
  const borderMm = hasBorder ? (layoutConfig.photoBorderMm ?? 1.2) : 0;
  const borderPt = mmToPt(borderMm);

  // Draw each placed photo
  for (const item of itemsToExport) {
    const x = mmToPt(item.xMm);
    // PDF coordinate system is bottom-left, so invert Y
    const y = pageHeightPt - mmToPt(item.yMm) - mmToPt(item.heightMm);
    const w = mmToPt(item.widthMm);
    const h = mmToPt(item.heightMm);

    // 1. Background Fill for photo
    const bg = hexToRgbNorm(bgColor);
    page.drawRectangle({ x, y, width: w, height: h, color: rgb(bg.r, bg.g, bg.b) });

    // 2. Draw Image at 100% full exact size (never shrunk)
    try {
      const embeddedImage = await getEmbeddedImage(item.url);
      if (item.rotateDegrees === 90) {
        page.drawImage(embeddedImage, {
          x: x + w,
          y,
          width: h,
          height: w,
          rotate: { type: 'degrees' as any, angle: 90 },
        });
      } else {
        page.drawImage(embeddedImage, { x, y, width: w, height: h });
      }
    } catch (err) {
      console.warn('[PDF Export] Could not embed image for item', item.id, err);
    }

    // 3. Dashed Cut lines (ডট ডট কাটলাইন) with optional offset & corner extensions
    if (layoutConfig.showCutlines) {
      const offsetPt = mmToPt(layoutConfig.cutlineOffsetMm ?? 0);
      const extPt = mmToPt(layoutConfig.cutlineExtensionMm ?? 0);
      const cutX = x - offsetPt;
      const cutY = y - offsetPt;
      const cutW = w + 2 * offsetPt;
      const cutH = h + 2 * offsetPt;
      const lineColor = rgb(0.35, 0.35, 0.35);

      // Dashed rectangle
      page.drawRectangle({
        x: cutX,
        y: cutY,
        width: cutW,
        height: cutH,
        borderColor: lineColor,
        borderWidth: 0.5,
        borderDashArray: [2.5, 2.5],
      });

      // Corner Crosshair Extensions (if extension > 0)
      if (extPt > 0) {
        // Top-Left (in PDF Y: top of cut box is cutY + cutH)
        page.drawLine({ start: { x: cutX - extPt, y: cutY + cutH }, end: { x: cutX, y: cutY + cutH }, color: lineColor, thickness: 0.5 });
        page.drawLine({ start: { x: cutX, y: cutY + cutH }, end: { x: cutX, y: cutY + cutH + extPt }, color: lineColor, thickness: 0.5 });
        // Top-Right
        page.drawLine({ start: { x: cutX + cutW, y: cutY + cutH }, end: { x: cutX + cutW + extPt, y: cutY + cutH }, color: lineColor, thickness: 0.5 });
        page.drawLine({ start: { x: cutX + cutW, y: cutY + cutH }, end: { x: cutX + cutW, y: cutY + cutH + extPt }, color: lineColor, thickness: 0.5 });
        // Bottom-Left
        page.drawLine({ start: { x: cutX - extPt, y: cutY }, end: { x: cutX, y: cutY }, color: lineColor, thickness: 0.5 });
        page.drawLine({ start: { x: cutX, y: cutY - extPt }, end: { x: cutX, y: cutY }, color: lineColor, thickness: 0.5 });
        // Bottom-Right
        page.drawLine({ start: { x: cutX + cutW, y: cutY }, end: { x: cutX + cutW + extPt, y: cutY }, color: lineColor, thickness: 0.5 });
        page.drawLine({ start: { x: cutX + cutW, y: cutY - extPt }, end: { x: cutX + cutW, y: cutY }, color: lineColor, thickness: 0.5 });
      }
    }
  }

  // Optional Print header (Only if explicitly enabled)
  if (layoutConfig.showPrintHeader) {
    page.drawText(
      `PrintHub Passport Studio — ${template.country} ${template.name} — ${itemsToExport.length} copies — 300 DPI`,
      {
        x: mmToPt(layoutConfig.marginMm || 10),
        y: pageHeightPt - mmToPt((layoutConfig.marginMm || 10) * 0.5),
        size: 6,
        color: rgb(0.5, 0.5, 0.5),
      }
    );
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `passport_${template.id}_${itemsToExport.length}copies.pdf`);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ── Printable Sheet (PrintHub Custom Print System) ───────────────────────────

/**
 * Open a 100% crisp, high-DPI print window using exact CSS millimeter layout
 * and high-resolution photo sources.
 */
export async function printPassportSheet(
  imageDataUrl: string,
  template: PassportTemplate,
  layoutConfig: LayoutConfig,
  bgColor = '#ffffff'
): Promise<void> {
  const { sharedLayoutState } = await import('../utils/shared-layout-state');
  const layout = calculateLayout(template, layoutConfig);
  const mm = (v: number) => `${v}mm`;

  const paperWMm = sharedLayoutState.paperWMm || layout.paperWidthMm;
  const paperHMm = sharedLayoutState.paperHMm || layout.paperHeightMm;
  const paperWStr = mm(paperWMm);
  const paperHStr = mm(paperHMm);

  const itemsToPrint = (sharedLayoutState.items && sharedLayoutState.items.length > 0)
    ? sharedLayoutState.items
    : layout.placed.map((place, idx) => ({
        id: `single_${idx}`,
        url: imageDataUrl,
        name: template.name,
        xMm: place.xMm,
        yMm: place.yMm,
        widthMm: place.widthMm,
        heightMm: place.heightMm,
        rotateDegrees: layoutConfig.rotatePhotoDegrees || 0,
      }));

  const offsetMm = layoutConfig.cutlineOffsetMm ?? 0;
  const extMm = layoutConfig.cutlineExtensionMm ?? 0;

  let photosHtml = '';
  for (const item of itemsToPrint) {
    const isRotated = item.rotateDegrees === 90;

    const imgStyle = isRotated
      ? `position: absolute; left: 50%; top: 50%; width: ${mm(item.heightMm)}; height: ${mm(item.widthMm)}; transform: translate(-50%, -50%) rotate(90deg); object-fit: cover;`
      : `width: 100%; height: 100%; object-fit: cover; display: block;`;

    // Dashed cutline box & Corner crosshairs in HTML/CSS
    const cutlineHtml = layoutConfig.showCutlines ? `
      <div style="
        position: absolute;
        left: -${offsetMm}mm;
        top: -${offsetMm}mm;
        width: ${item.widthMm + 2 * offsetMm}mm;
        height: ${item.heightMm + 2 * offsetMm}mm;
        border: 1px dashed rgba(0,0,0,0.45);
        pointer-events: none;
        box-sizing: border-box;
      ">
        ${extMm > 0 ? `
          <div style="position: absolute; left: -${extMm}mm; top: -1px; width: ${extMm}mm; height: 1px; background: rgba(0,0,0,0.55);"></div>
          <div style="position: absolute; left: -1px; top: -${extMm}mm; width: 1px; height: ${extMm}mm; background: rgba(0,0,0,0.55);"></div>
          <div style="position: absolute; right: -${extMm}mm; top: -1px; width: ${extMm}mm; height: 1px; background: rgba(0,0,0,0.55);"></div>
          <div style="position: absolute; right: -1px; top: -${extMm}mm; width: 1px; height: ${extMm}mm; background: rgba(0,0,0,0.55);"></div>
          <div style="position: absolute; left: -${extMm}mm; bottom: -1px; width: ${extMm}mm; height: 1px; background: rgba(0,0,0,0.55);"></div>
          <div style="position: absolute; left: -1px; bottom: -${extMm}mm; width: 1px; height: ${extMm}mm; background: rgba(0,0,0,0.55);"></div>
          <div style="position: absolute; right: -${extMm}mm; bottom: -1px; width: ${extMm}mm; height: 1px; background: rgba(0,0,0,0.55);"></div>
          <div style="position: absolute; right: -1px; bottom: -${extMm}mm; width: 1px; height: ${extMm}mm; background: rgba(0,0,0,0.55);"></div>
        ` : ''}
      </div>
    ` : '';

    photosHtml += `
      <div style="
        position: absolute;
        left: ${mm(item.xMm)};
        top: ${mm(item.yMm)};
        width: ${mm(item.widthMm)};
        height: ${mm(item.heightMm)};
        background: ${bgColor};
        box-sizing: border-box;
      ">
        ${cutlineHtml}
        <div style="width: 100%; height: 100%; overflow: hidden; position: relative;">
          <img src="${item.url}" style="${imgStyle}" />
        </div>
      </div>`;
  }

  const printHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Passport Photo Print — ${template.name}</title>
      <style>
        @page {
          margin: 0;
          size: ${paperWStr} ${paperHStr};
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        html, body {
          width: ${paperWStr};
          height: ${paperHStr};
          overflow: hidden;
          background: #ffffff;
        }
        .sheet {
          position: relative;
          width: ${paperWStr};
          height: ${paperHStr};
          background: #ffffff;
        }
      </style>
    </head>
    <body>
      <div class="sheet">${photosHtml}</div>
    </body>
    </html>`;

  // Open Custom Professional Print System Window with the passport photo print layout
  if (typeof window !== 'undefined') {
    const { sharedPrintCanvasRef } = await import('../utils/shared-canvas-ref');
    const sourceCanvas = sharedPrintCanvasRef.current;
    
    window.dispatchEvent(new CustomEvent('printhub:open-custom-print', {
      detail: {
        source: sourceCanvas ? sourceCanvas.toDataURL('image/png', 1.0) : null,
        title: `Passport_${template.country}_${template.widthMm}x${template.heightMm}mm`,
      }
    }));
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

export async function printViaIframe(htmlContent: string): Promise<void> {
  const { nativeHardwareService } = await import('../../services/nativeHardwareService');
  if (nativeHardwareService.isDesktop()) {
    await nativeHardwareService.printDirect({
      htmlContent,
      silent: true,
    });
    return;
  }

  // Web mode: open custom print modal
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('printhub:open-custom-print', {
      detail: {
        title: 'PrintHub_Studio_Document',
      }
    }));
  }
}

function triggerDownload(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function dataUrlToUint8Array(dataUrl: string): Promise<Uint8Array> {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function hexToRgbNorm(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}
