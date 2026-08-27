/**
 * DocumentWorkspace.tsx
 * Production Document Scanner Studio with Multi-Page / Batch Document Support,
 * Clean Upload Hero Dropzone, Multi-Up Print Sheet Arranging & Accurate 4-Corner Warp.
 */

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import {
  FileText, Upload, Sparkles, Wand2, RotateCw, ZoomIn, ZoomOut, Maximize2,
  Printer, Download, CreditCard, Sliders, Scissors, Sun, Eye, Layers,
  RotateCcw, Check, RefreshCw, Palette, ShieldCheck, FileCheck2, Camera,
  Columns, SplitSquareVertical, FlipHorizontal, FlipVertical, Undo2, Redo2,
  Move, Minimize2, CheckCircle2, ChevronRight, Scan, Plus, Trash2, ImagePlus,
  LayoutGrid
} from 'lucide-react';
import { PerspectiveWarpEngine, DocumentQuad } from '../../engines/PerspectiveWarpEngine';
import { DocumentEnhanceEngine, DocumentFilterMode } from '../../engines/DocumentEnhanceEngine';
import { ExportEngine } from '../../engines/ExportEngine';
import { PrintEngine } from '../../engines/PrintEngine';
import { ImageEngine } from '../../engines/ImageEngine';
import { HistoryEngine } from '../../engines/HistoryEngine';
import { mmToPx } from '../../passport-studio/utils/mm-to-px';
import PerspectiveCropOverlay from './PerspectiveCropOverlay';
import NidComposerModal from './NidComposerModal';
import DocumentPrintSheetModal, { PrintSheetPageItem } from './DocumentPrintSheetModal';

interface DocumentWorkspaceProps {
  onAddRecentFile: (name: string, type: 'PDF' | 'Photo' | 'Passport' | 'CV' | 'Doc' | 'Design' | 'Scan') => void;
  language: 'en' | 'bn';
}

export interface DocPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  icon: string;
  dpi: number;
  desc: string;
}

export const DOC_PRESETS: DocPreset[] = [
  {
    id: 'birth_cert',
    name: 'জন্মনিবন্ধন (A4)',
    widthMm: 210,
    heightMm: 297,
    icon: '📜',
    dpi: 300,
    desc: 'ডিজিটাল জন্ম ও মৃত্যু সনদ (২১০ × ২৯৭ মিমি)'
  },
  {
    id: 'smart_nid',
    name: 'স্মার্ট এনআইডি (85.6 × 54mm)',
    widthMm: 85.6,
    heightMm: 53.98,
    icon: '💳',
    dpi: 300,
    desc: 'জাতীয় পরিচয়পত্র ID-1 স্ট্যান্ডার্ড (৮৫.৬ × ৫৪ মিমি)'
  },
  {
    id: 'old_nid',
    name: 'পুরাতন এনআইডি (105 × 75mm)',
    widthMm: 105,
    heightMm: 75,
    icon: '🪪',
    dpi: 300,
    desc: 'পুরাতন লেমিনেটিং কার্ড (১০৫ × ৭৫ মিমি)'
  },
  {
    id: 'certificate_a4',
    name: 'সার্টিফিকেট / মার্কশিট (A4)',
    widthMm: 210,
    heightMm: 297,
    icon: '🎓',
    dpi: 300,
    desc: 'শিক্ষা সনদ ও প্রশংসাপত্র (২১০ × ২৯৭ মিমি)'
  },
  {
    id: 'memo_a5',
    name: 'ক্যাশ মেমো / রশিদ (A5)',
    widthMm: 148,
    heightMm: 210,
    icon: '🧾',
    dpi: 300,
    desc: 'অফিস মেমো ও চালান রশিদ (১৪৮ × ২১০ মিমি)'
  },
  {
    id: 'legal_doc',
    name: 'দলিল / স্ট্যাম্প (Legal)',
    widthMm: 216,
    heightMm: 356,
    icon: '⚖️',
    dpi: 300,
    desc: 'স্ট্যাম্প ও চুক্তিপত্র (২১৬ × ৩৫৬ মিমি)'
  },
];

