import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';

function rgbToLab(r, g, b) {
  let lr = r / 255, lg = g / 255, lb = b / 255;
  lr = lr > 0.04045 ? Math.pow((lr + 0.055) / 1.055, 2.4) : lr / 12.92;
  lg = lg > 0.04045 ? Math.pow((lg + 0.055) / 1.055, 2.4) : lg / 12.92;
  lb = lb > 0.04045 ? Math.pow((lb + 0.055) / 1.055, 2.4) : lb / 12.92;

  const x = (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) * 100;
  const y = (lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750) * 100;
  const z = (lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041) * 100;

  const xr = x / 95.047, yr = y / 100.0, zr = z / 108.883;
  const eps = 0.008856, kappa = 903.3;

  const fx = xr > eps ? Math.cbrt(xr) : (kappa * xr + 16) / 116;
  const fy = yr > eps ? Math.cbrt(yr) : (kappa * yr + 16) / 116;
  const fz = zr > eps ? Math.cbrt(zr) : (kappa * zr + 16) / 116;

  return {
    l: Math.max(0, 116 * fy - 16),
    a: 500 * (fx - fy),
    b: 200 * (fy - fz)
  };
}

function deltaEWeighted(c1, c2, wL = 1.0, wC = 1.25) {
  const dl = (c1.l - c2.l) * wL;
  const da = c1.a - c2.a;
  const db = c1.b - c2.b;
  return Math.sqrt(dl * dl + (da * da + db * db) * (wC * wC));
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

console.log('Testing Edge Refinement Model...');
