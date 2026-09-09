import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';

// Let's load the user's uploaded couple photo
const imgPath = 'scratch/couple_photo.png';
const img = await loadImage(imgPath);
const w = img.width;
const h = img.height;
console.log(`Original image size: ${w}x${h}`);

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

// Sample background palette from top corners & top perimeter
const canvas = createCanvas(w, h);
const ctx = canvas.getContext('2d');
ctx.drawImage(img, 0, 0);
const imgData = ctx.getImageData(0, 0, w, h);
const data = imgData.data;

const rawBgSamples = [];
const addBg = (x, y) => {
  if (x >= 0 && x < w && y >= 0 && y < h) {
    const idx = (y * w + x) * 4;
    rawBgSamples.push(rgbToLab(data[idx], data[idx + 1], data[idx + 2]));
  }
};

// Sample top strip
for (let y = 0; y < Math.max(4, Math.round(h * 0.05)); y++) {
  for (let x = 0; x < w; x += Math.max(1, Math.round(w / 40))) {
    addBg(x, y);
  }
}
// Sample top corners
for (let y = 0; y < Math.round(h * 0.2); y += 2) {
  for (let x = 0; x < Math.round(w * 0.15); x += 2) {
    addBg(x, y);
    addBg(w - 1 - x, y);
  }
}

let sumR = 0, sumG = 0, sumB = 0, cnt = 0;
for (let y = 0; y < 10; y++) {
  for (let x = 0; x < 10; x++) {
    const idx = (y * w + x) * 4;
    sumR += data[idx]; sumG += data[idx + 1]; sumB += data[idx + 2];
    cnt++;
  }
}
const avgBgR = sumR / cnt;
const avgBgG = sumG / cnt;
const avgBgB = sumB / cnt;
console.log(`Average background RGB: (${avgBgR.toFixed(1)}, ${avgBgG.toFixed(1)}, ${avgBgB.toFixed(1)})`);

