/**
 * PhotoCropOverlay.tsx
 * Enterprise Photoshop/GIMP-Grade Mathematical Photo Studio Crop Engine.
 * 
 * Features:
 * 1. 2D Affine Inversion & Master Resolution Sub-pixel Extraction:
 *    - Perfect geometric crop on rotated, slanted, flipped, and scaled photos.
 * 2. Interactive Straighten Tool:
 *    - Draw reference baseline on photo to measure tilt angle and auto-level horizontally or vertically.
 * 3. 8-Point Pro Handles + Top Lollipop Rotation Handle + Center Pan:
 *    - Corner resize, edge stretch, center move, and angle rotation.
 * 4. Aspect Ratio & Physical Print Presets:
 *    - Free, BD Passport (40x50mm), ePassport/Visa (35x45mm), Stamp (25x30mm), 4R (4x6in), 1:1, 16:9, etc.
 *    - Live physical output pixel badge (e.g. 35×45mm @ 300 DPI -> 413×531 px).
 * 5. Composition Guide Overlays:
 *    - Rule of Thirds (3x3 grid)
 *    - Golden Ratio (φ ≈ 1.618 golden section lines)
 *    - Diagonal Guides
 *    - Center Crosshair
 * 6. Classical Deterministic Smart Crop (0 AI / Cloud):
 *    - Local contrast, Sobel edge density, and Rule-of-Thirds centroid alignment.
 * 7. 4-Corner Projective Perspective Homography Mode:
 *    - 4x4 subdivided mesh grid, real-time tilt angle indicators, and Canny/Sobel auto document boundary detection.
 * 8. Keyboard Controls:
 *    - Arrow keys: 1px nudge (Shift + Arrow: 10px)
 *    - Alt key: Center-based symmetric resize
 *    - Esc: Cancel, Enter: Apply
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import {
  Check, X, Crop, Scissors, Move, Sparkles, 
  MousePointerClick, RefreshCw, CheckCircle2, 
  ZoomIn, ZoomOut, Maximize2, Hand, RotateCw, Compass,
  Grid, Sliders, ArrowRight
} from 'lucide-react';
import {
  CropCoordinateMapper,
  CropConstraintSolver,
  CropRotationEngine,
  CropPerspectiveEngine,
  SmartCropEngine,
  CropExportEngine,
  CROP_PRESETS,
  CropPreset,
  CropRect,
  Point2D,
  DocumentQuad,
  HandleType,
  CompositionGuide,
  ImageTransformState,
  ViewportTransformState
} from '../../engines/CropEngine';

export type CropMode = 'normal' | 'perspective';

export interface CropMeta {
  sceneRect?: { left: number; top: number; width: number; height: number };
  targetObject?: any;
  targetObjects?: any[];
}

interface PhotoCropOverlayProps {
  fabricCanvas: fabric.Canvas | null;
  activeImage: fabric.FabricObject | fabric.Image | fabric.Group | fabric.Object | any | null;
  cropMode: CropMode;
  onSetCropMode: (mode: CropMode) => void;
  onApplyCrop: (resultCanvas: HTMLCanvasElement, meta?: CropMeta) => void;
  onCancelCrop: () => void;
  language: 'en' | 'bn';
}

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

  // Active Tool Mode
  const [isPanToolActive, setIsPanToolActive] = useState<boolean>(false);
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const [isAltPressed, setIsAltPressed] = useState<boolean>(false);
  const [isStraightenToolActive, setIsStraightenToolActive] = useState<boolean>(false);

  // Active Drag Target
  const [activeTarget, setActiveTarget] = useState<HandleType | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const isDrawingBoxRef = useRef<boolean>(false);
  const isStraighteningRef = useRef<boolean>(false);

  // Laser baseline coordinates for Straighten tool
  const [straightenLine, setStraightenLine] = useState<{ p1: Point2D; p2: Point2D } | null>(null);

  // Mouse cursor position on container for crosshair laser guide
  const [cursorPos, setCursorPos] = useState<Point2D | null>(null);

  // Aspect ratio lock (null = freeform)
  const [lockedRatio, setLockedRatio] = useState<number | null>(null);
  const [activePreset, setActivePreset] = useState<CropPreset>(CROP_PRESETS.free);
  const [activePresetId, setActivePresetId] = useState<string>('free');

  // Composition Guide
  const [activeGuide, setActiveGuide] = useState<CompositionGuide>('thirds');
  const [showGuideMenu, setShowGuideMenu] = useState<boolean>(false);

  // 1. Normal Rectangular Crop Box (Container Display Pixels)
  const [normalRect, setNormalRect] = useState<CropRect | null>(null);

  // 2. 4-Corner Perspective Warp Points
  const [pickedPoints, setPickedPoints] = useState<Point2D[]>([]);
  const [quadDisp, setQuadDisp] = useState<DocumentQuad | null>(null);

  // Drag start state references
  const dragStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    startRect: CropRect;
    startQuad: DocumentQuad | null;
    startVpt: number[];
    startAngle: number;
    startCenter: Point2D;
  }>({
    mouseX: 0,
    mouseY: 0,
    startRect: { left: 0, top: 0, width: 0, height: 0 },
    startQuad: null,
    startVpt: [1, 0, 0, 1, 0, 0],
    startAngle: 0,
    startCenter: { x: 0, y: 0 }
  });

  // Raw Master Image Canvas Reference
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

  // Spacebar and Alt key listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.code === 'Space' && !e.repeat) setIsSpacePressed(true);
      if (e.key === 'Alt' && !e.repeat) setIsAltPressed(true);

      // Keyboard arrow nudging
      if (normalRect && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dLeft = 0;
        let dTop = 0;
        if (e.key === 'ArrowUp') dTop = -step;
        if (e.key === 'ArrowDown') dTop = step;
        if (e.key === 'ArrowLeft') dLeft = -step;
        if (e.key === 'ArrowRight') dLeft = step;

        setNormalRect({
          ...normalRect,
          left: normalRect.left + dLeft,
          top: normalRect.top + dTop
        });
      }

      // Enter to Apply, Esc to Cancel
      if (e.key === 'Enter') {
        e.preventDefault();
        handleExecuteCrop();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancelCrop();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpacePressed(false);
      if (e.key === 'Alt') setIsAltPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [normalRect]);

  // Synchronous High-Precision Master Source & Transform State Generator
  const getTargetMasterAndStates = useCallback((): {
    masterSource: HTMLCanvasElement | HTMLImageElement;
    imgState: ImageTransformState;
    vptState: ViewportTransformState;
  } | null => {
    if (!fabricCanvas) return null;

    const vpt = fabricCanvas.viewportTransform ? [...fabricCanvas.viewportTransform] : [1, 0, 0, 1, 0, 0];
    const zoom = fabricCanvas.getZoom() || vpt[0] || 1;
    const vptState: ViewportTransformState = {
      zoom,
      panX: vpt[4] || 0,
      panY: vpt[5] || 0,
    };

    // 1. If activeImage is an image layer, group, or multi-selection
    if (activeImage) {
      const isGroup = (typeof (activeImage as any).isType === 'function')
        ? ((activeImage as any).isType('group') || (activeImage as any).isType('activeSelection'))
        : (activeImage.type === 'group' || activeImage.type === 'activeSelection');

      if (isGroup) {
        const groupW = (activeImage.getScaledWidth ? activeImage.getScaledWidth() : (activeImage.width || 800) * (activeImage.scaleX || 1));
        const groupH = (activeImage.getScaledHeight ? activeImage.getScaledHeight() : (activeImage.height || 600) * (activeImage.scaleY || 1));
        const centerPt = (typeof activeImage.getCenterPoint === 'function')
          ? activeImage.getCenterPoint()
          : {
              x: (activeImage.left || 0) + groupW / 2,
              y: (activeImage.top || 0) + groupH / 2,
            };

        const imgState: ImageTransformState = {
          centerX: centerPt.x,
          centerY: centerPt.y,
          width: activeImage.width || groupW,
          height: activeImage.height || groupH,
          scaleX: activeImage.scaleX || 1,
          scaleY: activeImage.scaleY || 1,
          angleDeg: activeImage.angle || 0,
          flipX: !!activeImage.flipX,
          flipY: !!activeImage.flipY,
          naturalWidth: Math.round(groupW * 2),
          naturalHeight: Math.round(groupH * 2),
        };

        const masterCanvas = document.createElement('canvas');
        masterCanvas.width = Math.max(1, Math.round(groupW * 2));
        masterCanvas.height = Math.max(1, Math.round(groupH * 2));
        const ctx = masterCanvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.save();
          ctx.scale(2, 2);
          ctx.translate(-(activeImage.left || 0), -(activeImage.top || 0));
          try {
            (activeImage as any).render(ctx);
          } catch (e) {
            if (fabricCanvas?.lowerCanvasEl) {
              ctx.drawImage(fabricCanvas.lowerCanvasEl, -(activeImage.left || 0), -(activeImage.top || 0));
            }
          }
          ctx.restore();
        }

        return { masterSource: masterCanvas, imgState, vptState };
      }

      // Single Image Layer
      const rawEl = (activeImage as any)._rawSourceElement || (activeImage.getElement ? activeImage.getElement() : null);
      if (rawEl) {
        const natW = (rawEl as HTMLImageElement).naturalWidth || (rawEl as HTMLCanvasElement).width || activeImage.width || 800;
        const natH = (rawEl as HTMLImageElement).naturalHeight || (rawEl as HTMLCanvasElement).height || activeImage.height || 600;

        const centerPt = (typeof activeImage.getCenterPoint === 'function')
          ? activeImage.getCenterPoint()
          : {
              x: (activeImage.left || 0) + (activeImage.getScaledWidth ? activeImage.getScaledWidth() : (activeImage.width || 0) * (activeImage.scaleX || 1)) / 2,
              y: (activeImage.top || 0) + (activeImage.getScaledHeight ? activeImage.getScaledHeight() : (activeImage.height || 0) * (activeImage.scaleY || 1)) / 2,
            };

        const imgState: ImageTransformState = {
          centerX: centerPt.x,
          centerY: centerPt.y,
          width: activeImage.width || natW,
          height: activeImage.height || natH,
          scaleX: activeImage.scaleX || 1,
          scaleY: activeImage.scaleY || 1,
          angleDeg: activeImage.angle || 0,
          flipX: !!activeImage.flipX,
          flipY: !!activeImage.flipY,
          naturalWidth: natW,
          naturalHeight: natH,
        };

        return { masterSource: rawEl, imgState, vptState };
      }
    }

    // 2. Fallback: Entire Canvas / Composite Crop
    const cW = fabricCanvas.width || 800;
    const cH = fabricCanvas.height || 600;

    let masterCanvas: HTMLCanvasElement;
    if (rawCanvasRef.current) {
      masterCanvas = rawCanvasRef.current;
    } else {
      masterCanvas = document.createElement('canvas');
      masterCanvas.width = cW;
      masterCanvas.height = cH;
      const ctx = masterCanvas.getContext('2d');
      if (ctx && fabricCanvas.lowerCanvasEl) {
        ctx.drawImage(fabricCanvas.lowerCanvasEl, 0, 0, cW, cH);
      }
      rawCanvasRef.current = masterCanvas;
    }

    const imgState: ImageTransformState = {
      centerX: cW / 2,
      centerY: cH / 2,
      width: cW,
      height: cH,
      scaleX: 1,
      scaleY: 1,
      angleDeg: 0,
      flipX: false,
      flipY: false,
      naturalWidth: masterCanvas.width,
      naturalHeight: masterCanvas.height,
    };

    return { masterSource: masterCanvas, imgState, vptState };
  }, [fabricCanvas, activeImage]);

  // Helper: Get Image Display Bounding Box on Container
  const getImageDisplayBounds = useCallback((): CropRect | null => {
    const states = getTargetMasterAndStates();
    if (!states) return null;
    return CropCoordinateMapper.getImageScreenBoundingBox(states.imgState, states.vptState);
  }, [getTargetMasterAndStates]);

  // Convert Container Display Point -> Master High-Res Pixel Coordinates
  const dispToMaster = useCallback((pt: Point2D): Point2D => {
    const states = getTargetMasterAndStates();
    if (!states) return { x: 0, y: 0 };
    return CropCoordinateMapper.screenToMaster(pt, states.imgState, states.vptState);
  }, [getTargetMasterAndStates]);

  // Convert Master High-Res Pixel Point -> Container Display Point
  const masterToDisp = useCallback((pt: Point2D): Point2D => {
    const states = getTargetMasterAndStates();
    if (!states) return { x: 0, y: 0 };
    return CropCoordinateMapper.masterToScreen(pt, states.imgState, states.vptState);
  }, [getTargetMasterAndStates]);

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

  // Handle Mouse Down on Container
  const handleContainerMouseDown = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = Math.round(e.clientX - rect.left);
    const mouseY = Math.round(e.clientY - rect.top);

    // 1. Canvas Pan (Spacebar / Middle click / Hand tool active)
    if (isSpacePressed || isPanToolActive || e.button === 1) {
      e.preventDefault();
      isDraggingRef.current = true;
      setActiveTarget('canvas_pan');
      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        startRect: { left: 0, top: 0, width: 0, height: 0 },
        startQuad: null,
        startVpt: fabricCanvas?.viewportTransform ? [...fabricCanvas.viewportTransform] : [1, 0, 0, 1, 0, 0],
        startAngle: activeImage?.angle || 0,
        startCenter: { x: 0, y: 0 }
      };
      return;
    }

    // 2. Straighten Tool baseline drawing
    if (isStraightenToolActive) {
      e.preventDefault();
      isStraighteningRef.current = true;
      setStraightenLine({
        p1: { x: mouseX, y: mouseY },
        p2: { x: mouseX, y: mouseY }
      });
      return;
    }

    // 3. Perspective 4-Corner Mode
    if (cropMode === 'perspective') {
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

    // 4. Normal Crop: Draw new crop box from scratch
    isDrawingBoxRef.current = true;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startRect: { left: mouseX, top: mouseY, width: 0, height: 0 },
      startQuad: null,
      startVpt: [1, 0, 0, 1, 0, 0],
      startAngle: activeImage?.angle || 0,
      startCenter: { x: 0, y: 0 }
    };
    setNormalRect({ left: mouseX, top: mouseY, width: 5, height: 5 });
  };

  // Handle Drag Handle Mouse Down
  const handleHandleMouseDown = (e: React.MouseEvent, target: HandleType) => {
    e.preventDefault();
    e.stopPropagation();

    isDraggingRef.current = true;
    setActiveTarget(target);

    const bounds = getImageDisplayBounds();
    const centerPt = normalRect ? {
      x: normalRect.left + normalRect.width / 2,
      y: normalRect.top + normalRect.height / 2
    } : { x: 0, y: 0 };

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startRect: normalRect ? { ...normalRect } : { left: 0, top: 0, width: 0, height: 0 },
      startQuad: quadDisp ? { ...quadDisp } : null,
      startVpt: fabricCanvas?.viewportTransform ? [...fabricCanvas.viewportTransform] : [1, 0, 0, 1, 0, 0],
      startAngle: activeImage?.angle || 0,
      startCenter: centerPt
    };
  };

  // Global Mouse Move & Up Handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const currentX = Math.round(e.clientX - rect.left);
      const currentY = Math.round(e.clientY - rect.top);
      setCursorPos({ x: currentX, y: currentY });

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

      // 1. Straighten Tool baseline dragging
      if (isStraighteningRef.current && straightenLine) {
        setStraightenLine({
          ...straightenLine,
          p2: { x: currentX, y: currentY }
        });
        return;
      }

      // 2. Drawing a brand new crop box from scratch
      if (isDrawingBoxRef.current) {
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

      // 3. Rotation Handle Dragging (Top Lollipop Handle)
      if (isDraggingRef.current && activeTarget === 'rotate' && activeImage && fabricCanvas) {
        const center = dragStartRef.current.startCenter;
        const initialAngle = Math.atan2(
          dragStartRef.current.mouseY - (containerRef.current?.getBoundingClientRect().top || 0) - center.y,
          dragStartRef.current.mouseX - (containerRef.current?.getBoundingClientRect().left || 0) - center.x
        );
        const currentAngle = Math.atan2(currentY - center.y, currentX - center.x);
        const deltaAngleDeg = ((currentAngle - initialAngle) * 180) / Math.PI;

        let newAngle = dragStartRef.current.startAngle + deltaAngleDeg;
        // Snap to nearest 45° if Shift is held
        if (e.shiftKey) {
          newAngle = Math.round(newAngle / 45) * 45;
        }

        activeImage.set('angle', newAngle);
        fabricCanvas.requestRenderAll();
        return;
      }

      // 4. Dragging handles or moving existing crop box
      if (!isDraggingRef.current || !activeTarget) return;

      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;

      if (cropMode === 'normal' && normalRect) {
        const solved = CropConstraintSolver.solveHandleDrag(
          dragStartRef.current.startRect,
          activeTarget,
          dx,
          dy,
          {
            aspectRatio: lockedRatio,
            isCenterAnchor: isAltPressed,
            minSize: 20
          }
        );

        setNormalRect(solved.rect);
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
      // If Straighten Tool finished drawing baseline, apply automatic level rotation
      if (isStraighteningRef.current && straightenLine && activeImage && fabricCanvas) {
        const straightenAngle = CropRotationEngine.calculateStraightenAngle(
          straightenLine.p1,
          straightenLine.p2,
          'horizontal'
        );
        const currentAngle = activeImage.angle || 0;
        const targetAngle = currentAngle + straightenAngle;

        activeImage.set('angle', targetAngle);
        fabricCanvas.requestRenderAll();
        isStraighteningRef.current = false;
        setIsStraightenToolActive(false);
        setStraightenLine(null);
        return;
      }

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
  }, [activeTarget, cropMode, normalRect, quadDisp, lockedRatio, isAltPressed, isStraightenToolActive, straightenLine, fabricCanvas, activeImage]);

  // Apply Aspect Ratio Presets
  const handleApplyPreset = (preset: CropPreset) => {
    setActivePreset(preset);
    setActivePresetId(preset.id);
    setLockedRatio(preset.aspectRatio > 0 ? preset.aspectRatio : null);

    const bounds = getImageDisplayBounds();
    if (!bounds) return;

    const fitted = CropConstraintSolver.getFittedCenterRect(
      bounds,
      preset.aspectRatio > 0 ? preset.aspectRatio : null,
      0.75
    );
    setNormalRect(fitted);
  };

  // Classical 1-Click Smart Crop Framing (Deterministic, No AI)
  const handleApplySmartCrop = () => {
    const states = getTargetMasterAndStates();
    if (!states) return;
    const bounds = getImageDisplayBounds();
    if (!bounds) return;

    const ratio = lockedRatio && lockedRatio > 0 ? lockedRatio : (activeImage?.width || 800) / (activeImage?.height || 600);
    const sourceCanvas = (states.masterSource instanceof HTMLCanvasElement)
      ? states.masterSource
      : (() => {
          const tempC = document.createElement('canvas');
          tempC.width = (states.masterSource as HTMLImageElement).naturalWidth || 800;
          tempC.height = (states.masterSource as HTMLImageElement).naturalHeight || 600;
          const tCtx = tempC.getContext('2d');
          if (tCtx) tCtx.drawImage(states.masterSource, 0, 0);
          return tempC;
        })();

    const smartRect = SmartCropEngine.calculateSmartCrop(sourceCanvas, ratio, bounds);
    setNormalRect(smartRect);
  };

  // Reset 4 Corner Points in Perspective Mode
  const handleResetPoints = () => {
    setPickedPoints([]);
    setQuadDisp(null);
  };

  // Auto-Straighten Perspective Quad
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
    const states = getTargetMasterAndStates();
    if (!states) return;
    const sourceCanvas = (states.masterSource instanceof HTMLCanvasElement)
      ? states.masterSource
      : (() => {
          const tempC = document.createElement('canvas');
          tempC.width = (states.masterSource as HTMLImageElement).naturalWidth || 800;
          tempC.height = (states.masterSource as HTMLImageElement).naturalHeight || 600;
          const tCtx = tempC.getContext('2d');
          if (tCtx) tCtx.drawImage(states.masterSource, 0, 0);
          return tempC;
        })();

    const detected = CropPerspectiveEngine.autoDetectDocumentCorners(sourceCanvas);
    if (!detected) return;

    const tlDisp = masterToDisp(detected.tl);
    const trDisp = masterToDisp(detected.tr);
    const brDisp = masterToDisp(detected.br);
    const blDisp = masterToDisp(detected.bl);

    setQuadDisp({ tl: tlDisp, tr: trDisp, br: brDisp, bl: blDisp });
    setPickedPoints([tlDisp, trDisp, brDisp, blDisp]);
  };

  // Helper to find all visible photo/image objects that intersect with the drawn crop box
  const getIntersectingObjects = (sceneRect: { left: number; top: number; width: number; height: number }) => {
    if (!fabricCanvas) return [];
    const allObjects = fabricCanvas.getObjects().filter((obj: any) => {
      if (obj.visible === false) return false;
      if ((obj as any).isGuide || (obj as any).excludeFromExport) return false;
      return true;
    });

    const intersecting: any[] = [];
    const sL = sceneRect.left;
    const sT = sceneRect.top;
    const sR = sceneRect.left + sceneRect.width;
    const sB = sceneRect.top + sceneRect.height;
    const sArea = Math.max(1, sceneRect.width * sceneRect.height);

    for (const obj of allObjects) {
      const b = (typeof obj.getBoundingRect === 'function')
        ? obj.getBoundingRect()
        : {
            left: obj.left || 0,
            top: obj.top || 0,
            width: (obj.width || 100) * (obj.scaleX || 1),
            height: (obj.height || 100) * (obj.scaleY || 1),
          };

      const oL = Math.max(sL, b.left);
      const oT = Math.max(sT, b.top);
      const oR = Math.min(sR, b.left + b.width);
      const oB = Math.min(sB, b.top + b.height);

      if (oR > oL && oB > oT) {
        const overlapArea = (oR - oL) * (oB - oT);
        const objArea = Math.max(1, b.width * b.height);
        const overlapWithCrop = overlapArea / sArea;
        const overlapWithObj = overlapArea / objArea;

        // Substantial intentional overlap:
        // Must fill either a large portion of the crop box (>= 40%),
        // Or both the object and crop box share significant overlap (>= 15% each)
        if (overlapWithCrop >= 0.40 || (overlapWithCrop >= 0.15 && overlapWithObj >= 0.15)) {
          intersecting.push(obj);
        }
      }
    }
    return intersecting;
  };

  // Helper to extract a high-resolution composite canvas of the scene rectangle across all overlapping layers
  const extractCompositeCrop = (
    fCanvas: fabric.Canvas,
    sceneRect: { left: number; top: number; width: number; height: number }
  ): HTMLCanvasElement => {
    const maxDim = Math.max(sceneRect.width, sceneRect.height);
    const targetPx = 2400; // 300 DPI studio master quality
    const multiplier = Math.max(1, Math.min(4, Math.round(targetPx / Math.max(100, maxDim))));

    const outW = Math.max(1, Math.round(sceneRect.width * multiplier));
    const outH = Math.max(1, Math.round(sceneRect.height * multiplier));

    const outCanvas = document.createElement('canvas');
    outCanvas.width = outW;
    outCanvas.height = outH;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return outCanvas;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Fill clean background if canvas has backgroundColor
    const bgColor = (fCanvas as any).backgroundColor;
    if (bgColor && typeof bgColor === 'string' && bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, outW, outH);
    }

    ctx.save();
    ctx.scale(multiplier, multiplier);
    ctx.translate(-sceneRect.left, -sceneRect.top);

    const objects = fCanvas.getObjects().filter((obj) => obj.visible !== false);
    for (const obj of objects) {
      ctx.save();
      try {
        (obj as any).render(ctx);
      } catch (e) {
        console.warn('Error rendering object in composite crop:', e);
      }
      ctx.restore();
    }
    ctx.restore();

    return outCanvas;
  };

  // Execute and Apply Crop (The Core Masterpiece Fix)
  const handleExecuteCrop = () => {
    if (!fabricCanvas) return;
    const targetStates = getTargetMasterAndStates();
    if (!targetStates) return;

    const { masterSource, imgState, vptState } = targetStates;
    const { zoom, panX, panY } = vptState;

    if (cropMode === 'normal') {
      if (!normalRect) return;

      const sceneRect = {
        left: (normalRect.left - panX) / zoom,
        top: (normalRect.top - panY) / zoom,
        width: normalRect.width / zoom,
        height: normalRect.height / zoom,
      };

      const isGroup = activeImage && (
        (typeof (activeImage as any).isType === 'function')
          ? ((activeImage as any).isType('group') || (activeImage as any).isType('activeSelection'))
          : (activeImage.type === 'group' || activeImage.type === 'activeSelection')
      );

      const intersecting = getIntersectingObjects(sceneRect);
      // Multi-object or Group composite crop
      const isMultiOrGroupCrop = isGroup || intersecting.length > 1;

      let croppedCanvas: HTMLCanvasElement;
      let cropMeta: CropMeta;

      if (isMultiOrGroupCrop) {
        // Multi-image or Group composite crop: captures high-res composite across all layers in the crop box
        croppedCanvas = extractCompositeCrop(fabricCanvas, sceneRect);
        cropMeta = {
          sceneRect,
          targetObjects: isGroup ? [activeImage] : intersecting,
          targetObject: activeImage || intersecting[0],
        };
      } else {
        // Single-image lossless camera raw extraction
        const singleTarget = activeImage || (intersecting.length === 1 ? intersecting[0] : null);
        croppedCanvas = CropRotationEngine.extractSubpixelCrop(
          masterSource,
          normalRect,
          imgState,
          vptState
        );
        cropMeta = {
          sceneRect,
          targetObjects: singleTarget ? [singleTarget] : [],
          targetObject: singleTarget,
        };
      }

      // If preset has physical dimensions (e.g. BD Passport 40x50mm @ 300 DPI), downsample crisp multi-step
      if (activePreset.widthMm && activePreset.heightMm) {
        const targetDims = CropExportEngine.getPresetPixelDimensions(activePreset, activePreset.defaultDpi || 300);
        const finalExportCanvas = CropExportEngine.multiStepDownscale(
          croppedCanvas,
          targetDims.width,
          targetDims.height
        );
        onApplyCrop(finalExportCanvas, cropMeta);
      } else {
        onApplyCrop(croppedCanvas, cropMeta);
      }
    } else {
      if (!quadDisp) return;

      const minX = Math.min(quadDisp.tl.x, quadDisp.tr.x, quadDisp.br.x, quadDisp.bl.x);
      const maxX = Math.max(quadDisp.tr.x, quadDisp.tr.x, quadDisp.br.x, quadDisp.bl.x);
      const minY = Math.min(quadDisp.tl.y, quadDisp.tr.y, quadDisp.br.y, quadDisp.bl.y);
      const maxY = Math.max(quadDisp.bl.y, quadDisp.br.y, quadDisp.bl.y, quadDisp.bl.y);
      const sceneRect = {
        left: (minX - panX) / zoom,
        top: (minY - panY) / zoom,
        width: (maxX - minX) / zoom,
        height: (maxY - minY) / zoom,
      };

      const isGroup = activeImage && (
        (typeof (activeImage as any).isType === 'function')
          ? ((activeImage as any).isType('group') || (activeImage as any).isType('activeSelection'))
          : (activeImage.type === 'group' || activeImage.type === 'activeSelection')
      );

      const intersecting = getIntersectingObjects(sceneRect);
      const isMultiOrGroupCrop = isGroup || intersecting.length > 1;

      const rawQuad: DocumentQuad = {
        tl: dispToMaster(quadDisp.tl),
        tr: dispToMaster(quadDisp.tr),
        br: dispToMaster(quadDisp.br),
        bl: dispToMaster(quadDisp.bl),
      };

      const topW = Math.hypot(rawQuad.tr.x - rawQuad.tl.x, rawQuad.tr.y - rawQuad.tl.y);
      const botW = Math.hypot(rawQuad.br.x - rawQuad.bl.x, rawQuad.br.y - rawQuad.bl.y);
      const leftH = Math.hypot(rawQuad.bl.x - rawQuad.tl.x, rawQuad.bl.y - rawQuad.tl.y);
      const rightH = Math.hypot(rawQuad.br.x - rawQuad.tr.x, rawQuad.br.y - rawQuad.tr.y);

      const targetW = Math.max(50, Math.round(Math.max(topW, botW)));
      const targetH = Math.max(50, Math.round(Math.max(leftH, rightH)));

      let sourceCanvas: HTMLCanvasElement;
      if (isMultiOrGroupCrop) {
        sourceCanvas = extractCompositeCrop(fabricCanvas, {
          left: 0,
          top: 0,
          width: fabricCanvas.width || 800,
          height: fabricCanvas.height || 600
        });
      } else {
        sourceCanvas = (masterSource instanceof HTMLCanvasElement)
          ? masterSource
          : (() => {
              const tempC = document.createElement('canvas');
              tempC.width = (masterSource as HTMLImageElement).naturalWidth || 800;
              tempC.height = (masterSource as HTMLImageElement).naturalHeight || 600;
              const tCtx = tempC.getContext('2d');
              if (tCtx) tCtx.drawImage(masterSource, 0, 0);
              return tempC;
            })();
      }

      const warped = CropPerspectiveEngine.warpPerspective(sourceCanvas, rawQuad, targetW, targetH);
      const singleTarget = activeImage || (intersecting.length === 1 ? intersecting[0] : null);
      const cropMeta: CropMeta = {
        sceneRect,
        targetObjects: isGroup ? [activeImage] : (isMultiOrGroupCrop ? intersecting : (singleTarget ? [singleTarget] : [])),
        targetObject: singleTarget,
      };
      onApplyCrop(warped, cropMeta);
    }
  };

  // Compute calculated pixel dimensions of crop box in master image space
  const getRawCropDimensions = () => {
    if (!normalRect) return null;
    const states = getTargetMasterAndStates();
    if (!states) return null;

    const screenTL: Point2D = { x: normalRect.left, y: normalRect.top };
    const screenTR: Point2D = { x: normalRect.left + normalRect.width, y: normalRect.top };
    const screenBL: Point2D = { x: normalRect.left, y: normalRect.top + normalRect.height };

    const mTL = CropCoordinateMapper.screenToMaster(screenTL, states.imgState, states.vptState);
    const mTR = CropCoordinateMapper.screenToMaster(screenTR, states.imgState, states.vptState);
    const mBL = CropCoordinateMapper.screenToMaster(screenBL, states.imgState, states.vptState);

    const w = Math.round(Math.hypot(mTR.x - mTL.x, mTR.y - mTL.y));
    const h = Math.round(Math.hypot(mBL.x - mTL.x, mBL.y - mTL.y));

    return { w, h };
  };

  const rawDim = getRawCropDimensions();

  // Perspective Tilt Angle Readout
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

  // Perspective midpoints and center
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
        isPanMode ? 'cursor-grab active:cursor-grabbing' : isStraightenToolActive ? 'cursor-crosshair' : 'cursor-crosshair'
      }`}
    >
      {/* ── Straighten Tool Live Reference Laser Line ── */}
      {straightenLine && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-40">
          <line
            x1={straightenLine.p1.x}
            y1={straightenLine.p1.y}
            x2={straightenLine.p2.x}
            y2={straightenLine.p2.y}
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeDasharray="5 3"
          />
          <circle cx={straightenLine.p1.x} cy={straightenLine.p1.y} r="5" fill="#f59e0b" stroke="#fff" strokeWidth="2" />
          <circle cx={straightenLine.p2.x} cy={straightenLine.p2.y} r="5" fill="#f59e0b" stroke="#fff" strokeWidth="2" />
        </svg>
      )}

      {/* ── Cursor Laser Guides (When hovering to pick or draw) ── */}
      {cursorPos && (!isDraggingRef.current || isDrawingBoxRef.current) && !isPanMode && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25">
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
          <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.65)" mask="url(#normal-crop-mask)" />
          
          {/* Rule of Thirds Guidelines */}
          {activeGuide === 'thirds' && (
            <>
              <line x1={normalRect.left + normalRect.width / 3} y1={normalRect.top} x2={normalRect.left + normalRect.width / 3} y2={normalRect.top + normalRect.height} stroke="rgba(255,255,255,0.4)" strokeDasharray="3 3" />
              <line x1={normalRect.left + (2 * normalRect.width) / 3} y1={normalRect.top} x2={normalRect.left + (2 * normalRect.width) / 3} y2={normalRect.top + normalRect.height} stroke="rgba(255,255,255,0.4)" strokeDasharray="3 3" />
              <line x1={normalRect.left} y1={normalRect.top + normalRect.height / 3} x2={normalRect.left + normalRect.width} y2={normalRect.top + normalRect.height / 3} stroke="rgba(255,255,255,0.4)" strokeDasharray="3 3" />
              <line x1={normalRect.left} y1={normalRect.top + (2 * normalRect.height) / 3} x2={normalRect.left + normalRect.width} y2={normalRect.top + (2 * normalRect.height) / 3} stroke="rgba(255,255,255,0.4)" strokeDasharray="3 3" />
            </>
          )}

          {/* Golden Ratio Guides (φ ≈ 1.618 -> 0.382 & 0.618) */}
          {activeGuide === 'golden' && (
            <>
              <line x1={normalRect.left + normalRect.width * 0.382} y1={normalRect.top} x2={normalRect.left + normalRect.width * 0.382} y2={normalRect.top + normalRect.height} stroke="rgba(251,191,36,0.5)" strokeDasharray="3 3" />
              <line x1={normalRect.left + normalRect.width * 0.618} y1={normalRect.top} x2={normalRect.left + normalRect.width * 0.618} y2={normalRect.top + normalRect.height} stroke="rgba(251,191,36,0.5)" strokeDasharray="3 3" />
              <line x1={normalRect.left} y1={normalRect.top + normalRect.height * 0.382} x2={normalRect.left + normalRect.width} y2={normalRect.top + normalRect.height * 0.382} stroke="rgba(251,191,36,0.5)" strokeDasharray="3 3" />
              <line x1={normalRect.left} y1={normalRect.top + normalRect.height * 0.618} x2={normalRect.left + normalRect.width} y2={normalRect.top + normalRect.height * 0.618} stroke="rgba(251,191,36,0.5)" strokeDasharray="3 3" />
            </>
          )}

          {/* Diagonal Guides */}
          {activeGuide === 'diagonal' && (
            <>
              <line x1={normalRect.left} y1={normalRect.top} x2={normalRect.left + normalRect.width} y2={normalRect.top + normalRect.height} stroke="rgba(129,140,248,0.45)" strokeDasharray="4 4" />
              <line x1={normalRect.left + normalRect.width} y1={normalRect.top} x2={normalRect.left} y2={normalRect.top + normalRect.height} stroke="rgba(129,140,248,0.45)" strokeDasharray="4 4" />
            </>
          )}

          {/* Center Crosshair Guide */}
          {activeGuide === 'center' && (
            <>
              <line x1={normalRect.left + normalRect.width / 2} y1={normalRect.top} x2={normalRect.left + normalRect.width / 2} y2={normalRect.top + normalRect.height} stroke="rgba(52,211,153,0.5)" strokeDasharray="3 3" />
              <line x1={normalRect.left} y1={normalRect.top + normalRect.height / 2} x2={normalRect.left + normalRect.width} y2={normalRect.top + normalRect.height / 2} stroke="rgba(52,211,153,0.5)" strokeDasharray="3 3" />
            </>
          )}

          {/* High-Contrast Crisp Border */}
          <rect
            x={normalRect.left}
            y={normalRect.top}
            width={normalRect.width}
            height={normalRect.height}
            fill="none"
            stroke="#6366f1"
            strokeWidth="2"
            className="drop-shadow-[0_0_12px_rgba(99,102,241,0.9)]"
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
          <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.65)" mask="url(#perspective-crop-mask)" />
          
          {/* Subdivided 4x4 Perspective Mesh Grid */}
          {meshLines.map((l, i) => (
            <line
              key={i}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke="rgba(129, 140, 248, 0.45)"
              strokeDasharray="3 3"
            />
          ))}

          {/* Glowing Polygon Outline */}
          <polygon
            points={`${quadDisp.tl.x},${quadDisp.tl.y} ${quadDisp.tr.x},${quadDisp.tr.y} ${quadDisp.br.x},${quadDisp.br.y} ${quadDisp.bl.x},${quadDisp.bl.y}`}
            fill="none"
            stroke={alignment?.isPerfect ? "#10b981" : "#6366f1"}
            strokeWidth="2.5"
            className="drop-shadow-[0_0_12px_rgba(99,102,241,0.9)]"
          />
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
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-950/95 border border-indigo-500/50 px-2.5 py-0.5 rounded-md text-[10px] font-mono text-indigo-200 font-bold shadow-2xl pointer-events-none whitespace-nowrap flex items-center gap-1.5 backdrop-blur-md">
                    <span>{rawDim.w} × {rawDim.h} px</span>
                    {activePreset.widthMm && activePreset.heightMm && (
                      <span className="text-amber-400 text-[9px] border-l border-slate-700 pl-1.5 font-sans">
                        {activePreset.widthMm}×{activePreset.heightMm} mm @ 300DPI
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Top Lollipop Rotation Handle */}
              <div
                onMouseDown={(e) => handleHandleMouseDown(e, 'rotate')}
                style={{
                  left: `${normalRect.left + normalRect.width / 2}px`,
                  top: `${normalRect.top - 24}px`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="absolute z-40 group cursor-grab active:cursor-grabbing flex flex-col items-center"
                title="Rotate image freely"
              >
                <div className="w-5 h-5 rounded-full bg-indigo-600 border-2 border-white shadow-xl flex items-center justify-center group-hover:scale-125 transition-transform group-hover:bg-amber-400">
                  <RotateCw className="w-3 h-3 text-white" />
                </div>
                <div className="w-0.5 h-3 bg-indigo-400" />
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
                  onMouseDown={(e) => handleHandleMouseDown(e, key as HandleType)}
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
                  onMouseDown={(e) => handleHandleMouseDown(e, key as HandleType)}
                  style={{ left: `${left}px`, top: `${top}px`, transform: 'translate(-50%, -50%)' }}
                  className={`absolute w-3.5 h-3.5 rounded-md bg-white border border-slate-900 shadow-md ${cursor} hover:scale-125 transition-transform z-40 hover:bg-amber-300 cursor-pointer`}
                />
              ))}
            </>
          )}
        </>
      )}

      {/* ── 3. Interactive Handles for 4-Corner Mode ── */}
      {cropMode === 'perspective' && (
        <>
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
                  onMouseDown={(e) => handleHandleMouseDown(e, key as HandleType)}
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
                  onMouseDown={(e) => handleHandleMouseDown(e, key as HandleType)}
                  style={{
                    left: `${pt.x}px`,
                    top: `${pt.y}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute w-3.5 h-3.5 rounded-md bg-white border border-slate-900 shadow-md ${cursor} hover:scale-125 transition-transform z-40 hover:bg-amber-300 cursor-pointer`}
                />
              ) : null)}
            </>
          )}

          {/* Sequential 4-Click Point Indicators */}
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

      {/* ── Compact Top Floating Studio Dock ── */}
      <div 
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute top-1.5 left-1/2 -translate-x-1/2 bg-slate-950/90 hover:bg-slate-950/98 backdrop-blur-2xl px-2 py-1 rounded-xl border border-indigo-500/30 text-xs font-bold text-slate-200 shadow-2xl flex items-center gap-1.5 z-50 whitespace-nowrap transition-all"
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
              CROP_PRESETS.free,
              CROP_PRESETS.passport_bd,
              CROP_PRESETS.passport_epassport,
              CROP_PRESETS.stamp,
              CROP_PRESETS.photo_4r,
              CROP_PRESETS.square_1x1,
              CROP_PRESETS.ratio_16x9
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handleApplyPreset(p)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                  activePresetId === p.id
                    ? 'bg-indigo-600 text-white border border-indigo-400 shadow'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title={language === 'bn' ? p.nameBn : p.name}
              >
                {p.id === 'free' ? (language === 'bn' ? 'মুক্ত' : 'Free') :
                 p.id === 'passport_bd' ? '40×50' :
                 p.id === 'passport_epassport' ? '35×45' :
                 p.id === 'stamp' ? 'Stamp' :
                 p.id === 'photo_4r' ? '4R' :
                 p.id === 'square_1x1' ? '1:1' : '16:9'}
              </button>
            ))}

            {/* Straighten Tool Trigger */}
            <button
              onClick={() => setIsStraightenToolActive(!isStraightenToolActive)}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-bold transition cursor-pointer ml-1 ${
                isStraightenToolActive
                  ? 'bg-amber-500 text-slate-950 shadow animate-pulse'
                  : 'bg-slate-900 hover:bg-slate-800 text-amber-300'
              }`}
              title="Straighten Tool: Click & drag baseline across image to level tilt"
            >
              <Compass className="w-3 h-3" />
              <span>{language === 'bn' ? 'লেভেল' : 'Straighten'}</span>
            </button>

            {/* Smart Crop 1-Click framing */}
            <button
              onClick={handleApplySmartCrop}
              className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 rounded text-[10.5px] text-indigo-200 font-bold transition cursor-pointer"
              title="Deterministic Classical Smart Crop framing"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>{language === 'bn' ? 'স্মার্ট' : 'Smart'}</span>
            </button>

            {/* Composition Guides Selector */}
            <div className="relative">
              <button
                onClick={() => setShowGuideMenu(!showGuideMenu)}
                className={`p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer ${
                  activeGuide !== 'none' ? 'text-indigo-400' : ''
                }`}
                title="Composition Guides (Rule of Thirds, Golden Ratio, Diagonal)"
              >
                <Grid className="w-3 h-3" />
              </button>

              {showGuideMenu && (
                <div className="absolute top-7 right-0 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-1 z-50 flex flex-col gap-0.5 min-w-[130px]">
                  {[
                    { id: 'thirds', label: 'Rule of Thirds' },
                    { id: 'golden', label: 'Golden Ratio (φ)' },
                    { id: 'diagonal', label: 'Diagonal' },
                    { id: 'center', label: 'Center Cross' },
                    { id: 'none', label: 'Off' }
                  ].map((g) => (
                    <button
                      key={g.id}
                      onClick={() => {
                        setActiveGuide(g.id as CompositionGuide);
                        setShowGuideMenu(false);
                      }}
                      className={`text-left px-2 py-1 rounded text-[10.5px] font-semibold transition ${
                        activeGuide === g.id
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
                  title="Reset 4 corners"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{language === 'bn' ? 'রিসেট' : 'Reset'}</span>
                </button>

                {quadDisp && (
                  <button
                    onClick={handleAutoStraightenQuad}
                    className="flex items-center gap-1 px-2 py-0.5 bg-emerald-600/70 hover:bg-emerald-600 text-white rounded text-[10.5px] font-bold transition cursor-pointer"
                    title="Snap 4 corners to rectangular bounds"
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
              title="Auto Detect Document Corners (Canny/Sobel CV)"
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

      {/* ── Bottom Action Dock (Apply / Cancel) ── */}
      <div 
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-950/90 hover:bg-slate-950/98 backdrop-blur-2xl px-3 py-1.5 rounded-2xl border border-slate-800 shadow-2xl z-50 whitespace-nowrap transition-all"
      >
        <button
          onClick={handleExecuteCrop}
          disabled={cropMode === 'normal' ? !normalRect : !quadDisp}
          className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            (cropMode === 'normal' ? normalRect : quadDisp)
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl shadow-emerald-950/60 hover:scale-105 active:scale-95'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>
            {cropMode === 'normal'
              ? (language === 'bn' ? '✓ ক্রপ করুন' : 'Apply Crop')
              : (language === 'bn' ? '✓ সোজা ও ক্রপ' : 'Warp & Crop')}
          </span>
        </button>

        <button
          onClick={onCancelCrop}
          className="flex items-center gap-1 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition active:scale-95 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>{language === 'bn' ? 'বাতিল' : 'Cancel'}</span>
        </button>
      </div>
    </div>
  );
}
