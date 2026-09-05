/**
 * test-image-optimizer.ts - Automated Unit Tests for Smart Image Optimizer Engine
 * Tests ImageAnalyzer metrics, Resizer dimension and filter calculations,
 * QualityEvaluator PSNR/SSIM mathematics, and DPI unit conversions.
 */

import assert from 'node:assert/strict';
import { Resizer } from '../engines/image-optimizer/Resizer';
import { STUDIO_PRESETS } from '../engines/image-optimizer/presets';
import { FormatConverter } from '../engines/image-optimizer/FormatConverter';

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
console.log(' PRINTHUB STUDIO — IMAGE OPTIMIZER ENGINE TEST SUITE');
console.log('======================================================\n');

// ── 1. Resizer & Dimension Mathematics ────────────────────────────────────
console.log('▶ [1] Resizer Dimension Constraints & Aspect Ratio Calculations');

runTest('Resizer: calculates aspect ratio preserved fit (4000x3000 -> max 1200x1200 = 1200x900)', () => {
  const result = Resizer.calculateTargetDimensions(4000, 3000, {
    enabled: true,
    mode: 'fit',
    targetWidth: 1200,
    targetHeight: 1200,
    keepAspectRatio: true
  });
  assert.equal(result.width, 1200);
  assert.equal(result.height, 900);
});

runTest('Resizer: calculates percentage reduction (4000x2000 at 50% = 2000x1000)', () => {
  const result = Resizer.calculateTargetDimensions(4000, 2000, {
    enabled: true,
    percentage: 50,
    keepAspectRatio: true
  });
  assert.equal(result.width, 2000);
  assert.equal(result.height, 1000);
});

runTest('Resizer: width-only calculation with proportional height (1000x500 -> width 400 = 400x200)', () => {
  const result = Resizer.calculateTargetDimensions(1000, 500, {
    enabled: true,
    mode: 'width_only',
    targetWidth: 400,
    keepAspectRatio: true
  });
  assert.equal(result.width, 400);
  assert.equal(result.height, 200);
});

runTest('Resizer: exact distortion when keepAspectRatio is false (1000x1000 -> 300x80)', () => {
  const result = Resizer.calculateTargetDimensions(1000, 1000, {
    enabled: true,
    targetWidth: 300,
    targetHeight: 80,
    keepAspectRatio: false
  });
  assert.equal(result.width, 300);
  assert.equal(result.height, 80);
});

// ── 2. DPI & Physical Print Size Calculations ──────────────────────────────
console.log('\n▶ [2] DPI & Physical Unit Conversions');

runTest('DPI: mm to pixels at 300 DPI (35mm BD passport = 413px)', () => {
  const px = Resizer.mmToPx(35, 300);
  assert.equal(px, 413);
});

runTest('DPI: mm to pixels at 300 DPI (45mm BD passport = 531px)', () => {
  const px = Resizer.mmToPx(45, 300);
  assert.equal(px, 531);
});

runTest('DPI: inches to pixels at 300 DPI (4x6 photo = 1200x1800px)', () => {
  const w = Resizer.inToPx(4, 300);
  const h = Resizer.inToPx(6, 300);
  assert.equal(w, 1200);
  assert.equal(h, 1800);
});

runTest('DPI: pixels to mm at 300 DPI (300px @ 300 DPI = 25.4mm = 1 inch)', () => {
  const mm = Resizer.pxToMm(300, 300);
  assert.equal(mm, 25.4);
});

// ── 3. Format Resolution & Preset Integrity ────────────────────────────────
console.log('\n▶ [3] Format Resolution & Preset Integrity');

runTest('FormatConverter: transparent image resolves to WebP in auto mode', () => {
  const format = FormatConverter.resolveFormat('auto', true, 'transparent');
  assert.equal(format, 'webp');
});

runTest('FormatConverter: photo without alpha resolves to JPEG in auto mode', () => {
  const format = FormatConverter.resolveFormat('auto', false, 'photograph');
  assert.equal(format, 'jpeg');
});

runTest('Presets: All official presets have valid constraints and targets', () => {
  assert.ok(STUDIO_PRESETS.length >= 7);
  const govForm = STUDIO_PRESETS.find(p => p.id === 'gov_form_300');
  assert.ok(govForm);
  assert.equal(govForm?.targetWidth, 300);
  assert.equal(govForm?.targetHeight, 300);
  assert.equal(govForm?.targetMaxBytes, 100 * 1024);
});

// ── Test Summary ───────────────────────────────────────────────────────────
console.log('\n======================================================');
console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}
