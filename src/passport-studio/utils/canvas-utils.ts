// ── Canvas Utilities ──────────────────────────────────────────────────────

/**
 * Load an image from a URL/dataURL and return an HTMLImageElement.
 * Handles CORS and blob URLs gracefully.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Only set crossOrigin for non-blob URLs to avoid tainting
    if (!src.startsWith('blob:') && !src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load image: ${src} — ${e}`));
    img.src = src;
  });
}

/**
 * Create an offscreen canvas with given dimensions and return ctx.
 */
export function createOffscreenCanvas(
  width: number,
  height: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  return { canvas, ctx };
}

/**
 * Draw an image centered and cropped to fill a target canvas region.
 * Maintains aspect ratio (cover mode).
 */
export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  destX: number,
  destY: number,
  destW: number,
  destH: number
): void {
  const scaleX = destW / img.naturalWidth;
  const scaleY = destH / img.naturalHeight;
  const scale = Math.max(scaleX, scaleY);
  const srcW = destW / scale;
  const srcH = destH / scale;
  const srcX = (img.naturalWidth - srcW) / 2;
  const srcY = (img.naturalHeight - srcH) / 2;
  ctx.drawImage(img, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
}

/**
 * Draw rounded rectangle path (for safe area overlays).
 */
export function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Convert a canvas to a base64 data URL at given quality.
 */
export function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  format: 'png' | 'jpeg' = 'png',
  quality = 0.95
): string {
  return canvas.toDataURL(`image/${format}`, quality);
}

/**
 * Get image data from a canvas for pixel manipulation.
 * Safe — returns null if canvas is tainted.
 */
export function safeGetImageData(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number
): ImageData | null {
  try {
    return ctx.getImageData(x, y, w, h);
  } catch {
    return null;
  }
}

/**
 * Sample a single pixel color from a canvas at (x, y).
 */
export function samplePixel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
): { r: number; g: number; b: number; a: number } | null {
  const data = safeGetImageData(ctx, Math.floor(x), Math.floor(y), 1, 1);
  if (!data) return null;
  return { r: data.data[0], g: data.data[1], b: data.data[2], a: data.data[3] };
}

/**
 * Draw dashed cut-line border on a canvas context.
 */
export function drawCutLine(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  color = 'rgba(0,0,0,0.35)'
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  ctx.setLineDash([3, 3]);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}
