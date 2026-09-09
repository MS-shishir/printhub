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

function clusterColorSamples(samples, maxK = 16) {
  if (samples.length <= maxK) return samples;
  const centroids = [];
  const step = Math.floor(samples.length / maxK);
  for (let i = 0; i < maxK; i++) {
    centroids.push({ ...samples[i * step] });
  }
  return centroids;
}

export function universalMatting(imgCanvas, options = {}) {
  const ctx = imgCanvas.getContext('2d');
  const w = imgCanvas.width, h = imgCanvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const userTolerance = options.tolerance ?? 38; // 1..100
  const edgeRadius = options.edgeRadius ?? 2;
  const haloSuppression = options.haloSuppression ?? 0.85;
  const decontamStrength = options.decontamStrength ?? 0.95;

  // 1. Unconditionally sample the outer perimeter to build the Background Model
  const rawBgSamples = [];
  const addBg = (x, y) => {
    if (x >= 0 && x < w && y >= 0 && y < h) {
      const idx = (y * w + x) * 4;
      rawBgSamples.push(rgbToLab(data[idx], data[idx + 1], data[idx + 2]));
    }
  };

  // Top perimeter strip (top 3% of height)
  const topH = Math.max(4, Math.round(h * 0.04));
  for (let y = 0; y < topH; y++) {
    for (let x = 0; x < w; x += Math.max(1, Math.round(w / 60))) {
      addBg(x, y);
    }
  }

  // Top left & top right corner blocks (15% width, 25% height)
  const cW = Math.max(8, Math.round(w * 0.15));
  const cH = Math.max(8, Math.round(h * 0.25));
  for (let y = 0; y < cH; y += 2) {
    for (let x = 0; x < cW; x += 2) {
      addBg(x, y);
      addBg(w - 1 - x, y);
    }
  }

  // Side perimeter columns (upper 50% height)
  const sideW = Math.max(4, Math.round(w * 0.04));
  for (let y = 0; y < Math.round(h * 0.50); y += 2) {
    for (let x = 0; x < sideW; x++) {
      addBg(x, y);
      addBg(w - 1 - x, y);
    }
  }

  if (rawBgSamples.length === 0) {
    rawBgSamples.push(rgbToLab(250, 250, 250));
  }

  const bgPalette = clusterColorSamples(rawBgSamples, 16);

  // Compute average corner RGB & background variance
  let sumR = 0, sumG = 0, sumB = 0, count = 0;
  for (let y = 0; y < Math.min(8, h); y++) {
    for (let x = 0; x < Math.min(8, w); x++) {
      const idx = (y * w + x) * 4;
      sumR += data[idx]; sumG += data[idx + 1]; sumB += data[idx + 2];
      count++;
    }
  }
  const avgBgR = sumR / (count || 1);
  const avgBgG = sumG / (count || 1);
  const avgBgB = sumB / (count || 1);

  // Chroma flags
  const isChromaBlue = avgBgB > avgBgR + 25 && avgBgB > avgBgG + 15;
  const isChromaGreen = avgBgG > avgBgR + 25 && avgBgG > avgBgB + 15;

  // Measure background color variance (how uniform is the background?)
  let maxBgSpread = 0;
  for (let i = 0; i < bgPalette.length; i++) {
    for (let j = i + 1; j < bgPalette.length; j++) {
      const d = deltaEWeighted(bgPalette[i], bgPalette[j], 1.0, 1.2);
      if (d > maxBgSpread) maxBgSpread = d;
    }
  }

  // Base threshold: adaptive based on background spread and user tolerance
  // e.g. for pure white / studio blue (spread < 8), base threshold ~ 16..22
  // for textured wall (spread ~ 25), base threshold ~ 28..36
  const baseTol = Math.max(16, Math.min(45, maxBgSpread * 1.3 + (userTolerance / 100) * 18));

  // Compute distance from any RGB pixel to the background model
  const getBgDistance = (r, g, b) => {
    if (isChromaBlue) {
      const maxRG = Math.max(r, g);
      if (b >= 95 && (b - maxRG) >= 18) return 0; // Perfect blue match
      return 100; // Definitely foreground
    }
    if (isChromaGreen) {
      const maxRB = Math.max(r, b);
      if (g >= 95 && (g - maxRB) >= 18) return 0; // Perfect green match
      return 100; // Definitely foreground
    }

    const pLab = rgbToLab(r, g, b);
    let minD = 999;
    for (let i = 0; i < bgPalette.length; i++) {
      const d = deltaEWeighted(pLab, bgPalette[i], 1.0, 1.25);
      if (d < minD) {
        minD = d;
        if (d < 2.5) break;
      }
    }
    return minD;
  };

  // 2. Wavefront BFS Propagation strictly from exterior boundary
  const isExteriorBg = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let qHead = 0, qTail = 0;

  const pushSeed = (x, y) => {
    const idx = y * w + x;
    if (isExteriorBg[idx] === 0) {
      isExteriorBg[idx] = 1;
      queue[qTail++] = idx;
    }
  };

  // Seed top boundary pixels that match background
  for (let x = 0; x < w; x++) {
    const p4 = x * 4;
    const dist = getBgDistance(data[p4], data[p4 + 1], data[p4 + 2]);
    if (dist <= baseTol * 1.1) {
      pushSeed(x, 0);
    }
  }

  // Seed left and right outer columns (upper 60% of height)
  const maxSideY = Math.round(h * 0.60);
  for (let y = 0; y < maxSideY; y++) {
    const l4 = (y * w + 0) * 4;
    if (getBgDistance(data[l4], data[l4 + 1], data[l4 + 2]) <= baseTol * 1.1) {
      pushSeed(0, y);
    }
    const r4 = (y * w + (w - 1)) * 4;
    if (getBgDistance(data[r4], data[r4 + 1], data[r4 + 2]) <= baseTol * 1.1) {
      pushSeed(w - 1, y);
    }
  }

  if (qTail === 0) {
    pushSeed(0, 0);
    pushSeed(w - 1, 0);
  }

  // Wavefront BFS Expansion
  while (qHead < qTail) {
    const currIdx = queue[qHead++];
    const curX = currIdx % w;
    const curY = Math.floor(currIdx / w);

    const neighbors = [
      curX > 0 ? currIdx - 1 : -1,
      curX < w - 1 ? currIdx + 1 : -1,
      curY > 0 ? currIdx - w : -1,
      curY < h - 1 ? currIdx + w : -1,
    ];

    for (let i = 0; i < 4; i++) {
      const nIdx = neighbors[i];
      if (nIdx === -1 || isExteriorBg[nIdx] === 1) continue;

      const p4 = nIdx * 4;
      const nr = data[p4], ng = data[p4 + 1], nb = data[p4 + 2];

      const dist = getBgDistance(nr, ng, nb);

      // Definite Foreground Barrier:
      // If color distance from background exceeds tolerance, STOP. It cannot be background!
      if (dist > baseTol) {
        continue;
      }

      isExteriorBg[nIdx] = 1;
      queue[qTail++] = nIdx;
    }
  }

  // 3. Morphological Cleanup on Binary Mask
  const rawFgMask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    rawFgMask[i] = isExteriorBg[i] === 1 ? 0 : 255;
  }

  // Fill enclosed holes inside foreground (e.g. tiny speckles inside hair/clothes)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (rawFgMask[idx] === 0) {
        const fgNeighborCount = (rawFgMask[idx - 1] === 255 ? 1 : 0) +
                               (rawFgMask[idx + 1] === 255 ? 1 : 0) +
                               (rawFgMask[idx - w] === 255 ? 1 : 0) +
                               (rawFgMask[idx + w] === 255 ? 1 : 0);
        if (fgNeighborCount >= 3) {
          rawFgMask[idx] = 255; // Fill hole
        }
      }
    }
  }

  // 4. Unknown Transition Band (Trimap Omega) via Erosion & Dilation
  const erodeMask = new Uint8Array(w * h);
  const dilateMask = new Uint8Array(w * h);
  const r = edgeRadius;

  for (let y = 0; y < h; y++) {
    const yMin = Math.max(0, y - r), yMax = Math.min(h - 1, y + r);
    for (let x = 0; x < w; x++) {
      const xMin = Math.max(0, x - r), xMax = Math.min(w - 1, x + r);
      let allFg = 1, anyFg = 0;
      for (let ny = yMin; ny <= yMax; ny++) {
        const rowOff = ny * w;
        for (let nx = xMin; nx <= xMax; nx++) {
          const val = rawFgMask[rowOff + nx];
          if (val === 0) allFg = 0;
          if (val === 255) anyFg = 1;
        }
      }
      const idx = y * w + x;
      erodeMask[idx] = allFg ? 255 : 0;
      dilateMask[idx] = anyFg ? 255 : 0;
    }
  }

  // 5. Continuous Alpha Matting, Color Decontamination & Edge Softening
  const alphaMatte = new Float32Array(w * h);
  const decontamR = new Uint8Array(w * h);
  const decontamG = new Uint8Array(w * h);
  const decontamB = new Uint8Array(w * h);

  for (let i = 0; i < w * h; i++) {
    const idx4 = i * 4;
    decontamR[i] = data[idx4];
    decontamG[i] = data[idx4 + 1];
    decontamB[i] = data[idx4 + 2];
    if (erodeMask[i] === 255) {
      alphaMatte[i] = 1.0;
    } else if (dilateMask[i] === 0) {
      alphaMatte[i] = 0.0;
    } else {
      alphaMatte[i] = -1.0; // Unknown edge
    }
  }

  const searchRadius = r + 4;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const pIdx = y * w + x;
      if (alphaMatte[pIdx] >= 0) continue;

      const p4 = pIdx * 4;
      const pr = data[p4], pg = data[p4 + 1], pb = data[p4 + 2];

      const dist = getBgDistance(pr, pg, pb);

      // Smooth continuous alpha ramp across edge band
      let alpha = clamp((dist - (baseTol * 0.3)) / (baseTol * 0.7 + 0.0001), 0, 1);

      // Fringe / Halo suppression
      if (haloSuppression > 0 && alpha < 0.80) {
        if (dist < baseTol * 0.6) {
          alpha = Math.max(0, alpha * (1.0 - haloSuppression * 0.5));
        }
      }

      // Color Decontamination (Unmix spilled background light)
      if (alpha > 0.05 && alpha < 0.95 && decontamStrength > 0) {
        const estR = (pr - (1.0 - alpha) * avgBgR) / alpha;
        const estG = (pg - (1.0 - alpha) * avgBgG) / alpha;
        const estB = (pb - (1.0 - alpha) * avgBgB) / alpha;
        decontamR[pIdx] = Math.round(clamp(pr * (1.0 - decontamStrength) + estR * decontamStrength, 0, 255));
        decontamG[pIdx] = Math.round(clamp(pg * (1.0 - decontamStrength) + estG * decontamStrength, 0, 255));
        decontamB[pIdx] = Math.round(clamp(pb * (1.0 - decontamStrength) + estB * decontamStrength, 0, 255));
      }

      alphaMatte[pIdx] = alpha;
    }
  }

  // 6. Anti-Aliased Edge Output
  const finalAlpha = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const rawA = alphaMatte[idx];
      if (rawA <= 0.001) finalAlpha[idx] = 0;
      else if (rawA >= 0.999) finalAlpha[idx] = 255;
      else {
        let sumA = 0, countA = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= w) continue;
            const wK = (dx === 0 && dy === 0) ? 4 : (dx === 0 || dy === 0 ? 2 : 1);
            sumA += alphaMatte[ny * w + nx] * wK;
            countA += wK;
          }
        }
        finalAlpha[idx] = Math.round(clamp(sumA / countA, 0, 1) * 255);
      }
    }
  }

  const outCanvas = createCanvas(w, h);
  const outCtx = outCanvas.getContext('2d');
  const outImgData = outCtx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const idx4 = i * 4;
    outImgData.data[idx4] = decontamR[i];
    outImgData.data[idx4 + 1] = decontamG[i];
    outImgData.data[idx4 + 2] = decontamB[i];
    outImgData.data[idx4 + 3] = finalAlpha[i];
  }
  outCtx.putImageData(outImgData, 0, 0);
  return outCanvas;
}

// Let's test on all uploaded images including media_1788584939190.png, media_1788585250142.png, media_1788586948023.png, media_1788587194609.png
const userUploadDir = 'C:\\Users\\IT\\.gemini\\antigravity-ide\\brain\\df9b4638-f12a-4656-bf65-74c4e0bc88ac\\.user_uploaded';
const testFiles = [
  'media_1788584939190.png',
  'media_1788585250142.png',
  'media_1788585940388.png',
  'media_1788586948023.png',
  'media_1788587194609.png'
];

for (const f of testFiles) {
  const p = `${userUploadDir}/${f}`;
  if (!fs.existsSync(p)) continue;
  const img = await loadImage(p);
  const c = createCanvas(img.width, img.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const res = universalMatting(c);
  fs.writeFileSync(`scratch/universal_${f}`, res.toBuffer('image/png'));
  console.log(`Saved scratch/universal_${f}`);
}
