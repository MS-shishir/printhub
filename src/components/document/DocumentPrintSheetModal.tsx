/**
 * DocumentPrintSheetModal.tsx
 * Enterprise Multi-Page & Multi-Up Print Sheet Arranger for PrintHub Studio.
 * 
 * Features:
 * 1. Clean paper view without distracting floating text badges.
 * 2. Multi-selection support (Shift/Ctrl+click or "Select All") - move/drag both Front & Back together!
 * 3. Deselect when clicking on empty paper space.
 * 4. Freeform drag-to-position, 1-click center alignments, individual & group rotations.
 * 5. 300 DPI high-res print spooler and PDF export.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Printer, Download, X, LayoutGrid, FileText, Check, Scissors,
  Sliders, Maximize2, Sparkles, ChevronRight, Layers, Move,
  RotateCw, RotateCcw, AlignCenter, AlignVerticalSpaceAround,
  CheckCircle2, RefreshCw, ZoomIn, ZoomOut, CheckSquare, Square
} from 'lucide-react';
import { mmToPx } from '../../passport-studio/utils/mm-to-px';
import { PrintEngine } from '../../engines/PrintEngine';
import { ExportEngine } from '../../engines/ExportEngine';
import { PDFDocument } from 'pdf-lib';

export interface PrintSheetPageItem {
  id: string;
  name: string;
  canvas: HTMLCanvasElement;
  widthMm: number;
  heightMm: number;
}

export interface PlacedItemState {
  pageId: string;
  name: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  rotationDeg: number; // 0, 90, 180, 270
  scale: number; // 1.0 = 100%
}

interface DocumentPrintSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  pages: PrintSheetPageItem[];
  language: 'en' | 'bn';
}

type PaperSizeKey = 'A4' | '4R' | 'Legal' | 'A5';
type PageOrientation = 'portrait' | 'landscape';

const PAPER_DIMENSIONS: Record<PaperSizeKey, { name: string; widthMm: number; heightMm: number }> = {
  A4: { name: 'A4 Paper', widthMm: 210, heightMm: 297 },
  '4R': { name: '4R Photo (4"×6")', widthMm: 102, heightMm: 152 },
  Legal: { name: 'Legal Paper', widthMm: 216, heightMm: 356 },
  A5: { name: 'A5 Paper', widthMm: 148, heightMm: 210 },
};

export default function DocumentPrintSheetModal({
  isOpen,
  onClose,
  pages,
  language
}: DocumentPrintSheetModalProps) {
  const [paperSize, setPaperSize] = useState<PaperSizeKey>('A4');
  const [orientation, setOrientation] = useState<PageOrientation>('portrait');
  const [showCutlines, setShowCutlines] = useState<boolean>(true);
  const [showCenterGuides, setShowCenterGuides] = useState<boolean>(true);

  // Placed Interactive Items on the Paper
  const [placedItems, setPlacedItems] = useState<PlacedItemState[]>([]);
  // Multi-selection: array of selected indices
  const [selectedIndices, setSelectedIndices] = useState<number[]>([0]);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sheetContainerRef = useRef<HTMLDivElement | null>(null);

  // Multi-item Dragging state
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialItems: { index: number; origXMm: number; origYMm: number }[];
    paperWidthMm: number;
    paperHeightMm: number;
  }>({
    startX: 0,
    startY: 0,
    initialItems: [],
    paperWidthMm: 210,
    paperHeightMm: 297,
  });

  const getPaperDimensionsMm = () => {
    const spec = PAPER_DIMENSIONS[paperSize];
    const isLand = orientation === 'landscape';
    const widthMm = isLand ? Math.max(spec.widthMm, spec.heightMm) : Math.min(spec.widthMm, spec.heightMm);
    const heightMm = isLand ? Math.min(spec.widthMm, spec.heightMm) : Math.max(spec.widthMm, spec.heightMm);
    return { widthMm, heightMm };
  };

  // Initialize Placed Items when pages or paper size change
  useEffect(() => {
    if (!isOpen || pages.length === 0) return;

    const { widthMm: pW, heightMm: pH } = getPaperDimensionsMm();

    if (pages.length === 1) {
      const p = pages[0];
      const wMm = p.widthMm || 85.6;
      const hMm = p.heightMm || 53.98;
      setPlacedItems([
        {
          pageId: p.id,
          name: p.name || 'Document 1',
          xMm: Math.round((pW - wMm) / 2),
          yMm: Math.round((pH - hMm) / 2),
          widthMm: wMm,
          heightMm: hMm,
          rotationDeg: 0,
          scale: 1.0,
        }
      ]);
      setSelectedIndices([0]);
    } else if (pages.length >= 2) {
      const p1 = pages[0];
      const p2 = pages[1];

      const w1 = p1.widthMm || 85.6;
      const h1 = p1.heightMm || 53.98;
      const w2 = p2.widthMm || 85.6;
      const h2 = p2.heightMm || 53.98;

      const gapMm = 8;
      const totalW = w1 + w2 + gapMm;

      const startX = Math.max(10, Math.round((pW - totalW) / 2));
      const startY = Math.max(15, Math.round((pH - Math.max(h1, h2)) / 2));

      setPlacedItems([
        {
          pageId: p1.id,
          name: p1.name || 'Front',
          xMm: startX,
          yMm: startY,
          widthMm: w1,
          heightMm: h1,
          rotationDeg: 0,
          scale: 1.0,
        },
        {
          pageId: p2.id,
          name: p2.name || 'Back',
          xMm: startX + w1 + gapMm,
          yMm: startY,
          widthMm: w2,
          heightMm: h2,
          rotationDeg: 0,
          scale: 1.0,
        }
      ]);
      setSelectedIndices([0, 1]); // Select both by default for easy group drag
    }
  }, [isOpen, pages.length, paperSize, orientation]);

  // Selection Toggles
  const handleItemClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      // Toggle selection in multi-select
      setSelectedIndices(prev =>
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
      );
    } else {
      if (!selectedIndices.includes(index)) {
        setSelectedIndices([index]);
      }
    }
  };

  const handleSelectAll = () => {
    setSelectedIndices(placedItems.map((_, i) => i));
  };

  const handleDeselectAll = () => {
    setSelectedIndices([]);
  };

  // Layout Alignments
  const handleAlignSideBySideCenter = () => {
    if (placedItems.length < 2) return;
    const { widthMm: pW, heightMm: pH } = getPaperDimensionsMm();
    const gapMm = 8;

    const w1 = placedItems[0].widthMm * placedItems[0].scale;
    const h1 = placedItems[0].heightMm * placedItems[0].scale;
    const w2 = placedItems[1].widthMm * placedItems[1].scale;
    const h2 = placedItems[1].heightMm * placedItems[1].scale;

    const totalW = w1 + w2 + gapMm;
    const startX = Math.round((pW - totalW) / 2);
    const startY = Math.round((pH - Math.max(h1, h2)) / 2);

    setPlacedItems(prev => [
      { ...prev[0], xMm: startX, yMm: startY },
      { ...prev[1], xMm: startX + Math.round(w1) + gapMm, yMm: startY },
      ...prev.slice(2),
    ]);
  };

  const handleAlignStackedCenter = () => {
    if (placedItems.length < 2) return;
    const { widthMm: pW, heightMm: pH } = getPaperDimensionsMm();
    const gapMm = 8;

    const w1 = placedItems[0].widthMm * placedItems[0].scale;
    const h1 = placedItems[0].heightMm * placedItems[0].scale;
    const w2 = placedItems[1].widthMm * placedItems[1].scale;
    const h2 = placedItems[1].heightMm * placedItems[1].scale;

    const totalH = h1 + h2 + gapMm;
    const startX1 = Math.round((pW - w1) / 2);
    const startX2 = Math.round((pW - w2) / 2);
    const startY = Math.round((pH - totalH) / 2);

    setPlacedItems(prev => [
      { ...prev[0], xMm: startX1, yMm: startY },
      { ...prev[1], xMm: startX2, yMm: startY + Math.round(h1) + gapMm },
      ...prev.slice(2),
    ]);
  };

  const handleAlignTopCenter = () => {
    const { widthMm: pW } = getPaperDimensionsMm();
    const gapMm = 8;

    if (placedItems.length === 1) {
      const w = placedItems[0].widthMm * placedItems[0].scale;
      setPlacedItems(prev => [{ ...prev[0], xMm: Math.round((pW - w) / 2), yMm: 15 }]);
    } else if (placedItems.length >= 2) {
      const w1 = placedItems[0].widthMm * placedItems[0].scale;
      const w2 = placedItems[1].widthMm * placedItems[1].scale;
      const totalW = w1 + w2 + gapMm;
      const startX = Math.round((pW - totalW) / 2);
      setPlacedItems(prev => [
        { ...prev[0], xMm: startX, yMm: 15 },
        { ...prev[1], xMm: startX + Math.round(w1) + gapMm, yMm: 15 },
        ...prev.slice(2),
      ]);
    }
  };

  const handleRotateSelected = (cw = true) => {
    if (selectedIndices.length === 0) return;
    setPlacedItems(prev => {
      const next = [...prev];
      selectedIndices.forEach(idx => {
        if (next[idx]) {
          const cur = next[idx].rotationDeg;
          next[idx] = {
            ...next[idx],
            rotationDeg: cw ? (cur + 90) % 360 : (cur + 270) % 360,
          };
        }
      });
      return next;
    });
  };

  const handleScaleSelected = (scaleVal: number) => {
    if (selectedIndices.length === 0) return;
    setPlacedItems(prev => {
      const next = [...prev];
      selectedIndices.forEach(idx => {
        if (next[idx]) {
          next[idx] = { ...next[idx], scale: scaleVal };
        }
      });
      return next;
    });
  };

  // Generate 300 DPI High-Resolution Sheet Canvas
  const generateSheetCanvas = (): HTMLCanvasElement | null => {
    if (pages.length === 0 || placedItems.length === 0) return null;

    const { widthMm: paperWidthMm, heightMm: paperHeightMm } = getPaperDimensionsMm();
    const dpi = 300;
    const sheetW = Math.round(mmToPx(paperWidthMm, dpi));
    const sheetH = Math.round(mmToPx(paperHeightMm, dpi));

    const sheetCanvas = document.createElement('canvas');
    sheetCanvas.width = sheetW;
    sheetCanvas.height = sheetH;
    const ctx = sheetCanvas.getContext('2d');
    if (!ctx) return null;

    // Fill white paper background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, sheetW, sheetH);

    // Draw Placed Items
    placedItems.forEach((item, idx) => {
      const page = pages.find(p => p.id === item.pageId) || pages[idx] || pages[0];
      if (!page) return;

      const itemX = Math.round(mmToPx(item.xMm, dpi));
      const itemY = Math.round(mmToPx(item.yMm, dpi));
      const itemW = Math.round(mmToPx(item.widthMm * item.scale, dpi));
      const itemH = Math.round(mmToPx(item.heightMm * item.scale, dpi));

      ctx.save();
      ctx.translate(itemX + itemW / 2, itemY + itemH / 2);
      ctx.rotate((item.rotationDeg * Math.PI) / 180);

      // Draw document canvas
      ctx.drawImage(page.canvas, -itemW / 2, -itemH / 2, itemW, itemH);

      // Light border
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-itemW / 2, -itemH / 2, itemW, itemH);

      // Cut guides
      if (showCutlines) {
        ctx.strokeStyle = '#94A3B8';
        ctx.setLineDash([8, 8]);
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-itemW / 2 - 3, -itemH / 2 - 3, itemW + 6, itemH + 6);
        ctx.setLineDash([]);
      }

      ctx.restore();
    });

    return sheetCanvas;
  };

  // Render to Preview Canvas
  useEffect(() => {
    if (!isOpen) return;
    const sheet = generateSheetCanvas();
    if (!sheet || !previewCanvasRef.current) return;

    const pCanvas = previewCanvasRef.current;
    pCanvas.width = sheet.width;
    pCanvas.height = sheet.height;
    const pCtx = pCanvas.getContext('2d');
    if (pCtx) {
      pCtx.drawImage(sheet, 0, 0);
    }
  }, [isOpen, paperSize, orientation, showCutlines, placedItems, pages]);

  // Mouse Dragging Handlers for single or multiple selected items
  const handleItemMouseDown = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();

    let targetIndices = selectedIndices;
    if (!selectedIndices.includes(index)) {
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        targetIndices = [...selectedIndices, index];
      } else {
        targetIndices = [index];
      }
      setSelectedIndices(targetIndices);
    }

    isDraggingRef.current = true;
    const { widthMm: pW, heightMm: pH } = getPaperDimensionsMm();

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialItems: targetIndices.map(idx => ({
        index: idx,
        origXMm: placedItems[idx]?.xMm || 0,
        origYMm: placedItems[idx]?.yMm || 0,
      })),
      paperWidthMm: pW,
      paperHeightMm: pH,
    };
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !sheetContainerRef.current) return;

    const rect = sheetContainerRef.current.getBoundingClientRect();
    const { startX, startY, initialItems, paperWidthMm, paperHeightMm } = dragStartRef.current;

    const dxPx = e.clientX - startX;
    const dyPx = e.clientY - startY;

    // Convert pixel delta to paper millimeter delta
    const dxMm = (dxPx / rect.width) * paperWidthMm;
    const dyMm = (dyPx / rect.height) * paperHeightMm;

    setPlacedItems(prev => {
      const next = [...prev];
      initialItems.forEach(({ index, origXMm, origYMm }) => {
        if (next[index]) {
          const newX = Math.round(origXMm + dxMm);
          const newY = Math.round(origYMm + dyMm);
          next[index] = {
            ...next[index],
            xMm: Math.max(0, Math.min(paperWidthMm - 10, newX)),
            yMm: Math.max(0, Math.min(paperHeightMm - 10, newY)),
          };
        }
      });
      return next;
    });
  };

  const handleContainerMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Actions: Print & Export
  const handlePrint = () => {
    const sheet = generateSheetCanvas();
    if (!sheet) return;
    PrintEngine.printCanvas(sheet);
  };

  const handleExportPdf = async () => {
    const sheet = generateSheetCanvas();
    if (!sheet) return;
    await ExportEngine.exportCanvas(sheet, {
      fileName: `Print_Sheet_${paperSize}_CustomLayout`,
      format: 'pdf',
      quality: 1.0,
    });
  };

  const handleExportAllPagesPdf = async () => {
    if (pages.length === 0) return;

    const pdfDoc = await PDFDocument.create();
    for (const pageItem of pages) {
      const dataUrl = pageItem.canvas.toDataURL('image/jpeg', 0.95);
      const base64 = dataUrl.split(',')[1];
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const image = await pdfDoc.embedJpg(bytes);

      const pdfPage = pdfDoc.addPage([image.width, image.height]);
      pdfPage.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `MultiPage_Document_${pages.length}Pages.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  const { widthMm: pWidthMm, heightMm: pHeightMm } = getPaperDimensionsMm();
  const firstSelectedItem = placedItems[selectedIndices[0]] || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                <span>{language === 'bn' ? 'প্রিন্ট পেপার লেআউট ও পজিশন আর্রেঞ্জার' : 'Print Sheet & Position Arranger'}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/30">
                  300 DPI 1:1 Scale
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {language === 'bn' ? 'মাউস দিয়ে ধরে কার্ড সরান, একাধিক কার্ড সিলেক্ট করুন অথবা ফাঁকা জায়গায় ক্লিক করে সিলেকশন সরান' : 'Drag items to position, multi-select with Shift/Ctrl+Click, or click outside to deselect'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Controls & Alignment Panel */}
          <div className="w-88 border-r border-slate-800 p-4 flex flex-col gap-3.5 overflow-y-auto bg-slate-950/60">
            {/* 1. Paper Size & Orientation */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {language === 'bn' ? '১. কাগজের সাইজ (Paper Size)' : '1. Paper Size'}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['A4', '4R', 'Legal', 'A5'] as PaperSizeKey[]).map((pKey) => (
                  <button
                    key={pKey}
                    onClick={() => setPaperSize(pKey)}
                    className={`py-1.5 px-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      paperSize === pKey
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {PAPER_DIMENSIONS[pKey].name}
                  </button>
                ))}
              </div>

              {/* Orientation */}
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                <button
                  onClick={() => setOrientation('portrait')}
                  className={`py-1 px-2.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    orientation === 'portrait'
                      ? 'bg-indigo-600/80 text-white border-indigo-400'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  {language === 'bn' ? 'লম্বালম্বি (Portrait)' : 'Portrait'}
                </button>
                <button
                  onClick={() => setOrientation('landscape')}
                  className={`py-1 px-2.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    orientation === 'landscape'
                      ? 'bg-indigo-600/80 text-white border-indigo-400'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  {language === 'bn' ? 'আড়াআড়ি (Landscape)' : 'Landscape'}
                </button>
              </div>
            </div>

            {/* 2. Selection & Multi-Select Bar */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                <span>সিলেক্টেড: {selectedIndices.length} টি কার্ড</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleSelectAll}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold transition"
                >
                  সব সিলেক্ট
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-[10px] transition"
                >
                  বাতিল
                </button>
              </div>
            </div>

            {/* 3. One-Click Center & Layout Presets */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {language === 'bn' ? '৩. সেন্টার ও অ্যালাইনমেন্ট প্রিসেট' : '3. Center & Align Presets'}
              </label>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={handleAlignSideBySideCenter}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-indigo-500 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <AlignCenter className="w-3.5 h-3.5 text-indigo-400" />
                  <span>মাঝখানে পাশাপাশি</span>
                </button>

                <button
                  onClick={handleAlignStackedCenter}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-indigo-500 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <AlignVerticalSpaceAround className="w-3.5 h-3.5 text-indigo-400" />
                  <span>মাঝখানে উপরে-নিচে</span>
                </button>

                <button
                  onClick={handleAlignTopCenter}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-indigo-500 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Move className="w-3.5 h-3.5 text-emerald-400" />
                  <span>উপরে সেন্টার (Top)</span>
                </button>

                <button
                  onClick={() => handleRotateSelected(true)}
                  disabled={selectedIndices.length === 0}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-indigo-500 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>রোটেট ৯০°</span>
                </button>
              </div>
            </div>

            {/* 4. Selected Items Fine Adjustments (Active when items selected) */}
            {firstSelectedItem && selectedIndices.length > 0 && (
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-2.5 shadow-inner">
                <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span>
                      {selectedIndices.length === 1
                        ? firstSelectedItem.name
                        : `${selectedIndices.length}টি কার্ড একসাথে`}
                    </span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleRotateSelected(false)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      title="Rotate 90° CCW"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRotateSelected(true)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      title="Rotate 90° CW"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Scale Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span>সাইজ স্কেল:</span>
                    <span className="font-mono text-indigo-400 font-bold">{Math.round(firstSelectedItem.scale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="2.0"
                    step="0.05"
                    value={firstSelectedItem.scale}
                    onChange={(e) => handleScaleSelected(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Guides Checkboxes */}
            <div className="flex items-center gap-4 px-1 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCutlines}
                  onChange={(e) => setShowCutlines(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span className="text-slate-300 font-bold">কাটার দাগ</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCenterGuides}
                  onChange={(e) => setShowCenterGuides(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span className="text-slate-300 font-bold">সেন্টার লাইন</span>
              </label>
            </div>

            {/* Bottom Print & Export Buttons */}
            <div className="mt-auto flex flex-col gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={handlePrint}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4 stroke-[2.5]" />
                <span>{language === 'bn' ? 'সরাসরি প্রিন্ট দিন (Print Sheet)' : 'Print Sheet Directly'}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleExportPdf}
                  className="py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-xs rounded-xl border border-indigo-500/30 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>শিট PDF</span>
                </button>

                {pages.length > 1 && (
                  <button
                    onClick={handleExportAllPagesPdf}
                    className="py-1.5 bg-gradient-to-r from-indigo-900/60 to-purple-900/60 hover:from-indigo-800 hover:to-purple-800 text-purple-200 font-bold text-xs rounded-xl border border-purple-500/30 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    <span>সব পেজ PDF</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Interactive Sheet Viewport with Deselection on Canvas Click */}
          <div
            onMouseDown={(e) => {
              // Clicking outside deselects
              if (e.target === e.currentTarget) {
                handleDeselectAll();
              }
            }}
            onMouseMove={handleContainerMouseMove}
            onMouseUp={handleContainerMouseUp}
            className="flex-1 bg-slate-950 p-6 flex flex-col items-center justify-center relative overflow-hidden"
          >
            {/* Paper Container */}
            <div
              ref={sheetContainerRef}
              onMouseDown={(e) => {
                // If clicking directly on white paper background, deselect all
                if (e.target === sheetContainerRef.current || (e.target as HTMLElement).tagName === 'CANVAS') {
                  handleDeselectAll();
                }
              }}
              style={{
                aspectRatio: `${pWidthMm} / ${pHeightMm}`,
              }}
              className="relative max-w-[640px] max-h-[64vh] bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden flex items-center justify-center cursor-default"
            >
              {/* Center Guides */}
              {showCenterGuides && (
                <>
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-sky-400/40 pointer-events-none z-10" />
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-dashed border-sky-400/40 pointer-events-none z-10" />
                </>
              )}

              {/* Rendered Canvas Base */}
              <canvas
                ref={previewCanvasRef}
                className="w-full h-full object-contain pointer-events-none"
              />

              {/* Interactive Draggable Overlay Boxes for each placed card (NO text badges) */}
              {placedItems.map((item, idx) => {
                const isSelected = selectedIndices.includes(idx);
                const leftPercent = (item.xMm / pWidthMm) * 100;
                const topPercent = (item.yMm / pHeightMm) * 100;
                const widthPercent = ((item.widthMm * item.scale) / pWidthMm) * 100;
                const heightPercent = ((item.heightMm * item.scale) / pHeightMm) * 100;

                return (
                  <div
                    key={item.pageId || idx}
                    onClick={(e) => handleItemClick(e, idx)}
                    onMouseDown={(e) => handleItemMouseDown(e, idx)}
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                      width: `${widthPercent}%`,
                      height: `${heightPercent}%`,
                      transform: `rotate(${item.rotationDeg}deg)`,
                      transformOrigin: 'center center',
                    }}
                    className={`absolute z-20 cursor-grab active:cursor-grabbing rounded transition-colors group ${
                      isSelected
                        ? 'border-2 border-indigo-500 ring-2 ring-indigo-500/40 bg-indigo-500/10'
                        : 'border border-transparent hover:border-indigo-400/60 bg-transparent'
                    }`}
                  >
                    {/* Move Icon Center on Hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <Move className="w-5 h-5 text-indigo-600 bg-white/90 p-1 rounded-full shadow" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Status Info */}
            <div className="mt-3 text-xs font-mono text-slate-400 flex items-center gap-3">
              <span className="text-white font-bold">{PAPER_DIMENSIONS[paperSize].name}</span>
              <span>•</span>
              <span className="text-indigo-400">{orientation.toUpperCase()}</span>
              <span>•</span>
              <span className="text-slate-300">{pWidthMm} × {pHeightMm} mm</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">100% Interactive Physical Scale</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
