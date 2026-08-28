/**
 * DocumentViewer.tsx
 * Enterprise Viewport Component for Interactive Document Rendering, Zoom, Pan & Before/After Comparison.
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  ZoomIn, ZoomOut, Maximize2, Columns, RotateCw, RotateCcw, Scissors, Check
} from 'lucide-react';
import { DocumentPageItem } from '../../services/DocumentScanService';
import PerspectiveCropOverlay from './PerspectiveCropOverlay';

interface DocumentViewerProps {
  activePage: DocumentPageItem | null;
  onApplyWarp: () => void;
  onAutoDetect: () => void;
  onResetQuad: () => void;
  onCancelWarp: () => void;
  onRotateInCrop: (cw: boolean) => void;
  onUpdateQuad: (newQuad: any) => void;
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
    const active = activePage.isWarpMode ? activePage.sourceCanvas : (activePage.processedCanvas || activePage.sourceCanvas);
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
  }, [activePage?.sourceCanvas, activePage?.processedCanvas, activePage?.isWarpMode]);

  // Render Canvas (Processed or Before/After Split)
  useEffect(() => {
    if (!canvasDisplayRef.current || !activePage) return;
    const active = activePage.isWarpMode ? activePage.sourceCanvas : (activePage.processedCanvas || activePage.sourceCanvas);
    if (!active) return;

    const canvas = canvasDisplayRef.current;
    canvas.width = canvasDisplaySize.width;
    canvas.height = canvasDisplaySize.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isBeforeAfterActive && !activePage.isWarpMode && activePage.sourceCanvas && activePage.processedCanvas) {
      // Split Screen Comparison View
      const splitX = (canvas.width * splitPos) / 100;

      // Left: Original Source
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitX, canvas.height);
      ctx.clip();
      ctx.drawImage(activePage.sourceCanvas, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Right: Enhanced Processed
      ctx.save();
      ctx.beginPath();
      ctx.rect(splitX, 0, canvas.width - splitX, canvas.height);
      ctx.clip();
      ctx.drawImage(activePage.processedCanvas, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Divider Line
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, canvas.height);
      ctx.stroke();
    } else {
      // Full Single View
      ctx.drawImage(active, 0, 0, canvas.width, canvas.height);
    }
  }, [activePage?.processedCanvas, activePage?.sourceCanvas, activePage?.isWarpMode, canvasDisplaySize, isBeforeAfterActive, splitPos]);

  // Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoomLevel(prev => Math.min(4, Math.max(0.4, prev * zoomFactor)));
  };

  // Mouse Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.crop-interactive-element') || activePage?.isWarpMode) return;
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
      {/* Zoom / Viewport Canvas */}
      <div
        style={{
          width: `${canvasDisplaySize.width}px`,
          height: `${canvasDisplaySize.height}px`,
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformOrigin: 'center center',
          transition: isPanningRef.current ? 'none' : 'transform 0.1s ease-out',
        }}
        className="relative shadow-2xl rounded-lg border border-slate-800 overflow-visible flex items-center justify-center bg-black"
      >
        <canvas
          ref={canvasDisplayRef}
          style={{
            width: `${canvasDisplaySize.width}px`,
            height: `${canvasDisplaySize.height}px`,
          }}
          className="w-full h-full object-contain rounded-lg shadow-2xl block"
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
              onQuadChange={onUpdateQuad}
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
          onClick={() => setZoomLevel(prev => Math.min(4, prev * 1.2))}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          onClick={() => setZoomLevel(prev => Math.max(0.4, prev * 0.8))}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          onClick={handleResetZoom}
          className="px-2 py-1 text-[11px] font-mono text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
          title="Reset Zoom & Pan"
        >
          {Math.round(zoomLevel * 100)}%
        </button>

        <div className="h-4 w-px bg-slate-700 mx-0.5" />

        {/* Before / After Split Comparison Toggle */}
        <button
          onClick={() => setIsBeforeAfterActive(!isBeforeAfterActive)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
            isBeforeAfterActive
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Compare Before & After"
        >
          <Columns className="w-3.5 h-3.5" />
          <span>{language === 'bn' ? 'তুলনা (Compare)' : 'Compare'}</span>
        </button>
      </div>
    </div>
  );
}
