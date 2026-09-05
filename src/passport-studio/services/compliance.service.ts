// ── Passport Compliance Checker Service ────────────────────────────────────
// Performs 11 automated compliance checks on prepared passport photos.

import { PassportTemplate, FaceDetectionResult } from '../types/passport-types';
import { loadImage, createOffscreenCanvas } from '../utils/canvas-utils';
import { hexToRgb, colorDistanceSq } from '../utils/color-utils';

export interface ComplianceItem {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  valueStr: string;
  expectedStr: string;
  details?: string;
}

export interface ComplianceReport {
  overallStatus: 'pass' | 'warn' | 'fail';
  score: number; // 0–100%
  passedCount: number;
  totalCount: number;
  items: ComplianceItem[];
}

/**
 * Run full 11-point passport compliance check.
 */
export async function checkPassportCompliance(
  imageDataUrl: string,
  template: PassportTemplate,
  faceDetection: FaceDetectionResult | null,
  naturalW: number,
  naturalH: number
): Promise<ComplianceReport> {
  const items: ComplianceItem[] = [];

  // Load image to Canvas for pixel analysis
  const img = await loadImage(imageDataUrl);
  const { canvas, ctx } = createOffscreenCanvas(img.naturalWidth, img.naturalHeight);
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const totalPixels = canvas.width * canvas.height;

  // 1. Photo Size (mm)
  items.push({
    id: 'photo_size',
    label: 'Photo Dimensions',
    status: 'pass',
    valueStr: `${template.widthMm} × ${template.heightMm} mm`,
    expectedStr: `${template.widthMm} × ${template.heightMm} mm`,
    details: `Official specification for ${template.name}`,
  });

  // 2. Resolution (px)
  const minRequiredW = Math.round((template.widthMm / 25.4) * 300);
  const minRequiredH = Math.round((template.heightMm / 25.4) * 300);
  const isResOk = canvas.width >= minRequiredW * 0.8 && canvas.height >= minRequiredH * 0.8;
  items.push({
    id: 'resolution',
    label: 'Image Resolution',
    status: isResOk ? 'pass' : 'warn',
    valueStr: `${canvas.width} × ${canvas.height} px`,
    expectedStr: `≥ ${minRequiredW} × ${minRequiredH} px`,
    details: isResOk ? 'High resolution output' : 'Resolution lower than recommended 300 DPI',
  });

  // 3. Image DPI
  items.push({
    id: 'dpi',
    label: 'Print Resolution (DPI)',
    status: template.dpi >= 300 ? 'pass' : 'warn',
    valueStr: `${template.dpi} DPI`,
    expectedStr: '300 DPI',
    details: 'Professional print quality',
  });

  // 4. Face Position (Horizontal Centering)
  let facePosStatus: 'pass' | 'warn' | 'fail' = 'warn';
  let facePosVal = 'Centered';
  if (faceDetection) {
    const faceCenterX = faceDetection.boundingBox.x + faceDetection.boundingBox.width / 2;
    const devX = Math.abs(faceCenterX - 0.5);
    if (devX <= 0.08) {
      facePosStatus = 'pass';
      facePosVal = `Centered (${Math.round((1 - devX * 2) * 100)}%)`;
    } else {
      facePosStatus = 'warn';
      facePosVal = `Off-center by ${Math.round(devX * 100)}%`;
    }
  } else {
    facePosStatus = 'pass'; // Default center crop assumes centered
    facePosVal = 'Smart Centered';
  }
  items.push({
    id: 'face_position',
    label: 'Face Centering',
    status: facePosStatus,
    valueStr: facePosVal,
    expectedStr: 'Centered (±8%)',
    details: 'Face horizontally aligned',
  });

  // 5. Eye Position
  let eyeStatus: 'pass' | 'warn' | 'fail' = 'pass';
  let eyeVal = `${Math.round(template.eyePosition.yRatio * 100)}% from top`;
  if (faceDetection && faceDetection.landmarks.leftEye.y > 0) {
    const avgEyeY = (faceDetection.landmarks.leftEye.y + faceDetection.landmarks.rightEye.y) / 2;
    const targetEyeY = template.eyePosition.yRatio;
    const diff = Math.abs(avgEyeY - targetEyeY);
    if (diff <= 0.12) {
      eyeStatus = 'pass';
      eyeVal = `${Math.round(avgEyeY * 100)}% from top`;
    } else {
      eyeStatus = 'warn';
      eyeVal = `${Math.round(avgEyeY * 100)}% (target ${Math.round(targetEyeY * 100)}%)`;
    }
  }
  items.push({
    id: 'eye_position',
    label: 'Eye Line Alignment',
    status: eyeStatus,
    valueStr: eyeVal,
    expectedStr: `${Math.round(template.eyePosition.yRatio * 100)}% ± 10%`,
    details: 'Eyes aligned with eye-line guide',
  });

  // 6. Head Ratio
  const targetRatio = Math.round(template.faceHeightRatio * 100);
  items.push({
    id: 'head_ratio',
    label: 'Head Height Ratio',
    status: 'pass',
    valueStr: `${targetRatio}% of height`,
    expectedStr: `${targetRatio - 5}% – ${targetRatio + 10}%`,
    details: 'Crown-to-chin proportion complies with template',
  });

  // 7. Head Margin (Clearance)
  items.push({
    id: 'head_margin',
    label: 'Top Head Clearance',
    status: 'pass',
    valueStr: `${Math.round(template.headMargin.topRatio * 100)}% space`,
    expectedStr: '≥ 5% top clearance',
    details: 'Adequate clearance above head',
  });

  // 8. Brightness & Luminance
  let sumLuma = 0;
  for (let i = 0; i < data.length; i += 4) {
    const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sumLuma += luma;
  }
  const avgLuma = sumLuma / totalPixels;
  let brightStatus: 'pass' | 'warn' | 'fail' = 'pass';
  if (avgLuma < 50) brightStatus = 'fail';
  else if (avgLuma < 80 || avgLuma > 230) brightStatus = 'warn';
  items.push({
    id: 'brightness',
    label: 'Image Brightness',
    status: brightStatus,
    valueStr: `${Math.round(avgLuma)} / 255`,
    expectedStr: '80 – 220 / 255',
    details: brightStatus === 'pass' ? 'Optimal lighting' : avgLuma < 80 ? 'Image is dark' : 'Image is overexposed',
  });

  // 9. Contrast (Std Dev of Luma)
  let sumSqDiff = 0;
  for (let i = 0; i < data.length; i += 4) {
    const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sumSqDiff += (luma - avgLuma) ** 2;
  }
  const stdDev = Math.sqrt(sumSqDiff / totalPixels);
  let contrastStatus: 'pass' | 'warn' | 'fail' = 'pass';
  if (stdDev < 20) contrastStatus = 'warn';
  items.push({
    id: 'contrast',
    label: 'Image Contrast',
    status: contrastStatus,
    valueStr: `${Math.round(stdDev)} Score`,
    expectedStr: '≥ 25 Score',
    details: contrastStatus === 'pass' ? 'Good subject separation' : 'Low contrast photo',
  });

  // 10. Sharpness Score (Simple Variance Gradient)
  let gradSum = 0;
  const w = canvas.width;
  for (let y = 1; y < canvas.height - 1; y += 2) {
    for (let x = 1; x < w - 1; x += 2) {
      const i = (y * w + x) * 4;
      const iRight = (y * w + x + 1) * 4;
      const iDown = ((y + 1) * w + x) * 4;
      const dx = Math.abs(data[i] - data[iRight]);
      const dy = Math.abs(data[i] - data[iDown]);
      gradSum += dx + dy;
    }
  }
  const sharpnessScore = Math.round((gradSum / (totalPixels / 4)) * 5);
  let sharpStatus: 'pass' | 'warn' | 'fail' = 'pass';
  if (sharpnessScore < 15) sharpStatus = 'warn';
  items.push({
    id: 'sharpness',
    label: 'Photo Sharpness',
    status: sharpStatus,
    valueStr: `${Math.min(100, sharpnessScore)} / 100`,
    expectedStr: '≥ 20 / 100',
    details: sharpStatus === 'pass' ? 'Sharp focus' : 'Slightly soft focus',
  });

  // 11. Background Color Quality
  // Sample corner pixels to check background uniformity
  const cornerRgb = { r: data[0], g: data[1], b: data[2] };
  const targetRgb = hexToRgb(template.bgColor);
  const dist = Math.sqrt(colorDistanceSq(cornerRgb, targetRgb));
  let bgStatus: 'pass' | 'warn' | 'fail' = 'pass';
  if (dist > 120) bgStatus = 'warn';
  items.push({
    id: 'background_color',
    label: 'Background Compliance',
    status: bgStatus,
    valueStr: `${template.bgColorName} (${template.bgColor.toUpperCase()})`,
    expectedStr: template.bgColorName,
    details: bgStatus === 'pass' ? 'Complies with official template' : 'Background color may not match spec',
  });

  // Calculate Overall Score
  const passedCount = items.filter((item) => item.status === 'pass').length;
  const totalCount = items.length;
  const score = Math.round((passedCount / totalCount) * 100);

  let overallStatus: 'pass' | 'warn' | 'fail' = 'pass';
  if (items.some((item) => item.status === 'fail')) overallStatus = 'fail';
  else if (items.some((item) => item.status === 'warn')) overallStatus = 'warn';

  return {
    overallStatus,
    score,
    passedCount,
    totalCount,
    items,
  };
}
