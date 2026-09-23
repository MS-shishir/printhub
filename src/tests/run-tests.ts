/**
 * run-tests.ts - PrintHub Studio Automated Test Suite Foundation
 * Validates unit conversion math, layout calculation accuracy, state history engine, and image adjustments.
 * Executed via: npx tsx src/tests/run-tests.ts
 */

import assert from 'node:assert/strict';
import { mmToPx, pxToMm, mmToPt, ptToMm, getPhotoPxDimensions, PRINT_DPI } from '../passport-studio/utils/mm-to-px';
import { calculateLayout, maxCopiesThatFit } from '../passport-studio/services/layout.service';
import { HistoryEngine } from '../engines/HistoryEngine';
import { PassportTemplate, LayoutConfig, PaperSize } from '../passport-studio/types/passport-types';
import { rgbToLab, deltaE76, deltaEWeighted, decontaminatePixel } from '../passport-studio/utils/color-utils';

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log('\n======================================================');
console.log(' PRINTHUB STUDIO — AUTOMATED TEST SUITE FOUNDATION');
console.log('======================================================\n');

// ── 1. Unit Conversion Tests ───────────────────────────────────────────────
console.log('▶ [1] Millimeter / Pixel / DPI Conversion Math');

runTest('mmToPx: 25.4mm at 300 DPI equals 300px', () => {
  const px = mmToPx(25.4, 300);
  assert.equal(Math.round(px), 300);
});

runTest('mmToPx: 35mm BD Passport width at 300 DPI equals 413px', () => {
  const px = mmToPx(35, 300);
  assert.equal(Math.round(px), 413);
});

runTest('mmToPx: 45mm BD Passport height at 300 DPI equals 531px', () => {
  const px = mmToPx(45, 300);
  assert.equal(Math.round(px), 531);
});

runTest('pxToMm: 300px at 300 DPI equals 25.4mm', () => {
  const mm = pxToMm(300, 300);
  assert.equal(Math.round(mm * 10) / 10, 25.4);
});

runTest('mmToPt: 25.4mm equals 72 PDF points', () => {
  const pt = mmToPt(25.4);
  assert.equal(Math.round(pt), 72);
});

runTest('getPhotoPxDimensions returns 413x531 for 35x45mm @ 300 DPI', () => {
  const dim = getPhotoPxDimensions(35, 45, PRINT_DPI);
  assert.equal(dim.widthPx, 413);
  assert.equal(dim.heightPx, 531);
});

// ── 2. Grid Layout Calculation Tests ──────────────────────────────────────
console.log('\n▶ [2] Grid Sheet Layout Calculator (layout.service.ts)');

const testTemplate: PassportTemplate = {
  id: 'bd_pp',
  country: 'Bangladesh',
  name: 'BD Passport (35×45mm)',
  flag: '🇧🇩',
  widthMm: 35,
  heightMm: 45,
  dpi: 300,
  faceHeightRatio: 0.75,
  eyePosition: { xRatio: 0.5, yRatio: 0.42 },
  headMargin: { topRatio: 0.08, bottomRatio: 0.12, leftRatio: 0.10, rightRatio: 0.10 },
  bgColor: '#ffffff',
  bgColorName: 'White',
  rules: '',
  category: 'bangladesh',
};

const paper4R: PaperSize = { id: '4r', name: '4R (4"×6")', widthMm: 102, heightMm: 152 };
const paperA4: PaperSize = { id: 'a4', name: 'A4 Paper', widthMm: 210, heightMm: 297 };

runTest('calculateLayout: 4R sheet (102x152mm) fits 4 BD Passport photos (2x2 grid)', () => {
  const config: LayoutConfig = {
    copies: 4,
    paperSize: paper4R,
    customWidthMm: 102,
    customHeightMm: 152,
    gapMm: 3,
    marginMm: 8,
    alignPos: 'top-left',
    showCutlines: true,
    showPrintHeader: false,
    autoFit: true,
  };

  const layout = calculateLayout(testTemplate, config);
  assert.equal(layout.placed.length, 4);
  assert.equal(layout.columns, 2);
  assert.equal(layout.rows, 2);
});

