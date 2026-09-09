// ── Color Utilities ─────────────────────────────────────────────────────

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface RGBA extends RGB {
  a: number;
}

export interface LAB {
  l: number; // 0 to 100
  a: number; // -128 to 127
  b: number; // -128 to 127
}

export interface HSV {
  h: number; // 0 to 360
  s: number; // 0 to 1
  v: number; // 0 to 1
}

/** Clamp helper */
export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
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

/** Euclidean distance² in RGB color space */
export function colorDistanceSq(a: RGB, b: RGB): number {
  return (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;
}

/**
 * Convert sRGB to CIE-L*a*b* (D65 standard illuminant)
 * Mathematically accurate perceptual color space
 */
export function rgbToLab(r: number, g: number, b: number): LAB {
  // 1. Inverse sRGB gamma companding to linear RGB
  let lr = r / 255;
  let lg = g / 255;
  let lb = b / 255;

  lr = lr > 0.04045 ? Math.pow((lr + 0.055) / 1.055, 2.4) : lr / 12.92;
  lg = lg > 0.04045 ? Math.pow((lg + 0.055) / 1.055, 2.4) : lg / 12.92;
  lb = lb > 0.04045 ? Math.pow((lb + 0.055) / 1.055, 2.4) : lb / 12.92;

  // 2. Linear RGB to CIE XYZ (Observer = 2°, Illuminant = D65)
  const x = (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) * 100;
  const y = (lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750) * 100;
  const z = (lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041) * 100;

  // 3. CIE XYZ to CIE L*a*b* (D65 reference white: Xn=95.047, Yn=100.0, Zn=108.883)
  const xr = x / 95.047;
  const yr = y / 100.0;
  const zr = z / 108.883;

  const eps = 0.008856; // (6/29)^3
  const kappa = 903.3;  // (29/3)^3 * 8

  const fx = xr > eps ? Math.cbrt(xr) : (kappa * xr + 16) / 116;
  const fy = yr > eps ? Math.cbrt(yr) : (kappa * yr + 16) / 116;
  const fz = zr > eps ? Math.cbrt(zr) : (kappa * zr + 16) / 116;

  const l = Math.max(0, 116 * fy - 16);
  const a = 500 * (fx - fy);
  const bVal = 200 * (fy - fz);

  return { l, a, b: bVal };
}

/** Perceptual Delta E (CIE76 distance in L*a*b* space) */
export function deltaE76(c1: LAB, c2: LAB): number {
  const dl = c1.l - c2.l;
  const da = c1.a - c2.a;
  const db = c1.b - c2.b;
  return Math.sqrt(dl * dl + da * da + db * db);
}

/** Weighted Delta E with lightness scaling */
export function deltaEWeighted(c1: LAB, c2: LAB, wL = 1.0, wC = 1.2): number {
  const dl = (c1.l - c2.l) * wL;
  const da = c1.a - c2.a;
  const db = c1.b - c2.b;
  return Math.sqrt(dl * dl + (da * da + db * db) * (wC * wC));
}

/** Convert RGB to HSV color space */
export function rgbToHsv(r: number, g: number, b: number): HSV {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;

  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const delta = max - min;

  let h = 0;
  if (delta > 0.00001) {
    if (max === nr) {
      h = 60 * (((ng - nb) / delta) % 6);
    } else if (max === ng) {
      h = 60 * ((nb - nr) / delta + 2);
    } else {
      h = 60 * ((nr - ng) / delta + 4);
    }
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h, s, v };
}

/**
 * Color-Line Alpha Estimation:
 * Projects observed pixel I onto the line segment connecting local Background (B) and local Foreground (F).
 * I = alpha * F + (1 - alpha) * B  =>  alpha = ((I - B) . (F - B)) / ||F - B||^2
 */
export function estimateColorLineAlpha(
  iR: number, iG: number, iB: number,
  bgR: number, bgG: number, bgB: number,
  fgR: number, fgG: number, fgB: number
): number {
  const vR = fgR - bgR;
  const vG = fgG - bgG;
  const vB = fgB - bgB;
  const denom = vR * vR + vG * vG + vB * vB;

  if (denom < 10) {
    // If foreground and background are nearly identical, fall back to luminance / Euclidean ratio
    return 0.5;
  }

  const pR = iR - bgR;
  const pG = iG - bgG;
  const pB = iB - bgB;
  const dot = pR * vR + pG * vG + pB * vB;

  return clamp(dot / denom, 0, 1);
}

/**
 * Color Decontamination / Despill Model:
 * Given observed pixel C, estimated alpha, and local background color B:
 * F_est = [C - (1 - alpha) * B] / alpha
 * Clamps result safely to [0, 255] and blends with observed pixel by strength.
 */
export function decontaminatePixel(
  cR: number, cG: number, cB: number,
  bgR: number, bgG: number, bgB: number,
  alpha: number,
  strength = 1.0,
  epsilon = 0.08
): RGB {
  if (alpha <= epsilon) {
    return { r: cR, g: cG, b: cB };
  }

  const clampedAlpha = Math.max(epsilon, Math.min(1.0, alpha));
  const oneMinusAlpha = 1.0 - clampedAlpha;

  const rawR = (cR - oneMinusAlpha * bgR) / clampedAlpha;
  const rawG = (cG - oneMinusAlpha * bgG) / clampedAlpha;
  const rawB = (cB - oneMinusAlpha * bgB) / clampedAlpha;

  const pureEstR = clamp(Math.round(rawR), 0, 255);
  const pureEstG = clamp(Math.round(rawG), 0, 255);
  const pureEstB = clamp(Math.round(rawB), 0, 255);

  return {
    r: Math.round(cR * (1 - strength) + pureEstR * strength),
    g: Math.round(cG * (1 - strength) + pureEstG * strength),
    b: Math.round(cB * (1 - strength) + pureEstB * strength),
  };
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

