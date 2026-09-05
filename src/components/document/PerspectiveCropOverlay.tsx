/**
 * PerspectiveCropOverlay.tsx
 * Enterprise-Grade 4-Corner Interactive Perspective Warp & Crop UI.
 * 
 * Features:
 * 1. Ultra-Smooth 60 FPS RequestAnimationFrame corner & edge dragging (zero lag/freeze)
 * 2. Crystal-Clear High-DPI Magnifier Loupe with high-res bilinear sampling
 * 3. Smart Loupe Auto-Repositioning (avoids viewport edges & toolbar overlaps)
 * 4. Precision Red Crosshair for pixel-accurate document corner placement
 * 5. Aspect Ratio Presets: Freeform, 35x45mm Passport, 1:1 Square, A4, Smart NID
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Check, X, RotateCcw, RotateCw, Wand2, Maximize, Move, UserCheck, CreditCard, FileText, Scale, Square
} from 'lucide-react';
import { DocumentQuad, Point2D } from '../../engines/PerspectiveWarpEngine';
import { DOC_PRESETS, DocPreset } from '../../services/DocumentScanService';

interface PerspectiveCropOverlayProps {
  canvasRect: { left: number; top: number; width: number; height: number };
  sourceCanvas: HTMLCanvasElement;
  quad: DocumentQuad;
  selectedPreset?: DocPreset;
  onQuadChange: (newQuad: DocumentQuad) => void;
  onSelectPreset?: (preset: DocPreset) => void;
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
  selectedPreset,
  onQuadChange,
  onSelectPreset,
  onApplyWarp,
  onAutoDetect,
  onResetQuad,
  onCancel,
  onRotate,
  language
}: PerspectiveCropOverlayProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [localQuad, setLocalQuad] = useState<DocumentQuad>(quad);
  const [activeTarget, setActiveTarget] = useState<DragTarget | null>(null);

  const isDraggingRef = useRef<boolean>(false);
  const activeTargetRef = useRef<DragTarget | null>(null);
  const localQuadRef = useRef<DocumentQuad>(quad);
  const dragStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    startQuad: DocumentQuad;
    overlayWidth: number;
    overlayHeight: number;
  }>({
    mouseX: 0,
    mouseY: 0,
    startQuad: quad,
    overlayWidth: canvasRect.width,
    overlayHeight: canvasRect.height,
  });

  const loupeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Synchronize internal state with external quad props when not dragging
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalQuad(quad);
      localQuadRef.current = quad;
    }
  }, [quad]);

  // Coordinate transforms: Original Image <-> Display Rendered
  const scaleX = canvasRect.width / (sourceCanvas.width || 1);
  const scaleY = canvasRect.height / (sourceCanvas.height || 1);

  const toDisplay = useCallback((pt: Point2D): Point2D => ({
    x: pt.x * scaleX,
    y: pt.y * scaleY,
  }), [scaleX, scaleY]);

  const dTl = toDisplay(localQuad.tl);
  const dTr = toDisplay(localQuad.tr);
  const dBr = toDisplay(localQuad.br);
  const dBl = toDisplay(localQuad.bl);

  // Midpoints and Center
  const dTopMid = { x: (dTl.x + dTr.x) / 2, y: (dTl.y + dTr.y) / 2 };
  const dRightMid = { x: (dTr.x + dBr.x) / 2, y: (dTr.y + dBr.y) / 2 };
  const dBotMid = { x: (dBl.x + dBr.x) / 2, y: (dBl.y + dBr.y) / 2 };
  const dLeftMid = { x: (dTl.x + dBl.x) / 2, y: (dTl.y + dBl.y) / 2 };
  const dCenter = { x: (dTl.x + dTr.x + dBr.x + dBl.x) / 4, y: (dTl.y + dTr.y + dBr.y + dBl.y) / 4 };

  const handleMouseDown = (e: React.MouseEvent, target: DragTarget) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    activeTargetRef.current = target;
    setActiveTarget(target);

    const rect = containerRef.current?.getBoundingClientRect();
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startQuad: { ...localQuadRef.current },
      overlayWidth: rect?.width || canvasRect.width,
      overlayHeight: rect?.height || canvasRect.height,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !activeTargetRef.current) return;

      const target = activeTargetRef.current;
      const clientX = e.clientX;
      const clientY = e.clientY;

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        const dxDisp = clientX - dragStartRef.current.mouseX;
        const dyDisp = clientY - dragStartRef.current.mouseY;

        // Accurate screen-to-source conversion using active client bounding rect
        const overlayW = dragStartRef.current.overlayWidth || canvasRect.width;
        const overlayH = dragStartRef.current.overlayHeight || canvasRect.height;
        const dxOrig = dxDisp * (sourceCanvas.width / overlayW);
        const dyOrig = dyDisp * (sourceCanvas.height / overlayH);
        const sQuad = dragStartRef.current.startQuad;

        const maxW = sourceCanvas.width;
        const maxH = sourceCanvas.height;

        const clampPt = (pt: { x: number; y: number }): Point2D => ({
          x: Math.max(0, Math.min(maxW, Math.round(pt.x))),
          y: Math.max(0, Math.min(maxH, Math.round(pt.y))),
        });

        let nextQuad: DocumentQuad = { ...sQuad };

        if (target === 'tl') {
          nextQuad.tl = clampPt({ x: sQuad.tl.x + dxOrig, y: sQuad.tl.y + dyOrig });
        } else if (target === 'tr') {
          nextQuad.tr = clampPt({ x: sQuad.tr.x + dxOrig, y: sQuad.tr.y + dyOrig });
        } else if (target === 'br') {
          nextQuad.br = clampPt({ x: sQuad.br.x + dxOrig, y: sQuad.br.y + dyOrig });
        } else if (target === 'bl') {
          nextQuad.bl = clampPt({ x: sQuad.bl.x + dxOrig, y: sQuad.bl.y + dyOrig });
        } else if (target === 'top') {
          nextQuad.tl = clampPt({ x: sQuad.tl.x, y: sQuad.tl.y + dyOrig });
          nextQuad.tr = clampPt({ x: sQuad.tr.x, y: sQuad.tr.y + dyOrig });
        } else if (target === 'right') {
          nextQuad.tr = clampPt({ x: sQuad.tr.x + dxOrig, y: sQuad.tr.y });
          nextQuad.br = clampPt({ x: sQuad.br.x + dxOrig, y: sQuad.br.y });
        } else if (target === 'bottom') {
          nextQuad.bl = clampPt({ x: sQuad.bl.x, y: sQuad.bl.y + dyOrig });
          nextQuad.br = clampPt({ x: sQuad.br.x + dxOrig, y: sQuad.br.y + dyOrig });
        } else if (target === 'left') {
          nextQuad.tl = clampPt({ x: sQuad.tl.x + dxOrig, y: sQuad.tl.y });
          nextQuad.bl = clampPt({ x: sQuad.bl.x + dxOrig, y: sQuad.bl.y });
        } else if (target === 'center') {
          nextQuad = {
            tl: clampPt({ x: sQuad.tl.x + dxOrig, y: sQuad.tl.y + dyOrig }),
            tr: clampPt({ x: sQuad.tr.x + dxOrig, y: sQuad.tr.y + dyOrig }),
            br: clampPt({ x: sQuad.br.x + dxOrig, y: sQuad.br.y + dyOrig }),
            bl: clampPt({ x: sQuad.bl.x + dxOrig, y: sQuad.bl.y + dyOrig }),
          };
        }

        localQuadRef.current = nextQuad;
        setLocalQuad(nextQuad);
        onQuadChange(nextQuad);
      });
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        isDraggingRef.current = false;
        activeTargetRef.current = null;
        setActiveTarget(null);
        onQuadChange(localQuadRef.current);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [canvasRect.width, canvasRect.height, sourceCanvas.width, sourceCanvas.height, onQuadChange]);

  // Render Crystal-Clear High-DPI Magnifier Loupe
  useEffect(() => {
    if (!activeTarget || !loupeCanvasRef.current || !sourceCanvas) return;

    let targetPt: Point2D | null = null;
    if (activeTarget === 'tl') targetPt = localQuad.tl;
    else if (activeTarget === 'tr') targetPt = localQuad.tr;
    else if (activeTarget === 'br') targetPt = localQuad.br;
    else if (activeTarget === 'bl') targetPt = localQuad.bl;
    
    if (!targetPt) return;

    const lCanvas = loupeCanvasRef.current;
    const lCtx = lCanvas.getContext('2d');
    if (!lCtx) return;

    const canvasResolution = 300; // 300x300 high-DPI internal buffer
    const zoom = 2.8; // 2.8x magnification for crystal-clear corner inspection

    // Compute source sample window in native sourceCanvas pixels
    const dispRadius = 75; // Display loupe radius in px
    const srcRadiusX = (dispRadius / zoom) / scaleX;
    const srcRadiusY = (dispRadius / zoom) / scaleY;

    lCtx.clearRect(0, 0, canvasResolution, canvasResolution);
    lCtx.imageSmoothingEnabled = true;
    lCtx.imageSmoothingQuality = 'high';

    // Draw high-resolution cropped source area centered EXACTLY at targetPt
    lCtx.drawImage(
      sourceCanvas,
      targetPt.x - srcRadiusX,
      targetPt.y - srcRadiusY,
      srcRadiusX * 2,
      srcRadiusY * 2,
      0,
      0,
      canvasResolution,
      canvasResolution
    );

    // Fine, High-Precision Crosshair Guide
    const center = canvasResolution / 2;

    // Subtle dark backdrop behind crosshair for maximum contrast on bright white pages
    lCtx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    lCtx.lineWidth = 3;
    lCtx.beginPath();
    lCtx.moveTo(center, 0);
    lCtx.lineTo(center, canvasResolution);
    lCtx.moveTo(0, center);
    lCtx.lineTo(canvasResolution, center);
    lCtx.stroke();

    // Vibrant Red Precision Crosshair Line
    lCtx.strokeStyle = '#ef4444';
    lCtx.lineWidth = 1.75;
    lCtx.beginPath();
    lCtx.moveTo(center, 0);
    lCtx.lineTo(center, canvasResolution);
    lCtx.moveTo(0, center);
    lCtx.lineTo(canvasResolution, center);
    lCtx.stroke();

    // Center Red Dot with White Border
    lCtx.fillStyle = '#ef4444';
    lCtx.beginPath();
    lCtx.arc(center, center, 3.5, 0, 2 * Math.PI);
    lCtx.fill();

    lCtx.strokeStyle = '#ffffff';
    lCtx.lineWidth = 1.25;
    lCtx.beginPath();
    lCtx.arc(center, center, 3.5, 0, 2 * Math.PI);
    lCtx.stroke();
  }, [activeTarget, localQuad, sourceCanvas, scaleX, scaleY]);

  // Preset Ratio Applier
  const handleApplyPresetRatio = (ratioWtoH: number, presetId?: string) => {
    if (presetId && onSelectPreset) {
      const targetPreset = DOC_PRESETS.find(p => p.id === presetId);
      if (targetPreset) onSelectPreset(targetPreset);
    }

    if (ratioWtoH <= 0) return;

    const w = sourceCanvas.width;
    const h = sourceCanvas.height;

    let targetW = w * 0.85;
    let targetH = targetW / ratioWtoH;

    if (targetH > h * 0.85) {
      targetH = h * 0.85;
      targetW = targetH * ratioWtoH;
    }

    const cx = w / 2;
    const cy = h / 2;

    const newQuad: DocumentQuad = {
      tl: { x: Math.round(cx - targetW / 2), y: Math.round(cy - targetH / 2) },
      tr: { x: Math.round(cx + targetW / 2), y: Math.round(cy - targetH / 2) },
      br: { x: Math.round(cx + targetW / 2), y: Math.round(cy + targetH / 2) },
      bl: { x: Math.round(cx - targetW / 2), y: Math.round(cy + targetH / 2) },
    };

    setLocalQuad(newQuad);
    localQuadRef.current = newQuad;
    onQuadChange(newQuad);
  };

  // Smart Loupe Coordinates Calculation directly attached to the active corner handle
  let activeCornerPt: Point2D | null = null;
  if (activeTarget === 'tl') activeCornerPt = dTl;
  else if (activeTarget === 'tr') activeCornerPt = dTr;
  else if (activeTarget === 'br') activeCornerPt = dBr;
  else if (activeTarget === 'bl') activeCornerPt = dBl;

  let loupeStyle: React.CSSProperties = {};
  if (activeCornerPt) {
    const loupeDiameter = 150;
    const offsetDistance = 95;

    let targetX = activeCornerPt.x;
    let targetY = activeCornerPt.y - offsetDistance;

    // If near top of overlay, flip loupe below handle
    if (activeCornerPt.y < 125) {
      targetY = activeCornerPt.y + offsetDistance;
    }

    // Clamp horizontally to stay inside canvas bounds
    const halfD = loupeDiameter / 2;
    targetX = Math.max(halfD + 8, Math.min(canvasRect.width - halfD - 8, targetX));

    loupeStyle = {
      left: `${targetX}px`,
      top: `${targetY}px`,
      width: `${loupeDiameter}px`,
      height: `${loupeDiameter}px`,
      transform: 'translate(-50%, -50%)',
    };
  }

  return (
    <div
      ref={containerRef}
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
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        <line
          x1={dTr.x}
          y1={dTr.y}
          x2={dBl.x}
          y2={dBl.y}
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* Quad Perimeter Line */}
        <polygon
          points={`${dTl.x},${dTl.y} ${dTr.x},${dTr.y} ${dBr.x},${dBr.y} ${dBl.x},${dBl.y}`}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2"
          className="drop-shadow-[0_0_6px_rgba(56,189,248,0.7)]"
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
        className="absolute w-8 h-8 rounded-full bg-slate-900/95 border-2 border-sky-400 text-sky-300 shadow-xl flex items-center justify-center cursor-move hover:scale-115 transition-transform z-40 hover:bg-sky-600 hover:text-white"
        title="Drag to Move Crop Area"
      >
        <Move className="w-4 h-4" />
      </div>

      {/* 4 Draggable Corner Handles */}
      {[
        { key: 'tl', pt: dTl },
        { key: 'tr', pt: dTr },
        { key: 'br', pt: dBr },
        { key: 'bl', pt: dBl },
      ].map(({ key, pt }) => (
        <div
          key={key}
          onMouseDown={(e) => handleMouseDown(e, key as DragTarget)}
          style={{
            left: `${pt.x}px`,
            top: `${pt.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
          className="absolute w-8 h-8 flex items-center justify-center cursor-crosshair z-40 group cursor-pointer"
        >
          {/* Subtle Outer Halo */}
          <div className="w-6 h-6 rounded-full bg-sky-500/20 group-hover:scale-125 transition-transform absolute" />
          {/* Main Corner Circle (Crisp white with vibrant center) */}
          <div className="w-5 h-5 rounded-full bg-white border-2 border-sky-500 shadow-lg flex items-center justify-center group-hover:scale-120 group-hover:border-amber-400 transition-transform">
            <div className="w-2 h-2 rounded-full bg-sky-600 group-hover:bg-amber-500" />
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
          className={`absolute w-3.5 h-3.5 rounded-sm bg-white border border-slate-800 shadow-md ${cursor} hover:scale-125 transition-transform z-40 hover:bg-amber-300 cursor-pointer`}
        />
      ))}

      {/* Crystal-Clear Floating Magnifier Loupe during Corner Dragging */}
      {activeCornerPt && (
        <div
          style={loupeStyle}
          className="absolute z-50 pointer-events-none rounded-full border-3 border-white/95 shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_0_1px_rgba(0,0,0,0.3)] bg-slate-950 overflow-hidden"
        >
          <canvas
            ref={loupeCanvasRef}
            width={300}
            height={300}
            className="w-full h-full rounded-full block"
          />
        </div>
      )}

      {/* Top Banner Toolbar (Fixed at Viewport Top - Never Shrinks) */}
      <div className="fixed top-18 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl px-3.5 py-1.5 rounded-2xl border border-sky-500/40 text-xs font-bold text-slate-200 shadow-2xl flex items-center gap-2 z-50 whitespace-nowrap pointer-events-auto">
        <button
          onClick={onAutoDetect}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 rounded-xl text-xs text-white font-extrabold shadow-md transition active:scale-95 cursor-pointer"
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
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1 text-[11px] font-bold"
              title="Rotate 90° CCW (বামে ঘোরান)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>90°</span>
            </button>
            <button
              onClick={() => onRotate(true)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1 text-[11px] font-bold"
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
          onClick={() => handleApplyPresetRatio(85.6 / 53.98, 'smart_nid')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
            selectedPreset?.id === 'smart_nid' || selectedPreset?.id === 'driving_license'
              ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-300 font-extrabold'
              : 'bg-slate-800 hover:bg-slate-700 text-amber-300'
          }`}
          title="Smart NID (85.6 × 54mm) - বাংলাদেশ স্মার্ট জাতীয় পরিচয়পত্র"
        >
          <CreditCard className="w-3 h-3" />
          <span>{language === 'bn' ? 'স্মার্ট NID' : 'Smart NID'}</span>
        </button>

        <button
          onClick={() => handleApplyPresetRatio(105 / 75, 'old_nid')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
            selectedPreset?.id === 'old_nid'
              ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-300 font-extrabold'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
          }`}
          title="Old Laminated NID (105 × 75mm) - পুরাতন ভোটার আইডি"
        >
          <span>{language === 'bn' ? 'পুরাতন NID' : 'Old NID'}</span>
        </button>

        <button
          onClick={() => handleApplyPresetRatio(210 / 297, 'birth_cert_a4')}
          className={`px-2 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer flex items-center gap-1 ${
            selectedPreset?.id === 'birth_cert_a4' || selectedPreset?.id === 'certificate_a4'
              ? 'bg-sky-500 text-slate-950 font-bold shadow-md'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
          title="A4 Document / জন্ম নিবন্ধন ও সার্টিফিকেট (210 × 297mm)"
        >
          <FileText className="w-3 h-3" />
          <span>A4</span>
        </button>

        <button
          onClick={() => handleApplyPresetRatio(216 / 356, 'legal_doc')}
          className={`px-2 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer flex items-center gap-1 ${
            selectedPreset?.id === 'legal_doc'
              ? 'bg-sky-500 text-slate-950 font-bold shadow-md'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
          title="Legal Document / দলিল ও স্ট্যাম্প (216 × 356mm)"
        >
          <Scale className="w-3 h-3" />
          <span>Legal</span>
        </button>

        <button
          onClick={() => handleApplyPresetRatio(35 / 45, 'passport_photo')}
          className={`px-2 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer flex items-center gap-1 ${
            selectedPreset?.id === 'passport_photo'
              ? 'bg-sky-500 text-slate-950 font-bold shadow-md'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
          title="Passport / Visa (35 × 45mm)"
        >
          <UserCheck className="w-3 h-3" />
          <span>35×45</span>
        </button>

        <button
          onClick={() => handleApplyPresetRatio(1)}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] text-slate-300 font-mono transition cursor-pointer"
          title="Square (1:1)"
        >
          1:1
        </button>

        <button
          onClick={() => {
            if (onSelectPreset) {
              const freePreset = DOC_PRESETS.find(p => p.id === 'freeform');
              if (freePreset) onSelectPreset(freePreset);
            }
          }}
          className={`px-2 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer ${
            selectedPreset?.id === 'freeform'
              ? 'bg-indigo-500 text-white font-bold shadow-md'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
          }`}
          title="Freeform / কোনো রেশিও লক ছাড়া মুক্ত ক্রপ"
        >
          {language === 'bn' ? 'মুক্ত' : 'Free'}
        </button>

        <button
          onClick={onResetQuad}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
          title="Reset Full Corners (সম্পূর্ণ পেজ সিলেক্ট)"
        >
          <Maximize className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Floating Apply Action Bar (Fixed at Viewport Bottom - Never Shrinks) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-950/95 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-800 shadow-2xl z-50 whitespace-nowrap pointer-events-auto">
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
