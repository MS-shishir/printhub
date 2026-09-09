/**
 * DocumentViewer.tsx
 * Enterprise Viewport Component for Interactive Document Rendering, Zoom, Pan & Before/After Comparison.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ZoomIn, ZoomOut, Maximize2, Columns, RotateCw, RotateCcw, Scissors, Check,
  X, Wand2, CreditCard, FileText, Scale, UserCheck, Maximize, ChevronsLeftRight
} from 'lucide-react';
import { DocumentPageItem, DocPreset, DOC_PRESETS } from '../../services/DocumentScanService';
import { DocumentQuad } from '../../engines/PerspectiveWarpEngine';
import PerspectiveCropOverlay from './PerspectiveCropOverlay';

interface DocumentViewerProps {
  activePage: DocumentPageItem | null;
  onApplyWarp: () => void;
  onAutoDetect: () => void;
  onResetQuad: () => void;
  onCancelWarp: () => void;
  onRotateInCrop: (cw: boolean) => void;
  onUpdateQuad: (newQuad: any) => void;
  onSelectPreset?: (preset: DocPreset) => void;
  language: 'en' | 'bn';
}

export default function DocumentViewer({
  activePage,
  onApplyWarp,
  onAutoDetect,
  onResetQuad,
  onCancelWarp,
  onRotateInCrop,
  onUpdateQuad,
  onSelectPreset,
  language
}: DocumentViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasDisplayRef = useRef<HTMLCanvasElement | null>(null);
  const splitOverlayRef = useRef<HTMLDivElement | null>(null);

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isBeforeAfterActive, setIsBeforeAfterActive] = useState<boolean>(false);
  const [splitPos, setSplitPos] = useState<number>(50);
  const [canvasDisplaySize, setCanvasDisplaySize] = useState<{ width: number; height: number }>({ width: 600, height: 800 });

  const isPanningRef = useRef<boolean>(false);
  const isDraggingSplitRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number; startPanX: number; startPanY: number }>({
    x: 0, y: 0, startPanX: 0, startPanY: 0
  });

  // Calculate Best Fit on container resize or page change
  useEffect(() => {
    if (!containerRef.current || !activePage) return;
    const active = activePage.isWarpMode
      ? activePage.sourceCanvas
      : (activePage.previewCanvas || activePage.processedCanvas || activePage.sourceCanvas);
    if (!active) return;

    const cW = containerRef.current.clientWidth - 40;
    const cH = containerRef.current.clientHeight - 40;

    const imgAspect = active.width / active.height;
    const contAspect = cW / cH;

    let dispW = cW;
    let dispH = cH;

    if (imgAspect > contAspect) {
      dispW = cW;
      dispH = cW / imgAspect;
    } else {
      dispH = cH;
      dispW = cH * imgAspect;
    }

    setCanvasDisplaySize({
      width: Math.max(100, Math.round(dispW)),
      height: Math.max(100, Math.round(dispH)),
    });
  }, [activePage?.sourceCanvas, activePage?.previewCanvas, activePage?.processedCanvas, activePage?.isWarpMode]);

  // Render Canvas (Processed or Before/After Split) at Full Native High-DPI Resolution
  useEffect(() => {
    if (!canvasDisplayRef.current || !activePage) return;
    const active = activePage.isWarpMode
      ? activePage.sourceCanvas
      : (activePage.processedCanvas || activePage.warpedCanvas || activePage.sourceCanvas);
    if (!active) return;

    const canvas = canvasDisplayRef.current;
    
    // Set internal buffer to full native image resolution for razor-sharp rendering
    if (canvas.width !== active.width || canvas.height !== active.height) {
      canvas.width = active.width;
      canvas.height = active.height;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isBeforeAfterActive && !activePage.isWarpMode && activePage.sourceCanvas) {
      // Split Screen Comparison View
      const splitX = (active.width * splitPos) / 100;
      const beforeSource = activePage.warpedCanvas || activePage.sourceCanvas;
      const enhanced = activePage.processedCanvas || activePage.warpedCanvas || activePage.sourceCanvas;

      // Left: Original / Un-enhanced Source
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitX, active.height);
      ctx.clip();
      ctx.drawImage(beforeSource, 0, 0, active.width, active.height);
      ctx.restore();

      // Right: Enhanced Processed
      ctx.save();
      ctx.beginPath();
      ctx.rect(splitX, 0, active.width - splitX, active.height);
      ctx.clip();
      ctx.drawImage(enhanced, 0, 0, active.width, active.height);
      ctx.restore();
    } else {
      // Full Single View
      ctx.drawImage(active, 0, 0, active.width, active.height);
    }
  }, [activePage?.processedCanvas, activePage?.warpedCanvas, activePage?.sourceCanvas, activePage?.isWarpMode, isBeforeAfterActive, splitPos]);

  // Split Drag Handlers with 60 FPS smooth precision
  const updateSplitPosition = useCallback((clientX: number) => {
    if (!splitOverlayRef.current) return;
    const rect = splitOverlayRef.current.getBoundingClientRect();
    if (rect.width > 0) {
      const offsetX = clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (offsetX / rect.width) * 100));
      setSplitPos(Math.round(percentage * 10) / 10);
    }
  }, []);

  const handleSplitMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingSplitRef.current = true;
    updateSplitPosition(e.clientX);
  };

  const handleSplitTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      e.stopPropagation();
      isDraggingSplitRef.current = true;
      updateSplitPosition(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDraggingSplitRef.current) {
        updateSplitPosition(e.clientX);
      }
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isDraggingSplitRef.current && e.touches.length === 1) {
        updateSplitPosition(e.touches[0].clientX);
      }
    };

    const handleGlobalMouseUp = () => {
      isDraggingSplitRef.current = false;
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchmove', handleGlobalTouchMove, { passive: true });
    window.addEventListener('touchend', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [updateSplitPosition]);

  // Keyboard Enter & Escape handlers for Crop Mode
  useEffect(() => {
    if (!activePage?.isWarpMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        onApplyWarp();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancelWarp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePage?.isWarpMode, onApplyWarp, onCancelWarp]);

  // Mouse Wheel Zoom (Enabled smoothly for both Crop and Normal mode)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    setZoomLevel(prev => Math.min(4, Math.max(0.4, prev * zoomFactor)));
  };

  // Mouse Pan Handlers (Enabled for both Crop and Normal mode)
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.crop-interactive-element, .split-interactive-element') && !e.altKey && e.button !== 1) return;
    isPanningRef.current = true;
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPanX: panOffset.x,
      startPanY: panOffset.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanningRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setPanOffset({
      x: panStartRef.current.startPanX + dx,
      y: panStartRef.current.startPanY + dy,
    });
  };

  const handleMouseUp = () => {
    isPanningRef.current = false;
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Preset Ratio Applier
  const handleApplyPresetRatio = (ratioWtoH: number, presetId?: string) => {
    if (!activePage?.sourceCanvas) return;
    if (presetId && onSelectPreset) {
      const targetPreset = DOC_PRESETS.find(p => p.id === presetId);
      if (targetPreset) onSelectPreset(targetPreset);
    }

    if (ratioWtoH <= 0) return;

    const w = activePage.sourceCanvas.width;
    const h = activePage.sourceCanvas.height;

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

    onUpdateQuad(newQuad);
  };

  if (!activePage) {
    return (
      <div className="flex-1 bg-slate-950 flex items-center justify-center text-slate-500">
        <p className="text-sm font-medium">
          {language === 'bn' ? 'বাম পাশের তালিকা থেকে একটি পৃষ্ঠা নির্বাচন করুন' : 'Select a page from the sidebar'}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="flex-1 relative bg-slate-950/90 overflow-hidden flex items-center justify-center select-none"
    >
      {/* ── TOP HUD (Fixed Viewport Level - 100% UI Scale - Never Shrinks / Never Blocks Document) ── */}
      {activePage.isWarpMode ? (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/95 hover:bg-slate-900/98 backdrop-blur-2xl px-3 py-1.5 rounded-2xl border border-slate-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.7)] text-xs font-bold text-slate-200 flex items-center gap-1.5 z-40 whitespace-nowrap pointer-events-auto select-none transition-all">
          <button
            onClick={onAutoDetect}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 rounded-xl text-xs text-white font-extrabold shadow-md transition active:scale-95 cursor-pointer"
            title="Auto Detect 4 Corners (স্বয়ংক্রিয় চার কোণা সনাক্ত)"
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-300" />
            <span>{language === 'bn' ? 'অটো ৪-কোণা' : 'Auto Detect'}</span>
          </button>

          <div className="h-4 w-px bg-slate-700/80 mx-0.5" />

          {/* Rotate 90° Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onRotateInCrop(false)}
              className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-sky-300 hover:text-white rounded-xl transition active:scale-95 cursor-pointer flex items-center gap-1 text-[11px] font-bold"
              title="Rotate 90° CCW (বামে ঘোরান)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>90°</span>
            </button>
            <button
              onClick={() => onRotateInCrop(true)}
              className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-sky-300 hover:text-white rounded-xl transition active:scale-95 cursor-pointer flex items-center gap-1 text-[11px] font-bold"
              title="Rotate 90° CW (ডানে ঘোরান)"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>90°</span>
            </button>
          </div>

          <div className="h-4 w-px bg-slate-700/80 mx-0.5" />

          {/* Aspect Ratio Presets */}
          <button
            onClick={() => handleApplyPresetRatio(85.6 / 53.98, 'smart_nid')}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activePage.selectedPreset?.id === 'smart_nid' || activePage.selectedPreset?.id === 'driving_license'
                ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-300 font-extrabold'
                : 'bg-slate-800/80 hover:bg-slate-700 text-amber-300'
            }`}
            title="Smart NID (85.6 × 54mm) - বাংলাদেশ স্মার্ট জাতীয় পরিচয়পত্র"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'স্মার্ট NID' : 'Smart NID'}</span>
          </button>

          <button
            onClick={() => handleApplyPresetRatio(105 / 75, 'old_nid')}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activePage.selectedPreset?.id === 'old_nid'
                ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-300 font-extrabold'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200'
            }`}
            title="Old Laminated NID (105 × 75mm) - পুরাতন ভোটার আইডি"
          >
            <span>{language === 'bn' ? 'পুরাতন NID' : 'Old NID'}</span>
          </button>

          <button
            onClick={() => handleApplyPresetRatio(210 / 297, 'birth_cert_a4')}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono transition cursor-pointer flex items-center gap-1.5 ${
              activePage.selectedPreset?.id === 'birth_cert_a4' || activePage.selectedPreset?.id === 'certificate_a4'
                ? 'bg-sky-500 text-slate-950 font-bold shadow-md'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
            title="A4 Document / জন্ম নিবন্ধন ও সার্টিফিকেট (210 × 297mm)"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>A4</span>
          </button>

          <button
            onClick={() => handleApplyPresetRatio(216 / 356, 'legal_doc')}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono transition cursor-pointer flex items-center gap-1.5 ${
              activePage.selectedPreset?.id === 'legal_doc'
                ? 'bg-sky-500 text-slate-950 font-bold shadow-md'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
            title="Legal Document / দলিল ও স্ট্যাম্প (216 × 356mm)"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Legal</span>
          </button>

          <button
            onClick={() => handleApplyPresetRatio(35 / 45, 'passport_photo')}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono transition cursor-pointer flex items-center gap-1.5 ${
              activePage.selectedPreset?.id === 'passport_photo'
                ? 'bg-sky-500 text-slate-950 font-bold shadow-md'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
            title="Passport / Visa (35 × 45mm)"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>35×45</span>
          </button>

          <button
            onClick={() => handleApplyPresetRatio(1)}
            className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-xl text-[11px] text-slate-300 font-mono transition cursor-pointer"
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
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono transition cursor-pointer ${
              activePage.selectedPreset?.id === 'freeform'
                ? 'bg-indigo-500 text-white font-bold shadow-md'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400'
            }`}
            title="Freeform / কোনো রেশিও লক ছাড়া মুক্ত ক্রপ"
          >
            {language === 'bn' ? 'মুক্ত' : 'Free'}
          </button>

          <button
            onClick={onResetQuad}
            className="p-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
            title="Reset Full Corners (সম্পূর্ণ পেজ সিলেক্ট)"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        /* Normal Mode: Top Floating Document Format & Live Size Badge */
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/80 shadow-2xl flex items-center gap-2 text-xs font-semibold z-20 pointer-events-none animate-fade-in">
          <span className="text-sm">{activePage.selectedPreset?.icon || '📄'}</span>
          <span className="text-slate-200 font-bold">
            {activePage.selectedPreset?.name || 'A4 Document'}
          </span>
          <span className="h-3 w-px bg-slate-700" />
          <span className="font-mono text-[11px] text-amber-400 font-bold">
            {activePage.selectedPreset?.widthMm > 0
              ? `${activePage.selectedPreset.widthMm} × ${activePage.selectedPreset.heightMm} mm`
              : `${activePage.sourceCanvas.width} × ${activePage.sourceCanvas.height} px`}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold">
            300 DPI
          </span>
        </div>
      )}

      {/* ── Zoom / Viewport Canvas in Realistic Sheet / Card Frame (Scales & Pans Smoothly) ── */}
      <div
        style={{
          width: `${canvasDisplaySize.width}px`,
          height: `${canvasDisplaySize.height}px`,
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformOrigin: 'center center',
          transition: isPanningRef.current ? 'none' : 'transform 0.08s ease-out',
        }}
        className={`relative shadow-[0_15px_50px_rgba(0,0,0,0.85)] overflow-visible flex items-center justify-center bg-white ${
          activePage.selectedPreset?.id.includes('nid') || activePage.selectedPreset?.id.includes('card')
            ? 'rounded-2xl border-2 border-slate-700'
            : 'rounded-md border border-slate-700/60'
        }`}
      >
        <canvas
          ref={canvasDisplayRef}
          style={{
            width: `${canvasDisplaySize.width}px`,
            height: `${canvasDisplaySize.height}px`,
          }}
          className={`w-full h-full object-contain block ${
            activePage.selectedPreset?.id.includes('nid') || activePage.selectedPreset?.id.includes('card')
              ? 'rounded-2xl'
              : 'rounded-md'
          }`}
        />

        {/* 4-Corner Perspective Warp Interactive Overlay (Handles & Saliency Mesh Scale With Document) */}
        {activePage.isWarpMode && activePage.sourceCanvas && (
          <div className="crop-interactive-element">
            <PerspectiveCropOverlay
              canvasRect={{
                left: 0,
                top: 0,
                width: canvasDisplaySize.width,
                height: canvasDisplaySize.height,
              }}
              sourceCanvas={activePage.sourceCanvas}
              quad={activePage.quad}
              selectedPreset={activePage.selectedPreset}
              onQuadChange={onUpdateQuad}
              onSelectPreset={onSelectPreset}
              onApplyWarp={onApplyWarp}
              onAutoDetect={onAutoDetect}
              onResetQuad={onResetQuad}
              onCancel={onCancelWarp}
              onRotate={onRotateInCrop}
              language={language}
            />
          </div>
        )}

        {/* Before / After Interactive Split Comparison Overlay */}
        {isBeforeAfterActive && !activePage.isWarpMode && (
          <div
            ref={splitOverlayRef}
            onMouseDown={handleSplitMouseDown}
            onTouchStart={handleSplitTouchStart}
            className="split-interactive-element absolute inset-0 z-30 cursor-ew-resize select-none overflow-hidden"
          >
            {/* Before / After Floating Status Badges */}
            <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-200 pointer-events-none shadow-xl flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>{language === 'bn' ? 'পূর্বে (Original)' : 'Before'}</span>
            </div>
            <div className="absolute top-3 right-3 bg-slate-950/85 backdrop-blur-md border border-emerald-500/50 px-2.5 py-1 rounded-full text-[11px] font-bold text-emerald-300 pointer-events-none shadow-xl flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{language === 'bn' ? 'পরে (Enhanced)' : 'After'}</span>
            </div>

            {/* Vertical Divider Line with Glow & Shadow */}
            <div
              style={{ left: `${splitPos}%` }}
              className="absolute top-0 bottom-0 -translate-x-1/2 w-0.5 bg-white shadow-[0_0_12px_rgba(0,0,0,0.9),0_0_4px_rgba(255,255,255,0.8)] pointer-events-none"
            >
              {/* Center Draggable Circular Handle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-900/95 border-2 border-white text-white shadow-[0_6px_25px_rgba(0,0,0,0.8)] flex items-center justify-center pointer-events-auto cursor-ew-resize hover:scale-115 active:scale-95 transition-transform backdrop-blur-md group">
                <ChevronsLeftRight className="w-4 h-4 text-sky-400 group-hover:text-amber-300 transition-colors" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM FIXED ACTION DOCK (Fixed Viewport Level - 100% UI Scale - Never Shrinks) ── */}
      {activePage.isWarpMode && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2.5 bg-slate-950/95 backdrop-blur-2xl px-3.5 py-2 rounded-2xl border border-slate-800 shadow-[0_25px_60px_rgba(0,0,0,0.85)] z-40 whitespace-nowrap pointer-events-auto select-none animate-fade-in">
          <button
            onClick={onApplyWarp}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl text-xs transition-all shadow-xl shadow-emerald-950/70 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{language === 'bn' ? '✓ ক্রপ করুন (Apply Crop)' : 'Apply Crop'}</span>
          </button>

          <button
            onClick={onCancelWarp}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition active:scale-95 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'বাতিল' : 'Cancel'}</span>
          </button>
        </div>
      )}

      {/* Floating Bottom Right Viewport Controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md px-2 py-1 rounded-xl border border-slate-800 shadow-xl z-20">
        <button
          onClick={() => setZoomLevel(prev => Math.max(0.4, prev - 0.15))}
          title="জুম কমান"
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="font-mono text-xs text-slate-300 min-w-[3rem] text-center font-bold">
          {Math.round(zoomLevel * 100)}%
        </span>
        <button
          onClick={() => setZoomLevel(prev => Math.min(4, prev + 0.15))}
          title="জুম বাড়ান"
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleResetZoom}
          title="রিসেট ভিউ"
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* Before / After Comparison Toggle */}
        {!activePage.isWarpMode && (
          <>
            <span className="h-4 w-px bg-slate-800 mx-0.5" />
            <button
              onClick={() => setIsBeforeAfterActive(!isBeforeAfterActive)}
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1 font-medium transition-colors cursor-pointer ${
                isBeforeAfterActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">তুলনা</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
