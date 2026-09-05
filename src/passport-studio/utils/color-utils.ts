// ── Color Utilities ─────────────────────────────────────────────────────

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface RGBA extends RGB {
  a: number;
}

/** Parse any CSS color string to RGB object */
export function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  const n = parseInt(full, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

/** Convert RGB to hex */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
}

/** Clamp helper */
function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Euclidean distance² in RGB color space */
export function colorDistanceSq(a: RGB, b: RGB): number {
  return (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;
}

/**
 * Checks if two colors are within tolerance (0–100 scale)
 * Internally maps tolerance to 0–195075 range (max RGB distance²)
 */
export function isColorWithinTolerance(pixel: RGB, key: RGB, tolerance: number): boolean {
  const maxDist = 195075; // 255² * 3
  const threshold = (tolerance / 100) * maxDist;
  return colorDistanceSq(pixel, key) <= threshold;
}

/** Adjust color brightness by a factor (1.0 = no change) */
export function adjustBrightness(hex: string, factor: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * factor, g * factor, b * factor);
}

/** Common passport background colors */
export const PRESET_BACKGROUNDS: Array<{ name: string; hex: string }> = [
  { name: 'White',      hex: '#ffffff' },
  { name: 'Blue',       hex: '#2563eb' },
  { name: 'Red',        hex: '#dc2626' },
  { name: 'Gray',       hex: '#9ca3af' },
  { name: 'Light Blue', hex: '#93c5fd' },
  { name: 'Off-White',  hex: '#f8fafc' },
];
