// ── useCanvasEditor Hook ──────────────────────────────────────────────────
// Native Canvas 2D editor — handles pan, zoom, rotate, flip, drag reposition.
// No Fabric.js dependency. Faster and lighter.

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { ImageTransform, CropArea } from '../types/passport-types';
import { loadImage, createOffscreenCanvas } from '../utils/canvas-utils';

interface UseCanvasEditorOptions {
  canvasWidth: number;
  canvasHeight: number;
  bgColor: string;
}

interface UseCanvasEditorReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  transform: ImageTransform;
  setTransform: (t: Partial<ImageTransform>) => void;
  loadImageSrc: (src: string) => Promise<void>;
  getCroppedDataUrl: (cropArea: CropArea, outputW: number, outputH: number) => string | null;
  zoomIn: () => void;
  zoomOut: () => void;
  rotateLeft: () => void;
  rotateRight: () => void;
  flipH: () => void;
  flipV: () => void;
  fitToCanvas: () => void;
  resetTransform: () => void;
  redraw: () => void;
}

export function useCanvasEditor(options: UseCanvasEditorOptions): UseCanvasEditorReturn {
  const { canvasWidth, canvasHeight, bgColor } = options;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [transform, setTransformState] = useState<ImageTransform>({
    zoom: 1,
    pan: { x: 0, y: 0 },
    rotation: 0,
    flipX: false,
    flipY: false,
  });

  const transformRef = useRef(transform);
  transformRef.current = transform;

  // Drag state
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const setTransform = useCallback((partial: Partial<ImageTransform>) => {
    setTransformState((prev) => {
      const next = {
        ...prev,
        ...partial,
        zoom: partial.zoom != null ? Math.max(0.05, Math.min(10, partial.zoom)) : prev.zoom,
        rotation: partial.rotation != null ? ((partial.rotation % 360) + 360) % 360 : prev.rotation,
        pan: partial.pan ?? prev.pan,
      };
      transformRef.current = next;
      return next;
    });
  }, []);

  // Draw the image with current transform
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const t = transformRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!img) return;

    const cx = canvas.width / 2 + t.pan.x;
    const cy = canvas.height / 2 + t.pan.y;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((t.rotation * Math.PI) / 180);
    ctx.scale(t.flipX ? -1 : 1, t.flipY ? -1 : 1);

    const drawW = img.naturalWidth * t.zoom;
    const drawH = img.naturalHeight * t.zoom;
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }, [bgColor]);

  // Redraw whenever transform or bgColor changes
  useEffect(() => {
    redraw();
  }, [transform, bgColor, redraw]);

  const loadImageSrc = useCallback(async (src: string) => {
    const img = await loadImage(src);
    imgRef.current = img;

    // Auto-fit: scale image to fill ~85% of canvas
    const scaleX = (canvasWidth * 0.85) / img.naturalWidth;
    const scaleY = (canvasHeight * 0.85) / img.naturalHeight;
    const zoom = Math.min(scaleX, scaleY);

    setTransformState({
      zoom,
      pan: { x: 0, y: 0 },
      rotation: 0,
      flipX: false,
      flipY: false,
    });
    transformRef.current = { zoom, pan: { x: 0, y: 0 }, rotation: 0, flipX: false, flipY: false };

    requestAnimationFrame(redraw);
  }, [canvasWidth, canvasHeight, redraw]);

  // Mouse event handlers for pan
  const onMouseDown = useCallback((e: MouseEvent) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setTransform({ pan: { x: transformRef.current.pan.x + dx, y: transformRef.current.pan.y + dy } });
  }, [setTransform]);

  const onMouseUp = useCallback(() => { isDragging.current = false; }, []);

  // Wheel zoom
  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setTransform({ zoom: transformRef.current.zoom * factor });
  }, [setTransform]);

  // Attach events to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [onMouseDown, onMouseMove, onMouseUp, onWheel]);

  // ── Control Actions ─────────────────────────────────────────────────────
  const zoomIn = useCallback(() => setTransform({ zoom: transformRef.current.zoom * 1.15 }), [setTransform]);
  const zoomOut = useCallback(() => setTransform({ zoom: transformRef.current.zoom * 0.87 }), [setTransform]);
  const rotateLeft = useCallback(() => setTransform({ rotation: transformRef.current.rotation - 90 }), [setTransform]);
  const rotateRight = useCallback(() => setTransform({ rotation: transformRef.current.rotation + 90 }), [setTransform]);
  const flipH = useCallback(() => setTransform({ flipX: !transformRef.current.flipX }), [setTransform]);
  const flipV = useCallback(() => setTransform({ flipY: !transformRef.current.flipY }), [setTransform]);

  const fitToCanvas = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const scaleX = (canvasWidth * 0.85) / img.naturalWidth;
    const scaleY = (canvasHeight * 0.85) / img.naturalHeight;
    setTransform({ zoom: Math.min(scaleX, scaleY), pan: { x: 0, y: 0 } });
  }, [canvasWidth, canvasHeight, setTransform]);

  const resetTransform = useCallback(() => {
    setTransformState({ zoom: 1, pan: { x: 0, y: 0 }, rotation: 0, flipX: false, flipY: false });
    transformRef.current = { zoom: 1, pan: { x: 0, y: 0 }, rotation: 0, flipX: false, flipY: false };
    requestAnimationFrame(redraw);
  }, [redraw]);

  // ── Crop Extraction ────────────────────────────────────────────────────
  /**
   * Export the currently visible crop region as a data URL.
   * Renders at outputW × outputH pixels.
   */
  const getCroppedDataUrl = useCallback(
    (cropArea: CropArea, outputW: number, outputH: number): string | null => {
      const img = imgRef.current;
      if (!img) return null;
      const { canvas: out, ctx } = createOffscreenCanvas(outputW, outputH);
      const t = transformRef.current;

      // Build the transform to extract exactly the crop region
      ctx.save();
      const scaleX = outputW / cropArea.width;
      const scaleY = outputH / cropArea.height;
      ctx.scale(scaleX, scaleY);
      ctx.translate(-cropArea.x, -cropArea.y);

      // Re-draw image with current transform
      const cx = canvasWidth / 2 + t.pan.x;
      const cy = canvasHeight / 2 + t.pan.y;
      ctx.translate(cx, cy);
      ctx.rotate((t.rotation * Math.PI) / 180);
      ctx.scale(t.flipX ? -1 : 1, t.flipY ? -1 : 1);
      const drawW = img.naturalWidth * t.zoom;
      const drawH = img.naturalHeight * t.zoom;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      return out.toDataURL('image/png');
    },
    [canvasWidth, canvasHeight]
  );

  return {
    canvasRef,
    transform,
    setTransform,
    loadImageSrc,
    getCroppedDataUrl,
    zoomIn,
    zoomOut,
    rotateLeft,
    rotateRight,
    flipH,
    flipV,
    fitToCanvas,
    resetTransform,
    redraw,
  };
}
