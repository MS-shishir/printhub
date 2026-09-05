import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { RotateCw, Copy, Trash2, Move, ZoomIn, ZoomOut, Undo2, Redo2 } from 'lucide-react';
import { usePassportStore } from '../store';
import { getTemplate } from '../services/template.service';
import { calculateLayout } from '../services/layout.service';
import { sharedPrintCanvasRef } from '../utils/shared-canvas-ref';
import { sharedLayoutState } from '../utils/shared-layout-state';

const BASE_MAX_W = 680;
const BASE_MAX_H = 700;
const ZOOM_STEP = 0.15;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2.0;

interface PlacedPhotoItem {
  id: string;
  url: string;
  name: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  rotateDegrees: number;
  trayItemId?: string;
}

export default function PrintPreview() {
  const { state } = usePassportStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const template = getTemplate(state.selectedTemplateId, state.customWidth, state.customHeight);
  const { layoutConfig, processedTray } = state;

  const paperW = layoutConfig.paperSize.id === 'custom' ? layoutConfig.customWidthMm : layoutConfig.paperSize.widthMm;
  const paperH = layoutConfig.paperSize.id === 'custom' ? layoutConfig.customHeightMm : layoutConfig.paperSize.heightMm;

  // ── Zoom State ──────────────────────────────────────────────────────────────
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const baseScale = Math.min(BASE_MAX_W / paperW, BASE_MAX_H / paperH);
  const scale = baseScale * zoomLevel;

  const zoomIn  = () => setZoomLevel(z => Math.min(ZOOM_MAX, parseFloat((z + ZOOM_STEP).toFixed(2))));
  const zoomOut = () => setZoomLevel(z => Math.max(ZOOM_MIN, parseFloat((z - ZOOM_STEP).toFixed(2))));
  const zoomReset = () => setZoomLevel(1.0);

  // ── Placed Items State + Local Undo/Redo History ────────────────────────────
  const [placedItems, setPlacedItemsRaw] = useState<PlacedPhotoItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // History stack for local undo/redo
  const undoStackRef = useRef<PlacedPhotoItem[][]>([]);
  const redoStackRef = useRef<PlacedPhotoItem[][]>([]);

  /** Commit a change: push current items to undo stack, update state */
  const commitChange = useCallback((newItems: PlacedPhotoItem[]) => {
    undoStackRef.current = [...undoStackRef.current.slice(-29), placedItemsRef.current];
    redoStackRef.current = [];
    setPlacedItemsRaw(newItems);
  }, []);

  const localUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current[undoStackRef.current.length - 1];
    redoStackRef.current = [...redoStackRef.current, placedItemsRef.current];
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    setPlacedItemsRaw(prev);
  }, []);

  const localRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current[redoStackRef.current.length - 1];
    undoStackRef.current = [...undoStackRef.current, placedItemsRef.current];
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    setPlacedItemsRaw(next);
  }, []);

  const canUndo = undoStackRef.current.length > 0;
  const canRedo = redoStackRef.current.length > 0;

  // ── Drag Refs (no setState during drag) ─────────────────────────────────────
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; itemX: number; itemY: number }>({ mouseX: 0, mouseY: 0, itemX: 0, itemY: 0 });
  const dragPreSnapshotRef = useRef<PlacedPhotoItem[]>([]); // snapshot before drag starts for undo
  const selectedIndexRef = useRef<number | null>(null);
  const placedItemsRef = useRef<PlacedPhotoItem[]>([]);
  const rafRef = useRef<number | null>(null);

  // Keep refs in sync
  useEffect(() => { placedItemsRef.current = placedItems; }, [placedItems]);
  useEffect(() => { selectedIndexRef.current = selectedIndex; }, [selectedIndex]);

  // Expose canvas for WYSIWYG printing
  useEffect(() => {
    sharedPrintCanvasRef.current = canvasRef.current;
    return () => { sharedPrintCanvasRef.current = null; };
  }, []);

  // Sync placed items + paper dims to shared state for high-DPI print/export
  useEffect(() => {
    sharedLayoutState.items = placedItems;
    sharedLayoutState.paperWMm = paperW;
    sharedLayoutState.paperHMm = paperH;
  }, [placedItems, paperW, paperH]);

  // ── Image Cache ──────────────────────────────────────────────────────────────
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const getOrLoadImage = useCallback((url: string): HTMLImageElement | null => {
    if (imageCacheRef.current.has(url)) return imageCacheRef.current.get(url)!;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { imageCacheRef.current.set(url, img); drawNow(); };
    img.src = url;
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Synchronous Canvas Draw ─────────────────────────────────────────────────
  const drawNow = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const items = placedItemsRef.current;
    const selIdx = selectedIndexRef.current;
    const displayW = Math.round(paperW * scale);
    const displayH = Math.round(paperH * scale);

    if (canvas.width !== displayW || canvas.height !== displayH) {
      canvas.width = displayW;
      canvas.height = displayH;
    }

    ctx.clearRect(0, 0, displayW, displayH);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, displayW, displayH);
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, displayW, displayH);

    // ── Roller Safe Guides (Printer non-printable gripper margin) ───────────
    if (layoutConfig.showRollerGuide) {
      const topSafeMm = layoutConfig.marginTopMm ?? layoutConfig.marginMm ?? 3;
      const botSafeMm = layoutConfig.rollerSafeMarginMm ?? 8;
      const topSafePx = topSafeMm * scale;
      const botSafePx = displayH - (botSafeMm * scale);

      ctx.save();
      // Top Roller Guide
      if (topSafeMm > 0) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.04)';
        ctx.fillRect(0, 0, displayW, topSafePx);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.lineWidth = 0.8;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, topSafePx);
        ctx.lineTo(displayW, topSafePx);
        ctx.stroke();

        ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.font = `bold ${Math.max(8, Math.round(scale * 2.6))}px sans-serif`;
        ctx.fillText(`▲ Top Feed Safe (${topSafeMm}mm)`, 8, Math.max(9, topSafePx - 3));
      }

      // Bottom Roller Gripper Guide
      if (botSafeMm > 0) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.06)';
        ctx.fillRect(0, botSafePx, displayW, displayH - botSafePx);
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, botSafePx);
        ctx.lineTo(displayW, botSafePx);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
        ctx.font = `bold ${Math.max(8, Math.round(scale * 2.6))}px sans-serif`;
        ctx.fillText(`▼ Roller Gripper Safe Zone (${botSafeMm}mm)`, 8, Math.min(displayH - 4, botSafePx + 10));
      }
      ctx.restore();
    }

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const isSelected = selIdx === idx;
      const x = item.xMm * scale;
      const y = item.yMm * scale;
      const w = item.widthMm * scale;
      const h = item.heightMm * scale;

      // 1. Draw Image (Full 100% exact size, never shrunk)
      const imgEl = getOrLoadImage(item.url);
      if (imgEl) {
        if (item.rotateDegrees === 90) {
          ctx.save();
          ctx.translate(x + w / 2, y + h / 2);
          ctx.rotate((90 * Math.PI) / 180);
          ctx.drawImage(imgEl, -h / 2, -w / 2, h, w);
          ctx.restore();
        } else {
          ctx.drawImage(imgEl, x, y, w, h);
        }
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x, y, w, h);
      }

      // 2. Dashed Cut Lines (ডট ডট কাটলাইন) with adjustable offset and corner extensions
      if (layoutConfig.showCutlines) {
        const offsetMm = layoutConfig.cutlineOffsetMm ?? 0;
        const offsetPx = offsetMm * scale;
        const extMm = layoutConfig.cutlineExtensionMm ?? 0;
        const extPx = extMm * scale;

        const cutX = x - offsetPx;
        const cutY = y - offsetPx;
        const cutW = w + 2 * offsetPx;
        const cutH = h + 2 * offsetPx;

        ctx.save();
        ctx.strokeStyle = layoutConfig.cutlineColor || 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 0.65;
        ctx.setLineDash([2.5, 2.5]); // Classic dot/dash cut line
        ctx.strokeRect(cutX, cutY, cutW, cutH);

        // Corner Crosshair Extensions (if extension > 0)
        if (extPx > 0) {
          ctx.beginPath();
          // Top-Left Corner
          ctx.moveTo(cutX - extPx, cutY); ctx.lineTo(cutX, cutY);
          ctx.moveTo(cutX, cutY - extPx); ctx.lineTo(cutX, cutY);
          // Top-Right Corner
          ctx.moveTo(cutX + cutW, cutY); ctx.lineTo(cutX + cutW + extPx, cutY);
          ctx.moveTo(cutX + cutW, cutY - extPx); ctx.lineTo(cutX + cutW, cutY);
          // Bottom-Left Corner
          ctx.moveTo(cutX - extPx, cutY + cutH); ctx.lineTo(cutX, cutY + cutH);
          ctx.moveTo(cutX, cutY + cutH); ctx.lineTo(cutX, cutY + cutH + extPx);
          // Bottom-Right Corner
          ctx.moveTo(cutX + cutW, cutY + cutH); ctx.lineTo(cutX + cutW + extPx, cutY + cutH);
          ctx.moveTo(cutX + cutW, cutY + cutH); ctx.lineTo(cutX + cutW, cutY + cutH + extPx);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.restore();
      }

      // Subtle selection glow
      if (isSelected) {
        ctx.save();
        ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
      }
    }

    // Optional Header Text (Only if explicitly enabled)
    if (layoutConfig.showPrintHeader) {
      ctx.fillStyle = 'rgba(100,116,139,0.6)';
      ctx.font = `bold ${Math.max(6, scale * 3)}px sans-serif`;
      ctx.fillText(
        `PrintHub Studio · ${template.flag} ${template.name} · ${items.length} copies`,
        layoutConfig.marginMm * scale,
        Math.max(8, layoutConfig.marginMm * scale * 0.55)
      );
    }
  }, [paperW, paperH, scale, layoutConfig, template, getOrLoadImage]);

  useEffect(() => { drawNow(); }, [placedItems, selectedIndex, drawNow]);

  // ── Auto-layout: rebuild when tray/config/zoom changes ──────────────────────
  useEffect(() => {
    const isRotatedGlobal = layoutConfig.rotatePhotoDegrees === 90;
    const batchList: PlacedPhotoItem[] = [];

    const marginMm = layoutConfig.marginMm ?? 3;
    const topMarginMm = layoutConfig.marginTopMm ?? marginMm;
    const botMarginMm = Math.max(layoutConfig.marginBottomMm ?? marginMm, layoutConfig.rollerSafeMarginMm ?? 0);
    const leftMarginMm = layoutConfig.marginLeftMm ?? marginMm;
    const rightMarginMm = layoutConfig.marginRightMm ?? marginMm;
    const gapMm = layoutConfig.gapMm || 3;

    if (processedTray.length > 0) {
      let currentXMm = leftMarginMm;
      let currentYMm = topMarginMm;
      let rowMaxHMm = 0;
      let idCounter = 0;

      for (const item of processedTray) {
        for (let i = 0; i < item.copies; i++) {
          idCounter++;
          const isRotated = item.rotateDegrees === 90 || isRotatedGlobal;
          const pW = isRotated ? (item.heightMm || 45) : (item.widthMm || 35);
          const pH = isRotated ? (item.widthMm || 35) : (item.heightMm || 45);
          if (currentXMm + pW > paperW - rightMarginMm) {
            currentXMm = leftMarginMm;
            currentYMm += rowMaxHMm + gapMm;
            rowMaxHMm = 0;
          }
          if (currentYMm + pH > paperH - botMarginMm) break;
          rowMaxHMm = Math.max(rowMaxHMm, pH);
          batchList.push({
            id: `item_${idCounter}_${item.id}`,
            url: item.croppedUrl,
            name: item.name,
            xMm: currentXMm,
            yMm: currentYMm,
            widthMm: pW,
            heightMm: pH,
            rotateDegrees: isRotated ? 90 : 0,
            trayItemId: item.id,
          });
          currentXMm += pW + gapMm;
        }
      }
    } else {
      const layout = calculateLayout(template, layoutConfig);
      const img = state.croppedImage || state.processedImage || state.originalImage;
      if (img) {
        layout.placed.forEach((place, idx) => {
          batchList.push({
            id: `single_${idx}`,
            url: img,
            name: state.photoName || 'Photo',
            xMm: place.xMm,
            yMm: place.yMm,
            widthMm: place.widthMm,
            heightMm: place.heightMm,
            rotateDegrees: isRotatedGlobal ? 90 : 0,
          });
        });
      }
    }

    setPlacedItemsRaw(batchList);
    setSelectedIndex(null);
    undoStackRef.current = [];
    redoStackRef.current = [];
  }, [processedTray, layoutConfig, template, paperW, paperH, state.croppedImage, state.processedImage, state.originalImage, state.photoName]);

  // ── Mouse Drag ───────────────────────────────────────────────────────────────
  const handleMouseDownCanvas = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const mouseXMm = mouseX / scale;
    const mouseYMm = mouseY / scale;

    const items = placedItemsRef.current;
    let foundIdx = -1;
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (mouseXMm >= item.xMm && mouseXMm <= item.xMm + item.widthMm &&
          mouseYMm >= item.yMm && mouseYMm <= item.yMm + item.heightMm) {
        foundIdx = i; break;
      }
    }

    if (foundIdx !== -1) {
      setSelectedIndex(foundIdx);
      selectedIndexRef.current = foundIdx;
      isDraggingRef.current = true;
      dragPreSnapshotRef.current = [...items]; // save snapshot for undo
      const item = items[foundIdx];
      dragStartRef.current = { mouseX, mouseY, itemX: item.xMm, itemY: item.yMm };
    } else {
      setSelectedIndex(null);
      selectedIndexRef.current = null;
    }
  }, [scale]);

  const handleMouseMoveCanvas = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || selectedIndexRef.current === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const idx = selectedIndexRef.current;
    const dxMm = (mouseX - dragStartRef.current.mouseX) / scale;
    const dyMm = (mouseY - dragStartRef.current.mouseY) / scale;
    const items = placedItemsRef.current;
    const item = items[idx];
    const newXMm = Math.max(0, Math.min(paperW - item.widthMm, dragStartRef.current.itemX + dxMm));
    const newYMm = Math.max(0, Math.min(paperH - item.heightMm, dragStartRef.current.itemY + dyMm));
    placedItemsRef.current = items.map((it, i) => i === idx ? { ...it, xMm: newXMm, yMm: newYMm } : it);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(drawNow);
  }, [scale, paperW, paperH, drawNow]);

  const handleMouseUpCanvas = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    // Push pre-drag snapshot to undo stack and commit final positions
    undoStackRef.current = [...undoStackRef.current.slice(-29), dragPreSnapshotRef.current];
    redoStackRef.current = [];
    setPlacedItemsRaw([...placedItemsRef.current]);
  }, []);

  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // ── Actions (with undo support) ──────────────────────────────────────────────
  const handleRotateSelected = useCallback(() => {
    if (selectedIndex === null) return;
    commitChange(
      placedItemsRef.current.map((item, i) => {
        if (i !== selectedIndex) return item;
        const newRot = item.rotateDegrees === 90 ? 0 : 90;
        return { ...item, rotateDegrees: newRot, widthMm: item.heightMm, heightMm: item.widthMm };
      })
    );
  }, [selectedIndex, commitChange]);

  const handleDuplicateSelected = useCallback(() => {
    if (selectedIndex === null) return;
    const item = placedItemsRef.current[selectedIndex];
    if (!item) return;
    const newItem: PlacedPhotoItem = {
      ...item,
      id: `copy_${Date.now()}`,
      xMm: Math.min(paperW - item.widthMm, item.xMm + 5),
      yMm: Math.min(paperH - item.heightMm, item.yMm + 5),
    };
    const next = [...placedItemsRef.current, newItem];
    commitChange(next);
    setSelectedIndex(next.length - 1);
  }, [selectedIndex, paperW, paperH, commitChange]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIndex === null) return;
    commitChange(placedItemsRef.current.filter((_, i) => i !== selectedIndex));
    setSelectedIndex(null);
  }, [selectedIndex, commitChange]);

  // ── Keyboard Shortcuts ────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const isCtrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Undo/Redo (local for layout panel)
      if (isCtrl && key === 'z' && !e.shiftKey) { e.preventDefault(); localUndo(); return; }
      if ((isCtrl && key === 'y') || (isCtrl && key === 'z' && e.shiftKey)) { e.preventDefault(); localRedo(); return; }

      // Zoom
      if (isCtrl && (key === '=' || key === '+')) { e.preventDefault(); zoomIn(); return; }
      if (isCtrl && key === '-') { e.preventDefault(); zoomOut(); return; }
      if (isCtrl && key === '0') { e.preventDefault(); zoomReset(); return; }

      if (selectedIndexRef.current === null) return;

      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        commitChange(
          placedItemsRef.current.map((item, i) => {
            if (i !== selectedIndexRef.current) return item;
            let { xMm, yMm, widthMm, heightMm } = item;
            if (key === 'arrowup')    yMm = Math.max(0, yMm - step);
            if (key === 'arrowdown')  yMm = Math.min(paperH - heightMm, yMm + step);
            if (key === 'arrowleft')  xMm = Math.max(0, xMm - step);
            if (key === 'arrowright') xMm = Math.min(paperW - widthMm, xMm + step);
            return { ...item, xMm, yMm };
          })
        );
        return;
      }
      if (key === 'delete' || key === 'backspace') { e.preventDefault(); handleDeleteSelected(); return; }
      if (key === 'r' && !isCtrl) { e.preventDefault(); handleRotateSelected(); return; }
      if (isCtrl && key === 'd') { e.preventDefault(); handleDuplicateSelected(); return; }
      if (key === 'escape') { e.preventDefault(); setSelectedIndex(null); return; }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [paperW, paperH, localUndo, localRedo, handleDeleteSelected, handleRotateSelected, handleDuplicateSelected, commitChange, zoomIn, zoomOut, zoomReset]);

  const selectedItem = useMemo(() =>
    selectedIndex !== null ? placedItems[selectedIndex] : null,
    [selectedIndex, placedItems]
  );

  return (
    <div className="flex flex-col h-full select-none">

      {/* Header with Zoom + Undo/Redo controls */}
      <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between shrink-0 gap-2">
        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 shrink-0">
          <Move className="w-3 h-3 text-indigo-400" />
          Print Sheet Preview
        </span>

        {/* Undo / Redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={localUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={localRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={zoomOut} title="Zoom Out (Ctrl+-)" className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={zoomReset}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono font-bold transition min-w-[42px] text-center"
            title="Reset Zoom (Ctrl+0)"
          >
            {Math.round(zoomLevel * 100)}%
          </button>
          <button onClick={zoomIn} title="Zoom In (Ctrl++)" className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        <span className="text-[10px] text-indigo-400 font-mono font-bold shrink-0">
          {placedItems.length} copies
        </span>
      </div>

      {/* Canvas Scroll Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex items-start justify-center p-4 bg-slate-950/50"
      >
        <div className="flex flex-col items-center gap-2">
          {/* Canvas */}
          <div
            className="shadow-2xl shadow-black/80 bg-white rounded"
            style={{ border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <canvas
              ref={canvasRef}
              className="block"
              style={{ cursor: isDraggingRef.current ? 'grabbing' : 'crosshair' }}
              onMouseDown={handleMouseDownCanvas}
              onMouseMove={handleMouseMoveCanvas}
              onMouseUp={handleMouseUpCanvas}
              onMouseLeave={handleMouseUpCanvas}
            />
          </div>

          {/* ── Action Bar (shown BELOW canvas when item is selected) ── */}
          {selectedItem ? (
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900/95 border border-cyan-500/30 shadow-xl backdrop-blur-md">
              <span className="text-[9px] font-bold text-cyan-300 truncate max-w-[80px]">{selectedItem.name}</span>
              <div className="w-px h-3.5 bg-slate-700 mx-1" />
              <button onClick={handleRotateSelected}
                className="flex items-center gap-1 px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[9px] font-bold transition">
                <RotateCw className="w-2.5 h-2.5 text-cyan-400" /><span>Rotate</span>
              </button>
              <button onClick={handleDuplicateSelected}
                className="flex items-center gap-1 px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[9px] font-bold transition">
                <Copy className="w-2.5 h-2.5 text-indigo-400" /><span>Duplicate</span>
              </button>
              <button onClick={handleDeleteSelected}
                className="flex items-center gap-1 px-1.5 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-[9px] font-bold transition border border-rose-500/25">
                <Trash2 className="w-2.5 h-2.5" /><span>Delete</span>
              </button>
            </div>
          ) : (
            /* Paper size label when nothing selected */
            <div className="flex items-center justify-between w-full px-1">
              <span className="text-[9px] text-slate-600">Click photo to select · Drag to reposition</span>
              <span className="text-[9px] font-bold text-slate-500 font-mono">
                {layoutConfig.paperSize.name} {paperW}×{paperH}mm
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats + Shortcut Bar */}
      <div className="px-3 py-1.5 border-t border-slate-800 bg-slate-900/60 shrink-0">
        <div className="flex items-center justify-between mb-1">
          {[
            { label: 'Copies', value: placedItems.length },
            { label: 'In Tray', value: processedTray.length },
            { label: 'DPI', value: '300' },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-xs font-bold text-indigo-300">{value}</div>
              <div className="text-[8px] text-slate-600 uppercase tracking-wide">{label}</div>
            </div>
          ))}
        </div>
        {/* Keyboard hint row */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end pt-1 border-t border-slate-800/60">
          {[
            { keys: '↑↓←→', desc: '1mm' },
            { keys: 'Shift+↑↓', desc: '5mm' },
            { keys: 'R', desc: 'Rotate' },
            { keys: 'Del', desc: 'Del' },
            { keys: 'Ctrl+Z', desc: 'Undo' },
            { keys: 'Ctrl+Y', desc: 'Redo' },
          ].map(({ keys, desc }) => (
            <div key={keys} className="flex items-center gap-0.5 text-[8px]">
              <span className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono font-bold leading-tight">{keys}</span>
              <span className="text-slate-700">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
