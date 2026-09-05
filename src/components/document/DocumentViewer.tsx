/**
 * DocumentViewer.tsx
 * Enterprise Viewport Component for Interactive Document Rendering, Zoom, Pan & Before/After Comparison.
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  ZoomIn, ZoomOut, Maximize2, Columns, RotateCw, RotateCcw, Scissors, Check
} from 'lucide-react';
import { DocumentPageItem, DocPreset } from '../../services/DocumentScanService';
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

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isBeforeAfterActive, setIsBeforeAfterActive] = useState<boolean>(false);
  const [splitPos, setSplitPos] = useState<number>(50);
  const [canvasDisplaySize, setCanvasDisplaySize] = useState<{ width: number; height: number }>({ width: 600, height: 800 });

  const isPanningRef = useRef<boolean>(false);
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
      const enhanced = activePage.processedCanvas || activePage.warpedCanvas || activePage.sourceCanvas;

      // Left: Original Source
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitX, active.height);
      ctx.clip();
      ctx.drawImage(activePage.sourceCanvas, 0, 0, active.width, active.height);
      ctx.restore();

      // Right: Enhanced Processed
      ctx.save();
      ctx.beginPath();
      ctx.rect(splitX, 0, active.width - splitX, active.height);
      ctx.clip();
      ctx.drawImage(enhanced, 0, 0, active.width, active.height);
      ctx.restore();

      // High-precision Divider Line
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = Math.max(3, Math.round(active.width / 400));
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, active.height);
      ctx.stroke();
    } else {
      // Full Single View
      ctx.drawImage(active, 0, 0, active.width, active.height);
    }
  }, [activePage?.processedCanvas, activePage?.warpedCanvas, activePage?.sourceCanvas, activePage?.isWarpMode, isBeforeAfterActive, splitPos]);

  // Mouse Wheel Zoom (Enabled smoothly for both Crop and Normal mode)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    setZoomLevel(prev => Math.min(4, Math.max(0.4, prev * zoomFactor)));
  };

  // Mouse Pan Handlers (Enabled for both Crop and Normal mode)
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.crop-interactive-element') && !e.altKey && e.button !== 1) return;
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
      {/* Top Floating Document Format & Live Size Badge */}
      {!activePage.isWarpMode && (
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

      {/* Zoom / Viewport Canvas in Realistic Sheet / Card Frame */}
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

        {/* 4-Corner Perspective Warp Overlay */}
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

        {/* Before / After Split Slider Input */}
        {isBeforeAfterActive && !activePage.isWarpMode && (
          <input
            type="range"
            min="0"
            max="100"
            value={splitPos}
            onChange={(e) => setSplitPos(Number(e.target.value))}
            className="absolute inset-x-0 bottom-3 w-3/4 mx-auto accent-indigo-500 h-2 bg-slate-900/90 rounded-xl cursor-ew-resize z-30 shadow-xl"
          />
        )}
      </div>

      {/* Floating Bottom Viewport Controls */}
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
