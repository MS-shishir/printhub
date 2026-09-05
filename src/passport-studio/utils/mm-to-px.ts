// ── Unit Conversion Utilities ─────────────────────────────────────────────

/** Convert millimeters to pixels at a given DPI */
export function mmToPx(mm: number, dpi: number = 96): number {
  return (mm / 25.4) * dpi;
}

/** Convert pixels to millimeters at a given DPI */
export function pxToMm(px: number, dpi: number = 96): number {
  return (px / dpi) * 25.4;
}

/** Convert millimeters to PDF points (1 pt = 1/72 inch) */
export function mmToPt(mm: number): number {
  return (mm / 25.4) * 72;
}

/** Convert PDF points to millimeters */
export function ptToMm(pt: number): number {
  return (pt / 72) * 25.4;
}

/** Screen DPI — for layout preview rendering (not print) */
export const SCREEN_DPI = 96;

/** Print DPI — standard for passport photos */
export const PRINT_DPI = 300;

/**
 * Calculate the pixel dimensions of a passport photo at print resolution
 */
export function getPhotoPxDimensions(
  widthMm: number,
  heightMm: number,
  dpi: number = PRINT_DPI
): { widthPx: number; heightPx: number } {
  return {
    widthPx: Math.round(mmToPx(widthMm, dpi)),
    heightPx: Math.round(mmToPx(heightMm, dpi)),
  };
}

/**
 * Scale factor to fit a mm dimension into a pixel container
 */
export function fitScaleFactor(
  widthMm: number,
  heightMm: number,
  containerWidthPx: number,
  containerHeightPx: number
): number {
  const scaleX = containerWidthPx / mmToPx(widthMm, SCREEN_DPI);
  const scaleY = containerHeightPx / mmToPx(heightMm, SCREEN_DPI);
  return Math.min(scaleX, scaleY);
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
