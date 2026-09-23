import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Sparkles,
  RotateCcw,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  Sliders,
  Paintbrush,
  Eraser,
  Scissors,
  Check,
  SplitSquareVertical,
  Layers,
  Wand2,
  Move
} from 'lucide-react';
import { MattingEngine, BrushStrokeOptions, MattingPoint2D } from '../../../engines/MattingEngine';
import { loadImage, createOffscreenCanvas } from '../../utils/canvas-utils';
import { PRESET_BACKGROUNDS } from '../../utils/color-utils';

export interface BackgroundRefineModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalImageSrc: string;
  currentMaskOrTransparentPng?: string;
  onApply: (refinedTransparentPng: string) => void;
}

type RefineTool = 'add_subject' | 'erase_bg' | 'refine_hair' | 'defringe_edge' | 'pan';
type ViewMode = 'composite' | 'split' | 'ruby_mask' | 'alpha_channel';

export default function BackgroundRefineModal({
  isOpen,
  onClose,
  originalImageSrc,
  currentMaskOrTransparentPng,
  onApply,
}: BackgroundRefineModalProps) {
  // Canvas Refs
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const cursorCanvasRef = useRef<HTMLCanvasElement>(null);

  // Core Buffers
  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  const originalRgbPixelsRef = useRef<Uint8ClampedArray | null>(null);
  const currentAlphaBufferRef = useRef<Uint8ClampedArray | null>(null);
  const imgDimsRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  // History Stack for Undo/Redo
  const historyStackRef = useRef<Uint8ClampedArray[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Active Tool & Settings
  const [activeTool, setActiveTool] = useState<RefineTool>('refine_hair');
  const [brushSize, setBrushSize] = useState<number>(35);
  const [brushHardness, setBrushHardness] = useState<number>(0.3); // 0.0 to 1.0
  const [brushStrength, setBrushStrength] = useState<number>(0.8); // 0.1 to 1.0

  // View & Backdrop
  const [viewMode, setViewMode] = useState<ViewMode>('composite');
  const [backdropColor, setBackdropColor] = useState<string>('transparent');
  const [splitPosition, setSplitPosition] = useState<number>(50); // 0 to 100 %
  const [customColor, setCustomColor] = useState<string>('#ffffff');

  // Zoom & Pan
  const [zoom, setZoom] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Brush Painting Stroke State
  const isPaintingRef = useRef<boolean>(false);
  const currentStrokePointsRef = useRef<MattingPoint2D[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Push new state to history
  const pushHistory = useCallback((newAlpha: Uint8ClampedArray) => {
    const copy = new Uint8ClampedArray(newAlpha);
    const newStack = historyStackRef.current.slice(0, historyIndexRef.current + 1);
    newStack.push(copy);
    if (newStack.length > 20) {
      newStack.shift();
    }
    historyStackRef.current = newStack;
    historyIndexRef.current = newStack.length - 1;
    currentAlphaBufferRef.current = copy;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  // Undo / Redo Handlers
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const target = historyStackRef.current[historyIndexRef.current];
      currentAlphaBufferRef.current = new Uint8ClampedArray(target);
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyStackRef.current.length - 1);
      renderPreview();
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyStackRef.current.length - 1) {
      historyIndexRef.current += 1;
      const target = historyStackRef.current[historyIndexRef.current];
      currentAlphaBufferRef.current = new Uint8ClampedArray(target);
      setCanUndo(true);
      setCanRedo(historyIndexRef.current < historyStackRef.current.length - 1);
      renderPreview();
    }
  }, []);

  // Initialize Canvas & Image Buffers
  useEffect(() => {
    if (!isOpen || !originalImageSrc) return;

    let isMounted = true;
    setIsProcessing(true);
    setStatusMessage('Loading high-resolution portrait buffers…');

    (async () => {
      try {
        const img = await loadImage(originalImageSrc);
        if (!isMounted) return;

        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        imgDimsRef.current = { w, h };
        sourceImageRef.current = img;

        const { canvas: tempCanvas, ctx: tempCtx } = createOffscreenCanvas(w, h);
        tempCtx.drawImage(img, 0, 0, w, h);
        const imgData = tempCtx.getImageData(0, 0, w, h);
        originalRgbPixelsRef.current = new Uint8ClampedArray(imgData.data);

        // Extract Initial Alpha
        const initialAlpha = new Uint8ClampedArray(w * h);
        if (currentMaskOrTransparentPng && currentMaskOrTransparentPng !== originalImageSrc) {
          const segImg = await loadImage(currentMaskOrTransparentPng);
          const { canvas: segCan, ctx: segCtx } = createOffscreenCanvas(w, h);
          segCtx.drawImage(segImg, 0, 0, w, h);
          const segData = segCtx.getImageData(0, 0, w, h).data;
          for (let i = 0; i < w * h; i++) {
            initialAlpha[i] = segData[i * 4 + 3];
          }
        } else {
          // Default all solid foreground
          initialAlpha.fill(255);
        }

        historyStackRef.current = [new Uint8ClampedArray(initialAlpha)];
        historyIndexRef.current = 0;
        currentAlphaBufferRef.current = initialAlpha;
        setCanUndo(false);
        setCanRedo(false);

        // Adjust Zoom to Fit Container
        if (canvasContainerRef.current) {
          const rect = canvasContainerRef.current.getBoundingClientRect();
          const scaleX = (rect.width - 60) / w;
          const scaleY = (rect.height - 60) / h;
          const initialZoom = Math.min(1.5, Math.max(0.2, Math.min(scaleX, scaleY)));
          setZoom(initialZoom);
          setPanOffset({ x: 0, y: 0 });
        }

        setIsProcessing(false);
        setStatusMessage('');
      } catch (err) {
        console.error('[RefineModal] Init error:', err);
        setIsProcessing(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isOpen, originalImageSrc, currentMaskOrTransparentPng]);

  // Main Render Preview Function
  const renderPreview = useCallback(() => {
    const canvas = mainCanvasRef.current;
    const alpha = currentAlphaBufferRef.current;
    const rgb = originalRgbPixelsRef.current;
    const { w, h } = imgDimsRef.current;
    if (!canvas || !alpha || !rgb || w === 0 || h === 0) return;

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const outImgData = ctx.createImageData(w, h);
    const outPixels = outImgData.data;

    // Parse backdrop RGB if solid color
    let bgR = 255, bgG = 255, bgB = 255;
    const isTransparent = backdropColor === 'transparent';
    if (!isTransparent) {
      const hex = backdropColor.startsWith('#') ? backdropColor : '#ffffff';
      bgR = parseInt(hex.slice(1, 3), 16) || 255;
      bgG = parseInt(hex.slice(3, 5), 16) || 255;
      bgB = parseInt(hex.slice(5, 7), 16) || 255;
    }

    const splitPx = Math.round((splitPosition / 100) * w);

    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const idx = row + x;
        const idx4 = idx * 4;

        const srcR = rgb[idx4];
        const srcG = rgb[idx4 + 1];
        const srcB = rgb[idx4 + 2];
        const aVal = alpha[idx];
        const normA = aVal / 255.0;

        if (viewMode === 'split' && x < splitPx) {
          // Left side of split: Original Image
          outPixels[idx4] = srcR;
          outPixels[idx4 + 1] = srcG;
          outPixels[idx4 + 2] = srcB;
          outPixels[idx4 + 3] = 255;
        } else if (viewMode === 'alpha_channel') {
          // Pure Grayscale Alpha Mask View
          outPixels[idx4] = aVal;
          outPixels[idx4 + 1] = aVal;
          outPixels[idx4 + 2] = aVal;
          outPixels[idx4 + 3] = 255;
        } else if (viewMode === 'ruby_mask') {
          // Quick Mask Ruby Red Overlay over transparent areas
          if (normA < 0.99) {
            const rubyA = (1.0 - normA) * 0.65;
            outPixels[idx4] = Math.round(srcR * (1 - rubyA) + 239 * rubyA);
            outPixels[idx4 + 1] = Math.round(srcG * (1 - rubyA) + 68 * rubyA);
            outPixels[idx4 + 2] = Math.round(srcB * (1 - rubyA) + 68 * rubyA);
            outPixels[idx4 + 3] = 255;
          } else {
            outPixels[idx4] = srcR;
            outPixels[idx4 + 1] = srcG;
            outPixels[idx4 + 2] = srcB;
            outPixels[idx4 + 3] = 255;
          }
        } else {
          // Composite View on Selected Backdrop
          if (isTransparent) {
            outPixels[idx4] = srcR;
            outPixels[idx4 + 1] = srcG;
            outPixels[idx4 + 2] = srcB;
            outPixels[idx4 + 3] = aVal;
          } else {
            outPixels[idx4] = Math.round(srcR * normA + bgR * (1.0 - normA));
            outPixels[idx4 + 1] = Math.round(srcG * normA + bgG * (1.0 - normA));
            outPixels[idx4 + 2] = Math.round(srcB * normA + bgB * (1.0 - normA));
            outPixels[idx4 + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(outImgData, 0, 0);

    // Draw split line if in split mode
    if (viewMode === 'split') {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = Math.max(2, Math.round(2 / zoom));
      ctx.beginPath();
      ctx.moveTo(splitPx, 0);
      ctx.lineTo(splitPx, h);
      ctx.stroke();
    }
  }, [backdropColor, viewMode, splitPosition, zoom]);

  // Re-render preview whenever buffers or view settings change
  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  // Convert client mouse coordinate to canvas native image pixel
  const getCanvasCoords = (e: React.MouseEvent<HTMLDivElement>): MattingPoint2D | null => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = clientX * scaleX;
    const y = clientY * scaleY;

    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return null;
    return { x, y };
  };

  // Draw Brush Ring on Cursor Canvas
  const updateBrushCursor = (e: React.MouseEvent<HTMLDivElement>) => {
    const cursorCanvas = cursorCanvasRef.current;
    const mainCanvas = mainCanvasRef.current;
    if (!cursorCanvas || !mainCanvas) return;

    const rect = cursorCanvas.getBoundingClientRect();
    cursorCanvas.width = rect.width;
    cursorCanvas.height = rect.height;

    const ctx = cursorCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);

    if (activeTool === 'pan') return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const displayedRadius = (brushSize / 2) * zoom;

    ctx.save();
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, Math.max(2, displayedRadius), 0, Math.PI * 2);
    ctx.strokeStyle =
      activeTool === 'add_subject'
        ? '#10b981'
        : activeTool === 'erase_bg'
        ? '#ef4444'
        : activeTool === 'refine_hair'
        ? '#a855f7'
        : '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Inner center dot
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    ctx.restore();
  };

  // Mouse Handlers for Painting / Panning
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'pan' || e.button === 1 || e.altKey) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
      return;
    }

    if (e.button === 0) {
      const pt = getCanvasCoords(e);
      if (!pt) return;

      isPaintingRef.current = true;
      currentStrokePointsRef.current = [pt];
      applyLiveBrush([pt]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    updateBrushCursor(e);

    if (isPanningRef.current) {
      setPanOffset({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

    if (isPaintingRef.current) {
      const pt = getCanvasCoords(e);
      if (pt) {
        currentStrokePointsRef.current.push(pt);
        applyLiveBrush([pt]);
      }
    }
  };

  const handleMouseUp = () => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
    }

    if (isPaintingRef.current) {
      isPaintingRef.current = false;
      if (currentAlphaBufferRef.current) {
        pushHistory(currentAlphaBufferRef.current);
      }
      currentStrokePointsRef.current = [];
    }
  };

  // Apply Live Brush Stroke onto Alpha Buffer
  const applyLiveBrush = (points: MattingPoint2D[]) => {
    const alpha = currentAlphaBufferRef.current;
    const rgb = originalRgbPixelsRef.current;
    const { w, h } = imgDimsRef.current;
    if (!alpha || !rgb || w === 0 || h === 0) return;

    const brushOpts: BrushStrokeOptions = {
      radius: brushSize / 2,
      hardness: brushHardness,
      strength: brushStrength,
      mode: activeTool as BrushStrokeOptions['mode'],
    };

    const updated = MattingEngine.applyBrushStroke(alpha, rgb, w, h, points, brushOpts);
    currentAlphaBufferRef.current = updated;
    renderPreview();
  };

  // Run 1-Click Auto 10-Stage Morphological Refinement & Decontamination
  const handleRunAutoRefine = async () => {
    const alpha = currentAlphaBufferRef.current;
    const rgb = originalRgbPixelsRef.current;
    const { w, h } = imgDimsRef.current;
    if (!alpha || !rgb || w === 0 || h === 0) return;

    setIsProcessing(true);
    setStatusMessage('⚡ Running 10-Stage Morphological Closing & Guided Hair Matting…');

    try {
      await new Promise((res) => setTimeout(res, 50));

      const srcImgData = new ImageData(new Uint8ClampedArray(rgb), w, h);
      const initialMask = new Uint8Array(alpha);

      const refinedImgData = MattingEngine.executeMattingPipeline(srcImgData, initialMask, {
        tolerance: 38,
        edgeRadius: 3,
        edgeShift: -1.0,
        decontaminateStrength: 0.95,
      });

      const newAlpha = new Uint8ClampedArray(w * h);
      for (let i = 0; i < w * h; i++) {
        newAlpha[i] = refinedImgData.data[i * 4 + 3];
      }

      pushHistory(newAlpha);
      renderPreview();
      setStatusMessage('');
    } catch (err) {
      console.error('[AutoRefine Error]', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply Final High-Resolution Transparent PNG to Workspace
  const handleApplyAndSave = () => {
    const alpha = currentAlphaBufferRef.current;
    const rgb = originalRgbPixelsRef.current;
    const { w, h } = imgDimsRef.current;
    if (!alpha || !rgb || w === 0 || h === 0) return;

    const { canvas, ctx } = createOffscreenCanvas(w, h);
    const outImgData = ctx.createImageData(w, h);
    const outData = outImgData.data;

    for (let i = 0; i < w * h; i++) {
      const idx4 = i * 4;
      outData[idx4] = rgb[idx4];
      outData[idx4 + 1] = rgb[idx4 + 1];
      outData[idx4 + 2] = rgb[idx4 + 2];
      outData[idx4 + 3] = alpha[i];
    }

    ctx.putImageData(outImgData, 0, 0);
    const finalPng = canvas.toDataURL('image/png', 1.0);
    onApply(finalPng);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fadeIn select-none p-4">
      <div className="relative w-full max-w-6xl h-[90vh] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* ── 1. Top Header Bar ────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-md">
              <Scissors className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Refine Edge & Hair Studio
                </h2>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-500/30">
                  10-Stage Hybrid Matting
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Gaussian Hair Matting • Morphological Closing • Color Halo Decontamination
              </p>
            </div>
          </div>

          {/* Quick View Mode Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('composite')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === 'composite'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Composite</span>
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === 'split'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>Before / After</span>
            </button>
            <button
              onClick={() => setViewMode('ruby_mask')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === 'ruby_mask'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Ruby Mask</span>
            </button>
            <button
              onClick={() => setViewMode('alpha_channel')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === 'alpha_channel'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Alpha Map</span>
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── 2. Middle Work Area (Sidebar Tools + Main Viewport) ────── */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Tool Palette */}
          <div className="w-16 bg-slate-900/60 border-r border-slate-800 p-2 flex flex-col items-center gap-2">
            {/* [+] Add Subject */}
            <button
              onClick={() => setActiveTool('add_subject')}
              title="Add Subject (Recover Suits, Ties, Hair) [B]"
              className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${
                activeTool === 'add_subject'
                  ? 'bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-400/50 scale-105'
                  : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800'
              }`}
            >
              <Paintbrush className="w-4 h-4" />
              <span className="text-[9px] font-bold">+Add</span>
            </button>

            {/* [-] Erase Background */}
            <button
              onClick={() => setActiveTool('erase_bg')}
              title="Erase Background (Clean-up stray pixels) [E]"
              className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${
                activeTool === 'erase_bg'
                  ? 'bg-rose-600 text-white shadow-lg ring-2 ring-rose-400/50 scale-105'
                  : 'text-slate-400 hover:text-rose-300 hover:bg-slate-800'
              }`}
            >
              <Eraser className="w-4 h-4" />
              <span className="text-[9px] font-bold">-Erase</span>
            </button>

            {/* [Hair] Soft Refine Brush */}
            <button
              onClick={() => setActiveTool('refine_hair')}
              title="Refine Hair & Fine Edges (Gaussian Soft Alpha) [R]"
              className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${
                activeTool === 'refine_hair'
                  ? 'bg-purple-600 text-white shadow-lg ring-2 ring-purple-400/50 scale-105'
                  : 'text-slate-400 hover:text-purple-300 hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-[9px] font-bold">Hair</span>
            </button>

            {/* [Edge] Defringe / Halo Scrub */}
            <button
              onClick={() => setActiveTool('defringe_edge')}
              title="Defringe Edge (Remove blue/white background halos) [D]"
              className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${
                activeTool === 'defringe_edge'
                  ? 'bg-amber-600 text-white shadow-lg ring-2 ring-amber-400/50 scale-105'
                  : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800'
              }`}
            >
              <Wand2 className="w-4 h-4" />
              <span className="text-[9px] font-bold">Edge</span>
            </button>

            {/* Pan Tool */}
            <button
              onClick={() => setActiveTool('pan')}
              title="Pan Canvas [H / Space]"
              className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${
                activeTool === 'pan'
                  ? 'bg-sky-600 text-white shadow-lg ring-2 ring-sky-400/50 scale-105'
                  : 'text-slate-400 hover:text-sky-300 hover:bg-slate-800'
              }`}
            >
              <Move className="w-4 h-4" />
              <span className="text-[9px] font-bold">Pan</span>
            </button>

            <div className="w-8 border-t border-slate-800 my-1" />

            {/* Undo */}
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
            >
              <Undo2 className="w-4 h-4" />
            </button>

            {/* Redo */}
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Main Canvas Viewport */}
          <div
            ref={canvasContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`relative flex-1 bg-slate-950 overflow-hidden flex items-center justify-center ${
              activeTool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-none'
            }`}
          >
            {/* Checkerboard Background for Alpha Preview */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(#475569 1px, transparent 1px), radial-gradient(#475569 1px, #0f172a 1px)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 10px 10px',
              }}
            />

            {/* Transformed Stage */}
            <div
              className="relative shadow-2xl transition-transform duration-75 origin-center"
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              }}
            >
              {/* Main Rendered Canvas */}
              <canvas
                ref={mainCanvasRef}
                className="max-w-none block rounded-sm shadow-2xl"
              />
            </div>

            {/* Brush Cursor Overlay Layer */}
            <canvas
              ref={cursorCanvasRef}
              className="absolute inset-0 pointer-events-none"
            />

            {/* Split Screen Slider Control (if Split Mode Active) */}
            {viewMode === 'split' && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-700 px-4 py-2 rounded-xl shadow-xl flex items-center gap-3">
                <span className="text-[11px] text-slate-400 font-medium">Original</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={splitPosition}
                  onChange={(e) => setSplitPosition(+e.target.value)}
                  className="w-40 accent-indigo-500"
                />
                <span className="text-[11px] text-indigo-400 font-medium">Refined</span>
              </div>
            )}

            {/* Floating Zoom Bar */}
            <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl shadow-xl text-slate-300 text-xs">
              <button
                onClick={() => setZoom((z) => Math.max(0.2, z - 0.2))}
                className="p-1.5 hover:bg-slate-800 rounded-lg"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono text-[11px] text-indigo-300">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(4.0, z + 0.2))}
                className="p-1.5 hover:bg-slate-800 rounded-lg"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setZoom(1.0);
                  setPanOffset({ x: 0, y: 0 });
                }}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400"
                title="Reset Zoom & Pan"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Loading Indicator */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
                <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold text-white tracking-wide">
                  {statusMessage || 'Processing…'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Bottom Control Toolbar & Actions ───────────────────────── */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-4">
          {/* Left: Brush Settings */}
          <div className="flex items-center gap-6 text-xs text-slate-300">
            {/* Brush Size */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Size:</span>
              <input
                type="range"
                min={5}
                max={150}
                value={brushSize}
                onChange={(e) => setBrushSize(+e.target.value)}
                className="w-24 accent-indigo-500"
              />
              <span className="font-mono text-indigo-300 w-8">{brushSize}px</span>
            </div>

            {/* Brush Hardness / Gaussian */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Hardness:</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={brushHardness}
                onChange={(e) => setBrushHardness(+e.target.value)}
                className="w-20 accent-indigo-500"
              />
              <span className="font-mono text-indigo-300 w-8">
                {Math.round(brushHardness * 100)}%
              </span>
            </div>

            {/* Brush Strength */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Strength:</span>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={brushStrength}
                onChange={(e) => setBrushStrength(+e.target.value)}
                className="w-20 accent-indigo-500"
              />
              <span className="font-mono text-indigo-300 w-8">
                {Math.round(brushStrength * 100)}%
              </span>
            </div>
          </div>

          {/* Middle: Backdrop Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">Backdrop:</span>
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {/* Transparent */}
              <button
                onClick={() => setBackdropColor('transparent')}
                title="Transparent Checkerboard"
                className={`w-6 h-6 rounded border transition-all ${
                  backdropColor === 'transparent'
                    ? 'border-indigo-400 ring-2 ring-indigo-400/50 scale-110'
                    : 'border-slate-700 hover:border-slate-500'
                }`}
                style={{
                  backgroundImage:
                    'linear-gradient(45deg, #475569 25%, transparent 25%), linear-gradient(-45deg, #475569 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #475569 75%), linear-gradient(-45deg, transparent 75%, #475569 75%)',
                  backgroundSize: '8px 8px',
                  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                }}
              />

              {/* Color Presets */}
              {PRESET_BACKGROUNDS.slice(0, 4).map((bg) => (
                <button
                  key={bg.hex}
                  onClick={() => setBackdropColor(bg.hex)}
                  title={bg.name}
                  className={`w-6 h-6 rounded border transition-all ${
                    backdropColor === bg.hex
                      ? 'border-indigo-400 ring-2 ring-indigo-400/50 scale-110'
                      : 'border-slate-700 hover:border-slate-500'
                  }`}
                  style={{ background: bg.hex }}
                />
              ))}

              {/* Custom Color Input */}
              <input
                type="color"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  setBackdropColor(e.target.value);
                }}
                className="w-6 h-6 rounded border border-slate-700 cursor-pointer bg-transparent"
                title="Custom Background Color"
              />
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* Auto 10-Stage Refine */}
            <button
              onClick={handleRunAutoRefine}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all active:scale-98"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>⚡ Auto 10-Stage Refine</span>
            </button>

            {/* Cancel */}
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium transition-colors"
            >
              Cancel
            </button>

            {/* Apply & Save */}
            <button
              onClick={handleApplyAndSave}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-98"
            >
              <Check className="w-4 h-4" />
              <span>Save & Apply (300 DPI)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
