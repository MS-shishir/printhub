// ── useFaceDetection Hook ─────────────────────────────────────────────────
// Wraps the face detection service, handles loading states and auto-detection.

import { useCallback, useRef, useState } from 'react';
import { detectFace } from '../services/face-detection.service';
import { calculateSmartCrop } from '../services/image-processing.service';
import { FaceDetectionResult, CropArea, PassportTemplate } from '../types/passport-types';

interface UseFaceDetectionReturn {
  detect: (imageSrc: string, template: PassportTemplate, naturalW: number, naturalH: number) => Promise<{ face: FaceDetectionResult | null; crop: CropArea | null }>;
  isDetecting: boolean;
  lastError: string | null;
}

export function useFaceDetection(): UseFaceDetectionReturn {
  const [isDetecting, setIsDetecting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const abortRef = useRef<boolean>(false);

  const detect = useCallback(async (
    imageSrc: string,
    template: PassportTemplate,
    naturalW: number,
    naturalH: number
  ): Promise<{ face: FaceDetectionResult | null; crop: CropArea | null }> => {
    abortRef.current = false;
    setIsDetecting(true);
    setLastError(null);

    try {
      const face = await detectFace(imageSrc);
      if (abortRef.current) return { face: null, crop: null };

      if (!face) {
        return { face: null, crop: null };
      }

      // Calculate smart crop from detection result
      const targetAspect = template.widthMm / template.heightMm;
      const crop = calculateSmartCrop({
        imgWidth: naturalW,
        imgHeight: naturalH,
        faceX: face.boundingBox.x,
        faceY: face.boundingBox.y,
        faceW: face.boundingBox.width,
        faceH: face.boundingBox.height,
        targetAspect,
        faceHeightRatio: template.faceHeightRatio,
        eyeYRatio: template.eyePosition.yRatio,
        headTopMargin: template.headMargin.topRatio,
      });

      return { face, crop };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Detection failed';
      setLastError(msg);
      return { face: null, crop: null };
    } finally {
      if (!abortRef.current) setIsDetecting(false);
    }
  }, []);

  return { detect, isDetecting, lastError };
}
