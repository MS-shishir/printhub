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

// ── Test Summary ─────────────────────────────────────────────────────────
console.log('\n======================================================');
console.log(` TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}
