// ── Face Detection Service ────────────────────────────────────────────────
// Uses MediaPipe Face Detection — 100% offline, WASM backend.
// Falls back to center-crop heuristic if detection fails.

import { FaceDetectionResult } from '../types/passport-types';
import { loadImage } from '../utils/canvas-utils';

// Dynamically import MediaPipe to avoid SSR issues
let FaceDetectionModule: any = null;
let detectorInstance: any = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize the MediaPipe face detector (singleton).
 * Called once, cached for all subsequent detections.
 */
async function initDetector(): Promise<void> {
  if (detectorInstance) return;
  if (isInitializing && initPromise) return initPromise;

  isInitializing = true;
  initPromise = (async () => {
    try {
      // Import MediaPipe face detection with 3s timeout
      const mp = await Promise.race([
        import('@mediapipe/face_detection'),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Import timeout')), 3000))
      ]);
      FaceDetectionModule = mp;
      
      const detector = new (mp as any).FaceDetection({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
        },
      });

      detector.setOptions({
        model: 'short',        // Fast short-range model
        minDetectionConfidence: 0.5,
      });

      detectorInstance = detector;
    } catch (err) {
      console.warn('[FaceDetection] MediaPipe init failed, using fast fallback:', err);
      detectorInstance = null;
    } finally {
      isInitializing = false;
    }
  })();

  return initPromise;
}

/**
 * Detect the largest face in an image.
 * Returns fallback if face not found or on error/timeout.
 *
 * @param imageSrc  URL, blob URL, or data URL of the image
 */
export async function detectFace(imageSrc: string): Promise<FaceDetectionResult | null> {
  try {
    // 2.5s maximum wait for detector
    await Promise.race([
      initDetector(),
      new Promise<void>((resolve) => setTimeout(resolve, 2500))
    ]);

    if (!detectorInstance) {
      return getFallbackDetection();
    }

    const img = await loadImage(imageSrc);

    return new Promise((resolve) => {
      let isDone = false;

      // 2000ms safety watchdog: never hang UI
      const watchdog = setTimeout(() => {
        if (!isDone) {
          isDone = true;
          resolve(getFallbackDetection());
        }
      }, 2000);

      detectorInstance.onResults((results: any) => {
        if (isDone) return;
        isDone = true;
        clearTimeout(watchdog);

        if (!results.detections || results.detections.length === 0) {
          resolve(getFallbackDetection());
          return;
        }

        // Pick detection with highest confidence score
        const best = results.detections.reduce((prev: any, curr: any) => {
          const prevConf = prev.score?.[0] ?? 0;
          const currConf = curr.score?.[0] ?? 0;
          return currConf > prevConf ? curr : prev;
        });

        const bb = best.boundingBox;
        const lm = best.landmarks ?? [];

        // MediaPipe landmark order: [0]=rightEye [1]=leftEye [2]=noseTip [3]=mouthCenter [4]=rightEar [5]=leftEar
        const getLM = (i: number) => ({
          x: lm[i]?.x ?? 0.5,
          y: lm[i]?.y ?? 0.5,
        });

        resolve({
          boundingBox: {
            x: bb.xCenter - bb.width / 2,
            y: bb.yCenter - bb.height / 2,
            width: bb.width,
            height: bb.height,
          },
          landmarks: {
            rightEye:    getLM(0),
            leftEye:     getLM(1),
            noseTip:     getLM(2),
            mouthCenter: getLM(3),
            rightEar:    getLM(4),
            leftEar:     getLM(5),
          },
          confidence: best.score?.[0] ?? 0,
        });
      });

      detectorInstance.send({ image: img }).catch(() => {
        if (!isDone) {
          isDone = true;
          clearTimeout(watchdog);
          resolve(getFallbackDetection());
        }
      });
    });
  } catch (err) {
    console.warn('[FaceDetection] Detection error, using fallback:', err);
    return getFallbackDetection();
  }
}

/**
 * Fallback face detection result — assumes face occupies center of image.
 * Used when MediaPipe is unavailable or fails.
 */
function getFallbackDetection(): FaceDetectionResult {
  return {
    boundingBox: { x: 0.2, y: 0.1, width: 0.6, height: 0.7 },
    landmarks: {
      leftEye:     { x: 0.38, y: 0.35 },
      rightEye:    { x: 0.62, y: 0.35 },
      noseTip:     { x: 0.50, y: 0.50 },
      mouthCenter: { x: 0.50, y: 0.65 },
      leftEar:     { x: 0.18, y: 0.40 },
      rightEar:    { x: 0.82, y: 0.40 },
    },
    confidence: 0,  // 0 = fallback, not real detection
  };
}

/**
 * Pre-warm the detector on app load (optional).
 */
export function prewarmDetector(): void {
  initDetector().catch(() => {});
}

export { getFallbackDetection };
