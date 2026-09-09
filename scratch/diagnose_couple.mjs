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

function deltaEWeighted(c1, c2, wL = 1.0, wAB = 1.2) {
  const dl = (c1.l - c2.l) * wL;
  const da = (c1.a - c2.a) * wAB;
  const db = (c1.b - c2.b) * wAB;
  return Math.sqrt(dl * dl + da * da + db * db);
}

const img = await loadImage('scratch/couple_photo.png');
const w = img.width, h = img.height;
const canvas = createCanvas(w, h);
const ctx = canvas.getContext('2d');
ctx.drawImage(img, 0, 0);
const data = ctx.getImageData(0, 0, w, h).data;

console.log(`Couple image size: ${w}x${h}`);

// Let's sample colors in the center (x: 50%w, y: 38%h)
const cIdx = (Math.floor(h * 0.38) * w + Math.floor(w * 0.5)) * 4;
console.log(`Center (x=50%w, y=38%h): RGB(${data[cIdx]}, ${data[cIdx+1]}, ${data[cIdx+2]}) -> Between heads!`);

// Man face center (x: ~25%w, y: ~40%h)
const mIdx = (Math.floor(h * 0.40) * w + Math.floor(w * 0.25)) * 4;
console.log(`Man face (x=25%w, y=40%h): RGB(${data[mIdx]}, ${data[mIdx+1]}, ${data[mIdx+2]})`);

// Woman face center (x: ~70%w, y: ~40%h)
const wIdx = (Math.floor(h * 0.40) * w + Math.floor(w * 0.70)) * 4;
console.log(`Woman face (x=70%w, y=40%h): RGB(${data[wIdx]}, ${data[wIdx+1]}, ${data[wIdx+2]})`);

// Man's hair (x: ~25%w, y: ~22%h)
const hIdx = (Math.floor(h * 0.22) * w + Math.floor(w * 0.25)) * 4;
console.log(`Man hair (x=25%w, y=22%h): RGB(${data[hIdx]}, ${data[hIdx+1]}, ${data[hIdx+2]})`);

// Background top left (x: 5, y: 5)
const tlIdx = 0;
console.log(`Top Left BG: RGB(${data[tlIdx]}, ${data[tlIdx+1]}, ${data[tlIdx+2]})`);