runTest('calculateLayout: A4 sheet (210x297mm) fits 25 BD Passport photos at 10mm margins', () => {
  const config: LayoutConfig = {
    copies: 25 as any,
    paperSize: paperA4,
    customWidthMm: 210,
    customHeightMm: 297,
    gapMm: 3,
    marginMm: 10,
    alignPos: 'top-left',
    showCutlines: true,
    showPrintHeader: false,
    autoFit: true,
  };

  const layout = calculateLayout(testTemplate, config);
  assert.equal(layout.columns, 5); // (210 - 20 + 3) / 38 = 5 cols
  assert.equal(layout.rows, 5);    // (297 - 20 + 3) / 48 = 5 rows
  assert.equal(layout.placed.length, 25);
});

runTest('maxCopiesThatFit calculates correct maximum copy count', () => {
  const config: LayoutConfig = {
    copies: 16 as any,
    paperSize: paper4R,
    customWidthMm: 102,
    customHeightMm: 152,
    gapMm: 3,
    marginMm: 8,
    alignPos: 'top-left',
    showCutlines: true,
    showPrintHeader: false,
    autoFit: true,
  };

  const maxFit = maxCopiesThatFit(testTemplate, config);
  assert.equal(maxFit, 4); // 2x2 = 4 max fit on 4R
});

runTest('calculateLayout: A4 Full Size photo (210x297mm) places 1 full copy centered on A4 sheet', () => {
  const albumA4Template: PassportTemplate = {
    id: 'album_a4_full',
    country: 'Photo Album',
    name: 'A4 Full Page (210×297mm)',
    flag: '📸',
    widthMm: 210,
    heightMm: 297,
    dpi: 300,
    faceHeightRatio: 0.65,
    eyePosition: { xRatio: 0.5, yRatio: 0.42 },
    headMargin: { topRatio: 0.08, bottomRatio: 0.12, leftRatio: 0.10, rightRatio: 0.10 },
    bgColor: '#ffffff',
    bgColorName: 'White',
    rules: '',
    category: 'album',
  };

  const config: LayoutConfig = {
    copies: 1 as any,
    paperSize: paperA4,
    customWidthMm: 210,
    customHeightMm: 297,
    gapMm: 0,
    marginMm: 0,
    alignPos: 'center',
    showCutlines: false,
    showPrintHeader: false,
    autoFit: true,
  };

  const layout = calculateLayout(albumA4Template, config);
  assert.equal(layout.placed.length, 1);
  assert.equal(layout.placed[0].widthMm, 210);
  assert.equal(layout.placed[0].heightMm, 297);
  assert.equal(layout.placed[0].xMm, 0);
  assert.equal(layout.placed[0].yMm, 0);
});

runTest('calculateLayout: A4 Half Size Landscape (210x148.5mm) fits 2 copies on A4 sheet', () => {
  const albumHalfTemplate: PassportTemplate = {
    id: 'album_a4_half_landscape',
    country: 'Photo Album',
    name: 'A4 Half Size Landscape (210×148.5mm)',
    flag: '🖼️',
    widthMm: 210,
    heightMm: 148.5,
    dpi: 300,
    faceHeightRatio: 0.65,
    eyePosition: { xRatio: 0.5, yRatio: 0.42 },
    headMargin: { topRatio: 0.08, bottomRatio: 0.12, leftRatio: 0.10, rightRatio: 0.10 },
    bgColor: '#ffffff',
    bgColorName: 'White',
    rules: '',
    category: 'album',
  };

  const config: LayoutConfig = {
    copies: 2 as any,
    paperSize: paperA4,
    customWidthMm: 210,
    customHeightMm: 297,
    gapMm: 0,
    marginMm: 0,
    alignPos: 'top-left',
    showCutlines: false,
    showPrintHeader: false,
    autoFit: true,
  };

  const layout = calculateLayout(albumHalfTemplate, config);
  assert.equal(layout.placed.length, 2);
  assert.equal(layout.columns, 1);
  assert.equal(layout.rows, 2);
  assert.equal(layout.placed[0].yMm, 0);
  assert.equal(layout.placed[1].yMm, 148.5);
});

// ── 3. State History Engine Tests ─────────────────────────────────────────
console.log('\n▶ [3] State History Engine (HistoryEngine.ts)');