export interface DocumentPageItem {
  id: string;
  name: string;
  sourceCanvas: HTMLCanvasElement;
  warpedCanvas: HTMLCanvasElement | null;
  processedCanvas: HTMLCanvasElement | null;
  quad: DocumentQuad;
  isWarpMode: boolean;
  filterMode: DocumentFilterMode;
  shadowStrength: number;
  brightness: number;
  contrast: number;
  sharpen: number;
  binarizeSensitivity: number;
  deskewAngle: number;
  selectedPreset: DocPreset;
}

export default function DocumentWorkspace({ onAddRecentFile, language }: DocumentWorkspaceProps) {
  // Multi-Document Pages State
  const [pages, setPages] = useState<DocumentPageItem[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);

  // Active Page State References (derived from active page)
  const activePage = pages[activePageIndex] || null;

  // Zoom & Pan Interactive State
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number; startPanX: number; startPanY: number }>({
    x: 0, y: 0, startPanX: 0, startPanY: 0
  });

  // Before / After Split Comparison State
  const [isBeforeAfterActive, setIsBeforeAfterActive] = useState<boolean>(false);
  const [splitPos, setSplitPos] = useState<number>(50);

  // Modals
  const [isNidComposerOpen, setIsNidComposerOpen] = useState<boolean>(false);
  const [isPrintSheetModalOpen, setIsPrintSheetModalOpen] = useState<boolean>(false);

  // Display Sizing & Bounding Box
  const [canvasDisplaySize, setCanvasDisplaySize] = useState<{ width: number; height: number }>({ width: 500, height: 700 });

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasDisplayRef = useRef<HTMLCanvasElement | null>(null);
  const multiFileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper: Create a new DocumentPageItem from an image Data URL
  const createPageFromImage = (img: HTMLImageElement, name: string): DocumentPageItem => {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth || img.width;
    c.height = img.naturalHeight || img.height;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
    }

    const w = c.width;
    const h = c.height;

    // Initialize quad to full perimeter with 3% inset
    const initialQuad: DocumentQuad = {
      tl: { x: Math.round(w * 0.03), y: Math.round(h * 0.03) },
      tr: { x: Math.round(w * 0.97), y: Math.round(h * 0.03) },
      br: { x: Math.round(w * 0.97), y: Math.round(h * 0.97) },
      bl: { x: Math.round(w * 0.03), y: Math.round(h * 0.97) },
    };

    // Auto-detect corners with CV
    const detectedQuad = PerspectiveWarpEngine.autoDetectDocumentCorners(c);

    // Initial Process
    const processed = DocumentEnhanceEngine.processDocument(c, {
      mode: 'magic_color',
      shadowRemovalStrength: 65,
      brightness: 5,
      contrast: 15,
      sharpen: 30,
    });

    return {
      id: `page-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      sourceCanvas: c,
      warpedCanvas: c,
      processedCanvas: processed,
      quad: detectedQuad || initialQuad,
      isWarpMode: false,
      filterMode: 'magic_color',
      shadowStrength: 65,
      brightness: 5,
      contrast: 15,
      sharpen: 30,
      binarizeSensitivity: 50,
      deskewAngle: 0,
      selectedPreset: DOC_PRESETS[0],
    };
  };

  // Handle Multi-File Upload
  const handleMultipleFiles = (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    let loadedPages: DocumentPageItem[] = [];
    let count = 0;

    fileList.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const src = evt.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const newPage = createPageFromImage(img, file.name || `Document_${idx + 1}.jpg`);
          loadedPages.push(newPage);
          count++;

          if (count === fileList.length) {
            setPages(prev => [...prev, ...loadedPages]);
            if (pages.length === 0) {
              setActivePageIndex(0);
            }
            onAddRecentFile(fileList[0].name, 'Doc');
          }
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    });
  };

  // Clipboard Paste Support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const blob = items[i].getAsFile();
          if (blob) {
            handleMultipleFiles([blob]);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [pages.length]);

  // Update Active Page Properties
  const updateActivePage = (updates: Partial<DocumentPageItem>) => {
    if (!activePage) return;

    setPages(prev => {
      const next = [...prev];
      next[activePageIndex] = {
        ...next[activePageIndex],
        ...updates,
      };
      return next;
    });
  };

  // Apply Warp to Active Page
  const handleApplyWarp = () => {
    if (!activePage) return;
    const targetW = Math.round(mmToPx(activePage.selectedPreset.widthMm, 300));
    const targetH = Math.round(mmToPx(activePage.selectedPreset.heightMm, 300));

    const warped = PerspectiveWarpEngine.warpPerspective(
      activePage.sourceCanvas,
      activePage.quad,
      targetW,
      targetH
    );

    updateActivePage({
      warpedCanvas: warped,
      isWarpMode: false,
    });
  };

  // Auto Detect Corners on Active Page
  const handleAutoDetect = () => {
    if (!activePage) return;
    const detected = PerspectiveWarpEngine.autoDetectDocumentCorners(activePage.sourceCanvas);
    updateActivePage({ quad: detected });
  };

  // Reset Quad on Active Page
  const handleResetQuad = () => {
    if (!activePage) return;
    const w = activePage.sourceCanvas.width;
    const h = activePage.sourceCanvas.height;
    updateActivePage({
      quad: {
        tl: { x: Math.round(w * 0.02), y: Math.round(h * 0.02) },
        tr: { x: Math.round(w * 0.98), y: Math.round(h * 0.02) },
        br: { x: Math.round(w * 0.98), y: Math.round(h * 0.98) },
        bl: { x: Math.round(w * 0.02), y: Math.round(h * 0.98) },
      }
    });
  };

  // Preset Selection
  const handleSelectPreset = (preset: DocPreset) => {
    if (!activePage) return;

    const base = activePage.sourceCanvas;
    const ratio = preset.widthMm / preset.heightMm;
    const w = base.width;
    const h = base.height;

    let targetW = w * 0.94;
    let targetH = targetW / ratio;

    if (targetH > h * 0.94) {
      targetH = h * 0.94;
      targetW = targetH * ratio;
    }

    const cx = w / 2;
    const cy = h / 2;

    const newQuad: DocumentQuad = {
      tl: { x: Math.round(cx - targetW / 2), y: Math.round(cy - targetH / 2) },
      tr: { x: Math.round(cx + targetW / 2), y: Math.round(cy - targetH / 2) },
      br: { x: Math.round(cx + targetW / 2), y: Math.round(cy + targetH / 2) },
      bl: { x: Math.round(cx - targetW / 2), y: Math.round(cy + targetH / 2) },
    };

    updateActivePage({
      selectedPreset: preset,
      quad: newQuad,
      isWarpMode: true,
    });
  };

  // 90° Rotations & Flips
  const handleRotate90 = (cw = true) => {
    if (!activePage) return;
    const active = activePage.warpedCanvas || activePage.sourceCanvas;
    const rot = ImageEngine.rotateCanvas(active, cw ? 90 : -90);
    updateActivePage({ warpedCanvas: rot });
  };

  // Re-process Enhancements on Active Page when filters change
  useEffect(() => {
    if (!activePage) return;

    const baseCanvas = activePage.isWarpMode
      ? activePage.sourceCanvas
      : (activePage.warpedCanvas || activePage.sourceCanvas);

    let target = baseCanvas;

    if (activePage.deskewAngle !== 0) {
      const rad = (activePage.deskewAngle * Math.PI) / 180;
      const rotCanvas = document.createElement('canvas');
      rotCanvas.width = target.width;
      rotCanvas.height = target.height;
      const rCtx = rotCanvas.getContext('2d');
      if (rCtx) {
        rCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
        rCtx.rotate(rad);
        rCtx.drawImage(target, -target.width / 2, -target.height / 2);
        target = rotCanvas;
      }
    }

    const result = DocumentEnhanceEngine.processDocument(target, {
      mode: activePage.isWarpMode ? 'original' : activePage.filterMode,
      shadowRemovalStrength: activePage.shadowStrength,
      brightness: activePage.brightness,
      contrast: activePage.contrast,
      sharpen: activePage.sharpen,
      binarizeSensitivity: activePage.binarizeSensitivity,
    });

    updateActivePage({ processedCanvas: result });
  }, [
    activePage?.sourceCanvas,
    activePage?.warpedCanvas,
    activePage?.isWarpMode,
    activePage?.filterMode,
    activePage?.shadowStrength,
    activePage?.brightness,
    activePage?.contrast,
    activePage?.sharpen,
    activePage?.binarizeSensitivity,
    activePage?.deskewAngle
  ]);

  // Compute Viewport Render Dimensions accurately
  const updateDisplayDimensions = () => {
    if (!activePage || !viewportRef.current) return;
    const active = activePage.isWarpMode ? activePage.sourceCanvas : activePage.processedCanvas;
    if (!active) return;

    const vRect = viewportRef.current.getBoundingClientRect();
    const maxW = vRect.width - 64;
    const maxH = vRect.height - 64;

    const imgRatio = active.width / active.height;
    const viewRatio = maxW / maxH;

    let dW: number, dH: number;
    if (imgRatio > viewRatio) {
      dW = maxW;
      dH = dW / imgRatio;
    } else {
      dH = maxH;
      dW = dH * imgRatio;
    }

    setCanvasDisplaySize({ width: Math.round(dW), height: Math.round(dH) });
  };

  useLayoutEffect(() => {
    updateDisplayDimensions();
    window.addEventListener('resize', updateDisplayDimensions);
    return () => window.removeEventListener('resize', updateDisplayDimensions);
  }, [activePage?.sourceCanvas, activePage?.processedCanvas, activePage?.isWarpMode]);

  // Render to Display Canvas
  useEffect(() => {
    if (!activePage || !canvasDisplayRef.current) return;
    const active = activePage.isWarpMode ? activePage.sourceCanvas : activePage.processedCanvas;
    if (!active) return;

    const display = canvasDisplayRef.current;
    display.width = active.width;
    display.height = active.height;
    const ctx = display.getContext('2d');
    if (!ctx) return;

    if (isBeforeAfterActive && !activePage.isWarpMode && activePage.sourceCanvas && activePage.processedCanvas) {
      const splitX = Math.round((active.width * splitPos) / 100);

      ctx.drawImage(activePage.processedCanvas, 0, 0);

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitX, active.height);
      ctx.clip();
      ctx.drawImage(activePage.sourceCanvas, 0, 0, active.width, active.height);
      ctx.restore();

      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, active.height);
      ctx.stroke();
    } else {
      ctx.drawImage(active, 0, 0);
    }
  }, [activePage?.processedCanvas, activePage?.sourceCanvas, activePage?.isWarpMode, isBeforeAfterActive, splitPos]);

  // Mouse Pan & Wheel Zoom
  const handleViewportMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.crop-interactive-element') || activePage?.isWarpMode) return;
    isPanningRef.current = true;
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPanX: panOffset.x,
      startPanY: panOffset.y,
    };
  };

  const handleViewportMouseMove = (e: React.MouseEvent) => {
    if (!isPanningRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setPanOffset({
      x: panStartRef.current.startPanX + dx,
      y: panStartRef.current.startPanY + dy,
    });
  };

  const handleViewportMouseUp = () => {
    isPanningRef.current = false;
  };

  const handleWheelZoom = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
    setZoomLevel(prev => Math.max(0.4, Math.min(3.5, prev + zoomDelta)));
  };

  // Convert current pages for Print Sheet Modal
  const getPrintPages = (): PrintSheetPageItem[] => {
    return pages.map(p => ({
      id: p.id,
      name: p.name,
      canvas: p.processedCanvas || p.sourceCanvas,
      widthMm: p.selectedPreset.widthMm,
      heightMm: p.selectedPreset.heightMm,
    }));
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100 select-none overflow-hidden font-sans">
      {/* ── Top Header Toolbar ────────────────────────────────────────────── */}
      <header className="h-12 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 shrink-0 z-20 shadow-md">
        {/* Left Actions: Multi-File Upload, Warp, Rotate */}
        <div className="flex items-center gap-1.5">
          <input
            ref={multiFileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleMultipleFiles(e.target.files);
            }}
          />
          <button
            onClick={() => multiFileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition active:scale-95 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'ছবি ইমপোর্ট (+ একাধিক)' : 'Import (+ Multi)'}</span>
          </button>

          <div className="h-4 w-px bg-slate-800" />

          {activePage && (
            <>
              {/* 4-Corner Perspective Warp Tool Button */}
              <button
                onClick={() => updateActivePage({ isWarpMode: !activePage.isWarpMode })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                  activePage.isWarpMode
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/40'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? '৪-কোণা সোজা (Warp)' : '4-Corner Warp'}</span>
              </button>

              {/* 90° Rotations */}
              <button
                onClick={() => handleRotate90(false)}
                className="p-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                title="Rotate 90° CCW"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleRotate90(true)}
                className="p-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                title="Rotate 90° CW"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* NID Dual-Side Compositor Modal Button */}
          <button
            onClick={() => setIsNidComposerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 font-bold text-xs border border-amber-500/40 shadow-sm transition active:scale-95 cursor-pointer ml-1"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'NID উভয় পাশ (Front+Back)' : 'NID Dual-Side'}</span>
          </button>
        </div>

        {/* Center Scanner Filter Presets */}
        {activePage && (
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
            {[
              { id: 'magic_color', name: language === 'bn' ? 'ম্যাজিক কালার' : 'Magic Color', icon: Sparkles },
              { id: 'clean_bw', name: language === 'bn' ? 'ফটোকপি B&W' : 'Clean B&W', icon: FileCheck2 },
              { id: 'grayscale', name: language === 'bn' ? 'গ্রেস্কেল' : 'Grayscale', icon: Eye },
              { id: 'high_contrast', name: language === 'bn' ? 'হাই কনট্রাস্ট' : 'High Contrast', icon: Sun },
              { id: 'original', name: language === 'bn' ? 'অরিজিনাল' : 'Original', icon: RotateCcw },
            ].map(({ id, name, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  updateActivePage({
                    filterMode: id as DocumentFilterMode,
                    isWarpMode: false,
                  });
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activePage.filterMode === id && !activePage.isWarpMode
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Right Tools: Print Sheet Arranger, Direct Print & PDF Export */}
        <div className="flex items-center gap-1.5">
          {activePage && (
            <button
              onClick={() => setIsBeforeAfterActive(!isBeforeAfterActive)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                isBeforeAfterActive
                  ? 'bg-amber-600 text-white border-amber-400 shadow-md'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
              title="Toggle Before/After Comparison Split"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'তুলনা (Split)' : 'Compare'}</span>
            </button>
          )}

          {/* Master Print Sheet Arranger Modal */}
          <button
            onClick={() => setIsPrintSheetModalOpen(true)}
            disabled={pages.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-950/50 transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'প্রিন্ট শিট বিল্ডার' : 'Print Sheet Arranger'}</span>
          </button>
        </div>
      </header>

      {/* ── Main Workstation Viewport ──────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Multi-Page Gallery & Preset Selector */}
        <div className="w-68 bg-slate-900/95 border-r border-slate-800 flex flex-col p-3 gap-3 overflow-y-auto shrink-0 shadow-lg">
          {/* Multi-Page Document Strip Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-[11px] font-extrabold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              {language === 'bn' ? 'ডকুমেন্ট পেজসমূহ' : 'Document Pages'}
              <span className="ml-1 px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded text-[10px] font-mono">
                {pages.length}
              </span>
            </span>

            <button
              onClick={() => multiFileInputRef.current?.click()}
              className="p-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white transition active:scale-95 cursor-pointer"
              title="Add New Document Page"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Multi-Page Thumbnails List */}
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
            {pages.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                {language === 'bn' ? 'কোনো পেজ নেই (+ দিয়ে যোগ করুন)' : 'No pages added yet'}
              </div>
            ) : (
              pages.map((pItem, idx) => {
                const isActive = idx === activePageIndex;
                return (
                  <div
                    key={pItem.id}
                    onClick={() => setActivePageIndex(idx)}
                    className={`p-2 rounded-xl flex items-center gap-2.5 transition border cursor-pointer relative group ${
                      isActive
                        ? 'bg-indigo-950/70 border-indigo-500 ring-2 ring-indigo-500/20'
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    {/* Small Canvas Thumbnail Preview */}
                    <div className="w-10 h-12 bg-white rounded border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                      <canvas
                        ref={(el) => {
                          if (el) {
                            el.width = 40;
                            el.height = 48;
                            const ctx = el.getContext('2d');
                            const srcC = pItem.processedCanvas || pItem.sourceCanvas;
                            if (ctx && srcC) ctx.drawImage(srcC, 0, 0, 40, 48);
                          }
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                        <span>Page {idx + 1}</span>
                        {idx === 0 && <span className="text-[9px] text-amber-400">(Front)</span>}
                        {idx === 1 && <span className="text-[9px] text-emerald-400">(Back)</span>}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        {pItem.selectedPreset.name}
                      </div>
                    </div>

                    {/* Delete Page Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPages(prev => prev.filter((_, i) => i !== idx));
                        if (activePageIndex >= pages.length - 1) {
                          setActivePageIndex(Math.max(0, pages.length - 2));
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition"
                      title="Delete Page"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Document Size Presets (Compact Quick Selector) */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800">
            <span className="text-[10px] font-extrabold tracking-wider uppercase text-slate-400">
              {language === 'bn' ? 'সাইজ ফিট প্রিসেট (300 DPI)' : 'Size Presets (300 DPI)'}
            </span>

            <div className="grid grid-cols-1 gap-1.5">
              {DOC_PRESETS.map((preset) => {
                const isSelected = activePage?.selectedPreset.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`px-2.5 py-1.5 rounded-lg text-left flex items-center justify-between transition border cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="text-xs truncate">{preset.icon} {preset.name}</span>
                    <span className="text-[9px] font-mono text-slate-400">{preset.widthMm}mm</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fine Deskew Slider */}
          {activePage && (
            <div className="mt-auto p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1">
                  <RotateCw className="w-3 h-3 text-indigo-400" />
                  Deskew
                </span>
                <span className="font-mono text-indigo-300 font-bold">{activePage.deskewAngle.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min="-15"
                max="15"
                step="0.2"
                value={activePage.deskewAngle}
                onChange={(e) => updateActivePage({ deskewAngle: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Center Live Document Viewport / Empty State Hero */}
        <div
          ref={viewportRef}
          onMouseDown={handleViewportMouseDown}
          onMouseMove={handleViewportMouseMove}
          onMouseUp={handleViewportMouseUp}
          onWheel={handleWheelZoom}
          className="flex-1 bg-slate-950 flex items-center justify-center relative overflow-hidden p-6 cursor-default"
        >
          {pages.length === 0 ? (
            /* ── Clean Upload & Drop Hero Area (When No Document Loaded) ── */
            <div className="flex flex-col items-center justify-center max-w-lg p-8 border-2 border-dashed border-slate-800 hover:border-indigo-500 rounded-3xl bg-slate-900/40 backdrop-blur-xl text-center transition-all shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-600/30 mb-4 animate-pulse">
                <Upload className="w-8 h-8 text-white stroke-[2.5]" />
              </div>

              <h3 className="text-lg font-extrabold text-white mb-1">
                {language === 'bn' ? 'ডকুমেন্ট আপলোড বা ড্রপ করুন' : 'Upload or Drop Documents Here'}
              </h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                {language === 'bn'
                  ? 'NID কার্ড (সামনে/পেছনে), জন্মনিবন্ধন, সার্টিফিকেট বা যেকোনো মোবাইল ফটো এখানে ড্র্যাগ করুন অথবা ক্লিপবোর্ড থেকে পেস্ট করুন (Ctrl+V)'
                  : 'Drag & drop mobile photos of NID cards, birth certificates, marksheets or paste from clipboard (Ctrl+V)'}
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => multiFileInputRef.current?.click()}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-900/50 transition active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <ImagePlus className="w-4 h-4" />
                  <span>{language === 'bn' ? 'ফাইল সিলেক্ট করুন' : 'Choose Photos'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* ── Live Active Canvas Viewport ── */
            <>
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
                {activePage?.isWarpMode && activePage.sourceCanvas && (
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
                      onQuadChange={(newQuad) => updateActivePage({ quad: newQuad })}
                      onApplyWarp={handleApplyWarp}
                      onAutoDetect={handleAutoDetect}
                      onResetQuad={handleResetQuad}
                      onCancel={() => updateActivePage({ isWarpMode: false })}
                      language={language}
                    />
                  </div>
                )}

                {/* Before / After Comparison Slider Bar */}
                {isBeforeAfterActive && !activePage?.isWarpMode && (
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={splitPos}
                    onChange={(e) => setSplitPos(parseInt(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-40"
                  />
                )}
              </div>

              {/* Floating Zoom Controls */}
              <div className="absolute bottom-4 right-6 flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-xl px-3 py-1.5 rounded-2xl border border-slate-800 shadow-2xl z-30">
                <button
                  onClick={() => setZoomLevel(prev => Math.max(0.4, prev - 0.25))}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition active:scale-95 cursor-pointer"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <span className="text-xs font-mono font-bold text-indigo-300 min-w-12 text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>

                <button
                  onClick={() => setZoomLevel(prev => Math.min(3.5, prev + 0.25))}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition active:scale-95 cursor-pointer"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <div className="h-4 w-px bg-slate-700 mx-1" />

                <button
                  onClick={() => {
                    setZoomLevel(1);
                    setPanOffset({ x: 0, y: 0 });
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 transition cursor-pointer"
                  title="Fit to Screen (0)"
                >
                  Fit
                </button>
              </div>

              {/* Bottom Left Document Specs Status Pill */}
              <div className="absolute bottom-4 left-6 flex items-center gap-2 bg-slate-900/95 backdrop-blur-xl px-3.5 py-1.5 rounded-2xl border border-slate-800 text-xs font-mono text-slate-300 shadow-2xl z-30">
                <span className="text-white font-bold">{activePage.selectedPreset.name}</span>
                <span>•</span>
                <span className="text-indigo-400">{activePage.selectedPreset.widthMm} × {activePage.selectedPreset.heightMm} mm</span>
                <span>•</span>
                <span className="text-emerald-400 font-bold">300 DPI</span>
              </div>
            </>
          )}
        </div>

        {/* Right Fine Enhancements & Adjustment Sliders Panel */}
        {activePage && (
          <div className="w-72 bg-slate-900/90 border-l border-slate-800 flex flex-col p-4 gap-4 overflow-y-auto shrink-0 shadow-lg">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>{language === 'bn' ? 'স্ক্যানার এনহ্যান্সমেন্ট' : 'Scanner Enhancements'}</span>
            </div>

            {/* Shadow Removal Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-300">
                <span>{language === 'bn' ? 'ছায়া দূরীকরণ' : 'Shadow Removal'}</span>
                <span className="font-mono text-indigo-400 font-bold">{activePage.shadowStrength}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={activePage.shadowStrength}
                onChange={(e) => updateActivePage({ shadowStrength: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Text Sharpening Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-300">
                <span>{language === 'bn' ? 'লেখা স্পষ্টকরণ' : 'Sharpen Text'}</span>
                <span className="font-mono text-indigo-400 font-bold">{activePage.sharpen}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={activePage.sharpen}
                onChange={(e) => updateActivePage({ sharpen: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Binarization Sensitivity (Active for Clean B&W) */}
            {activePage.filterMode === 'clean_bw' && (
              <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 shadow-inner">
                <div className="flex justify-between text-xs font-bold text-slate-300">
                  <span>{language === 'bn' ? 'ফটোকপি সেন্সিটিভিটি' : 'B&W Sensitivity'}</span>
                  <span className="font-mono text-indigo-400 font-bold">{activePage.binarizeSensitivity}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={activePage.binarizeSensitivity}
                  onChange={(e) => updateActivePage({ binarizeSensitivity: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            )}

            {/* Brightness Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-300">
                <span>{language === 'bn' ? 'উজ্জ্বলতা (Brightness)' : 'Brightness'}</span>
                <span className="font-mono text-indigo-400 font-bold">{activePage.brightness}</span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                value={activePage.brightness}
                onChange={(e) => updateActivePage({ brightness: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Contrast Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-300">
                <span>{language === 'bn' ? 'কনট্রাস্ট (Contrast)' : 'Contrast'}</span>
                <span className="font-mono text-indigo-400 font-bold">{activePage.contrast}</span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                value={activePage.contrast}
                onChange={(e) => updateActivePage({ contrast: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Reset All Enhancements Button */}
            <button
              onClick={() => {
                updateActivePage({
                  shadowStrength: 65,
                  brightness: 5,
                  contrast: 15,
                  sharpen: 30,
                  binarizeSensitivity: 50,
                  deskewAngle: 0,
                  filterMode: 'magic_color',
                });
              }}
              className="mt-auto py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'ডিফল্ট রিসেট' : 'Reset Defaults'}</span>
            </button>
          </div>
        )}
      </div>

      {/* ── NID Dual-Side Compositor Modal ── */}
      <NidComposerModal
        isOpen={isNidComposerOpen}
        onClose={() => setIsNidComposerOpen(false)}
        initialFrontCanvas={activePage?.processedCanvas || null}
        language={language}
      />

      {/* ── Master Print Sheet Layout Arranger Modal ── */}
      <DocumentPrintSheetModal
        isOpen={isPrintSheetModalOpen}
        onClose={() => setIsPrintSheetModalOpen(false)}
        pages={getPrintPages()}
        language={language}
      />
    </div>
  );
}
