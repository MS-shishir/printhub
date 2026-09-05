/**
 * SideReconstructionModal.tsx
 * Professional Geometric Portrait & Body Side Reconstruction Studio Modal.
 * 
 * Implements:
 * 1. Center Axis Interactive Alignment (Draggable Line + Tilt Rotation Handle)
 * 2. Directional Reconstruction (Missing Left vs Missing Right)
 * 3. Distance-based Width Scaling & Subpixel Bilinear Texture Sampling
 * 4. Multi-Zone Vertical Breakdown (Hair, Face/Jaw, Ear, Shoulder/Collar)
 * 5. Smoothstep Alpha Seam Feathering & Split-Screen Comparison
 * 6. Interactive Brushes: Mirror Clone Stamp, Gaussian Liquify Warp, Healing Patch, Soft Eraser
 * 7. Full Undo/Redo History (Ctrl+Z / Ctrl+Y) & High-DPI Canvas Rendering
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Check, RotateCcw, Sliders, Eye, Undo2, Redo2, FlipHorizontal, 
  Sparkles, ZoomIn, ZoomOut, Move, Scissors, Layers, HelpCircle,
  Brush, Copy, Wand2, RefreshCw, ChevronDown, ChevronUp, Lock, ArrowLeftRight
} from 'lucide-react';
import { 
  SideReconstructionEngine, 
  GeometricReconstructionConfig, 
  MultiZoneConfig,
  WarpStroke,
  DEFAULT_RECONSTRUCTION_CONFIG,
  DEFAULT_ZONES
} from '../../engines';

interface SideReconstructionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceCanvasOrImage: HTMLCanvasElement | HTMLImageElement | null;
  onApply: (reconstructedCanvas: HTMLCanvasElement) => void;
  language: 'en' | 'bn';
}

type ActiveBrushTool = 'none' | 'mirror_stamp' | 'liquify_warp' | 'healing_brush' | 'soft_eraser';
type ViewMode = 'reconstructed' | 'split' | 'original';

export default function SideReconstructionModal({
  isOpen,
  onClose,
  sourceCanvasOrImage,
  onApply,
  language,
}: SideReconstructionModalProps) {
  // Main Configuration State
  const [config, setConfig] = useState<GeometricReconstructionConfig>({
    ...DEFAULT_RECONSTRUCTION_CONFIG,
    zones: JSON.parse(JSON.stringify(DEFAULT_ZONES)),
  });

  // UI / Tool Modes
  const [activeBrush, setActiveBrush] = useState<ActiveBrushTool>('none');
  const [viewMode, setViewMode] = useState<ViewMode>('reconstructed');
  const [splitRatio, setSplitRatio] = useState<number>(0.5);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSpacePanning, setIsSpacePanning] = useState<boolean>(false);
  const [activeZoneTab, setActiveZoneTab] = useState<'hair' | 'face' | 'ear' | 'shoulder' | null>('face');

  // Brush Settings
  const [brushSize, setBrushSize] = useState<number>(45);
  const [brushHardness, setBrushHardness] = useState<number>(0.3);
  const [brushStrength, setBrushStrength] = useState<number>(0.5);
  const [warpStrokes, setWarpStrokes] = useState<WarpStroke[]>([]);

  // Canvas Refs & Caches
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalSnapshotRef = useRef<HTMLCanvasElement | null>(null);
  const baseReconSnapshotRef = useRef<HTMLCanvasElement | null>(null);
  const workingCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dragging State for Axis, Split Slider, or Brushes
  const isDraggingAxisRef = useRef<boolean>(false);
  const isDraggingAngleRef = useRef<boolean>(false);
  const isDraggingSplitRef = useRef<boolean>(false);
  const isPaintingBrushRef = useRef<boolean>(false);
  const brushStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Undo / Redo History Stack
  interface HistorySnapshot {
    config: GeometricReconstructionConfig;
    warpStrokes: WarpStroke[];
    workingCanvasData?: ImageData;
  }
  const historyRef = useRef<HistorySnapshot[]>([]);
  const historyIdxRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  const pushHistory = useCallback((snapshot: HistorySnapshot) => {
    const nextHist = historyRef.current.slice(0, historyIdxRef.current + 1);
    nextHist.push({
      config: JSON.parse(JSON.stringify(snapshot.config)),
      warpStrokes: JSON.parse(JSON.stringify(snapshot.warpStrokes)),
    });
    historyRef.current = nextHist;
    historyIdxRef.current = nextHist.length - 1;
    setCanUndo(historyIdxRef.current > 0);
    setCanRedo(false);
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIdxRef.current > 0) {
      historyIdxRef.current -= 1;
      const prev = historyRef.current[historyIdxRef.current];
      setConfig(JSON.parse(JSON.stringify(prev.config)));
      setWarpStrokes(JSON.parse(JSON.stringify(prev.warpStrokes)));
      setCanUndo(historyIdxRef.current > 0);
      setCanRedo(historyIdxRef.current < historyRef.current.length - 1);
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIdxRef.current < historyRef.current.length - 1) {
      historyIdxRef.current += 1;
      const next = historyRef.current[historyIdxRef.current];
      setConfig(JSON.parse(JSON.stringify(next.config)));
      setWarpStrokes(JSON.parse(JSON.stringify(next.warpStrokes)));
      setCanUndo(true);
      setCanRedo(historyIdxRef.current < historyRef.current.length - 1);
    }
  }, []);

  // Initialize Canvas snapshot
  useEffect(() => {
    if (!isOpen || !sourceCanvasOrImage) return;

    const original = SideReconstructionEngine.createSnapshot(sourceCanvasOrImage);
    originalSnapshotRef.current = original;

    const autoAxis = SideReconstructionEngine.autoDetectCenterAxis(original);
    const initialConfig: GeometricReconstructionConfig = {
      ...DEFAULT_RECONSTRUCTION_CONFIG,
      axis: autoAxis,
      zones: JSON.parse(JSON.stringify(DEFAULT_ZONES)),
    };

    setConfig(initialConfig);
    setWarpStrokes([]);
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });

    historyRef.current = [{
      config: JSON.parse(JSON.stringify(initialConfig)),
      warpStrokes: [],
    }];
    historyIdxRef.current = 0;
    setCanUndo(false);
    setCanRedo(false);
  }, [isOpen, sourceCanvasOrImage]);

  // Render & Reconstruct Pipeline
  const renderReconstruction = useCallback(() => {
    if (!originalSnapshotRef.current || !canvasRef.current) return;

    const original = originalSnapshotRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Make canvas matching original dimensions
    if (canvas.width !== original.width || canvas.height !== original.height) {
      canvas.width = original.width;
      canvas.height = original.height;
    }

    // Step 1: Base Geometric Reconstruction
    let reconstructed = SideReconstructionEngine.applyGeometricReconstruction(original, config);
    baseReconSnapshotRef.current = reconstructed;

    // Step 2: Apply Gaussian Warp Strokes if any
    if (warpStrokes.length > 0) {
      reconstructed = SideReconstructionEngine.applyWarpDeformation(reconstructed, warpStrokes);
    }
    workingCanvasRef.current = reconstructed;

    // Step 3: Draw to display canvas based on View Mode
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (viewMode === 'original') {
      ctx.drawImage(original, 0, 0);
    } else if (viewMode === 'reconstructed') {
      ctx.drawImage(reconstructed, 0, 0);
    } else if (viewMode === 'split') {
      // Split Screen: Left part Original / Right part Reconstructed
      const splitX = Math.round(canvas.width * splitRatio);
      ctx.drawImage(original, 0, 0, splitX, canvas.height, 0, 0, splitX, canvas.height);
      ctx.drawImage(
        reconstructed,
        splitX,
        0,
        canvas.width - splitX,
        canvas.height,
        splitX,
        0,
        canvas.width - splitX,
        canvas.height
      );

      // Draw Split Divider Line
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2 / zoomLevel;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, canvas.height);
      ctx.stroke();

      // Split handle icon
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(splitX, canvas.height / 2, 8 / zoomLevel, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Step 4: Draw Center Axis Overlay if in Axis edit mode or none
    if (activeBrush === 'none' && viewMode !== 'original') {
      ctx.save();
      const topX = SideReconstructionEngine.getAxisXAtY(config.axis, 0, canvas.height);
      const bottomX = SideReconstructionEngine.getAxisXAtY(config.axis, canvas.height, canvas.height);
      const midY = canvas.height / 2;
      const midX = config.axis.cx;

      // Axis Line
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2.5 / zoomLevel;
      ctx.setLineDash([6 / zoomLevel, 4 / zoomLevel]);
      ctx.beginPath();
      ctx.moveTo(topX, 0);
      ctx.lineTo(bottomX, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center Anchor Handle
      ctx.fillStyle = '#818cf8';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 / zoomLevel;
      ctx.beginPath();
      ctx.arc(midX, midY, 7 / zoomLevel, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Top Rotation Handle
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(topX, 30 / zoomLevel, 6 / zoomLevel, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Bottom Rotation Handle
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(bottomX, canvas.height - 30 / zoomLevel, 6 / zoomLevel, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
  }, [config, warpStrokes, viewMode, splitRatio, zoomLevel, activeBrush]);

  useEffect(() => {
    renderReconstruction();
  }, [renderReconstruction]);

  // Convert Mouse Event coordinates to Canvas Image coordinates
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Mouse Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (e.button === 1 || isSpacePanning) {
      // Pan with middle click or space key
      return;
    }

    if (viewMode === 'split') {
      const splitX = canvas.width * splitRatio;
      if (Math.abs(x - splitX) < 15 / zoomLevel) {
        isDraggingSplitRef.current = true;
        return;
      }
    }

    if (activeBrush === 'none') {
      const midY = canvas.height / 2;
      const topX = SideReconstructionEngine.getAxisXAtY(config.axis, 0, canvas.height);
      const distToCenter = Math.sqrt((x - config.axis.cx) ** 2 + (y - midY) ** 2);
      const distToTop = Math.sqrt((x - topX) ** 2 + (y - 30 / zoomLevel) ** 2);

      if (distToTop < 20 / zoomLevel) {
        isDraggingAngleRef.current = true;
        return;
      }

      if (distToCenter < 25 / zoomLevel || Math.abs(x - config.axis.cx) < 12 / zoomLevel) {
        isDraggingAxisRef.current = true;
        return;
      }
    } else {
      // Painting with Brush (Mirror Clone, Liquify Warp, Healing, Eraser)
      isPaintingBrushRef.current = true;
      brushStartPosRef.current = { x, y };

      if (activeBrush === 'mirror_stamp' && originalSnapshotRef.current && workingCanvasRef.current) {
        const cxAtY = SideReconstructionEngine.getAxisXAtY(config.axis, y, canvas.height);
        const sourceX = config.side === 'left_to_right' ? cxAtY - (x - cxAtY) : cxAtY + (cxAtY - x);
        SideReconstructionEngine.applyMirrorCloneStamp(workingCanvasRef.current, {
          sourceX,
          sourceY: y,
          targetX: x,
          targetY: y,
          radius: brushSize,
          hardness: brushHardness,
          opacity: brushStrength,
        });
        renderReconstruction();
      } else if (activeBrush === 'healing_brush' && workingCanvasRef.current) {
        SideReconstructionEngine.applyHealingPatch(workingCanvasRef.current, x, y, brushSize, brushStrength);
        renderReconstruction();
      } else if (activeBrush === 'soft_eraser' && workingCanvasRef.current && originalSnapshotRef.current) {
        SideReconstructionEngine.applySoftEraser(
          workingCanvasRef.current,
          originalSnapshotRef.current,
          x,
          y,
          brushSize,
          brushStrength
        );
        renderReconstruction();
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    setCursorPos({ x, y });
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDraggingSplitRef.current) {
      const newRatio = Math.max(0.05, Math.min(0.95, x / canvas.width));
      setSplitRatio(newRatio);
      return;
    }

    if (isDraggingAxisRef.current) {
      const newCx = Math.max(20, Math.min(canvas.width - 20, Math.round(x)));
      setConfig((prev) => ({
        ...prev,
        axis: { ...prev.axis, cx: newCx },
      }));
      return;
    }

    if (isDraggingAngleRef.current) {
      const midY = canvas.height / 2;
      const deltaX = x - config.axis.cx;
      const deltaY = y - midY;
      const angleRad = Math.atan2(deltaX, -deltaY);
      const angleDeg = Math.max(-25, Math.min(25, (angleRad * 180) / Math.PI));
      setConfig((prev) => ({
        ...prev,
        axis: { ...prev.axis, angleDegrees: Math.round(angleDeg * 10) / 10 },
      }));
      return;
    }

    if (isPaintingBrushRef.current && brushStartPosRef.current && workingCanvasRef.current) {
      if (activeBrush === 'mirror_stamp' && originalSnapshotRef.current) {
        const cxAtY = SideReconstructionEngine.getAxisXAtY(config.axis, y, canvas.height);
        const sourceX = config.side === 'left_to_right' ? cxAtY - (x - cxAtY) : cxAtY + (cxAtY - x);
        SideReconstructionEngine.applyMirrorCloneStamp(workingCanvasRef.current, {
          sourceX,
          sourceY: y,
          targetX: x,
          targetY: y,
          radius: brushSize,
          hardness: brushHardness,
          opacity: brushStrength,
        });
        renderReconstruction();
      } else if (activeBrush === 'healing_brush') {
        SideReconstructionEngine.applyHealingPatch(workingCanvasRef.current, x, y, brushSize, brushStrength);
        renderReconstruction();
      } else if (activeBrush === 'soft_eraser' && originalSnapshotRef.current) {
        SideReconstructionEngine.applySoftEraser(
          workingCanvasRef.current,
          originalSnapshotRef.current,
          x,
          y,
          brushSize,
          brushStrength
        );
        renderReconstruction();
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);

    if (isPaintingBrushRef.current && activeBrush === 'liquify_warp' && brushStartPosRef.current) {
      const start = brushStartPosRef.current;
      const dist = Math.sqrt((x - start.x) ** 2 + (y - start.y) ** 2);
      if (dist > 3) {
        const newStroke: WarpStroke = {
          id: `warp-${Date.now()}`,
          startX: start.x,
          startY: start.y,
          endX: x,
          endY: y,
          radius: brushSize,
          strength: brushStrength,
        };
        const nextStrokes = [...warpStrokes, newStroke];
        setWarpStrokes(nextStrokes);
        pushHistory({ config, warpStrokes: nextStrokes });
      }
    } else if (isDraggingAxisRef.current || isDraggingAngleRef.current || isPaintingBrushRef.current) {
      pushHistory({ config, warpStrokes });
    }

    isDraggingAxisRef.current = false;
    isDraggingAngleRef.current = false;
    isDraggingSplitRef.current = false;
    isPaintingBrushRef.current = false;
    brushStartPosRef.current = null;
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === ' ') {
        setIsSpacePanning(true);
      } else if (e.key === '[') {
        setBrushSize((prev) => Math.max(10, prev - 5));
      } else if (e.key === ']') {
        setBrushSize((prev) => Math.min(150, prev + 5));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setIsSpacePanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen, handleUndo, handleRedo]);

  const handleApplyResult = () => {
    if (!workingCanvasRef.current && !canvasRef.current) return;
    const finalOutput = workingCanvasRef.current || canvasRef.current;
    if (finalOutput) {
      onApply(finalOutput);
      onClose();
    }
  };

  const handleResetConfig = () => {
    if (!originalSnapshotRef.current) return;
    const autoAxis = SideReconstructionEngine.autoDetectCenterAxis(originalSnapshotRef.current);
    const resetConfig: GeometricReconstructionConfig = {
      ...DEFAULT_RECONSTRUCTION_CONFIG,
      axis: autoAxis,
      zones: JSON.parse(JSON.stringify(DEFAULT_ZONES)),
    };
    setConfig(resetConfig);
    setWarpStrokes([]);
    pushHistory({ config: resetConfig, warpStrokes: [] });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex flex-col select-none text-slate-100 animate-fadeIn">
      {/* Top Application Header */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 border border-indigo-400/30">
            <FlipHorizontal className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black tracking-tight text-white">
                {language === 'bn' ? 'ম্যানুয়াল সাইড রিকনস্ট্রাকশন ও রিপেয়ার' : 'Manual Side Reconstruction Studio'}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Geometric Bilinear v2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {language === 'bn'
                ? 'এক পাশ কপি না করে জ্যামিতিক সিমেট্রি, সাবপিক্সেল ব্লেন্ডিং ও ওয়ার্পিং দিয়ে নিখুঁত ফেস মেরামত'
                : 'Subpixel bilinear reflection, multi-zone deformation & smoothstep boundary blending'}
            </p>
          </div>
        </div>

        {/* View Mode Controls & History */}
        <div className="flex items-center gap-2">
          {/* History Controls */}
          <div className="flex items-center bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 hover:bg-slate-800 transition-colors"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 hover:bg-slate-800 transition-colors"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('reconstructed')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'reconstructed'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {language === 'bn' ? 'রিকনস্ট্রাক্টেড' : 'Reconstructed'}
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                viewMode === 'split'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowLeftRight className="w-3 h-3" />
              <span>{language === 'bn' ? 'স্প্লিট ভিউ' : 'Split 50/50'}</span>
            </button>
            <button
              onClick={() => setViewMode('original')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'original'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {language === 'bn' ? 'মূল ছবি' : 'Original'}
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.4, z - 0.15))}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono font-bold px-1.5 text-slate-300">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.15))}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <div className="h-6 w-px bg-slate-800 mx-1" />

          <button
            onClick={handleResetConfig}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'রিসেট' : 'Reset'}</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <button
            onClick={handleApplyResult}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition-all active:scale-95 border border-indigo-400/30"
          >
            <Check className="w-4 h-4" />
            <span>{language === 'bn' ? 'লেয়ারে যুক্ত করুন' : 'Apply Layer'}</span>
          </button>
        </div>
      </header>

      {/* Main Studio Body: Left Canvas Viewport + Right Control Dock */}
      <div className="flex-1 flex overflow-hidden">
        {/* Central Interactive Viewport */}
        <main
          ref={containerRef}
          className="flex-1 relative bg-slate-950 flex items-center justify-center overflow-hidden p-6 cursor-crosshair"
          onWheel={(e) => {
            if (e.ctrlKey) {
              e.preventDefault();
              setZoomLevel((z) => Math.max(0.4, Math.min(2.5, z - e.deltaY * 0.002)));
            }
          }}
        >
          {/* Grid Background */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

          {/* Canvas Wrapper with Zoom & Pan */}
          <div
            className="relative shadow-2xl rounded-lg overflow-hidden border border-slate-800/80 transition-transform duration-75"
            style={{
              transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              transformOrigin: 'center center',
            }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="block max-h-[82vh] max-w-[65vw] object-contain shadow-2xl"
            />
          </div>

          {/* Interactive Axis / Split Overlay Guide Tip */}
          <div className="absolute bottom-4 left-6 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-md text-[11px] text-slate-300 flex items-center gap-2 pointer-events-none shadow-lg">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            {activeBrush === 'none'
              ? language === 'bn'
                ? 'সেন্টার লাইন ড্র্যাগ করে ফেসের মাঝে বসান। উপরের ডট দিয়ে মুখ বাঁকা থাকলে কোণ ঠিক করুন।'
                : 'Drag Center Line to align with nose/chin. Drag top dot to adjust tilt angle.'
              : language === 'bn'
                ? `ব্রাশ সাইজ: ${brushSize}px | ক্যানভাসে ড্র্যাগ করে পেইন্ট করুন`
                : `Active Brush: ${activeBrush} (${brushSize}px) | Drag to paint`}
          </div>
        </main>

        {/* Right Tools & Control Dock */}
        <aside className="w-[360px] bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 overflow-y-auto custom-scrollbar select-none">
          {/* Target Missing Side Selector */}
          <div className="p-4 border-b border-slate-800">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-2">
              {language === 'bn' ? '১. যে পাশটি মেরামত করতে চান (Missing Side)' : '1. Target Missing Side'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const nextConfig: GeometricReconstructionConfig = { ...config, side: 'right_to_left' };
                  setConfig(nextConfig);
                  pushHistory({ config: nextConfig, warpStrokes });
                }}
                className={`flex flex-col items-center py-2.5 px-2 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                  config.side === 'right_to_left'
                    ? 'bg-gradient-to-b from-indigo-600 to-indigo-700 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span>{language === 'bn' ? 'বাম পাশ নেই' : 'Missing Left'}</span>
                </div>
                <span className="text-[10px] font-normal opacity-80">
                  {language === 'bn' ? 'ডান থেকে বামে' : 'Right ➔ Left'}
                </span>
              </button>

              <button
                onClick={() => {
                  const nextConfig: GeometricReconstructionConfig = { ...config, side: 'left_to_right' };
                  setConfig(nextConfig);
                  pushHistory({ config: nextConfig, warpStrokes });
                }}
                className={`flex flex-col items-center py-2.5 px-2 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                  config.side === 'left_to_right'
                    ? 'bg-gradient-to-b from-indigo-600 to-indigo-700 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>{language === 'bn' ? 'ডান পাশ নেই' : 'Missing Right'}</span>
                </div>
                <span className="text-[10px] font-normal opacity-80">
                  {language === 'bn' ? 'বাম থেকে ডানে' : 'Left ➔ Right'}
                </span>
              </button>
            </div>
          </div>

          {/* Center Axis & Tilt Angle Alignment */}
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                {language === 'bn' ? '২. সেন্টার এক্সিস ও কোণ' : '2. Center Axis & Tilt'}
              </label>
              <button
                onClick={() => {
                  if (!originalSnapshotRef.current) return;
                  const auto = SideReconstructionEngine.autoDetectCenterAxis(originalSnapshotRef.current);
                  setConfig((prev) => ({ ...prev, axis: auto }));
                }}
                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>{language === 'bn' ? 'অটো সেন্টার' : 'Auto Center'}</span>
              </button>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">{language === 'bn' ? 'সেন্টার পজিশন (X)' : 'Center Position (X)'}</span>
                <span className="font-mono text-indigo-300">{config.axis.cx} px</span>
              </div>
              <input
                type="range"
                min="50"
                max={originalSnapshotRef.current ? originalSnapshotRef.current.width - 50 : 800}
                value={config.axis.cx}
                onChange={(e) => {
                  setConfig((prev) => ({
                    ...prev,
                    axis: { ...prev.axis, cx: parseInt(e.target.value) },
                  }));
                }}
                onMouseUp={() => pushHistory({ config, warpStrokes })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">{language === 'bn' ? 'ফেসের বাঁকা কোণ (Tilt)' : 'Head Tilt Angle'}</span>
                <span className="font-mono text-sky-300">{config.axis.angleDegrees}°</span>
              </div>
              <input
                type="range"
                min="-20"
                max="20"
                step="0.5"
                value={config.axis.angleDegrees}
                onChange={(e) => {
                  setConfig((prev) => ({
                    ...prev,
                    axis: { ...prev.axis, angleDegrees: parseFloat(e.target.value) },
                  }));
                }}
                onMouseUp={() => pushHistory({ config, warpStrokes })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>
          </div>

          {/* Master Geometric Controls */}
          <div className="p-4 border-b border-slate-800 space-y-3">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
              {language === 'bn' ? '৩. মাস্টার জ্যামিতিক স্কেল ও ব্লেন্ডিং' : '3. Geometric Scaling & Blending'}
            </label>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">{language === 'bn' ? 'প্রস্থ স্কেল (Width Scale)' : 'Global Width Scale'}</span>
                <span className="font-mono text-emerald-400">{Math.round(config.globalScale * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.85"
                max="1.15"
                step="0.01"
                value={config.globalScale}
                onChange={(e) => {
                  setConfig((prev) => ({ ...prev, globalScale: parseFloat(e.target.value) }));
                }}
                onMouseUp={() => pushHistory({ config, warpStrokes })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">{language === 'bn' ? 'স্মুথস্টেপ ফেদার (Feather)' : 'Smoothstep Feather'}</span>
                <span className="font-mono text-indigo-300">{config.featherRadius} px</span>
              </div>
              <input
                type="range"
                min="1"
                max="40"
                value={config.featherRadius}
                onChange={(e) => {
                  setConfig((prev) => ({ ...prev, featherRadius: parseInt(e.target.value) }));
                }}
                onMouseUp={() => pushHistory({ config, warpStrokes })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">{language === 'bn' ? 'লেয়ার অপাসিটি' : 'Reconstruction Opacity'}</span>
                <span className="font-mono text-slate-300">{Math.round(config.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={config.opacity}
                onChange={(e) => {
                  setConfig((prev) => ({ ...prev, opacity: parseFloat(e.target.value) }));
                }}
                onMouseUp={() => pushHistory({ config, warpStrokes })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>

          {/* 4-Zone Specific Breakdown */}
          <div className="p-4 border-b border-slate-800 space-y-3">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
              {language === 'bn' ? '৪. জোন অনুযায়ী সূক্ষ্ম ট্রান্সফর্মেশন' : '4. Multi-Zone Custom Adjustments'}
            </label>

            {/* Zone Selector Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950/70 rounded-xl border border-slate-800">
              {(['hair', 'face', 'ear', 'shoulder'] as const).map((z) => (
                <button
                  key={z}
                  onClick={() => setActiveZoneTab(activeZoneTab === z ? null : z)}
                  className={`py-1.5 text-[11px] font-bold rounded-lg capitalize transition-all ${
                    activeZoneTab === z
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {z === 'hair'
                    ? language === 'bn' ? 'চুল' : 'Hair'
                    : z === 'face'
                    ? language === 'bn' ? 'মুখ/চোয়াল' : 'Face'
                    : z === 'ear'
                    ? language === 'bn' ? 'কান' : 'Ear'
                    : language === 'bn' ? 'কাঁধ' : 'Shoulder'}
                </button>
              ))}
            </div>

            {/* Active Zone Sliders */}
            {activeZoneTab && (
              <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80 space-y-2.5 animate-fadeIn">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{activeZoneTab.toUpperCase()} Width Scale</span>
                    <span className="font-mono text-indigo-300">
                      {Math.round(config.zones[activeZoneTab].scale * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.85"
                    max="1.15"
                    step="0.01"
                    value={config.zones[activeZoneTab].scale}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setConfig((prev) => ({
                        ...prev,
                        zones: {
                          ...prev.zones,
                          [activeZoneTab]: { ...prev.zones[activeZoneTab], scale: val },
                        },
                      }));
                    }}
                    onMouseUp={() => pushHistory({ config, warpStrokes })}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{activeZoneTab.toUpperCase()} Horizontal Shift (Δx)</span>
                    <span className="font-mono text-sky-300">
                      {config.zones[activeZoneTab].shiftX} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-30"
                    max="30"
                    value={config.zones[activeZoneTab].shiftX}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setConfig((prev) => ({
                        ...prev,
                        zones: {
                          ...prev.zones,
                          [activeZoneTab]: { ...prev.zones[activeZoneTab], shiftX: val },
                        },
                      }));
                    }}
                    onMouseUp={() => pushHistory({ config, warpStrokes })}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{activeZoneTab.toUpperCase()} Vertical Shift (Δy)</span>
                    <span className="font-mono text-emerald-300">
                      {config.zones[activeZoneTab].shiftY} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    value={config.zones[activeZoneTab].shiftY}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setConfig((prev) => ({
                        ...prev,
                        zones: {
                          ...prev.zones,
                          [activeZoneTab]: { ...prev.zones[activeZoneTab], shiftY: val },
                        },
                      }));
                    }}
                    onMouseUp={() => pushHistory({ config, warpStrokes })}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Interactive Repair Brushes */}
          <div className="p-4 space-y-3">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
              {language === 'bn' ? '৫. ম্যানুয়াল টাচ-আপ ও রিপেয়ার ব্রাশ' : '5. Manual Touch-up Brushes'}
            </label>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setActiveBrush(activeBrush === 'none' ? 'mirror_stamp' : 'none')}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  activeBrush === 'none'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow'
                    : 'bg-slate-950/50 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Move className="w-4 h-4" />
                <span className="text-[10px] font-bold">
                  {language === 'bn' ? 'এক্সিস মুভ' : 'Axis Alignment'}
                </span>
              </button>

              <button
                onClick={() => setActiveBrush(activeBrush === 'mirror_stamp' ? 'none' : 'mirror_stamp')}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  activeBrush === 'mirror_stamp'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow'
                    : 'bg-slate-950/50 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Copy className="w-4 h-4" />
                <span className="text-[10px] font-bold">
                  {language === 'bn' ? 'মিরর ক্লোন স্ট্যাম্প' : 'Mirror Stamp'}
                </span>
              </button>

              <button
                onClick={() => setActiveBrush(activeBrush === 'liquify_warp' ? 'none' : 'liquify_warp')}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  activeBrush === 'liquify_warp'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow'
                    : 'bg-slate-950/50 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-[10px] font-bold">
                  {language === 'bn' ? 'পুশ-পুল লিকুইফাই' : 'Liquify Warp'}
                </span>
              </button>

              <button
                onClick={() => setActiveBrush(activeBrush === 'healing_brush' ? 'none' : 'healing_brush')}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  activeBrush === 'healing_brush'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow'
                    : 'bg-slate-950/50 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Wand2 className="w-4 h-4" />
                <span className="text-[10px] font-bold">
                  {language === 'bn' ? 'হিলিং প্যাচ' : 'Healing Patch'}
                </span>
              </button>
            </div>

            {/* Brush Settings if a brush is active */}
            {activeBrush !== 'none' && (
              <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80 space-y-2 animate-fadeIn">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{language === 'bn' ? 'ব্রাশ সাইজ' : 'Brush Size'}</span>
                    <span className="font-mono text-indigo-300">{brushSize} px</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="120"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{language === 'bn' ? 'ব্রাশ স্ট্রেন্থ / হার্ডনেস' : 'Strength / Hardness'}</span>
                    <span className="font-mono text-emerald-300">{Math.round(brushStrength * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={brushStrength}
                    onChange={(e) => setBrushStrength(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
