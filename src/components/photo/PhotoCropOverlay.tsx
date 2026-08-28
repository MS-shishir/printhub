/**
 * PhotoCropOverlay.tsx
 * Production Dual-Mode Photo Studio Crop Engine.
 * 
 * Features:
 * 1. Mode Switch: [ 🔲 রেগুলার ক্রপ (Normal Crop) | 📐 ৪-কোণা ক্রপ (4-Corner Perspective Warp) ]
 * 2. Exact Fabric Image to Screen Coordinate Math (0 pixel offset bug)
 * 3. 8-Point Rectangular Resize Handles + 4-Corner Warp Handles with 8x Magnifier Loupe
 * 4. Presets: Freeform, 35×45mm Passport, 1:1 Square, 4:3, 16:9, A4
 * 5. In-Viewport Action Bars with Apply and Cancel buttons.
 */

import React, { useState, useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import {
  Check, X, RotateCcw, Wand2, Crop, Scissors, UserCheck, Move, Sparkles
} from 'lucide-react';
import { PerspectiveWarpEngine, DocumentQuad, Point2D } from '../../engines/PerspectiveWarpEngine';

export type CropMode = 'normal' | 'perspective';

interface PhotoCropOverlayProps {
  fabricCanvas: fabric.Canvas | null;
  activeImage: fabric.Image | null;
  cropMode: CropMode;
  onSetCropMode: (mode: CropMode) => void;
  onApplyCrop: (resultCanvas: HTMLCanvasElement) => void;
  onCancelCrop: () => void;
  language: 'en' | 'bn';
}

type DragTarget = 
  | 'all'
  | 'tl' | 'tr' | 'br' | 'bl'
  | 'top' | 'right' | 'bottom' | 'left'
  | 'center';

export default function PhotoCropOverlay({
  fabricCanvas,
  activeImage,
  cropMode,
  onSetCropMode,
  onApplyCrop,
  onCancelCrop,
  language
}: PhotoCropOverlayProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active drag state
  const [activeTarget, setActiveTarget] = useState<DragTarget | null>(null);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  // 1. Normal Rectangular Crop State (Display Pixels relative to Container)
  const [normalRect, setNormalRect] = useState<{ left: number; top: number; width: number; height: number }>({
    left: 100, top: 100, width: 400, height: 400
  });

  // 2. 4-Corner Perspective Warp State (Display Pixels relative to Container)
  const [quadDisp, setQuadDisp] = useState<DocumentQuad>({
    tl: { x: 100, y: 100 },
    tr: { x: 500, y: 100 },
    br: { x: 500, y: 500 },
    bl: { x: 100, y: 500 },
  });

  const dragStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    startRect: { left: number; top: number; width: number; height: number };
    startQuad: DocumentQuad;
  }>({
    mouseX: 0,
    mouseY: 0,
    startRect: { left: 100, top: 100, width: 400, height: 400 },
    startQuad: {
      tl: { x: 100, y: 100 },
      tr: { x: 500, y: 100 },
      br: { x: 500, y: 500 },
      bl: { x: 100, y: 500 },
    }
  });

  // Raw Image Canvas Reference
  const rawCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize Raw Image & Coordinates
  useEffect(() => {
    if (!fabricCanvas || !activeImage) return;

    const rawEl = (activeImage as any)._rawSourceElement || activeImage.getElement();
    if (!rawEl) return;

    const natW = (rawEl as HTMLImageElement).naturalWidth || (rawEl as HTMLCanvasElement).width || 1200;
    const natH = (rawEl as HTMLImageElement).naturalHeight || (rawEl as HTMLCanvasElement).height || 800;

    const rawCanvas = document.createElement('canvas');
    rawCanvas.width = natW;
    rawCanvas.height = natH;
    const ctx = rawCanvas.getContext('2d');
    if (ctx) ctx.drawImage(rawEl, 0, 0);
    rawCanvasRef.current = rawCanvas;

    // Convert True Image Bounds on Fabric Canvas to Display Coordinates
    const vpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const zoom = fabricCanvas.getZoom() || 1;

    // Using true getBoundingRect() perfectly accounts for originX/originY (center or left)
    const bRect = activeImage.getBoundingRect();

    const dispLeft = bRect.left * zoom + vpt[4];
    const dispTop = bRect.top * zoom + vpt[5];
    const dispW = bRect.width * zoom;
    const dispH = bRect.height * zoom;

    // Centered crop box with 6% margin
    const padW = dispW * 0.06;
    const padH = dispH * 0.06;
    const cLeft = Math.round(dispLeft + padW);
    const cTop = Math.round(dispTop + padH);
    const cW = Math.round(dispW - 2 * padW);
    const cH = Math.round(dispH - 2 * padH);

    setNormalRect({ left: cLeft, top: cTop, width: cW, height: cH });

    setQuadDisp({
      tl: { x: cLeft, y: cTop },
      tr: { x: cLeft + cW, y: cTop },
      br: { x: cLeft + cW, y: cTop + cH },
      bl: { x: cLeft, y: cTop + cH },
    });
  }, [fabricCanvas, activeImage]);

  // Handle Drag Start
  const handleMouseDown = (e: React.MouseEvent, target: DragTarget) => {
    e.preventDefault();
    e.stopPropagation();

    isDraggingRef.current = true;
    setActiveTarget(target);

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startRect: { ...normalRect },
      startQuad: { ...quadDisp }
    };

    setLoupePos({ x: e.clientX, y: e.clientY });
  };

  // Mouse Move Drag Handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !activeTarget) return;

      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;

      if (cropMode === 'normal') {
        const s = dragStartRef.current.startRect;
        let next = { ...s };

        if (activeTarget === 'all' || activeTarget === 'center') {
          next.left = s.left + dx;
          next.top = s.top + dy;
        } else if (activeTarget === 'tl') {
          next.left = s.left + dx;
          next.top = s.top + dy;
          next.width = s.width - dx;
          next.height = s.height - dy;
        } else if (activeTarget === 'tr') {
          next.top = s.top + dy;
          next.width = s.width + dx;
          next.height = s.height - dy;
        } else if (activeTarget === 'br') {
          next.width = s.width + dx;
          next.height = s.height + dy;
        } else if (activeTarget === 'bl') {
          next.left = s.left + dx;
          next.width = s.width - dx;
          next.height = s.height + dy;
        } else if (activeTarget === 'top') {
          next.top = s.top + dy;
          next.height = s.height - dy;
        } else if (activeTarget === 'bottom') {
          next.height = s.height + dy;
        } else if (activeTarget === 'left') {
          next.left = s.left + dx;
          next.width = s.width - dx;
        } else if (activeTarget === 'right') {
          next.width = s.width + dx;
        }

        if (next.width > 20 && next.height > 20) {
          setNormalRect(next);
        }
      } else {
        // 4-Corner Perspective Mode
        const sQuad = dragStartRef.current.startQuad;
        let nextQuad = { ...quadDisp };

        if (activeTarget === 'tl') {
          nextQuad.tl = { x: sQuad.tl.x + dx, y: sQuad.tl.y + dy };
        } else if (activeTarget === 'tr') {
          nextQuad.tr = { x: sQuad.tr.x + dx, y: sQuad.tr.y + dy };
        } else if (activeTarget === 'br') {
          nextQuad.br = { x: sQuad.br.x + dx, y: sQuad.br.y + dy };
        } else if (activeTarget === 'bl') {
          nextQuad.bl = { x: sQuad.bl.x + dx, y: sQuad.bl.y + dy };
        } else if (activeTarget === 'center' || activeTarget === 'all') {
          nextQuad = {
            tl: { x: sQuad.tl.x + dx, y: sQuad.tl.y + dy },
            tr: { x: sQuad.tr.x + dx, y: sQuad.tr.y + dy },
            br: { x: sQuad.br.x + dx, y: sQuad.br.y + dy },
            bl: { x: sQuad.bl.x + dx, y: sQuad.bl.y + dy },
          };
        } else if (activeTarget === 'top') {
          nextQuad.tl = { x: sQuad.tl.x, y: sQuad.tl.y + dy };
          nextQuad.tr = { x: sQuad.tr.x, y: sQuad.tr.y + dy };
        } else if (activeTarget === 'bottom') {
          nextQuad.bl = { x: sQuad.bl.x, y: sQuad.bl.y + dy };
          nextQuad.br = { x: sQuad.br.x, y: sQuad.br.y + dy };
        } else if (activeTarget === 'left') {
          nextQuad.tl = { x: sQuad.tl.x + dx, y: sQuad.tl.y };
          nextQuad.bl = { x: sQuad.bl.x + dx, y: sQuad.bl.y };
        } else if (activeTarget === 'right') {
          nextQuad.tr = { x: sQuad.tr.x + dx, y: sQuad.tr.y };
          nextQuad.br = { x: sQuad.br.x + dx, y: sQuad.br.y };
        }

        setQuadDisp(nextQuad);
      }

      setLoupePos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      setActiveTarget(null);
      setLoupePos(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeTarget, cropMode, normalRect, quadDisp]);

  // Render 8x Magnifier Loupe
  useEffect(() => {
    if (!activeTarget || !loupeCanvasRef.current || !rawCanvasRef.current || !fabricCanvas || !activeImage) return;

    let ptDisp = { x: 0, y: 0 };
    if (cropMode === 'normal') {
      if (activeTarget === 'tl') ptDisp = { x: normalRect.left, y: normalRect.top };
      else if (activeTarget === 'tr') ptDisp = { x: normalRect.left + normalRect.width, y: normalRect.top };
      else if (activeTarget === 'br') ptDisp = { x: normalRect.left + normalRect.width, y: normalRect.top + normalRect.height };
      else if (activeTarget === 'bl') ptDisp = { x: normalRect.left, y: normalRect.top + normalRect.height };
      else return;
    } else {
      if (activeTarget === 'tl') ptDisp = quadDisp.tl;
      else if (activeTarget === 'tr') ptDisp = quadDisp.tr;
      else if (activeTarget === 'br') ptDisp = quadDisp.br;
      else if (activeTarget === 'bl') ptDisp = quadDisp.bl;
      else return;
    }

    // Convert display point to raw image pixel coordinates
    const vpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const zoom = fabricCanvas.getZoom() || 1;
    const fx = (ptDisp.x - vpt[4]) / zoom;
    const fy = (ptDisp.y - vpt[5]) / zoom;

    const bRect = activeImage.getBoundingRect();
    const relX = (fx - bRect.left) / (bRect.width || 1);
    const relY = (fy - bRect.top) / (bRect.height || 1);

    const rawC = rawCanvasRef.current;
    const rawX = Math.round(relX * rawC.width);
    const rawY = Math.round(relY * rawC.height);

    const lCanvas = loupeCanvasRef.current;
    const lCtx = lCanvas.getContext('2d');
    if (!lCtx) return;

    const lSize = 130;
    const lZoom = 8;
    const srcRadius = (lSize / 2) / lZoom;

    lCtx.clearRect(0, 0, lSize, lSize);
    lCtx.imageSmoothingEnabled = false;

    lCtx.drawImage(
      rawC,
      rawX - srcRadius,
      rawY - srcRadius,
      srcRadius * 2,
      srcRadius * 2,
      0,
      0,
      lSize,
      lSize
    );

    // Crosshair Guide
    lCtx.strokeStyle = '#ef4444';
    lCtx.lineWidth = 2;
    lCtx.beginPath();
    lCtx.moveTo(lSize / 2, 0);
    lCtx.lineTo(lSize / 2, lSize);
    lCtx.moveTo(0, lSize / 2);
    lCtx.lineTo(lSize, lSize / 2);
    lCtx.stroke();

    lCtx.fillStyle = '#ef4444';
    lCtx.beginPath();
    lCtx.arc(lSize / 2, lSize / 2, 3, 0, 2 * Math.PI);
    lCtx.fill();
  }, [activeTarget, cropMode, normalRect, quadDisp, fabricCanvas, activeImage]);

  // Apply Crop Transformation
  const handleExecuteCrop = () => {
    if (!fabricCanvas || !activeImage || !rawCanvasRef.current) return;

    const rawC = rawCanvasRef.current;
    const natW = rawC.width;
    const natH = rawC.height;

    const vpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const zoom = fabricCanvas.getZoom() || 1;
    const bRect = activeImage.getBoundingRect();

    // Helper: Convert Display Point -> Raw Pixel Point
    const dispToRaw = (pt: Point2D): Point2D => {
      const fx = (pt.x - vpt[4]) / zoom;
      const fy = (pt.y - vpt[5]) / zoom;
      const relX = (fx - bRect.left) / (bRect.width || 1);
      const relY = (fy - bRect.top) / (bRect.height || 1);
      return {
        x: Math.max(0, Math.min(natW, Math.round(relX * natW))),
        y: Math.max(0, Math.min(natH, Math.round(relY * natH))),
      };
    };

    if (cropMode === 'normal') {
      const tl = dispToRaw({ x: normalRect.left, y: normalRect.top });
      const br = dispToRaw({ x: normalRect.left + normalRect.width, y: normalRect.top + normalRect.height });

      const cropX = Math.min(tl.x, br.x);
      const cropY = Math.min(tl.y, br.y);
      const cropW = Math.max(10, Math.abs(br.x - tl.x));
      const cropH = Math.max(10, Math.abs(br.y - tl.y));

      const outCanvas = document.createElement('canvas');
      outCanvas.width = cropW;
      outCanvas.height = cropH;
      const oCtx = outCanvas.getContext('2d');
      if (oCtx) {
        oCtx.drawImage(rawC, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        onApplyCrop(outCanvas);
      }
    } else {
      // 4-Corner Perspective Warp
      const rawQuad: DocumentQuad = {
        tl: dispToRaw(quadDisp.tl),
        tr: dispToRaw(quadDisp.tr),
        br: dispToRaw(quadDisp.br),
        bl: dispToRaw(quadDisp.bl),
      };

      const topW = Math.hypot(rawQuad.tr.x - rawQuad.tl.x, rawQuad.tr.y - rawQuad.tl.y);
      const botW = Math.hypot(rawQuad.br.x - rawQuad.bl.x, rawQuad.br.y - rawQuad.bl.y);
      const leftH = Math.hypot(rawQuad.bl.x - rawQuad.tl.x, rawQuad.bl.y - rawQuad.tl.y);
      const rightH = Math.hypot(rawQuad.br.x - rawQuad.tr.x, rawQuad.br.y - rawQuad.tr.y);

      const targetW = Math.max(50, Math.round(Math.max(topW, botW)));
      const targetH = Math.max(50, Math.round(Math.max(leftH, rightH)));

      const warped = PerspectiveWarpEngine.warpPerspective(rawC, rawQuad, targetW, targetH);
      onApplyCrop(warped);
    }
  };

  // Apply Aspect Ratio Presets
  const handleApplyPreset = (ratioWtoH: number) => {
    if (!fabricCanvas || !activeImage) return;
    const vpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const zoom = fabricCanvas.getZoom() || 1;
    const bRect = activeImage.getBoundingRect();

    const dispLeft = bRect.left * zoom + vpt[4];
    const dispTop = bRect.top * zoom + vpt[5];
    const dispW = bRect.width * zoom;
    const dispH = bRect.height * zoom;

    let targetW = dispW * 0.85;
    let targetH = targetW / ratioWtoH;

    if (targetH > dispH * 0.85) {
      targetH = dispH * 0.85;
      targetW = targetH * ratioWtoH;
    }

    const cLeft = Math.round(dispLeft + (dispW - targetW) / 2);
    const cTop = Math.round(dispTop + (dispH - targetH) / 2);
    const cW = Math.round(targetW);
    const cH = Math.round(targetH);

    setNormalRect({ left: cLeft, top: cTop, width: cW, height: cH });

    setQuadDisp({
      tl: { x: cLeft, y: cTop },
      tr: { x: cLeft + cW, y: cTop },
      br: { x: cLeft + cW, y: cTop + cH },
      bl: { x: cLeft, y: cTop + cH },
    });
  };

  // Auto Detect Corners (Perspective Mode)
  const handleAutoDetect = () => {
    if (!rawCanvasRef.current || !fabricCanvas || !activeImage) return;

    const detected = PerspectiveWarpEngine.autoDetectDocumentCorners(rawCanvasRef.current);
    if (!detected) return;

    const vpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const zoom = fabricCanvas.getZoom() || 1;
    const bRect = activeImage.getBoundingRect();
    const natW = rawCanvasRef.current.width;
    const natH = rawCanvasRef.current.height;

    const rawToDisp = (pt: Point2D): Point2D => {
      const relX = pt.x / natW;
      const relY = pt.y / natH;
      const fx = bRect.left + relX * bRect.width;
      const fy = bRect.top + relY * bRect.height;
      return {
        x: Math.round(fx * zoom + vpt[4]),
        y: Math.round(fy * zoom + vpt[5]),
      };
    };

    setQuadDisp({
      tl: rawToDisp(detected.tl),
      tr: rawToDisp(detected.tr),
      br: rawToDisp(detected.br),
      bl: rawToDisp(detected.bl),
    });
  };

  const dTopMid = { x: (quadDisp.tl.x + quadDisp.tr.x) / 2, y: (quadDisp.tl.y + quadDisp.tr.y) / 2 };
  const dRightMid = { x: (quadDisp.tr.x + quadDisp.br.x) / 2, y: (quadDisp.tr.y + quadDisp.br.y) / 2 };
  const dBotMid = { x: (quadDisp.bl.x + quadDisp.br.x) / 2, y: (quadDisp.bl.y + quadDisp.br.y) / 2 };
  const dLeftMid = { x: (quadDisp.tl.x + quadDisp.bl.x) / 2, y: (quadDisp.tl.y + quadDisp.bl.y) / 2 };
  const dCenter = {
    x: (quadDisp.tl.x + quadDisp.tr.x + quadDisp.br.x + quadDisp.bl.x) / 4,
    y: (quadDisp.tl.y + quadDisp.tr.y + quadDisp.br.y + quadDisp.bl.y) / 4,
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-auto select-none z-30 overflow-hidden font-sans"
    >
      {/* Dimmed Shaded Overlay Mask */}
      {cropMode === 'normal' ? (
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <mask id="normal-crop-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={normalRect.left}
                y={normalRect.top}
                width={normalRect.width}
                height={normalRect.height}
                fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.65)" mask="url(#normal-crop-mask)" />
          {/* Rule of thirds grid inside crop box */}
          <line
            x1={normalRect.left + normalRect.width / 3}
            y1={normalRect.top}
            x2={normalRect.left + normalRect.width / 3}
            y2={normalRect.top + normalRect.height}
            stroke="rgba(255,255,255,0.3)"
            strokeDasharray="3 3"
          />
          <line
            x1={normalRect.left + (2 * normalRect.width) / 3}
            y1={normalRect.top}
            x2={normalRect.left + (2 * normalRect.width) / 3}
            y2={normalRect.top + normalRect.height}
            stroke="rgba(255,255,255,0.3)"
            strokeDasharray="3 3"
          />
          <line
            x1={normalRect.left}
            y1={normalRect.top + normalRect.height / 3}
            x2={normalRect.left + normalRect.width}
            y2={normalRect.top + normalRect.height / 3}
            stroke="rgba(255,255,255,0.3)"
            strokeDasharray="3 3"
          />
          <line
            x1={normalRect.left}
            y1={normalRect.top + (2 * normalRect.height) / 3}
            x2={normalRect.left + normalRect.width}
            y2={normalRect.top + (2 * normalRect.height) / 3}
            stroke="rgba(255,255,255,0.3)"
            strokeDasharray="3 3"
          />
          {/* Glowing Border */}
          <rect
            x={normalRect.left}
            y={normalRect.top}
            width={normalRect.width}
            height={normalRect.height}
            fill="none"
            stroke="#6366f1"
            strokeWidth="2.5"
            className="drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]"
          />
        </svg>
      ) : (
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <mask id="perspective-crop-mask">
              <rect width="100%" height="100%" fill="white" />
              <polygon
                points={`${quadDisp.tl.x},${quadDisp.tl.y} ${quadDisp.tr.x},${quadDisp.tr.y} ${quadDisp.br.x},${quadDisp.br.y} ${quadDisp.bl.x},${quadDisp.bl.y}`}
                fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.65)" mask="url(#perspective-crop-mask)" />
          {/* Diagonal guidelines */}
          <line
            x1={quadDisp.tl.x}
            y1={quadDisp.tl.y}
            x2={quadDisp.br.x}
            y2={quadDisp.br.y}
            stroke="rgba(255,255,255,0.3)"
            strokeDasharray="4 4"
          />
          <line
            x1={quadDisp.tr.x}
            y1={quadDisp.tr.y}
            x2={quadDisp.bl.x}
            y2={quadDisp.bl.y}
            stroke="rgba(255,255,255,0.3)"
            strokeDasharray="4 4"
          />
          {/* Glowing Polygon Outline */}
          <polygon
            points={`${quadDisp.tl.x},${quadDisp.tl.y} ${quadDisp.tr.x},${quadDisp.tr.y} ${quadDisp.br.x},${quadDisp.br.y} ${quadDisp.bl.x},${quadDisp.bl.y}`}
            fill="none"
            stroke="#6366f1"
            strokeWidth="2.5"
            className="drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]"
          />
        </svg>
      )}

      {/* ── Normal Crop Handles (8-Point) ── */}
      {cropMode === 'normal' && (
        <>
          {/* Center Move Area */}
          <div
            onMouseDown={(e) => handleMouseDown(e, 'all')}
            style={{
              left: `${normalRect.left}px`,
              top: `${normalRect.top}px`,
              width: `${normalRect.width}px`,
              height: `${normalRect.height}px`,
            }}
            className="absolute cursor-move flex items-center justify-center group"
          >
            <div className="w-8 h-8 rounded-full bg-slate-900/90 border-2 border-indigo-400 text-indigo-300 shadow-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              <Move className="w-4 h-4" />
            </div>
          </div>

          {/* 4 Corner Handles */}
          {[
            { key: 'tl', left: normalRect.left, top: normalRect.top, cursor: 'cursor-nwse-resize' },
            { key: 'tr', left: normalRect.left + normalRect.width, top: normalRect.top, cursor: 'cursor-nesw-resize' },
            { key: 'br', left: normalRect.left + normalRect.width, top: normalRect.top + normalRect.height, cursor: 'cursor-nwse-resize' },
            { key: 'bl', left: normalRect.left, top: normalRect.top + normalRect.height, cursor: 'cursor-nesw-resize' },
          ].map(({ key, left, top, cursor }) => (
            <div
              key={key}
              onMouseDown={(e) => handleMouseDown(e, key as DragTarget)}
              style={{ left: `${left}px`, top: `${top}px`, transform: 'translate(-50%, -50%)' }}
              className={`absolute w-5 h-5 rounded-full bg-indigo-600 border-2 border-white shadow-xl ${cursor} hover:scale-130 transition-transform z-40 hover:bg-amber-400 cursor-pointer`}
            />
          ))}

          {/* 4 Edge Midpoint Handles */}
          {[
            { key: 'top', left: normalRect.left + normalRect.width / 2, top: normalRect.top, cursor: 'cursor-ns-resize' },
            { key: 'bottom', left: normalRect.left + normalRect.width / 2, top: normalRect.top + normalRect.height, cursor: 'cursor-ns-resize' },
            { key: 'left', left: normalRect.left, top: normalRect.top + normalRect.height / 2, cursor: 'cursor-ew-resize' },
            { key: 'right', left: normalRect.left + normalRect.width, top: normalRect.top + normalRect.height / 2, cursor: 'cursor-ew-resize' },
          ].map(({ key, left, top, cursor }) => (
            <div
              key={key}
              onMouseDown={(e) => handleMouseDown(e, key as DragTarget)}
              style={{ left: `${left}px`, top: `${top}px`, transform: 'translate(-50%, -50%)' }}
              className={`absolute w-3.5 h-3.5 rounded-md bg-white border border-slate-900 shadow-md ${cursor} hover:scale-130 transition-transform z-40 hover:bg-amber-300 cursor-pointer`}
            />
          ))}
        </>
      )}

      {/* ── 4-Corner Perspective Handles ── */}
      {cropMode === 'perspective' && (
        <>
          {/* Center Pan Handle */}
          <div
            onMouseDown={(e) => handleMouseDown(e, 'center')}
            style={{
              left: `${dCenter.x}px`,
              top: `${dCenter.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
            className="absolute w-8 h-8 rounded-full bg-slate-900/90 border-2 border-indigo-400 text-indigo-300 shadow-xl flex items-center justify-center cursor-move hover:scale-125 transition-transform z-40 hover:bg-indigo-600 hover:text-white"
          >
            <Move className="w-4 h-4" />
          </div>

          {/* 4 Draggable Corner Handles */}
          {[
            { key: 'tl', pt: quadDisp.tl },
            { key: 'tr', pt: quadDisp.tr },
            { key: 'br', pt: quadDisp.br },
            { key: 'bl', pt: quadDisp.bl },
          ].map(({ key, pt }) => (
            <div
              key={key}
              onMouseDown={(e) => handleMouseDown(e, key as DragTarget)}
              style={{
                left: `${pt.x}px`,
                top: `${pt.y}px`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute w-7 h-7 flex items-center justify-center cursor-crosshair z-40 group cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-indigo-600/40 animate-ping absolute" />
              <div className="w-5 h-5 rounded-full bg-indigo-600 border-2 border-white shadow-xl flex items-center justify-center group-hover:scale-130 transition-transform group-hover:bg-amber-400">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            </div>
          ))}

          {/* 4 Edge Midpoint Handles */}
          {[
            { key: 'top', pt: dTopMid, cursor: 'cursor-ns-resize' },
            { key: 'right', pt: dRightMid, cursor: 'cursor-ew-resize' },
            { key: 'bottom', pt: dBotMid, cursor: 'cursor-ns-resize' },
            { key: 'left', pt: dLeftMid, cursor: 'cursor-ew-resize' },
          ].map(({ key, pt, cursor }) => (
            <div
              key={key}
              onMouseDown={(e) => handleMouseDown(e, key as DragTarget)}
              style={{
                left: `${pt.x}px`,
                top: `${pt.y}px`,
                transform: 'translate(-50%, -50%)',
              }}
              className={`absolute w-3.5 h-3.5 rounded-md bg-white border border-slate-900 shadow-md ${cursor} hover:scale-130 transition-transform z-40 hover:bg-amber-300 cursor-pointer`}
            />
          ))}
        </>
      )}

      {/* 8x Floating Magnifier Loupe during Dragging */}
      {activeTarget && loupePos && (
        <div
          style={{
            left: `${loupePos.x - 65}px`,
            top: `${loupePos.y - 155}px`,
          }}
          className="fixed z-50 pointer-events-none flex flex-col items-center animate-in fade-in zoom-in-95 duration-75"
        >
          <div className="w-32 h-32 rounded-full border-3 border-indigo-400 overflow-hidden shadow-2xl bg-black relative ring-4 ring-slate-950">
            <canvas ref={loupeCanvasRef} width={130} height={130} className="w-full h-full" />
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/85 rounded text-[10px] font-mono text-indigo-300 font-bold border border-slate-700">
              8x Magnifier
            </div>
          </div>
          <div className="w-2.5 h-2.5 bg-indigo-400 rotate-45 -mt-1.5 shadow-lg" />
        </div>
      )}

      {/* ── Top Floating Toolbar (Crop Mode Switch & Presets) ── */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl px-3 py-1.5 rounded-2xl border border-indigo-500/40 text-xs font-bold text-slate-200 shadow-2xl flex items-center gap-2 z-40 whitespace-nowrap">
        {/* Mode Switcher Pill */}
        <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 gap-1">
          <button
            onClick={() => onSetCropMode('normal')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              cropMode === 'normal'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crop className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'রেগুলার ক্রপ' : 'Normal Crop'}</span>
          </button>

          <button
            onClick={() => onSetCropMode('perspective')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              cropMode === 'perspective'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scissors className="w-3.5 h-3.5 text-amber-300" />
            <span>{language === 'bn' ? '৪-কোণা ওয়ার্প' : '4-Corner Warp'}</span>
          </button>
        </div>

        <div className="h-3.5 w-px bg-slate-700 mx-0.5" />

        {/* Presets */}
        <button
          onClick={() => handleApplyPreset(40 / 50)}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] text-emerald-300 font-mono font-bold transition cursor-pointer flex items-center gap-1"
          title="BD Passport (40x50mm)"
        >
          <UserCheck className="w-3 h-3" />
          <span>40×50mm</span>
        </button>

        <button
          onClick={() => handleApplyPreset(35 / 45)}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] text-amber-300 font-mono font-bold transition cursor-pointer flex items-center gap-1"
          title="E-Passport / Visa (35x45mm)"
        >
          <UserCheck className="w-3 h-3" />
          <span>35×45mm</span>
        </button>

        <button
          onClick={() => handleApplyPreset(25 / 30)}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] text-cyan-300 font-mono font-bold transition cursor-pointer"
          title="BD Stamp Size (25x30mm)"
        >
          <span>25×30mm</span>
        </button>

        <button
          onClick={() => handleApplyPreset(1)}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] text-slate-300 font-mono transition cursor-pointer"
          title="Square (1:1)"
        >
          1:1
        </button>

        <button
          onClick={() => handleApplyPreset(210 / 297)}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] text-slate-300 font-mono transition cursor-pointer"
          title="A4 Document"
        >
          A4
        </button>

        {cropMode === 'perspective' && (
          <button
            onClick={handleAutoDetect}
            className="flex items-center gap-1 px-2 py-1 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
            title="Auto Detect Document Corners"
          >
            <Wand2 className="w-3 h-3 text-amber-300" />
            <span>Auto</span>
          </button>
        )}
      </div>

      {/* ── Bottom Floating Action Bar (Apply / Cancel) ── */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-950/95 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-800 shadow-2xl z-50 whitespace-nowrap">
        <button
          onClick={handleExecuteCrop}
          className="flex items-center gap-1.5 px-6 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl text-xs transition-all shadow-xl shadow-emerald-950/60 hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>
            {cropMode === 'normal'
              ? (language === 'bn' ? '✓ ক্রপ করুন (Apply Crop)' : 'Apply Crop')
              : (language === 'bn' ? '✓ সোজা ও ক্রপ করুন (Warp & Crop)' : 'Warp & Crop')}
          </span>
        </button>

        <button
          onClick={onCancelCrop}
          className="flex items-center gap-1 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition active:scale-95 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>{language === 'bn' ? 'বাতিল' : 'Cancel'}</span>
        </button>
      </div>
    </div>
  );
}