runTest('HistoryEngine: Push state, Undo, and Redo time travel', () => {
  const history = new HistoryEngine<any>(50);

  history.pushState({ step: 1, zoom: 100 });
  history.pushState({ step: 2, zoom: 150 });
  history.pushState({ step: 3, zoom: 200 });

  assert.equal(history.getUndoCount(), 2);
  assert.equal(history.canUndo(), true);

  const prev1 = history.undo();
  assert.equal(prev1?.zoom, 150); // 1st undo reverts from 200 back to 150

  const prev2 = history.undo();
  assert.equal(prev2?.zoom, 100); // 2nd undo reverts from 150 back to 100

  assert.equal(history.canRedo(), true);
  const next = history.redo();
  assert.equal(next?.zoom, 150);  // 1st redo re-applies from 100 to 150
});

runTest('HistoryEngine: New action invalidates redo stack', () => {
  const history = new HistoryEngine<any>(50);

  history.pushState({ step: 1 });
  history.pushState({ step: 2 });
  history.undo({ step: 2 });

  assert.equal(history.canRedo(), true);

  // New action should clear redo stack
  history.pushState({ step: 3 });
  assert.equal(history.canRedo(), false);
});

// ── 4. Document Engine & Homography Tests ─────────────────────────────────
console.log('\n▶ [4] Document Perspective Warp & BD Sizing Engine');

import { PerspectiveWarpEngine, DocumentQuad } from '../engines/PerspectiveWarpEngine';

runTest('PerspectiveWarpEngine: Identity Homography Matrix for congruent quads', () => {
  const quad: DocumentQuad = {
    tl: { x: 0, y: 0 },
    tr: { x: 100, y: 0 },
    br: { x: 100, y: 100 },
    bl: { x: 0, y: 100 },
  };

  const H = PerspectiveWarpEngine.getPerspectiveTransform(quad, quad);
  assert.equal(H.length, 9);
  assert.ok(Math.abs(H[0] - 1) < 1e-4, 'H[0] should be 1');
  assert.ok(Math.abs(H[4] - 1) < 1e-4, 'H[4] should be 1');
  assert.ok(Math.abs(H[8] - 1) < 1e-4, 'H[8] should be 1');
});

runTest('PerspectiveWarpEngine: Invert Matrix 3x3 successfully', () => {
  const matrix = [
    2, 0, 0,
    0, 2, 0,
    0, 0, 1
  ];

  const inv = PerspectiveWarpEngine.invertMatrix3x3(matrix);
  assert.ok(inv !== null);
  assert.ok(Math.abs(inv![0] - 0.5) < 1e-4);
  assert.ok(Math.abs(inv![4] - 0.5) < 1e-4);
  assert.ok(Math.abs(inv![8] - 1.0) < 1e-4);
});

runTest('Document Specs: Smart NID 85.6x53.98mm converts accurately at 300 DPI', () => {
  const nidWPx = mmToPx(85.6, 300);
  const nidHPx = mmToPx(53.98, 300);
  assert.equal(Math.round(nidWPx), 1011);
  assert.equal(Math.round(nidHPx), 638);
});

// ── 5. Color Space & Classical Matting Math ──────────────────────────────
console.log('\n▶ [5] Color Space Lab Math & Decontamination');

runTest('ColorUtils: sRGB to D65-referenced CIE-L*a*b* conversion math', () => {
  const white = rgbToLab(255, 255, 255);
  assert.ok(white.l > 99.5, 'White L* should be ~100');
  const black = rgbToLab(0, 0, 0);
  assert.ok(black.l < 0.5, 'Black L* should be ~0');
});

runTest('ColorUtils: DeltaE76 and weighted DeltaE distance calculation', () => {
  const c1 = rgbToLab(250, 250, 250);
  const c2 = rgbToLab(30, 28, 26);
  const dE = deltaE76(c1, c2);
  assert.ok(dE > 80, 'DeltaE between white and dark hair should exceed 80');
  const dEWeighted = deltaEWeighted(c1, c2, 1.0, 1.25);
  assert.ok(dEWeighted > 80, 'Weighted DeltaE should exceed 80');
});

