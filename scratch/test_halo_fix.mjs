import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';

function rgbToLab(r, g, b) {
  let rn = r / 255, gn = g / 255, bn = b / 255;
  rn = rn > 0.04045 ? Math.pow((rn + 0.055) / 1.055, 2.4) : rn / 12.92;
  gn = gn > 0.04045 ? Math.pow((gn + 0.055) / 1.055, 2.4) : gn / 12.92;
  bn = bn > 0.04045 ? Math.pow((bn + 0.055) / 1.055, 2.4) : bn / 12.92;

  let x = (rn * 0.4124564 + gn * 0.3575761 + bn * 0.1804375) / 0.95047;
  let y = (rn * 0.2126729 + gn * 0.7151522 + bn * 0.0721750) / 1.00000;
  let z = (rn * 0.0193339 + gn * 0.1191920 + bn * 0.9503041) / 1.08883;

  const f = (t) => t > 0.008856 ? Math.cbrt(t) : (7.787 * t) + (16 / 116);
  const fx = f(x), fy = f(y), fz = f(z);

  return {
    l: Math.max(0, Math.min(100, (116 * fy) - 16)),
    a: (500 * (fx - fy)),
    b: (200 * (fy - fz))
  };
}

function deltaEWeighted(c1, c2, wL = 1.0, wAB = 1.25) {
  const dl = (c1.l - c2.l) * wL;
  const da = (c1.a - c2.a) * wAB;
  const db = (c1.b - c2.b) * wAB;
  return Math.sqrt(dl * dl + da * da + db * db);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// Let's test the halo trimming logic on couple photo
console.log('Testing Zero-Halo refinement...');
