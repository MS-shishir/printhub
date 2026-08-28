/**
 * PerspectiveCropOverlay.tsx
 * Enterprise-Grade 4-Corner Interactive Perspective Warp & Crop UI.
 * 
 * Features:
 * 1. Pixel-Perfect 1:1 coordinate alignment matching rendered canvas bounds
 * 2. 4 Draggable corner handles with glow + 4 edge midpoint nudgers + center pan
 * 3. Real-time 8x floating Magnifier Loupe showing exact pixel crosshair
 * 4. Always-Visible In-Viewport Action Bars (Apply Crop, Cancel, Presets, Auto-Detect)
 * 5. Aspect Ratio Presets: Freeform, 35x45mm Passport, 1:1 Square, 4:3, 16:9, A4
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Check, X, RotateCcw, RotateCw, Wand2, Maximize, Scissors, Sparkles, Move, ZoomIn,
  Crop, UserCheck
} from 'lucide-react';
import { DocumentQuad, Point2D } from '../../engines/PerspectiveWarpEngine';

interface PerspectiveCropOverlayProps {
  canvasRect: { left: number; top: number; width: number; height: number };
  sourceCanvas: HTMLCanvasElement;
  quad: DocumentQuad;
  onQuadChange: (newQuad: DocumentQuad) => void;
  onApplyWarp: () => void;
  onAutoDetect: () => void;
  onResetQuad: () => void;
  onCancel: () => void;
  onRotate?: (cw: boolean) => void;
  language: 'en' | 'bn';
}

type DragTarget = 'tl' | 'tr' | 'br' | 'bl' | 'center' | 'top' | 'right' | 'bottom' | 'left';

export default function PerspectiveCropOverlay({
  canvasRect,
  sourceCanvas,
  quad,
  onQuadChange,
  onApplyWarp,
  onAutoDetect,
  onResetQuad,
  onCancel,
  onRotate,
  language
}: PerspectiveCropOverlayProps) {
  const [activeTarget, setActiveTarget] = useState<DragTarget | null>(null);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startQuad: DocumentQuad }>({
    mouseX: 0,
    mouseY: 0,
    startQuad: quad
  });
  const loupeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Coordinate transforms: Original Image (e.g. 1200x1600) <-> Display Rendered (e.g. 480x640)
  const scaleX = canvasRect.width / sourceCanvas.width;
  const scaleY = canvasRect.height / sourceCanvas.height;

  const toDisplay = (pt: Point2D): Point2D => ({
    x: pt.x * scaleX,
    y: pt.y * scaleY,
  });

  const toOriginal = (dispX: number, dispY: number): Point2D => ({
    x: Math.round(dispX / scaleX),
    y: Math.round(dispY / scaleY),
  });

  const dTl = toDisplay(quad.tl);
  const dTr = toDisplay(quad.tr);
  const dBr = toDisplay(quad.br);
  const dBl = toDisplay(quad.bl);

  // Midpoints
  const dTopMid = { x: (dTl.x + dTr.x) / 2, y: (dTl.y + dTr.y) / 2 };
  const dRightMid = { x: (dTr.x + dBr.x) / 2, y: (dTr.y + dBr.y) / 2 };
  const dBotMid = { x: (dBl.x + dBr.x) / 2, y: (dBl.y + dBr.y) / 2 };
  const dLeftMid = { x: (dTl.x + dBl.x) / 2, y: (dTl.y + dBl.y) / 2 };
  const dCenter = { x: (dTl.x + dTr.x + dBr.x + dBl.x) / 4, y: (dTl.y + dTr.y + dBr.y + dBl.y) / 4 };

  const handleMouseDown = (e: React.MouseEvent, target: DragTarget) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    setActiveTarget(target);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startQuad: { ...quad },
    };
    setLoupePos({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !activeTarget) return;

      const dxDisp = e.clientX - dragStartRef.current.mouseX;
      const dyDisp = e.clientY - dragStartRef.current.mouseY;
      const dxOrig = dxDisp / scaleX;
      const dyOrig = dyDisp / scaleY;
      const sQuad = dragStartRef.current.startQuad;

      const clampPt = (pt: Point2D): Point2D => ({
        x: Math.max(0, Math.min(sourceCanvas.width, Math.round(pt.x))),
        y: Math.max(0, Math.min(sourceCanvas.height, Math.round(pt.y))),
      });

      let nextQuad = { ...quad };

      if (activeTarget === 'tl') {
        nextQuad.tl = clampPt({ x: sQuad.tl.x + dxOrig, y: sQuad.tl.y + dyOrig });
      } else if (activeTarget === 'tr') {
        nextQuad.tr = clampPt({ x: sQuad.tr.x + dxOrig, y: sQuad.tr.y + dyOrig });
      } else if (activeTarget === 'br') {
        nextQuad.br = clampPt({ x: sQuad.br.x + dxOrig, y: sQuad.br.y + dyOrig });
      } else if (activeTarget === 'bl') {
        nextQuad.bl = clampPt({ x: sQuad.bl.x + dxOrig, y: sQuad.bl.y + dyOrig });
      } else if (activeTarget === 'top') {
        nextQuad.tl = clampPt({ x: sQuad.tl.x, y: sQuad.tl.y + dyOrig });
        nextQuad.tr = clampPt({ x: sQuad.tr.x, y: sQuad.tr.y + dyOrig });
      } else if (activeTarget === 'right') {
        nextQuad.tr = clampPt({ x: sQuad.tr.x + dxOrig, y: sQuad.tr.y });
        nextQuad.br = clampPt({ x: sQuad.br.x + dxOrig, y: sQuad.br.y });
      } else if (activeTarget === 'bottom') {
        nextQuad.bl = clampPt({ x: sQuad.bl.x, y: sQuad.bl.y + dyOrig });
        nextQuad.br = clampPt({ x: sQuad.br.x, y: sQuad.br.y + dyOrig });
      } else if (activeTarget === 'left') {
        nextQuad.tl = clampPt({ x: sQuad.tl.x + dxOrig, y: sQuad.tl.y });
        nextQuad.bl = clampPt({ x: sQuad.bl.x + dxOrig, y: sQuad.bl.y });
      } else if (activeTarget === 'center') {
        nextQuad = {
          tl: clampPt({ x: sQuad.tl.x + dxOrig, y: sQuad.tl.y + dyOrig }),
          tr: clampPt({ x: sQuad.tr.x + dxOrig, y: sQuad.tr.y + dyOrig }),
          br: clampPt({ x: sQuad.br.x + dxOrig, y: sQuad.br.y + dyOrig }),
          bl: clampPt({ x: sQuad.bl.x + dxOrig, y: sQuad.bl.y + dyOrig }),
        };
      }

      onQuadChange(nextQuad);
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
  }, [activeTarget, quad, scaleX, scaleY, sourceCanvas.width, sourceCanvas.height, onQuadChange]);

  // Render 8x Floating Magnifier Loupe
  useEffect(() => {
    if (!activeTarget || !loupeCanvasRef.current || !sourceCanvas) return;

    let targetPt: Point2D = quad.tl;
    if (activeTarget === 'tl') targetPt = quad.tl;
    else if (activeTarget === 'tr') targetPt = quad.tr;
    else if (activeTarget === 'br') targetPt = quad.br;
    else if (activeTarget === 'bl') targetPt = quad.bl;
    else return;

    const lCanvas = loupeCanvasRef.current;
    const lCtx = lCanvas.getContext('2d');
    if (!lCtx) return;

    const lSize = 130;
    const zoom = 8;
    const srcRadius = (lSize / 2) / zoom;

    lCtx.clearRect(0, 0, lSize, lSize);
    lCtx.imageSmoothingEnabled = false;

    lCtx.drawImage(
      sourceCanvas,
      targetPt.x - srcRadius,
      targetPt.y - srcRadius,
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

    // Center Red Dot
    lCtx.fillStyle = '#ef4444';
    lCtx.beginPath();
    lCtx.arc(lSize / 2, lSize / 2, 3, 0, 2 * Math.PI);
    lCtx.fill();
  }, [activeTarget, quad, sourceCanvas]);

  // Preset Ratio Applier
  const handleApplyPresetRatio = (ratioWtoH: number) => {
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;

    let targetW = w * 0.75;
    let targetH = targetW / ratioWtoH;

    if (targetH > h * 0.75) {
      targetH = h * 0.75;
      targetW = targetH * ratioWtoH;
    }

    const cx = w / 2;
    const cy = h / 2;

    onQuadChange({
      tl: { x: Math.round(cx - targetW / 2), y: Math.round(cy - targetH / 2) },
      tr: { x: Math.round(cx + targetW / 2), y: Math.round(cy - targetH / 2) },
      br: { x: Math.round(cx + targetW / 2), y: Math.round(cy + targetH / 2) },
      bl: { x: Math.round(cx - targetW / 2), y: Math.round(cy + targetH / 2) },
    });
  };

  return (
    <div
      style={{
        width: `${canvasRect.width}px`,
        height: `${canvasRect.height}px`,
      }}
      className="absolute inset-0 pointer-events-auto select-none z-30 overflow-hidden font-sans"
    >
      {/* Semi-Transparent Shaded SVG Mask Outside Quad */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${canvasRect.width} ${canvasRect.height}`}
      >
        <defs>
          <mask id="crop-quad-mask">
            <rect width="100%" height="100%" fill="white" />
            <polygon
              points={`${dTl.x},${dTl.y} ${dTr.x},${dTr.y} ${dBr.x},${dBr.y} ${dBl.x},${dBl.y}`}
              fill="black"
            />
          </mask>
        </defs>

        {/* Dimmed Background */}
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.65)"
          mask="url(#crop-quad-mask)"
        />

        {/* Diagonal Crosshair Guidelines */}
        <line
          x1={dTl.x}
          y1={dTl.y}
          x2={dBr.x}
          y2={dBr.y}
          stroke="rgba(255, 255, 255, 0.35)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        <line
          x1={dTr.x}
          y1={dTr.y}
          x2={dBl.x}
          y2={dBl.y}
          stroke="rgba(255, 255, 255, 0.35)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* Quad Perimeter Outer Glow Line */}
        <polygon
          points={`${dTl.x},${dTl.y} ${dTr.x},${dTr.y} ${dBr.x},${dBr.y} ${dBl.x},${dBl.y}`}
          fill="none"
          stroke="#6366f1"
          strokeWidth="2.5"
          className="drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]"
        />
      </svg>

      {/* Center Pan Drag Handle */}
      <div
        onMouseDown={(e) => handleMouseDown(e, 'center')}
        style={{
          left: `${dCenter.x}px`,
          top: `${dCenter.y}px`,
          transform: 'translate(-50%, -50%)',
        }}
        className="absolute w-8 h-8 rounded-full bg-slate-900/90 border-2 border-indigo-400 text-indigo-300 shadow-xl flex items-center justify-center cursor-move hover:scale-125 transition-transform z-40 hover:bg-indigo-600 hover:text-white"
        title="Drag to Move Crop Area"
      >
        <Move className="w-4 h-4" />
      </div>

      {/* 4 Draggable Corner Handles with Halo & Glow */}
      {[
        { key: 'tl', pt: dTl, label: 'TL' },
        { key: 'tr', pt: dTr, label: 'TR' },
        { key: 'br', pt: dBr, label: 'BR' },
        { key: 'bl', pt: dBl, label: 'BL' },
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

      {/* 4 Edge Midpoint Nudge Handles */}
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

      {/* Top Banner Toolbar (Inside Viewport) */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl px-3.5 py-1.5 rounded-2xl border border-indigo-500/40 text-xs font-bold text-slate-200 shadow-2xl flex items-center gap-2 z-40 whitespace-nowrap">
        <button
          onClick={onAutoDetect}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl text-xs text-white font-extrabold shadow-md transition active:scale-95 cursor-pointer"
          title="Auto Detect 4 Corners"
        >
          <Wand2 className="w-3 h-3 text-amber-300" />
          <span>{language === 'bn' ? 'অটো ৪-কোণা' : 'Auto Detect'}</span>
        </button>

        <div className="h-3.5 w-px bg-slate-700" />

        {/* Rotate 90° Buttons */}
        {onRotate && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onRotate(false)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1 text-[11px] font-bold"
              title="Rotate 90° CCW (বামে ঘোরান)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>90°</span>
            </button>
            <button
              onClick={() => onRotate(true)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1 text-[11px] font-bold"
              title="Rotate 90° CW (ডানে ঘোরান)"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>90°</span>
            </button>
          </div>
        )}

        <div className="h-3.5 w-px bg-slate-700" />

        {/* Aspect Ratio Presets */}
        <button
          onClick={() => handleApplyPresetRatio(35 / 45)}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] text-amber-300 font-mono font-bold transition cursor-pointer flex items-center gap-1"
          title="Passport / Visa (35x45mm)"
        >
          <UserCheck className="w-3 h-3" />
          <span>35×45mm</span>
        </button>

        <button
          onClick={() => handleApplyPresetRatio(1)}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] text-slate-300 font-mono transition cursor-pointer"
          title="Square (1:1)"
        >
          1:1
        </button>

        <button
          onClick={() => handleApplyPresetRatio(210 / 297)}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] text-slate-300 font-mono transition cursor-pointer"
          title="A4 Document"
        >
          A4
        </button>

        <button
          onClick={() => handleApplyPresetRatio(85.6 / 53.98)}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] text-slate-300 font-mono transition cursor-pointer"
          title="Smart NID Card (85.6x54mm)"
        >
          NID
        </button>

        <button
          onClick={onResetQuad}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
          title="Reset Full Corners"
        >
          <Maximize className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Floating Apply Action Bar (Inside Viewport with High Visibility) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-950/95 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-800 shadow-2xl z-50 whitespace-nowrap">
        <button
          onClick={onApplyWarp}
          className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl text-xs transition-all shadow-xl shadow-emerald-950/60 hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{language === 'bn' ? '✓ ক্রপ করুন (Apply Crop)' : 'Apply Crop'}</span>
        </button>

        <button
          onClick={onCancel}
          className="flex items-center gap-1 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition active:scale-95 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>{language === 'bn' ? 'বাতিল' : 'Cancel'}</span>
        </button>
      </div>
    </div>
  );
}