runTest('ColorUtils: Mathematical Color Decontamination (Unmixing spilled background light)', () => {
  // 40% hair (30,28,26) + 60% white backdrop (250,250,250) = (162, 161, 160)
  const decontam = decontaminatePixel(162, 161, 160, 250, 250, 250, 0.4, 0.95, 0.05);
  assert.ok(decontam.r < 60, 'Decontaminated R should restore dark hair value');
  assert.ok(decontam.g < 60, 'Decontaminated G should restore dark hair value');
  assert.ok(decontam.b < 60, 'Decontaminated B should restore dark hair value');
});

// ── 6. 10-Stage MattingEngine & Morphological Pipeline Tests ─────────────
console.log('\n▶ [6] 10-Stage MattingEngine & Morphological Pipeline');

import { MattingEngine } from '../engines/MattingEngine';

runTest('MattingEngine: Dilation, Erosion, Opening, and Closing math', () => {
  const w = 10, h = 10;
  const mask = new Uint8Array(w * h);
  // Place a 2x2 square in center (x: 4..5, y: 4..5)
  mask[4 * w + 4] = 255;
  mask[4 * w + 5] = 255;
  mask[5 * w + 4] = 255;
  mask[5 * w + 5] = 255;

  const dilated = MattingEngine.dilateMask(mask, w, h, 1);
  assert.equal(dilated[3 * w + 4], 255, 'Dilated mask expands boundary by 1px');

  const eroded = MattingEngine.erodeMask(dilated, w, h, 1);
  assert.equal(eroded[4 * w + 4], 255, 'Erosion returns center pixels');

  const closed = MattingEngine.morphologicalClosing(mask, w, h, 1);
  assert.equal(closed[4 * w + 4], 255, 'Closing preserves foreground core');
});

runTest('MattingEngine: Topological Hole-Filling protects interior suits & ties', () => {
  const w = 10, h = 10;
  const mask = new Uint8Array(w * h);
  // Create a hollow square foreground ring (x: 2..7, y: 2..7) with empty center (4,4)
  for (let y = 2; y <= 7; y++) {
    for (let x = 2; x <= 7; x++) {
      mask[y * w + x] = 255;
    }
  }
  mask[4 * w + 4] = 0; // Internal hole/pinhole (e.g. dark tie button or pattern)
  mask[4 * w + 5] = 0;

  const filled = MattingEngine.fillInteriorHoles(mask, w, h);
  assert.equal(filled[4 * w + 4], 255, 'Enclosed internal hole is filled to solid 255');
  assert.equal(filled[4 * w + 5], 255, 'Enclosed internal hole is filled to solid 255');
  assert.equal(filled[0], 0, 'Outer background exterior remains 0');
});

runTest('MattingEngine: Adaptive Trimap Generation produces 3 distinct zones', () => {
  const w = 20, h = 20;
  const mask = new Uint8Array(w * h);
  for (let y = 5; y <= 15; y++) {
    for (let x = 5; x <= 15; x++) {
      mask[y * w + x] = 255;
    }
  }

  const trimap = MattingEngine.generateTrimap(mask, w, h, 2);
  assert.equal(trimap[10 * w + 10], 255, 'Deep interior is Definite Foreground (255)');
  assert.equal(trimap[0], 0, 'Outer boundary is Definite Background (0)');
  assert.equal(trimap[5 * w + 5], 128, 'Perimeter edge is Unknown Transition Band (128)');
});

runTest('MattingEngine: Gaussian Falloff Brush Stroke calculates correct weights', () => {
  const w = 20, h = 20;
  const alpha = new Uint8ClampedArray(w * h); // start with 0 (background)
  const rgb = new Uint8ClampedArray(w * h * 4);

  const updated = MattingEngine.applyBrushStroke(
    alpha,
    rgb,
    w,
    h,
    [{ x: 10, y: 10 }],
    { radius: 5, hardness: 0.2, strength: 1.0, mode: 'add_subject' }
  );

  assert.equal(updated[10 * w + 10], 255, 'Center of Add Subject brush stroke is 255');
  assert.ok(updated[10 * w + 13] > 0 && updated[10 * w + 13] < 255, 'Edge has soft Gaussian falloff');
  assert.equal(updated[0], 0, 'Pixels outside radius remain 0');
});

// ── Test Summary ─────────────────────────────────────────────────────────
console.log('\n======================================================');
console.log(` TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}

