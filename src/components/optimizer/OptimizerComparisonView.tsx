import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCcw,
  Sparkles,
  Move,
  Eye,
  Crop,
  Check,
  X,
  Lock,
  Layers,
  HelpCircle
} from 'lucide-react';
import { AppLanguage, OptimizationReport, CropRegion } from '../../engines/image-optimizer/types';

interface OptimizerComparisonViewProps {
  originalUrl: string | null;
  optimizedUrl: string | null;
  report: OptimizationReport | null;
  language: AppLanguage;
  isProcessing: boolean;
  activeCrop: CropRegion | null;
  targetAspectRatio?: number; // width / height
  targetPresetName?: string;
  onCropChange: (crop: CropRegion | null) => void;
  onUploadFiles?: (files: File[]) => void;
}

export const OptimizerComparisonView: React.FC<OptimizerComparisonViewProps> = ({
  originalUrl,
  optimizedUrl,
  report,
  language,
  isProcessing,
  activeCrop,
  targetAspectRatio,
  targetPresetName,
  onCropChange,
  onUploadFiles
}) => {
  // Image Transformation (Zoom & Pan relative to viewport)
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [panPosition, setPanPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [showOriginal, setShowOriginal] = useState<boolean>(false);

  // Fixed Screen-Space Framing Box (stays fixed while image zooms/pans behind it)
  const [isFramingActive, setIsFramingActive] = useState<boolean>(false);
  const [frameSize, setFrameSize] = useState<{ width: number; height: number }>({ width: 260, height: 260 });
  const [isResizingFrame, setIsResizingFrame] = useState<boolean>(false);

  const startPanPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startResizePos = useRef<{ clientX: number; clientY: number; width: number; height: number }>({
    clientX: 0,
    clientY: 0,
    width: 260,
    height: 260
  });

  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Initialize Frame Size based on aspect ratio
  const initFrameDimensions = useCallback((ratio: number) => {
    let w = 280;
    let h = w / ratio;

    if (h > 320) {
      h = 320;
      w = h * ratio;
    }
    if (w > 460) {
      w = 460;
      h = w / ratio;
    }

    setFrameSize({ width: Math.round(w), height: Math.round(h) });
    setIsFramingActive(true);
  }, []);

  // When target preset aspect ratio changes, activate template frame
  useEffect(() => {
    if (targetAspectRatio) {
      initFrameDimensions(targetAspectRatio);
    }
  }, [targetAspectRatio, initFrameDimensions]);

  // Calculate Image Crop coordinates (in natural image pixels) from Frame intersection
  const updateCropCoordinates = useCallback(() => {
    if (!isFramingActive || !imageRef.current || !viewportRef.current) return;

    const img = imageRef.current;
    const vp = viewportRef.current;
    if (!img.naturalWidth || !img.naturalHeight) return;

    const vpRect = vp.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();

    // Frame center is at viewport center
    const vpCenterX = vpRect.left + vpRect.width / 2;
    const vpCenterY = vpRect.top + vpRect.height / 2;

    const frameLeft = vpCenterX - frameSize.width / 2;
    const frameTop = vpCenterY - frameSize.height / 2;
    const frameRight = frameLeft + frameSize.width;
    const frameBottom = frameTop + frameSize.height;

    // Relative position inside the rendered image
    const relLeft = (frameLeft - imgRect.left) / imgRect.width;
    const relTop = (frameTop - imgRect.top) / imgRect.height;
    const relWidth = frameSize.width / imgRect.width;
    const relHeight = frameSize.height / imgRect.height;

    const natCropX = Math.max(0, Math.round(relLeft * img.naturalWidth));
    const natCropY = Math.max(0, Math.round(relTop * img.naturalHeight));
    const natCropW = Math.min(img.naturalWidth - natCropX, Math.round(relWidth * img.naturalWidth));
    const natCropH = Math.min(img.naturalHeight - natCropY, Math.round(relHeight * img.naturalHeight));

    if (natCropW > 10 && natCropH > 10) {
      onCropChange({
        x: natCropX,
        y: natCropY,
        width: natCropW,
        height: natCropH
      });
    }
  }, [isFramingActive, frameSize, onCropChange]);

  // Update crop rect whenever image pans or zooms or frame changes
  useEffect(() => {
    updateCropCoordinates();
  }, [zoomScale, panPosition, frameSize, isFramingActive, updateCropCoordinates]);

  const fitToScreen = () => {
    setZoomScale(1.0);
    setPanPosition({ x: 0, y: 0 });
  };

  const resetView = () => {
    setZoomScale(1.0);
    setPanPosition({ x: 0, y: 0 });
  };

  const setActualSize = () => {
    setZoomScale(1.0);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoomScale(prev => Math.min(8.0, Math.round((prev + 0.2) * 100) / 100));
  };

  const handleZoomOut = () => {
    setZoomScale(prev => Math.max(0.15, Math.round((prev - 0.2) * 100) / 100));
  };

  // Mouse wheel zooms IMAGE behind the template frame
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoomScale(prev => {
      const nextZoom = Math.min(8.0, Math.max(0.15, prev * zoomFactor));
      return Math.round(nextZoom * 100) / 100;
    });
  };

  // Dragging pans the IMAGE behind the frame
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      startPanPos.current = {
        x: e.clientX - panPosition.x,
        y: e.clientY - panPosition.y
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPanPosition({
        x: e.clientX - startPanPos.current.x,
        y: e.clientY - startPanPos.current.y
      });
    } else if (isResizingFrame) {
      const dx = (e.clientX - startResizePos.current.clientX) * 2;
      const ratio = targetAspectRatio || 1.0;
      let newW = Math.max(100, Math.min(600, startResizePos.current.width + dx));
      let newH = newW / ratio;
      setFrameSize({ width: Math.round(newW), height: Math.round(newH) });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsResizingFrame(false);
  };

  useEffect(() => {
    const onGlobalUp = () => {
      setIsPanning(false);
      setIsResizingFrame(false);
    };
    window.addEventListener('mouseup', onGlobalUp);
    return () => window.removeEventListener('mouseup', onGlobalUp);
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onUploadFiles) {
      onUploadFiles(Array.from(e.target.files));
    }
  };

  if (!originalUrl) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 select-none bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] rounded-2xl border border-slate-800/80">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />

        {/* Compact Centered Upload Card */}
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 flex flex-col items-center text-center shadow-2xl backdrop-blur-md relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 shadow-lg shadow-indigo-500/10 group-hover:scale-105 transition-transform">
            <Sparkles className="w-6 h-6" />
          </div>

          <h3 className="text-sm font-bold text-slate-100">
            {language === 'bn' ? 'ছবি নির্বাচন করুন' : 'Select or Drop Image'}
          </h3>

          <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">
            {language === 'bn'
              ? 'ছবি ড্র্যাগ অ্যান্ড ড্রপ করুন অথবা নিচের বাটনে ক্লিক করে ফাইল সিলেক্ট করুন'
              : 'Drag and drop an image here or browse from your computer to optimize'}
          </p>

          {/* Compact Select Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 py-2 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{language === 'bn' ? 'ছবি নির্বাচন করুন (Browse)' : 'Browse Image'}</span>
          </button>

          {/* Supported Formats Tags */}
          <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono">
            <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800/80 font-semibold text-slate-300">JPG</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800/80 font-semibold text-slate-300">PNG</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800/80 font-semibold text-slate-300">WEBP</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800/80 font-semibold text-slate-300">AVIF</span>
          </div>
        </div>
      </div>
    );
  }

  const activeDisplayUrl = (showOriginal ? originalUrl : (optimizedUrl || originalUrl));

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden relative shadow-2xl">
      {/* ── Viewport Header Bar ────────────────────────────────────────────── */}
      <div className="h-10 bg-slate-900/90 border-b border-slate-800 px-3 flex items-center justify-between z-30 backdrop-blur-md">
        {/* Toggle Original vs Optimized Preview & Framing Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOriginal(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer ${
              showOriginal
                ? 'bg-amber-600 text-white'
                : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>
              {showOriginal
                ? (language === 'bn' ? 'অরিজিনাল ছবি' : 'Original')
                : (language === 'bn' ? 'অপ্টিমাইজড ছবি' : 'Optimized')}
            </span>
          </button>

          {/* Framing / Template Frame Toggle */}
          <button
            onClick={() => {
              if (isFramingActive) {
                setIsFramingActive(false);
                onCropChange(null);
              } else {
                initFrameDimensions(targetAspectRatio || 1.0);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition border cursor-pointer ${
              isFramingActive
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-400 shadow-sm shadow-indigo-600/30'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            <Crop className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'টেমপ্লেট ফ্রেম' : 'Template Frame'}</span>
          </button>

          {report && (
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              {showOriginal ? formatSize(report.input.sizeBytes) : formatSize(report.output.sizeBytes)} • {report.output.width}×{report.output.height}px
            </span>
          )}
        </div>

        {/* Top Right: Zoom Controls & Readout */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5">
            <button
              onClick={handleZoomOut}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition cursor-pointer"
              title="Zoom Out (Scroll Down)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <span className="px-2 text-[11px] font-mono font-bold text-indigo-400 min-w-11 text-center">
              {Math.round(zoomScale * 100)}%
            </span>

            <button
              onClick={handleZoomIn}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition cursor-pointer"
              title="Zoom In (Scroll Up)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <div className="h-3 w-px bg-slate-800 mx-0.5" />

            <button
              onClick={setActualSize}
              className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded transition cursor-pointer ${
                zoomScale === 1.0 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="100% 1:1 Pixel Inspection"
            >
              100%
            </button>

            <button
              onClick={fitToScreen}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition cursor-pointer"
              title="Fit to Screen"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={resetView}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition cursor-pointer"
              title="Reset View"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Interactive Zoom/Pan Stage with Fixed Template Frame ────────── */}
      <div
        ref={viewportRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`flex-1 relative flex items-center justify-center overflow-hidden bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] select-none ${
          isPanning ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {/* Loading Spinner */}
        {isProcessing && (
          <div className="absolute inset-0 bg-slate-950/70 z-40 flex flex-col items-center justify-center backdrop-blur-sm">
            <div className="w-8 h-8 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            <span className="text-xs font-bold text-slate-200 mt-2">
              {language === 'bn' ? 'অপ্টিমাইজেশন চলছে...' : 'Optimizing Image...'}
            </span>
          </div>
        )}

        {/* 1. SCALABLE & PANNABLE IMAGE (ZOOMS & MOVES BEHIND THE FIXED FRAME) */}
        <div
          className="absolute flex items-center justify-center transition-transform duration-75 will-change-transform pointer-events-none"
          style={{
            transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomScale})`,
            transformOrigin: 'center center'
          }}
        >
          <img
            ref={imageRef}
            src={activeDisplayUrl}
            onLoad={updateCropCoordinates}
            alt="Workspace Preview"
            onError={(e) => {
              if (originalUrl && (e.currentTarget.src !== originalUrl)) {
                e.currentTarget.src = originalUrl;
              }
            }}
            className="max-h-[calc(100vh-250px)] max-w-[calc(100vw-500px)] object-contain shadow-2xl rounded"
            draggable={false}
          />
        </div>

        {/* 2. FIXED TEMPLATE FRAMING BOX (STAYS IN VIEWPORT CENTER WHILE IMAGE MOVES) */}
        {isFramingActive && !showOriginal && (
          <div
            className="absolute z-20 pointer-events-none flex items-center justify-center"
            style={{
              width: `${frameSize.width}px`,
              height: `${frameSize.height}px`
            }}
          >
            {/* Dark vignette mask outside the frame */}
            <div
              className="absolute inset-0 border-2 border-indigo-400 shadow-2xl rounded-sm group"
              style={{
                boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.65)'
              }}
            >
              {/* Rule of Thirds Grid Guidelines */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-40">
                <div className="border-r border-b border-white/40" />
                <div className="border-r border-b border-white/40" />
                <div className="border-b border-white/40" />
                <div className="border-r border-b border-white/40" />
                <div className="border-r border-b border-white/40" />
                <div className="border-b border-white/40" />
                <div className="border-r border-white/40" />
                <div className="border-r border-white/40" />
                <div />
              </div>

              {/* Top Preset Tag Badge on Frame */}
              <div className="absolute -top-7 left-0 flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-md shadow-lg whitespace-nowrap">
                <Lock className="w-2.5 h-2.5 text-amber-300" />
                <span>{targetPresetName || 'Template Frame'}</span>
              </div>

              {/* Bottom Instruction Pill */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 text-indigo-300 text-[9px] font-sans px-2 py-0.5 rounded border border-slate-800 whitespace-nowrap shadow">
                {language === 'bn'
                  ? 'ছবি জুম ও ড্র্যাগ করে ফ্রেমের সাথে পজিশন করুন'
                  : 'Zoom & drag image to fit frame'}
              </div>

              {/* Corner Handles to resize frame box */}
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsResizingFrame(true);
                  startResizePos.current = {
                    clientX: e.clientX,
                    clientY: e.clientY,
                    width: frameSize.width,
                    height: frameSize.height
                  };
                }}
                className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-white border-2 border-indigo-600 rounded-sm cursor-nwse-resize shadow-lg pointer-events-auto hover:scale-125 transition"
                title="Resize Frame"
              />
            </div>
          </div>
        )}

        {/* Floating Status Tag in Viewport */}
        <div className="absolute top-3 left-3 pointer-events-none bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] font-mono shadow-md z-30">
          {showOriginal ? (
            <span className="text-amber-400 font-bold">
              ORIGINAL {report && `• ${formatSize(report.input.sizeBytes)}`}
            </span>
          ) : (
            <span className="text-emerald-400 font-bold">
              OPTIMIZED {report && `• ${formatSize(report.output.sizeBytes)} (${report.reduction.percentage}% saved)`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
