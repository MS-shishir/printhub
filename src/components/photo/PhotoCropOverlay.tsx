/**
 * PhotoCropOverlay.tsx
 * Senior UI/UX Dual-Mode Photo Studio Crop Engine.
 * 
 * Features:
 * 1. Unobtrusive Layout: Compact header bar with integrated status pills — NEVER blocks face or subject.
 * 2. Full Zoom & Pan Controls inside Crop Mode:
 *    - Mouse Wheel Zooming
 *    - Spacebar + Drag / Middle Click / Hand Tool for Smooth Canvas Panning
 *    - Dedicated Zoom In (+), Zoom Out (-), Fit Screen & Pan toggles on top bar
 * 3. Clean Canvas Start: No intrusive default frame — click & drag anywhere on photo to draw crop area.
 * 4. 4-Corner Point & Warp Crop: Start with clean canvas, click 4 corners sequentially (① TL -> ② TR -> ③ BR -> ④ BL).
 * 5. Smart Straightness & Alignment Indicators:
 *    - Real-time Degree/Tilt Readout (e.g. 🟢 0.0° Level / 🟡 +2.5° Skewed)
 *    - 4x4 Perspective Mesh Grid to visually verify plane flatness and alignment
 *    - Laser Crosshair Guide following mouse cursor
 *    - One-Click Auto-Straighten / Rectangular Snap
 * 6. Live Synchronized Fabric.js Viewport Transform Tracking
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import {
  Check, X, RotateCcw, Crop, Scissors, UserCheck, Move, Sparkles, Users, 
  MousePointerClick, RefreshCw, Layout, Compass, CheckCircle2, 
  ZoomIn, ZoomOut, Maximize2, Hand, MousePointer
} from 'lucide-react';
import { PerspectiveWarpEngine, DocumentQuad, Point2D } from '../../engines/PerspectiveWarpEngine';

export type CropMode = 'normal' | 'perspective';

interface PhotoCropOverlayProps {
  fabricCanvas: fabric.Canvas | null;
  activeImage: fabric.Image | null;
  cropMode: CropMode;
  onSetCropMode: (mode: CropMode) => void;
  onApplyCrop: (resultCanvas: HTMLCanvasElement) => void;
  onCancelCrop: () => void;
  language: 'en' | 'bn';
}

type DragTarget = 
  | 'all'
  | 'tl' | 'tr' | 'br' | 'bl'
  | 'top' | 'right' | 'bottom' | 'left'
  | 'center'
  | 'canvas_pan';

export default function PhotoCropOverlay({
  fabricCanvas,
  activeImage,
  cropMode,
  onSetCropMode,
  onApplyCrop,
  onCancelCrop,
  language
}: PhotoCropOverlayProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Force re-render on canvas zoom/pan
  const [, setRenderTrigger] = useState<number>(0);

  // Pan / Hand tool mode
  const [isPanToolActive, setIsPanToolActive] = useState<boolean>(false);
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);

  // Active drag target
  const [activeTarget, setActiveTarget] = useState<DragTarget | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const isDrawingBoxRef = useRef<boolean>(false);

  // Mouse cursor position on container for crosshair laser guide
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Aspect ratio lock (null = freeform)
  const [lockedRatio, setLockedRatio] = useState<number | null>(null);
  const [activePresetLabel, setActivePresetLabel] = useState<string>('free');

  // 1. Normal Rectangular Crop Box (Container Display Pixels) - Starts NULL so no default box blocks the photo
  const [normalRect, setNormalRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  // 2. 4-Corner Perspective Warp Points (Starts EMPTY so user clicks 4 corners from scratch)
  const [pickedPoints, setPickedPoints] = useState<Point2D[]>([]);
  const [quadDisp, setQuadDisp] = useState<DocumentQuad | null>(null);

  // Drag start state references
  const dragStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    startRect: { left: number; top: number; width: number; height: number };
    startQuad: DocumentQuad | null;
    startVpt: number[];
  }>({
    mouseX: 0,
    mouseY: 0,
    startRect: { left: 0, top: 0, width: 0, height: 0 },
    startQuad: null,
    startVpt: [1, 0, 0, 1, 0, 0]
  });

  // Raw Image Canvas Reference
  const rawCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Disable Fabric active selection controls on mount so stray blue boxes never appear
  useEffect(() => {
    if (!fabricCanvas) return;
    fabricCanvas.discardActiveObject();
    fabricCanvas.getObjects().forEach((obj) => {
      obj.selectable = false;
      obj.evented = false;
      obj.hasControls = false;
      obj.hasBorders = false;
    });
    fabricCanvas.renderAll();

    return () => {
      fabricCanvas.getObjects().forEach((obj) => {
        if (!obj.lockMovementX) {
          obj.selectable = true;
          obj.evented = true;
          obj.hasControls = true;
          obj.hasBorders = true;
        }
      });
      fabricCanvas.renderAll();
    };
  }, [fabricCanvas]);

  // Listen to Fabric canvas render events to keep overlay perfectly synced with zoom/pan
  useEffect(() => {
    if (!fabricCanvas) return;
    const onRender = () => setRenderTrigger((n) => n + 1);
    fabricCanvas.on('after:render', onRender);
    return () => {
      fabricCanvas.off('after:render', onRender);
    };
  }, [fabricCanvas]);

  // Spacebar pan listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT') {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Helper: Get Image Display Bounding Box on Container
  const getImageDisplayBounds = useCallback(() => {
    if (!fabricCanvas || !activeImage) return null;
    const vpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const zoom = fabricCanvas.getZoom() || 1;
    const bRect = activeImage.getBoundingRect();

    return {
      left: bRect.left * zoom + vpt[4],
      top: bRect.top * zoom + vpt[5],
      width: bRect.width * zoom,
      height: bRect.height * zoom,
      bRect,
      vpt,
      zoom,
    };
  }, [fabricCanvas, activeImage]);

  // Initialize Raw Image
  useEffect(() => {
    if (!fabricCanvas || !activeImage) return;

    const rawEl = (activeImage as any)._rawSourceElement || activeImage.getElement();
    if (!rawEl) return;

    const natW = (rawEl as HTMLImageElement).naturalWidth || (rawEl as HTMLCanvasElement).width || 1200;
    const natH = (rawEl as HTMLImageElement).naturalHeight || (rawEl as HTMLCanvasElement).height || 800;

    const rawCanvas = document.createElement('canvas');
    rawCanvas.width = natW;
    rawCanvas.height = natH;
    const ctx = rawCanvas.getContext('2d');
    if (ctx) ctx.drawImage(rawEl, 0, 0);
    rawCanvasRef.current = rawCanvas;
  }, [fabricCanvas, activeImage]);

  // Convert Container Display Point -> Raw Image Pixel Coordinates
  const dispToRaw = useCallback((pt: Point2D): Point2D => {
    if (!fabricCanvas || !activeImage || !rawCanvasRef.current) return { x: 0, y: 0 };
    const rawC = rawCanvasRef.current;
    const natW = rawC.width;
    const natH = rawC.height;

    const vpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const zoom = fabricCanvas.getZoom() || 1;
    const bRect = activeImage.getBoundingRect();

    const fx = (pt.x - vpt[4]) / zoom;
    const fy = (pt.y - vpt[5]) / zoom;
    const relX = (fx - bRect.left) / (bRect.width || 1);
    const relY = (fy - bRect.top) / (bRect.height || 1);

    return {
      x: Math.max(0, Math.min(natW, Math.round(relX * natW))),
      y: Math.max(0, Math.min(natH, Math.round(relY * natH))),
    };
  }, [fabricCanvas, activeImage]);

  // Convert Raw Image Pixel -> Container Display Point
  const rawToDisp = useCallback((pt: Point2D): Point2D => {
    if (!fabricCanvas || !activeImage || !rawCanvasRef.current) return { x: 0, y: 0 };
    const rawC = rawCanvasRef.current;
    const natW = rawC.width;
    const natH = rawC.height;

    const vpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const zoom = fabricCanvas.getZoom() || 1;
    const bRect = activeImage.getBoundingRect();

    const relX = pt.x / natW;
    const relY = pt.y / natH;
    const fx = bRect.left + relX * bRect.width;
    const fy = bRect.top + relY * bRect.height;

    return {
      x: Math.round(fx * zoom + vpt[4]),
      y: Math.round(fy * zoom + vpt[5]),
    };
  }, [fabricCanvas, activeImage]);

  // Zoom & Pan Handlers
  const handleZoomIn = () => {
    if (!fabricCanvas) return;
    const center = new fabric.Point((fabricCanvas.width || 800) / 2, (fabricCanvas.height || 600) / 2);
    fabricCanvas.zoomToPoint(center, Math.min(20, fabricCanvas.getZoom() * 1.2));
    fabricCanvas.requestRenderAll();
  };

  const handleZoomOut = () => {
    if (!fabricCanvas) return;
    const center = new fabric.Point((fabricCanvas.width || 800) / 2, (fabricCanvas.height || 600) / 2);
    fabricCanvas.zoomToPoint(center, Math.max(0.1, fabricCanvas.getZoom() * 0.8));
    fabricCanvas.requestRenderAll();
  };

  const handleFitScreen = () => {
    if (!fabricCanvas || !activeImage) return;
    const cW = fabricCanvas.width || 800;
    const cH = fabricCanvas.height || 600;
    const iW = activeImage.width || 800;
    const iH = activeImage.height || 600;
    const scale = Math.min((cW * 0.85) / iW, (cH * 0.85) / iH);

    fabricCanvas.setZoom(scale);
    fabricCanvas.viewportTransform = [
      scale, 0, 0, scale,
      (cW - iW * scale) / 2,
      (cH - iH * scale) / 2
    ];
    fabricCanvas.requestRenderAll();
  };

  // Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (!fabricCanvas) return;
    e.preventDefault();
    e.stopPropagation();

    const delta = e.deltaY;
    let zoom = fabricCanvas.getZoom();
    zoom *= 0.999 ** delta;
    if (zoom > 20) zoom = 20;
    if (zoom < 0.05) zoom = 0.05;

    const point = new fabric.Point(e.clientX, e.clientY);
    fabricCanvas.zoomToPoint(point, zoom);
    fabricCanvas.requestRenderAll();
  };

  // Handle Drag / Draw / Pan Start
  const handleContainerMouseDown = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = Math.round(e.clientX - rect.left);
    const mouseY = Math.round(e.clientY - rect.top);

    // 1. Canvas Pan (If Space is held, Middle mouse clicked, or Hand Tool active)
    if (isSpacePressed || isPanToolActive || e.button === 1) {
      e.preventDefault();
      isDraggingRef.current = true;
      setActiveTarget('canvas_pan');
      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        startRect: { left: 0, top: 0, width: 0, height: 0 },
        startQuad: null,
        startVpt: fabricCanvas?.viewportTransform ? [...fabricCanvas.viewportTransform] : [1, 0, 0, 1, 0, 0]
      };
      return;
    }

    if (cropMode === 'perspective') {
      // 4-Corner Point Mode: If user has less than 4 points, register a point click
      if (pickedPoints.length < 4) {
        const newPt = { x: mouseX, y: mouseY };
        const nextPts = [...pickedPoints, newPt];
        setPickedPoints(nextPts);

        if (nextPts.length === 4) {
          setQuadDisp({
            tl: nextPts[0],
            tr: nextPts[1],
            br: nextPts[2],
            bl: nextPts[3],
          });
        }
        return;
      }
    }

    // Normal Crop Mode: If clicking on empty canvas area, start drawing a new crop box
    isDrawingBoxRef.current = true;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startRect: { left: mouseX, top: mouseY, width: 0, height: 0 },
      startQuad: null,
      startVpt: [1, 0, 0, 1, 0, 0]
    };
    setNormalRect({ left: mouseX, top: mouseY, width: 5, height: 5 });
  };

  // Handle Handle Drag Start
  const handleHandleMouseDown = (e: React.MouseEvent, target: DragTarget) => {
    e.preventDefault();
    e.stopPropagation();

    isDraggingRef.current = true;
    setActiveTarget(target);

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startRect: normalRect ? { ...normalRect } : { left: 0, top: 0, width: 0, height: 0 },
      startQuad: quadDisp ? { ...quadDisp } : null,
      startVpt: fabricCanvas?.viewportTransform ? [...fabricCanvas.viewportTransform] : [1, 0, 0, 1, 0, 0]
    };
  };

  // Global Mouse Move & Up Handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setCursorPos({ x: Math.round(e.clientX - rect.left), y: Math.round(e.clientY - rect.top) });
      }

      // 0. Canvas Viewport Panning
      if (isDraggingRef.current && activeTarget === 'canvas_pan' && fabricCanvas) {
        const dx = e.clientX - dragStartRef.current.mouseX;
        const dy = e.clientY - dragStartRef.current.mouseY;
        const vpt = [...dragStartRef.current.startVpt];
        vpt[4] += dx;
        vpt[5] += dy;
        fabricCanvas.viewportTransform = [vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]];
        fabricCanvas.requestRenderAll();
        return;
      }

      // 1. Drawing a brand new crop box from scratch
      if (isDrawingBoxRef.current) {
        if (!rect) return;
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        const startX = dragStartRef.current.startRect.left;
        const startY = dragStartRef.current.startRect.top;

        let w = Math.abs(currentX - startX);
        let h = Math.abs(currentY - startY);
        let l = Math.min(startX, currentX);
        let t = Math.min(startY, currentY);

        if (lockedRatio) {
          h = w / lockedRatio;
        }

        if (w > 5 && h > 5) {
          setNormalRect({ left: Math.round(l), top: Math.round(t), width: Math.round(w), height: Math.round(h) });
        }
        return;
      }

      // 2. Dragging handles or moving existing crop box
      if (!isDraggingRef.current || !activeTarget) return;

      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;

      if (cropMode === 'normal' && normalRect) {
        const s = dragStartRef.current.startRect;
        let next = { ...s };

        if (activeTarget === 'all' || activeTarget === 'center') {
          next.left = s.left + dx;
          next.top = s.top + dy;
        } else if (activeTarget === 'tl') {
          let newW = s.width - dx;
          let newH = s.height - dy;
          if (lockedRatio) newH = newW / lockedRatio;
          next.left = s.left + (s.width - newW);
          next.top = s.top + (s.height - newH);
          next.width = newW;
          next.height = newH;
        } else if (activeTarget === 'tr') {
          let newW = s.width + dx;
          let newH = s.height - dy;
          if (lockedRatio) newH = newW / lockedRatio;
          next.top = s.top + (s.height - newH);
          next.width = newW;
          next.height = newH;
        } else if (activeTarget === 'br') {
          let newW = s.width + dx;
          let newH = s.height + dy;
          if (lockedRatio) newH = newW / lockedRatio;
          next.width = newW;
          next.height = newH;
        } else if (activeTarget === 'bl') {
          let newW = s.width - dx;
          let newH = s.height + dy;
          if (lockedRatio) newH = newW / lockedRatio;
          next.left = s.left + (s.width - newW);
          next.width = newW;
          next.height = newH;
        } else if (activeTarget === 'top') {
          next.top = s.top + dy;
          next.height = s.height - dy;
        } else if (activeTarget === 'bottom') {
          next.height = s.height + dy;
        } else if (activeTarget === 'left') {
          next.left = s.left + dx;
          next.width = s.width - dx;
        } else if (activeTarget === 'right') {
          next.width = s.width + dx;
        }

        if (next.width > 20 && next.height > 20) {
          setNormalRect(next);
        }
      } else if (cropMode === 'perspective' && quadDisp && dragStartRef.current.startQuad) {
        const sQuad = dragStartRef.current.startQuad;
        let nextQuad = { ...quadDisp };

        if (activeTarget === 'tl') {
          nextQuad.tl = { x: sQuad.tl.x + dx, y: sQuad.tl.y + dy };
        } else if (activeTarget === 'tr') {
          nextQuad.tr = { x: sQuad.tr.x + dx, y: sQuad.tr.y + dy };
        } else if (activeTarget === 'br') {
          nextQuad.br = { x: sQuad.br.x + dx, y: sQuad.br.y + dy };
        } else if (activeTarget === 'bl') {
          nextQuad.bl = { x: sQuad.bl.x + dx, y: sQuad.bl.y + dy };
        } else if (activeTarget === 'center' || activeTarget === 'all') {
          nextQuad = {
            tl: { x: sQuad.tl.x + dx, y: sQuad.tl.y + dy },
            tr: { x: sQuad.tr.x + dx, y: sQuad.tr.y + dy },
            br: { x: sQuad.br.x + dx, y: sQuad.br.y + dy },
            bl: { x: sQuad.bl.x + dx, y: sQuad.bl.y + dy },
          };
        } else if (activeTarget === 'top') {
          nextQuad.tl = { x: sQuad.tl.x, y: sQuad.tl.y + dy };
          nextQuad.tr = { x: sQuad.tr.x, y: sQuad.tr.y + dy };
        } else if (activeTarget === 'bottom') {
          nextQuad.bl = { x: sQuad.bl.x, y: sQuad.bl.y + dy };
          nextQuad.br = { x: sQuad.br.x, y: sQuad.br.y + dy };
        } else if (activeTarget === 'left') {
          nextQuad.tl = { x: sQuad.tl.x + dx, y: sQuad.tl.y };
          nextQuad.bl = { x: sQuad.bl.x + dx, y: sQuad.bl.y };
        } else if (activeTarget === 'right') {
          nextQuad.tr = { x: sQuad.tr.x + dx, y: sQuad.tr.y };
          nextQuad.br = { x: sQuad.br.x + dx, y: sQuad.br.y };
        }

        setQuadDisp(nextQuad);
        setPickedPoints([nextQuad.tl, nextQuad.tr, nextQuad.br, nextQuad.bl]);
      }
    };

    const handleMouseUp = () => {
      isDrawingBoxRef.current = false;
      isDraggingRef.current = false;
      setActiveTarget(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeTarget, cropMode, normalRect, quadDisp, lockedRatio, fabricCanvas]);

  // Apply Aspect Ratio Presets (Positions preset box in center)
  const handleApplyPreset = (ratio: number | null, label: string) => {
    setLockedRatio(ratio);
    setActivePresetLabel(label);

    const bounds = getImageDisplayBounds();
    if (!bounds) return;

    if (!ratio) {
      if (!normalRect) {
        const padW = bounds.width * 0.1;
        const padH = bounds.height * 0.1;
        setNormalRect({
          left: Math.round(bounds.left + padW),
          top: Math.round(bounds.top + padH),
          width: Math.round(bounds.width - 2 * padW),
          height: Math.round(bounds.height - 2 * padH),
        });
      }
      return;
    }

    let targetW = bounds.width * 0.75;
    let targetH = targetW / ratio;

    if (targetH > bounds.height * 0.75) {
      targetH = bounds.height * 0.75;
      targetW = targetH * ratio;
    }

    const cLeft = Math.round(bounds.left + (bounds.width - targetW) / 2);
    const cTop = Math.round(bounds.top + (bounds.height - targetH) / 2);
    const cW = Math.round(targetW);
    const cH = Math.round(targetH);

    setNormalRect({ left: cLeft, top: cTop, width: cW, height: cH });
  };

  // Reset 4 Corner Points to let user re-click 4 corners from scratch
  const handleResetPoints = () => {
    setPickedPoints([]);
    setQuadDisp(null);
  };

  // Auto-Straighten Quad (Snaps 4 corners to perfect rectangular bounds)
  const handleAutoStraightenQuad = () => {
    if (!quadDisp) return;
    const minX = Math.min(quadDisp.tl.x, quadDisp.bl.x);
    const maxX = Math.max(quadDisp.tr.x, quadDisp.br.x);
    const minY = Math.min(quadDisp.tl.y, quadDisp.tr.y);
    const maxY = Math.max(quadDisp.bl.y, quadDisp.br.y);

    const straightened: DocumentQuad = {
      tl: { x: minX, y: minY },
      tr: { x: maxX, y: minY },
      br: { x: maxX, y: maxY },
      bl: { x: minX, y: maxY },
    };

    setQuadDisp(straightened);
    setPickedPoints([straightened.tl, straightened.tr, straightened.br, straightened.bl]);
  };

  // Auto Detect Document Corners
  const handleAutoDetect = () => {
    if (!rawCanvasRef.current) return;
    const detected = PerspectiveWarpEngine.autoDetectDocumentCorners(rawCanvasRef.current);
    if (!detected) return;

    const tlDisp = rawToDisp(detected.tl);
    const trDisp = rawToDisp(detected.tr);
    const brDisp = rawToDisp(detected.br);
    const blDisp = rawToDisp(detected.bl);

    setQuadDisp({ tl: tlDisp, tr: trDisp, br: brDisp, bl: blDisp });
    setPickedPoints([tlDisp, trDisp, brDisp, blDisp]);
  };

  // Execute and Apply Crop
  const handleExecuteCrop = () => {
    if (!rawCanvasRef.current) return;
    const rawC = rawCanvasRef.current;

    if (cropMode === 'normal') {
      if (!normalRect) return;
      const tl = dispToRaw({ x: normalRect.left, y: normalRect.top });
      const br = dispToRaw({ x: normalRect.left + normalRect.width, y: normalRect.top + normalRect.height });

      const cropX = Math.max(0, Math.min(rawC.width, Math.min(tl.x, br.x)));
      const cropY = Math.max(0, Math.min(rawC.height, Math.min(tl.y, br.y)));
      const cropW = Math.max(10, Math.min(rawC.width - cropX, Math.abs(br.x - tl.x)));
      const cropH = Math.max(10, Math.min(rawC.height - cropY, Math.abs(br.y - tl.y)));

      const outCanvas = document.createElement('canvas');
      outCanvas.width = cropW;
      outCanvas.height = cropH;
      const oCtx = outCanvas.getContext('2d');
      if (oCtx) {
        oCtx.imageSmoothingEnabled = true;
        oCtx.imageSmoothingQuality = 'high';
        oCtx.drawImage(rawC, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        onApplyCrop(outCanvas);
      }
    } else {
      if (!quadDisp) return;
      const rawQuad: DocumentQuad = {
        tl: dispToRaw(quadDisp.tl),
        tr: dispToRaw(quadDisp.tr),
        br: dispToRaw(quadDisp.br),
        bl: dispToRaw(quadDisp.bl),
      };

      const topW = Math.hypot(rawQuad.tr.x - rawQuad.tl.x, rawQuad.tr.y - rawQuad.tl.y);
      const botW = Math.hypot(rawQuad.br.x - rawQuad.bl.x, rawQuad.br.y - rawQuad.bl.y);
      const leftH = Math.hypot(rawQuad.bl.x - rawQuad.tl.x, rawQuad.bl.y - rawQuad.tl.y);
      const rightH = Math.hypot(rawQuad.br.x - rawQuad.tr.x, rawQuad.br.y - rawQuad.tr.y);

      const targetW = Math.max(50, Math.round(Math.max(topW, botW)));
      const targetH = Math.max(50, Math.round(Math.max(leftH, rightH)));

      const warped = PerspectiveWarpEngine.warpPerspective(rawC, rawQuad, targetW, targetH);
      onApplyCrop(warped);
    }
  };

  // Compute calculated pixel dimensions of crop box
  const getRawCropDimensions = () => {
    if (!normalRect || !rawCanvasRef.current) return null;
    const tl = dispToRaw({ x: normalRect.left, y: normalRect.top });
    const br = dispToRaw({ x: normalRect.left + normalRect.width, y: normalRect.top + normalRect.height });
    return {
      w: Math.round(Math.abs(br.x - tl.x)),
      h: Math.round(Math.abs(br.y - tl.y)),
    };
  };

  const rawDim = getRawCropDimensions();

  // Perspective Angles & Straightness Calculations
  const getPerspectiveAlignment = () => {
    if (!quadDisp) return null;
    const topDeg = (Math.atan2(quadDisp.tr.y - quadDisp.tl.y, quadDisp.tr.x - quadDisp.tl.x) * 180) / Math.PI;
    const leftDeg = (Math.atan2(quadDisp.bl.y - quadDisp.tl.y, quadDisp.bl.x - quadDisp.tl.x) * 180) / Math.PI;

    const isTopLevel = Math.abs(topDeg) < 1.0;
    const isLeftVertical = Math.abs(leftDeg - 90) < 1.0;
    const isPerfect = isTopLevel && isLeftVertical;

    return {
      topDeg: topDeg.toFixed(1),
      leftDeg: (leftDeg - 90).toFixed(1),
      isTopLevel,
      isPerfect,
    };
  };

  const alignment = getPerspectiveAlignment();

  // Perspective midpoints
  const dTopMid = quadDisp ? { x: (quadDisp.tl.x + quadDisp.tr.x) / 2, y: (quadDisp.tl.y + quadDisp.tr.y) / 2 } : null;
  const dRightMid = quadDisp ? { x: (quadDisp.tr.x + quadDisp.br.x) / 2, y: (quadDisp.tr.y + quadDisp.br.y) / 2 } : null;
  const dBotMid = quadDisp ? { x: (quadDisp.bl.x + quadDisp.br.x) / 2, y: (quadDisp.bl.y + quadDisp.br.y) / 2 } : null;
  const dLeftMid = quadDisp ? { x: (quadDisp.tl.x + quadDisp.bl.x) / 2, y: (quadDisp.tl.y + quadDisp.bl.y) / 2 } : null;
  const dCenter = quadDisp ? {
    x: (quadDisp.tl.x + quadDisp.tr.x + quadDisp.br.x + quadDisp.bl.x) / 4,
    y: (quadDisp.tl.y + quadDisp.tr.y + quadDisp.br.y + quadDisp.bl.y) / 4,
  } : null;

  // Subdivided 4x4 Perspective Mesh Grid Lines
  const getSubdividedMeshLines = () => {
    if (!quadDisp) return [];
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const fractions = [0.25, 0.5, 0.75];

    fractions.forEach((f) => {
      const topX = quadDisp.tl.x + f * (quadDisp.tr.x - quadDisp.tl.x);
      const topY = quadDisp.tl.y + f * (quadDisp.tr.y - quadDisp.tl.y);
      const botX = quadDisp.bl.x + f * (quadDisp.br.x - quadDisp.bl.x);
      const botY = quadDisp.bl.y + f * (quadDisp.br.y - quadDisp.bl.y);
      lines.push({ x1: topX, y1: topY, x2: botX, y2: botY });
    });

    fractions.forEach((f) => {
      const leftX = quadDisp.tl.x + f * (quadDisp.bl.x - quadDisp.tl.x);
      const leftY = quadDisp.tl.y + f * (quadDisp.bl.y - quadDisp.tl.y);
      const rightX = quadDisp.tr.x + f * (quadDisp.br.x - quadDisp.tr.x);
      const rightY = quadDisp.tr.y + f * (quadDisp.br.y - quadDisp.tr.y);
      lines.push({ x1: leftX, y1: leftY, x2: rightX, y2: rightY });
    });

    return lines;
  };

  const meshLines = getSubdividedMeshLines();

  const isPanMode = isSpacePressed || isPanToolActive;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleContainerMouseDown}
      onWheel={handleWheel}
      className={`absolute inset-0 pointer-events-auto select-none z-30 overflow-hidden font-sans ${
        isPanMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
      }`}
    >
      {/* ── Cursor Laser Guides (When hovering to pick or draw) ── */}
      {cursorPos && (!isDraggingRef.current || isDrawingBoxRef.current) && !isPanMode && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
          <line x1={0} y1={cursorPos.y} x2="100%" y2={cursorPos.y} stroke="#818cf8" strokeWidth="1" strokeDasharray="3 3" />
          <line x1={cursorPos.x} y1={0} x2={cursorPos.x} y2="100%" stroke="#818cf8" strokeWidth="1" strokeDasharray="3 3" />
        </svg>
      )}

      {/* ── 1. Shaded Dimmed Background Overlay ── */}
      {cropMode === 'normal' && normalRect && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <mask id="normal-crop-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={normalRect.left}
                y={normalRect.top}
                width={normalRect.width}
                height={normalRect.height}
                fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.60)" mask="url(#normal-crop-mask)" />
          
          {/* Rule of Thirds Guidelines */}
          <line
            x1={normalRect.left + normalRect.width / 3}
            y1={normalRect.top}
            x2={normalRect.left + normalRect.width / 3}
            y2={normalRect.top + normalRect.height}
            stroke="rgba(255,255,255,0.35)"
            strokeDasharray="3 3"
          />
          <line
            x1={normalRect.left + (2 * normalRect.width) / 3}
            y1={normalRect.top}
            x2={normalRect.left + (2 * normalRect.width) / 3}
            y2={normalRect.top + normalRect.height}
            stroke="rgba(255,255,255,0.35)"
            strokeDasharray="3 3"
          />
          <line
            x1={normalRect.left}
            y1={normalRect.top + normalRect.height / 3}
            x2={normalRect.left + normalRect.width}
            y2={normalRect.top + normalRect.height / 3}
            stroke="rgba(255,255,255,0.35)"
            strokeDasharray="3 3"
          />
          <line
            x1={normalRect.left}
            y1={normalRect.top + (2 * normalRect.height) / 3}
            x2={normalRect.left + normalRect.width}
            y2={normalRect.top + (2 * normalRect.height) / 3}
            stroke="rgba(255,255,255,0.35)"
            strokeDasharray="3 3"
          />

          {/* High-Contrast Crisp Border */}
          <rect
            x={normalRect.left}
            y={normalRect.top}
            width={normalRect.width}
            height={normalRect.height}
            fill="none"
            stroke="#6366f1"
            strokeWidth="2"
            className="drop-shadow-[0_0_10px_rgba(99,102,241,0.9)]"
          />
        </svg>
      )}

      {/* Perspective Shaded Polygon Overlay + 4x4 Straightness Mesh Grid */}
      {cropMode === 'perspective' && quadDisp && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <mask id="perspective-crop-mask">
              <rect width="100%" height="100%" fill="white" />
              <polygon
                points={`${quadDisp.tl.x},${quadDisp.tl.y} ${quadDisp.tr.x},${quadDisp.tr.y} ${quadDisp.br.x},${quadDisp.br.y} ${quadDisp.bl.x},${quadDisp.bl.y}`}
                fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.60)" mask="url(#perspective-crop-mask)" />
          
          {/* Subdivided 4x4 Perspective Mesh Grid */}
          {meshLines.map((l, i) => (
            <line
              key={i}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke="rgba(129, 140, 248, 0.4)"
              strokeDasharray="3 3"
            />
          ))}

          {/* Glowing Polygon Outline */}
          <polygon
            points={`${quadDisp.tl.x},${quadDisp.tl.y} ${quadDisp.tr.x},${quadDisp.tr.y} ${quadDisp.br.x},${quadDisp.br.y} ${quadDisp.bl.x},${quadDisp.bl.y}`}
            fill="none"
            stroke={alignment?.isPerfect ? "#10b981" : "#6366f1"}
            strokeWidth="2.5"
            className="drop-shadow-[0_0_10px_rgba(99,102,241,0.9)]"
          />
        </svg>
      )}

      {/* Partial Connecting Lines for 4-Corner Clicking (Steps 1 to 3) */}
      {cropMode === 'perspective' && pickedPoints.length < 4 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {pickedPoints.length > 1 && (
            <polyline
              points={pickedPoints.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#6366f1"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          )}
        </svg>
      )}

      {/* ── 2. Interactive Drag Handles for Normal Mode ── */}
      {cropMode === 'normal' && (
        <>
          {normalRect && (
            <>
              {/* Center Move Area */}
              <div
                onMouseDown={(e) => handleHandleMouseDown(e, 'all')}
                style={{
                  left: `${normalRect.left}px`,
                  top: `${normalRect.top}px`,
                  width: `${normalRect.width}px`,
                  height: `${normalRect.height}px`,
                }}
                className="absolute cursor-move flex items-center justify-center group"
              >
                <div className="w-7 h-7 rounded-full bg-slate-900/90 border-2 border-indigo-400 text-indigo-300 shadow-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <Move className="w-3.5 h-3.5" />
                </div>

                {/* Live Pixel Dimension Pill */}
                {rawDim && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-950/90 border border-indigo-500/40 px-2 py-0.5 rounded text-[9.5px] font-mono text-indigo-300 font-bold shadow-lg pointer-events-none whitespace-nowrap">
                    {rawDim.w} × {rawDim.h} px
                  </div>
                )}
              </div>

              {/* 4 Corner Resize Handles */}
              {[
                { key: 'tl', left: normalRect.left, top: normalRect.top, cursor: 'cursor-nwse-resize' },
                { key: 'tr', left: normalRect.left + normalRect.width, top: normalRect.top, cursor: 'cursor-nesw-resize' },
                { key: 'br', left: normalRect.left + normalRect.width, top: normalRect.top + normalRect.height, cursor: 'cursor-nwse-resize' },
                { key: 'bl', left: normalRect.left, top: normalRect.top + normalRect.height, cursor: 'cursor-nesw-resize' },
              ].map(({ key, left, top, cursor }) => (
                <div
                  key={key}
                  onMouseDown={(e) => handleHandleMouseDown(e, key as DragTarget)}
                  style={{ left: `${left}px`, top: `${top}px`, transform: 'translate(-50%, -50%)' }}
                  className={`absolute w-4 h-4 rounded-full bg-indigo-600 border-2 border-white shadow-xl ${cursor} hover:scale-125 transition-transform z-40 hover:bg-amber-400 cursor-pointer`}
                />
              ))}

              {/* 4 Edge Midpoint Handles */}
              {[
                { key: 'top', left: normalRect.left + normalRect.width / 2, top: normalRect.top, cursor: 'cursor-ns-resize' },
                { key: 'bottom', left: normalRect.left + normalRect.width / 2, top: normalRect.top + normalRect.height, cursor: 'cursor-ns-resize' },
                { key: 'left', left: normalRect.left, top: normalRect.top + normalRect.height / 2, cursor: 'cursor-ew-resize' },
                { key: 'right', left: normalRect.left + normalRect.width, top: normalRect.top + normalRect.height / 2, cursor: 'cursor-ew-resize' },
              ].map(({ key, left, top, cursor }) => (
                <div
                  key={key}
                  onMouseDown={(e) => handleHandleMouseDown(e, key as DragTarget)}
                  style={{ left: `${left}px`, top: `${top}px`, transform: 'translate(-50%, -50%)' }}
                  className={`absolute w-3 h-3 rounded-md bg-white border border-slate-900 shadow-md ${cursor} hover:scale-125 transition-transform z-40 hover:bg-amber-300 cursor-pointer`}
                />
              ))}
            </>
          )}
        </>
      )}

      {/* ── 3. Interactive Handles for 4-Corner Mode ── */}
      {cropMode === 'perspective' && (
        <>
          {/* If Quad is Complete (4 Points) */}
          {quadDisp && dCenter && (
            <>
              {/* Center Move Handle */}
              <div
                onMouseDown={(e) => handleHandleMouseDown(e, 'center')}
                style={{
                  left: `${dCenter.x}px`,
                  top: `${dCenter.y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="absolute w-7 h-7 rounded-full bg-slate-900/90 border-2 border-indigo-400 text-indigo-300 shadow-xl flex items-center justify-center cursor-move hover:scale-125 transition-transform z-40 hover:bg-indigo-600 hover:text-white"
              >
                <Move className="w-3.5 h-3.5" />
              </div>

              {/* 4 Draggable Corner Handles */}
              {[
                { key: 'tl', pt: quadDisp.tl, label: '① TL' },
                { key: 'tr', pt: quadDisp.tr, label: '② TR' },
                { key: 'br', pt: quadDisp.br, label: '③ BR' },
                { key: 'bl', pt: quadDisp.bl, label: '④ BL' },
              ].map(({ key, pt, label }) => (
                <div
                  key={key}
                  onMouseDown={(e) => handleHandleMouseDown(e, key as DragTarget)}
                  style={{
                    left: `${pt.x}px`,
                    top: `${pt.y}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="absolute z-40 group cursor-pointer flex flex-col items-center"
                >
                  <div className="w-5 h-5 rounded-full bg-indigo-600 border-2 border-white shadow-xl flex items-center justify-center group-hover:scale-125 transition-transform group-hover:bg-amber-400">
                    <span className="text-[8.5px] font-bold text-white leading-none">{label.charAt(0)}</span>
                  </div>
                </div>
              ))}

              {/* 4 Edge Midpoint Handles */}
              {[
                { key: 'top', pt: dTopMid, cursor: 'cursor-ns-resize' },
                { key: 'right', pt: dRightMid, cursor: 'cursor-ew-resize' },
                { key: 'bottom', pt: dBotMid, cursor: 'cursor-ns-resize' },
                { key: 'left', pt: dLeftMid, cursor: 'cursor-ew-resize' },
              ].map(({ key, pt, cursor }) => pt ? (
                <div
                  key={key}
                  onMouseDown={(e) => handleHandleMouseDown(e, key as DragTarget)}
                  style={{
                    left: `${pt.x}px`,
                    top: `${pt.y}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute w-3 h-3 rounded-md bg-white border border-slate-900 shadow-md ${cursor} hover:scale-125 transition-transform z-40 hover:bg-amber-300 cursor-pointer`}
                />
              ) : null)}
            </>
          )}

          {/* Sequential 4-Click Point Indicators (When less than 4 points picked) */}
          {pickedPoints.length < 4 && (
            <>
              {pickedPoints.map((pt, idx) => (
                <div
                  key={idx}
                  style={{ left: `${pt.x}px`, top: `${pt.y}px`, transform: 'translate(-50%, -50%)' }}
                  className="absolute z-40 pointer-events-none flex items-center justify-center animate-bounce"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-xl flex items-center justify-center font-bold text-white text-[9.5px]">
                    {idx + 1}
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}

      {/* ── Compact Top Floating Dock (Never obscures face / body) ── */}
      <div 
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute top-1.5 left-1/2 -translate-x-1/2 bg-slate-950/85 hover:bg-slate-950/95 backdrop-blur-xl px-2 py-1 rounded-xl border border-indigo-500/30 text-xs font-bold text-slate-200 shadow-2xl flex items-center gap-1.5 z-50 whitespace-nowrap transition-all"
      >
        {/* Mode Switcher Pill */}
        <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 gap-0.5">
          <button
            onClick={() => onSetCropMode('normal')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
              cropMode === 'normal'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crop className="w-3 h-3" />
            <span>{language === 'bn' ? 'টেনে ক্রপ' : 'Box Crop'}</span>
          </button>

          <button
            onClick={() => onSetCropMode('perspective')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
              cropMode === 'perspective'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scissors className="w-3 h-3 text-amber-300" />
            <span>{language === 'bn' ? '৪-কোণা' : '4-Corner'}</span>
          </button>
        </div>

        <div className="h-3.5 w-px bg-slate-800 mx-0.5" />

        {/* Normal Mode Aspect Ratio Presets */}
        {cropMode === 'normal' ? (
          <div className="flex items-center gap-0.5">
            {[
              { id: 'free', ratio: null, label: 'Free' },
              { id: '40x50', ratio: 40 / 50, label: '40×50' },
              { id: '35x45', ratio: 35 / 45, label: '35×45' },
              { id: '25x30', ratio: 25 / 30, label: 'Stamp' },
              { id: '4x6', ratio: 4 / 6, label: '4R' },
              { id: '1x1', ratio: 1, label: '1:1' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handleApplyPreset(p.ratio, p.id)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                  activePresetLabel === p.id
                    ? 'bg-indigo-600/50 text-indigo-200 border border-indigo-500/50'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        ) : (
          /* Perspective Mode Actions & Live Step Instruction */
          <div className="flex items-center gap-1.5">
            {pickedPoints.length < 4 ? (
              <div className="flex items-center gap-1 text-[10.5px] text-amber-300 font-semibold px-1.5 py-0.5 bg-amber-950/40 rounded border border-amber-500/30">
                <MousePointerClick className="w-3 h-3 animate-pulse" />
                <span>
                  {pickedPoints.length === 0 && (language === 'bn' ? '① উপরের বাম কোণায় ক্লিক করুন' : '① Click Top-Left')}
                  {pickedPoints.length === 1 && (language === 'bn' ? '② উপরের ডান কোণায় ক্লিক করুন' : '② Click Top-Right')}
                  {pickedPoints.length === 2 && (language === 'bn' ? '③ নিচের ডান কোণায় ক্লিক করুন' : '③ Click Bottom-Right')}
                  {pickedPoints.length === 3 && (language === 'bn' ? '④ নিচের বাম কোণায় ক্লিক করুন' : '④ Click Bottom-Left')}
                </span>
              </div>
            ) : (
              <>
                <button
                  onClick={handleResetPoints}
                  className="flex items-center gap-1 px-2 py-0.5 bg-slate-900 hover:bg-slate-800 rounded text-[10.5px] text-amber-300 font-bold transition cursor-pointer"
                  title="৪ কোণা নতুন করে ক্লিক করতে রিসেট করুন"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{language === 'bn' ? 'রিসেট' : 'Reset'}</span>
                </button>

                {quadDisp && (
                  <button
                    onClick={handleAutoStraightenQuad}
                    className="flex items-center gap-1 px-2 py-0.5 bg-emerald-600/70 hover:bg-emerald-600 text-white rounded text-[10.5px] font-bold transition cursor-pointer"
                    title="৪ কোণাকে সোজা আয়তাকার ফ্রেমে স্ন্যাপ করুন"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-200" />
                    <span>{language === 'bn' ? 'সোজা করুন' : 'Straighten'}</span>
                  </button>
                )}
              </>
            )}

            <button
              onClick={handleAutoDetect}
              className="flex items-center gap-1 px-2 py-0.5 bg-indigo-600/70 hover:bg-indigo-600 text-white rounded text-[10.5px] font-bold transition cursor-pointer"
              title="Auto Detect Document Corners"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>{language === 'bn' ? 'অটো' : 'Auto'}</span>
            </button>
          </div>
        )}

        <div className="h-3.5 w-px bg-slate-800 mx-0.5" />

        {/* Zoom & Pan Tools inside Crop */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setIsPanToolActive(!isPanToolActive)}
            className={`p-1 rounded transition cursor-pointer ${
              isPanToolActive
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Pan Tool (Spacebar + Drag to move canvas)"
          >
            <Hand className="w-3 h-3" />
          </button>

          <button
            onClick={handleZoomIn}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3 h-3" />
          </button>

          <button
            onClick={handleZoomOut}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3 h-3" />
          </button>

          <button
            onClick={handleFitScreen}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            title="Fit Screen"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ── Bottom Sleek Action Dock (Apply / Cancel) ── */}
      <div 
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-950/85 hover:bg-slate-950/95 backdrop-blur-xl px-2.5 py-1 rounded-xl border border-slate-800 shadow-2xl z-50 whitespace-nowrap transition-all"
      >
        <button
          onClick={handleExecuteCrop}
          disabled={cropMode === 'normal' ? !normalRect : !quadDisp}
          className={`flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
            (cropMode === 'normal' ? normalRect : quadDisp)
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/60 hover:scale-105 active:scale-95'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Check className="w-3.5 h-3.5 stroke-[3]" />
          <span>
            {cropMode === 'normal'
              ? (language === 'bn' ? '✓ ক্রপ করুন' : 'Apply Crop')
              : (language === 'bn' ? '✓ সোজা ও ক্রপ' : 'Warp & Crop')}
          </span>
        </button>

        <button
          onClick={onCancelCrop}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold rounded-lg text-xs transition active:scale-95 cursor-pointer"
        >
          <X className="w-3 h-3" />
          <span>{language === 'bn' ? 'বাতিল' : 'Cancel'}</span>
        </button>
      </div>
    </div>
  );
}
