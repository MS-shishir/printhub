/**
 * LocalMaskPaintingOverlay.tsx
 * Interactive Canvas Overlay for Selective Mask Brush/Eraser painting with brush ring cursor indicator.
 * Employs normalized image coordinate mapping for 100% pixel-perfect alignment under any zoom/pan state.
 */

import React, { useRef, useState } from 'react';
import * as fabric from 'fabric';
import { LocalAdjustmentEngine } from '../../engines/LocalAdjustmentEngine';

interface LocalMaskPaintingOverlayProps {
  fabricCanvas?: fabric.Canvas | null;
  activeImage?: fabric.Image | null;
  maskCanvas: HTMLCanvasElement | null;
  brushSize: number;
  brushMode: 'brush' | 'eraser';
  feather: number;
  isActive: boolean;
  onMaskUpdated: () => void;
}

export default function LocalMaskPaintingOverlay({
  fabricCanvas,
  activeImage,
  maskCanvas,
  brushSize,
  brushMode,
  feather,
  isActive,
  onMaskUpdated
}: LocalMaskPaintingOverlayProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  if (!isActive || !maskCanvas) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsMouseDown(true);
    paintAtEvent(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCursorPos({ x, y });

    if (isMouseDown) {
      paintAtEvent(e);
    }
  };

  const handlePointerUp = () => {
    setIsMouseDown(false);
  };

  const handlePointerLeave = () => {
    setIsMouseDown(false);
    setCursorPos(null);
  };

  const paintAtEvent = (e: React.PointerEvent) => {
    if (!overlayRef.current || !maskCanvas) return;

    const rect = overlayRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    let maskX = screenX;
    let maskY = screenY;
    let scaleRatio = 1;

    if (fabricCanvas) {
      const vpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      const zoom = vpt[0] || 1;
      const panX = vpt[4] || 0;
      const panY = vpt[5] || 0;

      // 1. Convert screen coordinates to Fabric canvas logical coordinates
      const canvasX = (screenX - panX) / zoom;
      const canvasY = (screenY - panY) / zoom;

      // 2. Find target image object on canvas
      const targetImg = activeImage || (fabricCanvas.getObjects().find((o) => o.isType('image')) as fabric.Image | null);

      if (targetImg) {
        const imgScaledW = targetImg.getScaledWidth() || 1;
        const imgScaledH = targetImg.getScaledHeight() || 1;
        
        let imgMinX = targetImg.left || 0;
        let imgMinY = targetImg.top || 0;

        if (targetImg.originX === 'center') imgMinX -= imgScaledW / 2;
        if (targetImg.originY === 'center') imgMinY -= imgScaledH / 2;

        // Normalized 0..1 ratio of pointer inside image bounding box
        const relX = (canvasX - imgMinX) / imgScaledW;
        const relY = (canvasY - imgMinY) / imgScaledH;

        maskX = relX * maskCanvas.width;
        maskY = relY * maskCanvas.height;

        const imgRawW = targetImg.width || 1;
        scaleRatio = maskCanvas.width / imgRawW;
      } else {
        const cW = fabricCanvas.width || 1;
        const cH = fabricCanvas.height || 1;
        maskX = (canvasX / cW) * maskCanvas.width;
        maskY = (canvasY / cH) * maskCanvas.height;
        scaleRatio = maskCanvas.width / cW;
      }
    } else {
      scaleRatio = maskCanvas.width / rect.width;
      maskX = (screenX / rect.width) * maskCanvas.width;
      maskY = (screenY / rect.height) * maskCanvas.height;
    }

    const scaledBrushSize = Math.max(5, brushSize * scaleRatio);

    LocalAdjustmentEngine.paintBrush(
      maskCanvas,
      maskX,
      maskY,
      scaledBrushSize,
      100,
      feather > 10 ? 40 : 85,
      brushMode === 'eraser'
    );

    onMaskUpdated();
  };

  return (
    <div
      ref={overlayRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      className="absolute inset-0 z-20 cursor-crosshair select-none"
    >
      {/* Live Brush Ring Cursor */}
      {cursorPos && (
        <div
          className={`pointer-events-none absolute rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2 shadow-lg transition-transform ${
            brushMode === 'eraser'
              ? 'border-pink-500 bg-pink-500/20'
              : 'border-cyan-400 bg-cyan-400/20'
          }`}
          style={{
            left: `${cursorPos.x}px`,
            top: `${cursorPos.y}px`,
            width: `${brushSize}px`,
            height: `${brushSize}px`
          }}
        />
      )}
    </div>
  );
}
