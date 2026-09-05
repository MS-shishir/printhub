/**
 * DocumentPrintSheetModal.tsx
 * Enterprise Multi-Page & Multi-Up Print Sheet Arranger for PrintHub Studio.
 * 
 * Features:
 * 1. Clean paper view with zero-distortion 300 DPI high-res canvas rendering.
 * 2. Multi-selection support (Shift/Ctrl+click or "Select All") - move/drag multiple cards together!
 * 3. Copy / Duplicate selected cards (Ctrl+D) to print multiple copies on one sheet.
 * 4. Delete selected cards (Delete/Backspace) from sheet.
 * 5. 1-Click 4-Card Multi-Up Auto-Fill layout.
 * 6. Solid Cutting Border (1px, 1.5px, 2.5px) for crisp trimming lines.
 * 7. Full Undo (Ctrl+Z) & Redo (Ctrl+Y / Ctrl+Shift+Z) history stack with visual buttons.
 * 8. Customizable Print Copies (1–99 copies) for direct hardware print & PDF.
 * 9. Keyboard arrow key precision nudging (1mm step, 5mm with Shift).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Printer, Download, X, LayoutGrid, FileText, Check, Scissors,
  Sliders, Maximize2, Sparkles, ChevronRight, Layers, Move,
  RotateCw, RotateCcw, AlignCenter, AlignVerticalSpaceAround,
  CheckCircle2, RefreshCw, ZoomIn, ZoomOut, CheckSquare, Square,
  Undo2, Redo2, Plus, Minus, Copy, Trash2
} from 'lucide-react';
import { mmToPx } from '../../passport-studio/utils/mm-to-px';
import { sharedPrintCanvasRef } from '../../passport-studio/utils/shared-canvas-ref';
import { nativeHardwareService, NativePrinter } from '../../services/nativeHardwareService';
import { DocPreset } from '../../services/DocumentScanService';
import { PDFDocument } from 'pdf-lib';

export interface PrintSheetPageItem {
  id: string;
  name: string;
  canvas: HTMLCanvasElement;
  widthMm: number;
  heightMm: number;
  selectedPreset?: DocPreset;
}

export interface PlacedItemState {
  id: string; // Unique ID for each placed card on sheet
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
  const [showCutlines, setShowCutlines] = useState<boolean>(false);
  const [showCenterGuides, setShowCenterGuides] = useState<boolean>(true);
  const [showSolidBorder, setShowSolidBorder] = useState<boolean>(true);
  const [solidBorderWidth, setSolidBorderWidth] = useState<number>(1.5);
  const [printCopies, setPrintCopies] = useState<number>(1);
  const [printers, setPrinters] = useState<NativePrinter[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');

  // Fetch Hardware Printers in Desktop Mode
  useEffect(() => {
    if (nativeHardwareService.isDesktop()) {
      nativeHardwareService.getPrinters().then((list) => {
        setPrinters(list);
        const def = list.find((p) => p.isDefault) || list[0];
        if (def) setSelectedPrinter(def.name);
      });
    }
  }, []);

  // Placed Interactive Items on the Paper
  const [placedItems, setPlacedItems] = useState<PlacedItemState[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([0]);

  // Undo / Redo History Stack
  const historyRef = useRef<PlacedItemState[][]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

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
    hasMoved: boolean;
  }>({
    startX: 0,
    startY: 0,
    initialItems: [],
    paperWidthMm: 210,
    paperHeightMm: 297,
    hasMoved: false,
  });

  const getPaperDimensionsMm = useCallback(() => {
    const spec = PAPER_DIMENSIONS[paperSize] || PAPER_DIMENSIONS.A4;
    const isLand = orientation === 'landscape';
    const widthMm = isLand ? Math.max(spec.widthMm, spec.heightMm) : Math.min(spec.widthMm, spec.heightMm);
    const heightMm = isLand ? Math.min(spec.widthMm, spec.heightMm) : Math.max(spec.widthMm, spec.heightMm);
    return { widthMm, heightMm };
  }, [paperSize, orientation]);

  // Push new state to history stack
  const pushHistory = useCallback((items: PlacedItemState[]) => {
    const curIdx = historyIndexRef.current;
    const newHist = historyRef.current.slice(0, curIdx + 1);
    newHist.push(JSON.parse(JSON.stringify(items)));
    if (newHist.length > 50) newHist.shift();
    historyRef.current = newHist;
    historyIndexRef.current = newHist.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  // Undo Action
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const targetState = JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current]));
      setPlacedItems(targetState);
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    }
  }, []);

  // Redo Action
  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const targetState = JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current]));
      setPlacedItems(targetState);
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    }
  }, []);

  // Initialize Placed Items when modal opens or paper size changes
  const initializePlacedItems = useCallback(() => {
    if (pages.length === 0) {
      setPlacedItems([]);
      return;
    }

    const { widthMm: pW, heightMm: pH } = getPaperDimensionsMm();
    let initial: PlacedItemState[] = [];

    // Helper to calculate exact aspect-ratio preserving dimensions
    const calcDimensions = (pageItem: PrintSheetPageItem, maxAvailableW: number, maxAvailableH: number) => {
      const cv = pageItem.canvas;
      const canvasAspect = (cv && cv.width && cv.height)
        ? (cv.width / cv.height)
        : (pageItem.widthMm && pageItem.heightMm ? pageItem.widthMm / pageItem.heightMm : 210 / 297);

      const isLandscapeCard = canvasAspect > 1.25 && (!pageItem.selectedPreset || pageItem.selectedPreset.widthMm < 140);
      const isCardPreset = pageItem.selectedPreset && (
        pageItem.selectedPreset.id.includes('nid') ||
        pageItem.selectedPreset.id.includes('card') ||
        pageItem.selectedPreset.widthMm < 120
      );

      if (isCardPreset || (isLandscapeCard && pages.length >= 2)) {
        const w = pageItem.selectedPreset?.widthMm || (pageItem.widthMm && pageItem.widthMm < 140 ? pageItem.widthMm : 85.6);
        const h = (pageItem.selectedPreset?.heightMm && pageItem.selectedPreset.heightMm > 0)
          ? pageItem.selectedPreset.heightMm
          : (pageItem.heightMm && pageItem.heightMm < 140 ? pageItem.heightMm : Math.round(w / canvasAspect));
        return { widthMm: Math.round(w), heightMm: Math.round(h) };
      }

      // Full document page (Birth Certificate, Certificate, A4/Legal doc, or portrait scan)
      let w = maxAvailableW;
      let h = Math.round(w / canvasAspect);
      if (h > maxAvailableH) {
        h = maxAvailableH;
        w = Math.round(h * canvasAspect);
      }
      return { widthMm: Math.round(w), heightMm: Math.round(h) };
    };

    if (pages.length === 1) {
      const p = pages[0];
      const { widthMm: wMm, heightMm: hMm } = calcDimensions(p, pW - 20, pH - 24);

      initial = [
        {
          id: `placed_0_${Date.now()}`,
          pageId: p.id,
          name: p.name || 'Document 1',
          xMm: Math.max(5, Math.round((pW - wMm) / 2)),
          yMm: Math.max(8, Math.round((pH - hMm) / 2)),
          widthMm: wMm,
          heightMm: hMm,
          rotationDeg: 0,
          scale: 1.0,
        }
      ];
      setSelectedIndices([0]);
    } else if (pages.length >= 2) {
      const p1 = pages[0];
      const p2 = pages[1];

      const cv1 = p1.canvas;
      const isCard = (p1.selectedPreset && p1.selectedPreset.widthMm < 140) ||
        (cv1 && cv1.width && cv1.height && (cv1.width / cv1.height) > 1.25);

      const maxW = isCard ? 105 : Math.round((pW - 30) / 2);
      const maxH = isCard ? 75 : Math.round(pH - 30);

      const { widthMm: w1, heightMm: h1 } = calcDimensions(p1, maxW, maxH);
      const { widthMm: w2, heightMm: h2 } = calcDimensions(p2, maxW, maxH);

      const gapMm = 8;
      const totalW = w1 + w2 + gapMm;

      const startX = Math.max(10, Math.round((pW - totalW) / 2));
      const startY = Math.max(15, Math.round((pH - Math.max(h1, h2)) / 2));

      initial = [
        {
          id: `placed_0_${Date.now()}`,
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
          id: `placed_1_${Date.now() + 1}`,
          pageId: p2.id,
          name: p2.name || 'Back',
          xMm: startX + w1 + gapMm,
          yMm: startY,
          widthMm: w2,
          heightMm: h2,
          rotationDeg: 0,
          scale: 1.0,
        }
      ];
      setSelectedIndices([0, 1]);
    }

    setPlacedItems(initial);
    historyRef.current = [JSON.parse(JSON.stringify(initial))];
    historyIndexRef.current = 0;
    setCanUndo(false);
    setCanRedo(false);
  }, [pages, getPaperDimensionsMm]);

  // Initial load when modal opens
  useEffect(() => {
    if (isOpen) {
      initializePlacedItems();
    }
  }, [isOpen, paperSize, orientation]);

  // Selection Toggles
  const handleItemClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
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

    const next: PlacedItemState[] = [
      { ...placedItems[0], xMm: startX, yMm: startY },
      { ...placedItems[1], xMm: startX + Math.round(w1) + gapMm, yMm: startY },
      ...placedItems.slice(2),
    ];
    setPlacedItems(next);
    pushHistory(next);
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

    const next: PlacedItemState[] = [
      { ...placedItems[0], xMm: startX1, yMm: startY },
      { ...placedItems[1], xMm: startX2, yMm: startY + Math.round(h1) + gapMm },
      ...placedItems.slice(2),
    ];
    setPlacedItems(next);
    pushHistory(next);
  };

  const handleAlignTopCenter = () => {
    const { widthMm: pW } = getPaperDimensionsMm();
    const gapMm = 8;
    let next: PlacedItemState[] = [];

    if (placedItems.length === 1) {
      const w = placedItems[0].widthMm * placedItems[0].scale;
      next = [{ ...placedItems[0], xMm: Math.round((pW - w) / 2), yMm: 15 }];
    } else if (placedItems.length >= 2) {
      const w1 = placedItems[0].widthMm * placedItems[0].scale;
      const w2 = placedItems[1].widthMm * placedItems[1].scale;
      const totalW = w1 + w2 + gapMm;
      const startX = Math.round((pW - totalW) / 2);
      next = [
        { ...placedItems[0], xMm: startX, yMm: 15 },
        { ...placedItems[1], xMm: startX + Math.round(w1) + gapMm, yMm: 15 },
        ...placedItems.slice(2),
      ];
    }
    if (next.length > 0) {
      setPlacedItems(next);
      pushHistory(next);
    }
  };

  // ⧉ Duplicate / Copy Selected Card(s)
  const handleDuplicateSelected = useCallback(() => {
    if (placedItems.length === 0) return;
    const { widthMm: pW, heightMm: pH } = getPaperDimensionsMm();
    const indicesToClone = selectedIndices.length > 0 ? selectedIndices : [0];

    const newClones: PlacedItemState[] = [];
    const newIndices: number[] = [];

    indicesToClone.forEach((idx) => {
      const orig = placedItems[idx];
      if (!orig) return;

      const cardH = orig.heightMm * orig.scale;
      const cardW = orig.widthMm * orig.scale;
      let newX = orig.xMm;
      let newY = orig.yMm + cardH + 8;

      if (newY + cardH > pH - 5) {
        newY = Math.max(5, (orig.yMm + 12) % Math.max(10, pH - cardH - 5));
        newX = Math.min(pW - cardW - 5, orig.xMm + 12);
      }

      const clone: PlacedItemState = {
        ...orig,
        id: `placed_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        xMm: Math.round(newX),
        yMm: Math.round(newY),
      };

      newClones.push(clone);
    });

    const nextItems = [...placedItems, ...newClones];
    for (let i = placedItems.length; i < nextItems.length; i++) {
      newIndices.push(i);
    }

    setPlacedItems(nextItems);
    setSelectedIndices(newIndices);
    pushHistory(nextItems);
  }, [placedItems, selectedIndices, getPaperDimensionsMm, pushHistory]);

  // 🗑️ Delete Selected Card(s)
  const handleDeleteSelected = useCallback(() => {
    if (placedItems.length === 0 || selectedIndices.length === 0) return;

    const nextItems = placedItems.filter((_, idx) => !selectedIndices.includes(idx));
    setPlacedItems(nextItems);

    if (nextItems.length === 0) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices([Math.min(selectedIndices[0] || 0, nextItems.length - 1)]);
    }

    pushHistory(nextItems);
  }, [placedItems, selectedIndices, pushHistory]);

  // ⊞ Auto Fill 4-Up (4 Copies Grid Layout)
  const handleAutoFill4Up = useCallback(() => {
    if (placedItems.length === 0) return;
    const { widthMm: pW, heightMm: pH } = getPaperDimensionsMm();

    const baseP1 = placedItems[0];
    const baseP2 = placedItems[1] || placedItems[0];

    const w1 = baseP1.widthMm * baseP1.scale;
    const h1 = baseP1.heightMm * baseP1.scale;
    const w2 = baseP2.widthMm * baseP2.scale;
    const h2 = baseP2.heightMm * baseP2.scale;

    const gapX = 8;
    const gapY = 12;
    const totalW = w1 + w2 + gapX;
    const startX = Math.max(8, Math.round((pW - totalW) / 2));
    const startY1 = Math.max(12, Math.round((pH - (h1 * 2 + gapY)) / 2));
    const startY2 = startY1 + Math.round(h1) + gapY;

    const next: PlacedItemState[] = [
      // Row 1 (Top)
      {
        ...baseP1,
        id: `placed_r1_1_${Date.now()}`,
        xMm: startX,
        yMm: startY1,
      },
      {
        ...baseP2,
        id: `placed_r1_2_${Date.now() + 1}`,
        xMm: startX + Math.round(w1) + gapX,
        yMm: startY1,
      },
      // Row 2 (Bottom)
      {
        ...baseP1,
        id: `placed_r2_1_${Date.now() + 2}`,
        xMm: startX,
        yMm: startY2,
      },
      {
        ...baseP2,
        id: `placed_r2_2_${Date.now() + 3}`,
        xMm: startX + Math.round(w1) + gapX,
        yMm: startY2,
      },
    ];

    setPlacedItems(next);
    setSelectedIndices([0, 1, 2, 3]);
    pushHistory(next);
  }, [placedItems, getPaperDimensionsMm, pushHistory]);

  const handleRotateSelected = (cw = true) => {
    if (selectedIndices.length === 0) return;
    const next = [...placedItems];
    selectedIndices.forEach(idx => {
      if (next[idx]) {
        const cur = next[idx].rotationDeg;
        next[idx] = {
          ...next[idx],
          rotationDeg: cw ? (cur + 90) % 360 : (cur + 270) % 360,
        };
      }
    });
    setPlacedItems(next);
    pushHistory(next);
  };

  const handleScaleSelected = (scaleVal: number) => {
    if (selectedIndices.length === 0) return;
    const next = [...placedItems];
    selectedIndices.forEach(idx => {
      if (next[idx]) {
        next[idx] = { ...next[idx], scale: scaleVal };
      }
    });
    setPlacedItems(next);
    pushHistory(next);
  };

  // Generate 300 DPI High-Resolution Sheet Canvas
  const generateSheetCanvas = useCallback((): HTMLCanvasElement | null => {
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
      if (!page || !page.canvas) return;

      const itemX = Math.round(mmToPx(item.xMm, dpi));
      const itemY = Math.round(mmToPx(item.yMm, dpi));
      const itemW = Math.round(mmToPx(item.widthMm * item.scale, dpi));
      const itemH = Math.round(mmToPx(item.heightMm * item.scale, dpi));

      ctx.save();
      ctx.translate(itemX + itemW / 2, itemY + itemH / 2);
      ctx.rotate((item.rotationDeg * Math.PI) / 180);

      // Draw document canvas
      ctx.drawImage(page.canvas, -itemW / 2, -itemH / 2, itemW, itemH);

      // Solid Cutting Border Option
      if (showSolidBorder) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(1, Math.round(solidBorderWidth * (dpi / 96)));
        ctx.setLineDash([]);
        ctx.strokeRect(-itemW / 2, -itemH / 2, itemW, itemH);
      } else {
        // Light subtle border
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-itemW / 2, -itemH / 2, itemW, itemH);
      }

      // Cut guides
      if (showCutlines) {
        ctx.strokeStyle = '#94A3B8';
        ctx.setLineDash([8, 8]);
        ctx.lineWidth = 2.0;
        ctx.strokeRect(-itemW / 2 - 3, -itemH / 2 - 3, itemW + 6, itemH + 6);
        ctx.setLineDash([]);
      }

      ctx.restore();
    });

    return sheetCanvas;
  }, [pages, placedItems, getPaperDimensionsMm, showSolidBorder, solidBorderWidth, showCutlines]);

  // Render to Preview Canvas & Sync to Shared Print Engine
  useEffect(() => {
    if (!isOpen) return;
    const sheet = generateSheetCanvas();
    if (!sheet) return;

    // Sync composed sheet canvas to shared global print spooler
    sharedPrintCanvasRef.current = sheet;

    if (previewCanvasRef.current) {
      const pCanvas = previewCanvasRef.current;
      pCanvas.width = sheet.width;
      pCanvas.height = sheet.height;
      const pCtx = pCanvas.getContext('2d');
      if (pCtx) {
        pCtx.drawImage(sheet, 0, 0);
      }
    }
  }, [isOpen, paperSize, orientation, showCutlines, showSolidBorder, solidBorderWidth, placedItems, pages, generateSheetCanvas]);

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
      hasMoved: false,
    };
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !sheetContainerRef.current) return;

    const rect = sheetContainerRef.current.getBoundingClientRect();
    const { startX, startY, initialItems, paperWidthMm, paperHeightMm } = dragStartRef.current;

    const dxPx = e.clientX - startX;
    const dyPx = e.clientY - startY;

    if (Math.abs(dxPx) > 1 || Math.abs(dyPx) > 1) {
      dragStartRef.current.hasMoved = true;
    }

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
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      if (dragStartRef.current.hasMoved) {
        pushHistory(placedItems);
      }
    }
  };

  // Actions: Print & Export
  const handlePrint = useCallback(() => {
    const sheet = generateSheetCanvas();
    if (!sheet) return;
    const dataUrl = sheet.toDataURL('image/png', 1.0);

    window.dispatchEvent(
      new CustomEvent('printhub:open-custom-print', {
        detail: {
          source: dataUrl,
          paperSize: paperSize,
          orientation: orientation,
          copies: printCopies,
          title: `Document_PrintSheet_${paperSize}`,
        },
      })
    );
  }, [generateSheetCanvas, paperSize, orientation, printCopies]);

  const handleExportPdf = async () => {
    const sheet = generateSheetCanvas();
    if (!sheet) return;

    const pdfDoc = await PDFDocument.create();
    const dataUrl = sheet.toDataURL('image/jpeg', 0.98);
    const base64 = dataUrl.split(',')[1];
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const image = await pdfDoc.embedJpg(bytes);

    const copies = Math.max(1, Math.min(99, printCopies || 1));
    for (let i = 0; i < copies; i++) {
      const pdfPage = pdfDoc.addPage([image.width, image.height]);
      pdfPage.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Print_Sheet_${paperSize}_${copies}Copies.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAllPagesPdf = async () => {
    if (pages.length === 0) return;

    const pdfDoc = await PDFDocument.create();
    for (const pageItem of pages) {
      if (!pageItem.canvas) continue;
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

  // Keyboard Shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Duplicate / Clone: Ctrl+D
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
        return;
      }

      // Delete: Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIndices.length > 0) {
          e.preventDefault();
          handleDeleteSelected();
          return;
        }
      }

      // Print: Ctrl+P
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
        return;
      }

      // Select All: Ctrl+A
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSelectAll();
        return;
      }

      // Deselect / Close: Escape
      if (e.key === 'Escape') {
        if (selectedIndices.length > 0) {
          e.preventDefault();
          handleDeselectAll();
        }
        return;
      }

      // Arrow Keys Nudging
      const { widthMm: pW, heightMm: pH } = getPaperDimensionsMm();
      const step = e.shiftKey ? 5 : 1;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        if (selectedIndices.length === 0) return;

        setPlacedItems(prev => {
          const next = [...prev];
          selectedIndices.forEach(idx => {
            if (next[idx]) {
              if (e.key === 'ArrowUp') {
                next[idx] = { ...next[idx], yMm: Math.max(0, next[idx].yMm - step) };
              } else if (e.key === 'ArrowDown') {
                next[idx] = { ...next[idx], yMm: Math.min(pH - 5, next[idx].yMm + step) };
              } else if (e.key === 'ArrowLeft') {
                next[idx] = { ...next[idx], xMm: Math.max(0, next[idx].xMm - step) };
              } else if (e.key === 'ArrowRight') {
                next[idx] = { ...next[idx], xMm: Math.min(pW - 5, next[idx].xMm + step) };
              }
            }
          });
          pushHistory(next);
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndices, paperSize, orientation, placedItems, handleUndo, handleRedo, handleDuplicateSelected, handleDeleteSelected, handlePrint, getPaperDimensionsMm, pushHistory]);

  if (!isOpen) return null;

  const { widthMm: pWidthMm, heightMm: pHeightMm } = getPaperDimensionsMm();
  const firstSelectedItem = placedItems[selectedIndices[0]] || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header with Undo / Redo Controls */}
        <div className="px-6 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
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
                {language === 'bn' ? 'মাউস দিয়ে ধরে কার্ড সরান, কপি/ডিলিট করুন এবং কীবোর্ড অ্যারো দিয়ে পজিশন সেট করুন' : 'Drag items, duplicate/delete cards, and print with exact physical scale'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Undo Button */}
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className={`p-2 rounded-xl border transition flex items-center gap-1.5 text-xs font-bold ${
                canUndo
                  ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white cursor-pointer'
                  : 'bg-slate-900/50 text-slate-600 border-slate-800/50 cursor-not-allowed'
              }`}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
              <span className="hidden sm:inline">Undo</span>
            </button>

            {/* Redo Button */}
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className={`p-2 rounded-xl border transition flex items-center gap-1.5 text-xs font-bold ${
                canRedo
                  ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white cursor-pointer'
                  : 'bg-slate-900/50 text-slate-600 border-slate-800/50 cursor-not-allowed'
              }`}
              title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
            >
              <Redo2 className="w-4 h-4" />
              <span className="hidden sm:inline">Redo</span>
            </button>

            <div className="h-5 w-px bg-slate-800 mx-1" />

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Controls & Alignment Panel */}
          <div className="w-88 border-r border-slate-800 p-4 flex flex-col gap-3.5 overflow-y-auto bg-slate-950/60 custom-scrollbar">
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
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold transition cursor-pointer"
                >
                  সব সিলেক্ট
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-[10px] transition cursor-pointer"
                >
                  বাতিল
                </button>
              </div>
            </div>

            {/* 3. One-Click Center & Multi-Up Presets */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {language === 'bn' ? '৩. সেন্টার ও লেআউট প্রিসেট' : '3. Layout & Multi-Up'}
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
                  onClick={handleAutoFill4Up}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-300 border border-slate-800 hover:border-teal-500 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  title="Auto 4-Card Multi-Up on A4"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-teal-400" />
                  <span>⊞ ৪-কপি অটো সাজান</span>
                </button>
              </div>
            </div>

            {/* 4. Selected Card Actions: Copy, Delete, Scale, Rotate */}
            {firstSelectedItem && selectedIndices.length > 0 && (
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-2.5 shadow-inner">
                <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span>
                      {selectedIndices.length === 1
                        ? firstSelectedItem.name
                        : `${selectedIndices.length}টি কার্ড সিলেক্টেড`}
                    </span>
                  </span>
                  
                  {/* Rotation buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleRotateSelected(false)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                      title="Rotate 90° CCW"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRotateSelected(true)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                      title="Rotate 90° CW"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* COPY & DELETE BUTTONS */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={handleDuplicateSelected}
                    className="py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-950/60 transition active:scale-95 cursor-pointer"
                    title="Duplicate selected cards on sheet (Ctrl+D)"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>কপি / ডুপ্লিকেট</span>
                  </button>

                  <button
                    onClick={handleDeleteSelected}
                    className="py-1.5 px-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                    title="Delete selected cards from sheet (Delete / Backspace)"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span>ডিলিট (Delete)</span>
                  </button>
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

            {/* 5. Solid Border & Cutline Options */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-2.5 shadow-inner">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {language === 'bn' ? '৫. বর্ডার ও কাটার দাগ (Border & Guides)' : '5. Border & Guides'}
              </label>

              {/* Solid Border Checkbox + Width Selector */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={showSolidBorder}
                    onChange={(e) => setShowSolidBorder(e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span className="text-slate-200 font-bold">সলিড বর্ডার (Solid Border)</span>
                </label>

                {showSolidBorder && (
                  <div className="flex items-center gap-1">
                    {[1, 1.5, 2.5].map((w) => (
                      <button
                        key={w}
                        onClick={() => setSolidBorderWidth(w)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition cursor-pointer ${
                          solidBorderWidth === w
                            ? 'bg-indigo-600 text-white border-indigo-400'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {w}px
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Cutlines & Center Guides */}
              <div className="flex items-center gap-4 text-xs pt-1 border-t border-slate-800/80">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCutlines}
                    onChange={(e) => setShowCutlines(e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span className="text-slate-400 font-medium">কাটার দাগ (Dotted)</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCenterGuides}
                    onChange={(e) => setShowCenterGuides(e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span className="text-slate-400 font-medium">সেন্টার লাইন</span>
                </label>
              </div>
            </div>

            {/* Hardware Printer Selector (Desktop Mode) */}
            {printers.length > 0 && (
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-2 shadow-inner">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{language === 'bn' ? 'প্রিন্টার নির্বাচন (Select Printer)' : 'Target Printer'}</span>
                </label>
                <select
                  value={selectedPrinter}
                  onChange={(e) => setSelectedPrinter(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {printers.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.displayName || p.name} {p.isDefault ? '★ (Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 6. Print Copies & Count System */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-2.5 shadow-inner">
              <div className="flex items-center justify-between text-xs">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Copy className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{language === 'bn' ? '৬. প্রিন্ট কপি সংখ্যা (Copies Count)' : '6. Print Copies Count'}</span>
                </label>
                <span className="text-[11px] font-mono font-extrabold text-indigo-400">
                  {printCopies} {language === 'bn' ? 'কপি' : 'Copies'}
                </span>
              </div>

              {/* Stepper Input */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPrintCopies(prev => Math.max(1, prev - 1))}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center border border-slate-700 transition active:scale-90 cursor-pointer"
                  title="Decrease copies"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <input
                  type="number"
                  min={1}
                  max={99}
                  value={printCopies}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setPrintCopies(isNaN(val) ? 1 : Math.max(1, Math.min(99, val)));
                  }}
                  className="flex-1 py-1 px-2 text-center bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                />

                <button
                  type="button"
                  onClick={() => setPrintCopies(prev => Math.min(99, prev + 1))}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center border border-slate-700 transition active:scale-90 cursor-pointer"
                  title="Increase copies"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Preset Badges */}
              <div className="grid grid-cols-5 gap-1 pt-0.5">
                {[1, 2, 4, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPrintCopies(num)}
                    className={`py-1 rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer ${
                      printCopies === num
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {num} কপি
                  </button>
                ))}
              </div>
            </div>

            {/* Keyboard Arrow Navigation & Shortcuts Tip */}
            <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-slate-300 flex items-start gap-2">
              <span className="text-base leading-none">⌨️</span>
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-indigo-300">
                  {language === 'bn' ? 'শর্টকাট গাইড (Shortcuts):' : 'Keyboard Shortcuts:'}
                </span>
                <span className="text-[10px] text-slate-400 leading-tight">
                  {language === 'bn'
                    ? '• Ctrl+D: কপি/ডুপ্লিকেট | Del/Backspace: ডিলিট\n• Ctrl+Z: Undo | Ctrl+Y: Redo\n• Arrow Keys: ১ মিমি (Shift: ৫ মিমি) | Ctrl+P: প্রিন্ট'
                    : '• Ctrl+D: Duplicate | Del: Delete Card\n• Ctrl+Z: Undo | Ctrl+Y: Redo\n• Arrow Keys: 1mm (Shift: 5mm) | Ctrl+P: Print'}
                </span>
              </div>
            </div>

            {/* Bottom Print & Export Buttons */}
            <div className="mt-auto flex flex-col gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={handlePrint}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {language === 'bn'
                    ? `সরাসরি প্রিন্ট দিন (${printCopies}টি কপি)`
                    : `Print Sheet (${printCopies} ${printCopies > 1 ? 'Copies' : 'Copy'})`}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleExportPdf}
                  className="py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-xs rounded-xl border border-indigo-500/30 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? `শিট PDF (${printCopies} পেজ)` : `Sheet PDF (${printCopies}p)`}</span>
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
                    key={item.id || idx}
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
              <span>•</span>
              <span className="text-purple-400 font-bold">{printCopies} {printCopies > 1 ? 'Copies' : 'Copy'}</span>
              <span>•</span>
              <span className="text-slate-400 font-bold">{placedItems.length} Cards on Sheet</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
