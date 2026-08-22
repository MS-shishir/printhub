import React, { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { usePassportStore } from '../store';
import { usePassportWorkflow } from '../hooks/usePassportWorkflow';
import { getTemplate } from '../services/template.service';
import FaceGuideOverlay from './overlays/FaceGuideOverlay';
import GridOverlay from './overlays/GridOverlay';
import { Upload, Camera, Clipboard } from 'lucide-react';

export const CANVAS_WIDTH = 560;
export const CANVAS_HEIGHT = 620;

export interface CanvasEditorHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  rotateLeft: () => void;
  rotateRight: () => void;
  flipH: () => void;
  flipV: () => void;
  fitToCanvas: () => void;
  resetTransform: () => void;
  loadSrc: (src: string) => void;
  getCroppedDataUrl: () => string | null;
}

interface MainCanvasProps {
  editorRef: React.MutableRefObject<CanvasEditorHandle | null>;
}

const getInitialCropBox = (aspect: number) => {
  const maxW = CANVAS_WIDTH * 0.72;
  const maxH = CANVAS_HEIGHT * 0.78;
  let cropW: number, cropH: number;
  if (aspect <= maxW / maxH) {
    cropH = maxH;
    cropW = maxH * aspect;
  } else {
    cropW = maxW;
    cropH = maxW / aspect;
  }
  return {
    x: (CANVAS_WIDTH - cropW) / 2,
    y: (CANVAS_HEIGHT - cropH) / 2,
    width: cropW,
    height: cropH,
  };
};

export default function MainCanvas({ editorRef }: MainCanvasProps) {
  const { state, dispatch } = usePassportStore();
  const { loadImageFile } = usePassportWorkflow();
  const template = getTemplate(state.selectedTemplateId);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const loadedSrcRef = useRef<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleCenterFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await loadImageFile(file);
    e.target.value = '';
  }, [loadImageFile]);

  const handleCenterDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) await loadImageFile(file);
  }, [loadImageFile]);

  const isCropPanel = state.activePanel === 'crop';
  const templateAspect = template.widthMm / template.heightMm;

  // Fixed template box for Template Panel & non-crop modes
  const fixedTemplateBox = useMemo(() => getInitialCropBox(templateAspect), [templateAspect]);

  // Resizable crop box state for Crop Panel
  const [cropBox, setCropBox] = useState(() => getInitialCropBox(templateAspect));

  // Current active frame: resizable cropBox in Crop tab, fixed template box in Template tab
  const activeFrame = isCropPanel ? cropBox : fixedTemplateBox;

  // Recalculate resizable crop box when template changes
  useEffect(() => {
    setCropBox(getInitialCropBox(templateAspect));
  }, [template.id, templateAspect]);

  const croppedImgRef = useRef<HTMLImageElement | null>(null);

  // Load croppedImage preview for post-crop steps
  useEffect(() => {
    if (!state.croppedImage) {
      croppedImgRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = state.croppedImage;
    img.onload = () => {
      croppedImgRef.current = img;
      if (['compliance', 'layout', 'export'].includes(state.activePanel)) {
        draw();
      }
    };
  }, [state.croppedImage]);

  // ── Canvas Draw ────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (!imgRef.current) return;
    const img = imgRef.current;

    const isDocOutputStep = ['compliance', 'layout', 'export'].includes(state.activePanel);
    const { x: fx, y: fy, width: fw, height: fh } = activeFrame;
    const t = state.transform;

    if (isDocOutputStep) {
      // In Compliance, Layout, Export steps:
      // Show the passport card cleanly centered on a dark studio background
      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Passport Card Drop Shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = state.bgConfig.color || '#ffffff';
      ctx.fillRect(fx, fy, fw, fh);
      ctx.restore();

      // Clip photo inside Template frame
      ctx.save();
      ctx.beginPath();
      ctx.rect(fx, fy, fw, fh);
      ctx.clip();

      // Draw solid background color FIRST inside frame
      ctx.fillStyle = state.bgConfig.color || '#ffffff';
      ctx.fillRect(fx, fy, fw, fh);

      // Render exact cropped card inside fixedTemplateBox frame
      const croppedImg = croppedImgRef.current;
      if (croppedImg && croppedImg.complete) {
        ctx.drawImage(croppedImg, fx, fy, fw, fh);
      } else {
        ctx.drawImage(img, fx, fy, fw, fh);
      }
      ctx.restore();

      // Template Border Line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(fx, fy, fw, fh);
      return;
    }

    // In Crop and Background editing steps:
    ctx.fillStyle = state.bgConfig.color || '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const cx = CANVAS_WIDTH / 2 + t.pan.x;
    const cy = CANVAS_HEIGHT / 2 + t.pan.y;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((t.rotation * Math.PI) / 180);
    ctx.scale(t.flipX ? -1 : 1, t.flipY ? -1 : 1);

    const dw = img.naturalWidth * t.zoom;
    const dh = img.naturalHeight * t.zoom;
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }, [state.activePanel, activeFrame, cropBox, state.transform, state.bgConfig.color]);

  useEffect(() => {
    draw();
  }, [draw]);

  // ── High-Res Crop Generator (600 - 1200 DPI Ultra HD) ──────────────────
  const getCroppedDataUrl = useCallback(() => {
    if (!imgRef.current) return null;
    const img = imgRef.current;
    const frame = isCropPanel ? cropBox : fixedTemplateBox;
    const { x: cropX, y: cropY, width: cropW } = frame;

    // High DPI calculation (600 to 1200 DPI for crystal-clear 4K HD output)
    const sourceRatio = img.naturalWidth / Math.max(1, cropW);
    const targetDpi = Math.max(600, Math.min(1200, Math.round(sourceRatio * 300)));

    const outW = Math.round((template.widthMm / 25.4) * targetDpi);
    const outH = Math.round((template.heightMm / 25.4) * targetDpi);

    const scale = outW / cropW;
    const t = state.transform;

    const out = document.createElement('canvas');
    out.width = outW;
    out.height = outH;
    const ctx = out.getContext('2d');
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Fill background color
    ctx.fillStyle = state.bgConfig.color || '#ffffff';
    ctx.fillRect(0, 0, outW, outH);

    // Exact uniform coordinate transformation
    const cx = (CANVAS_WIDTH / 2 + t.pan.x - cropX) * scale;
    const cy = (CANVAS_HEIGHT / 2 + t.pan.y - cropY) * scale;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((t.rotation * Math.PI) / 180);
    ctx.scale((t.flipX ? -1 : 1) * scale, (t.flipY ? -1 : 1) * scale);

    const dw = img.naturalWidth * t.zoom;
    const dh = img.naturalHeight * t.zoom;
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();

    return out.toDataURL('image/png');
  }, [isCropPanel, cropBox, fixedTemplateBox, template.widthMm, template.heightMm, state.transform, state.bgConfig.color]);

  // Real-time update to store croppedImage preview for PrintPreview
  useEffect(() => {
    const url = getCroppedDataUrl();
    if (url && url !== state.croppedImage) {
      dispatch({ type: 'SET_CROPPED_IMAGE', payload: url });
    }
  }, [cropBox, state.transform, state.bgConfig.color, template.id, getCroppedDataUrl, dispatch]);

  // ── Load Working Image ──────────────────────────────────────────────────
  const loadSrc = useCallback((src: string) => {
    if (loadedSrcRef.current === src && imgRef.current) {
      draw();
      return;
    }
    const img = new Image();
    if (!src.startsWith('blob:') && !src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      loadedSrcRef.current = src;

      const scaleX = activeFrame.width / img.naturalWidth;
      const scaleY = activeFrame.height / img.naturalHeight;
      const z = Math.max(scaleX, scaleY);

      dispatch({
        type: 'SET_TRANSFORM',
        payload: {
          zoom: z,
          pan: { x: 0, y: 0 },
          rotation: 0,
          flipX: false,
          flipY: false,
        },
      });
    };
    img.src = src;
  }, [activeFrame.width, activeFrame.height, dispatch, draw]);

  useEffect(() => {
    const imgSrc = state.processedImage || state.originalImage;
    if (imgSrc) loadSrc(imgSrc);
  }, [state.processedImage, state.originalImage, loadSrc]);

  // ── Smart Face Center Positioning ──────────────────────────────────────
  useEffect(() => {
    if (!state.cropArea || !imgRef.current) return;
    const imgW = imgRef.current.naturalWidth;
    const imgH = imgRef.current.naturalHeight;
    const coverScale = Math.max(activeFrame.width / imgW, activeFrame.height / imgH);
    const z = coverScale;

    dispatch({
      type: 'SET_TRANSFORM',
      payload: { zoom: z, pan: { x: 0, y: 0 }, rotation: 0, flipX: false, flipY: false },
    });
  }, [state.cropArea, activeFrame.width, activeFrame.height, dispatch]);

  // ── Interactive Dragging (Crop box, Handles & Image Pan) ────────────────
  type DragMode =
    | { type: 'handle'; handle: string; startX: number; startY: number; initCrop: { x: number; y: number; width: number; height: number } }
    | { type: 'crop'; startX: number; startY: number; initCrop: { x: number; y: number; width: number; height: number } }
    | { type: 'pan'; startX: number; startY: number; initPan: { x: number; y: number } };

  const dragModeRef = useRef<DragMode | null>(null);

  const handleMouseDownHandle = (handleId: string, e: React.MouseEvent) => {
    if (!isCropPanel) return;
    dragModeRef.current = {
      type: 'handle',
      handle: handleId,
      startX: e.clientX,
      startY: e.clientY,
      initCrop: { ...cropBox },
    };
  };

  const handleMouseDownCropBox = (e: React.MouseEvent) => {
    if (!isCropPanel) return;
    dragModeRef.current = {
      type: 'crop',
      startX: e.clientX,
      startY: e.clientY,
      initCrop: { ...cropBox },
    };
  };

  const isLockedStep = ['compliance', 'layout', 'export'].includes(state.activePanel);

  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if (isLockedStep) return;
    dragModeRef.current = {
      type: 'pan',
      startX: e.clientX,
      startY: e.clientY,
      initPan: { ...state.transform.pan },
    };
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        setMousePos({ x: Math.round(e.clientX - rect.left), y: Math.round(e.clientY - rect.top) });
      }

      const mode = dragModeRef.current;
      if (!mode || isLockedStep) return;

      const dx = e.clientX - mode.startX;
      const dy = e.clientY - mode.startY;

      if (mode.type === 'pan') {
        dispatch({
          type: 'SET_TRANSFORM',
          payload: { pan: { x: mode.initPan.x + dx, y: mode.initPan.y + dy } },
        });
      } else if (mode.type === 'crop' && isCropPanel) {
        const newX = Math.max(0, Math.min(CANVAS_WIDTH - mode.initCrop.width, mode.initCrop.x + dx));
        const newY = Math.max(0, Math.min(CANVAS_HEIGHT - mode.initCrop.height, mode.initCrop.y + dy));
        setCropBox({ ...mode.initCrop, x: newX, y: newY });
      } else if (mode.type === 'handle' && isCropPanel) {
        const { handle, initCrop } = mode;
        let newW = initCrop.width;
        let newH = initCrop.height;
        let newX = initCrop.x;
        let newY = initCrop.y;
        const aspect = templateAspect;

        if (handle === 'se') {
          newW = Math.max(80, initCrop.width + dx);
          newH = newW / aspect;
        } else if (handle === 'nw') {
          newW = Math.max(80, initCrop.width - dx);
          newH = newW / aspect;
          newX = initCrop.x + (initCrop.width - newW);
          newY = initCrop.y + (initCrop.height - newH);
        } else if (handle === 'sw') {
          newW = Math.max(80, initCrop.width - dx);
          newH = newW / aspect;
          newX = initCrop.x + (initCrop.width - newW);
        } else if (handle === 'ne') {
          newW = Math.max(80, initCrop.width + dx);
          newH = newW / aspect;
          newY = initCrop.y + (initCrop.height - newH);
        } else if (handle === 'e' || handle === 'w') {
          newW = Math.max(80, handle === 'e' ? initCrop.width + dx : initCrop.width - dx);
          newH = newW / aspect;
          if (handle === 'w') {
            newX = initCrop.x + (initCrop.width - newW);
          }
          newY = initCrop.y + (initCrop.height - newH) / 2;
        } else if (handle === 'n' || handle === 's') {
          newH = Math.max(80, handle === 's' ? initCrop.height + dy : initCrop.height - dy);
          newW = newH * aspect;
          if (handle === 'n') {
            newY = initCrop.y + (initCrop.height - newH);
          }
          newX = initCrop.x + (initCrop.width - newW) / 2;
        }

        // Clamp inside canvas bounds while preserving target template aspect ratio
        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
        if (newX + newW > CANVAS_WIDTH) {
          newW = CANVAS_WIDTH - newX;
          newH = newW / aspect;
        }
        if (newY + newH > CANVAS_HEIGHT) {
          newH = CANVAS_HEIGHT - newY;
          newW = newH * aspect;
        }

        setCropBox({ x: newX, y: newY, width: newW, height: newH });
      }
    };

    const onMouseUp = () => {
      dragModeRef.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isCropPanel, isLockedStep, templateAspect, dispatch]);

  // ── Wheel Zoom ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isLockedStep) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.max(0.05, Math.min(10, state.transform.zoom * factor));
      dispatch({ type: 'SET_TRANSFORM', payload: { zoom: newZoom } });
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [state.transform.zoom, isLockedStep, dispatch]);

  // ── Control Functions for Editor Handle ─────────────────────────────────
  const zoomIn = useCallback(() => {
    if (isLockedStep) return;
    dispatch({ type: 'SET_TRANSFORM', payload: { zoom: Math.min(10, state.transform.zoom * 1.15) } });
  }, [state.transform.zoom, isLockedStep, dispatch]);

  const zoomOut = useCallback(() => {
    if (isLockedStep) return;
    dispatch({ type: 'SET_TRANSFORM', payload: { zoom: Math.max(0.05, state.transform.zoom * 0.85) } });
  }, [state.transform.zoom, isLockedStep, dispatch]);

  const rotateLeft = useCallback(() => {
    if (isLockedStep) return;
    dispatch({ type: 'SET_TRANSFORM', payload: { rotation: ((state.transform.rotation - 90) + 360) % 360 } });
  }, [state.transform.rotation, isLockedStep, dispatch]);

  const rotateRight = useCallback(() => {
    if (isLockedStep) return;
    dispatch({ type: 'SET_TRANSFORM', payload: { rotation: (state.transform.rotation + 90) % 360 } });
  }, [state.transform.rotation, isLockedStep, dispatch]);

  const flipH = useCallback(() => {
    if (isLockedStep) return;
    dispatch({ type: 'SET_TRANSFORM', payload: { flipX: !state.transform.flipX } });
  }, [state.transform.flipX, isLockedStep, dispatch]);

  const flipV = useCallback(() => {
    if (isLockedStep) return;
    dispatch({ type: 'SET_TRANSFORM', payload: { flipY: !state.transform.flipY } });
  }, [state.transform.flipY, isLockedStep, dispatch]);

  const fitToCanvas = useCallback(() => {
    if (isLockedStep || !imgRef.current) return;
    const img = imgRef.current;
    const s = Math.min((activeFrame.width * 0.9) / img.naturalWidth, (activeFrame.height * 0.9) / img.naturalHeight);
    dispatch({ type: 'SET_TRANSFORM', payload: { zoom: s, pan: { x: 0, y: 0 } } });
  }, [activeFrame.width, activeFrame.height, isLockedStep, dispatch]);

  const resetTransform = useCallback(() => {
    if (isLockedStep) return;
    dispatch({
      type: 'SET_TRANSFORM',
      payload: { zoom: 1, pan: { x: 0, y: 0 }, rotation: 0, flipX: false, flipY: false },
    });
  }, [isLockedStep, dispatch]);

  // Expose handle to parent
  useEffect(() => {
    if (editorRef) {
      editorRef.current = { zoomIn, zoomOut, rotateLeft, rotateRight, flipH, flipV, fitToCanvas, resetTransform, loadSrc, getCroppedDataUrl };
    }
  }, [editorRef, zoomIn, zoomOut, rotateLeft, rotateRight, flipH, flipV, fitToCanvas, resetTransform, loadSrc, getCroppedDataUrl]);

  const hasImage = !!state.originalImage;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800 text-[10px] shrink-0">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="font-bold text-slate-300">{template.flag} {template.name}</span>
          <span>·</span>
          <span>{template.widthMm}×{template.heightMm}mm · 300 DPI</span>
          <span className="ml-2 px-2 py-0.5 rounded bg-indigo-900/50 text-indigo-300 font-semibold border border-indigo-700/40">
            {isCropPanel ? '✂️ Custom Resizable Crop Mode' : '📐 Fixed Template Mode'}
          </span>
        </div>
        <div className="flex items-center gap-4 text-slate-500">
          <span>Zoom: <span className="text-slate-300">{Math.round(state.transform.zoom * 100)}%</span></span>
          <span>X:<span className="text-slate-300">{mousePos.x}</span> Y:<span className="text-slate-300">{mousePos.y}</span></span>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative flex-1 overflow-hidden flex items-center justify-center bg-[#0f0f1a]"
        style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #141428 0%, #0a0a12 100%)' }}>
        {/* Checkerboard */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='10' height='10' fill='%23888'/%3E%3Crect x='10' y='10' width='10' height='10' fill='%23888'/%3E%3C/svg%3E")`, backgroundSize: '20px 20px' }}
        />

        <div className="relative shadow-2xl shadow-black/60">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="block rounded-md cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDownCanvas}
            style={{ imageRendering: 'auto' }}
          />

          {/* SVG Overlays (Only shown during Crop & Template editing steps) */}
          {['crop', 'template'].includes(state.activePanel) && (
            <>
              {state.showGrid && (
                <GridOverlay width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
              )}
              {(state.showFaceGuide || state.showSafeArea || state.showEyeLine || state.showShoulderGuide) && (
                <FaceGuideOverlay
                  canvasWidth={CANVAS_WIDTH} canvasHeight={CANVAS_HEIGHT}
                  cropX={activeFrame.x} cropY={activeFrame.y} cropW={activeFrame.width} cropH={activeFrame.height}
                  faceGuideScale={state.faceGuideScale}
                  faceGuideYOffset={state.faceGuideYOffset}
                  shoulderGuideYOffset={state.shoulderGuideYOffset}
                  showFaceGuide={state.showFaceGuide}
                  showSafeArea={state.showSafeArea}
                  showEyeLine={state.showEyeLine}
                  showShoulderGuide={state.showShoulderGuide}
                  eyeYRatio={template.eyePosition.yRatio}
                  isCropPanel={isCropPanel}
                  onHandleMouseDown={isCropPanel ? handleMouseDownHandle : undefined}
                  onCropBoxMouseDown={isCropPanel ? handleMouseDownCropBox : undefined}
                />
              )}
            </>
          )}
        </div>

        {/* Large Prominent Central Upload Box */}
        {!hasImage && (
          <div
            onDrop={handleCenterDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center p-8 z-30 cursor-pointer bg-slate-950/80 backdrop-blur-sm group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/bmp"
              onChange={handleCenterFileChange}
              className="hidden"
            />
            <div className="w-full max-w-lg bg-slate-900/90 border-2 border-dashed border-indigo-500/40 rounded-3xl p-10 text-center space-y-5 transition-all group-hover:border-indigo-400 group-hover:bg-indigo-950/20 group-hover:scale-[1.02] shadow-2xl shadow-indigo-950/50">
              <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto transition-transform group-hover:scale-110">
                <Upload className="w-10 h-10 text-indigo-400" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-white tracking-wide">
                  ছবি আপলোড করতে ড্র্যাগ ও ড্রপ করুন বা ক্লিক করুন
                </h3>
                <p className="text-xs font-semibold text-slate-400">
                  Drop photo here or click anywhere in this box to upload
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <span className="px-3 py-1 rounded-full bg-slate-800 text-indigo-300 text-[11px] font-bold border border-slate-700">
                  JPEG · PNG · WebP · BMP
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-800 text-amber-300 text-[11px] font-bold border border-slate-700">
                  Ctrl+V to Paste
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Processing Loading Overlay */}
        {state.isProcessing && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-slate-900/90 border border-indigo-500/40 rounded-3xl p-8 text-center space-y-4 shadow-2xl shadow-indigo-950/60 max-w-xs">
              <div className="w-16 h-16 mx-auto relative flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10 animate-ping" />
                <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-pink-500 border-b-violet-500 border-l-transparent animate-spin" />
                <span className="text-xl animate-pulse">✨</span>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-extrabold text-white tracking-wide">
                  {state.processingMessage || 'AI Background Removal…'}
                </p>
                <p className="text-[11px] text-indigo-300/80 font-medium animate-pulse">
                  Cleaning edges & removing green halos
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick tool strip */}
      <div className="flex items-center gap-1 px-3 py-1 bg-slate-900/80 border-t border-slate-800 shrink-0 flex-wrap">
        {[
          { label: '−', title: 'Zoom Out', onClick: zoomOut },
          { label: '+', title: 'Zoom In', onClick: zoomIn },
          { label: '↺', title: 'Rotate Left', onClick: rotateLeft },
          { label: '↻', title: 'Rotate Right', onClick: rotateRight },
          { label: '⇄', title: 'Flip H', onClick: flipH },
          { label: '⇅', title: 'Flip V', onClick: flipV },
          { label: '⊡', title: 'Fit', onClick: fitToCanvas },
          { label: '⟳', title: 'Reset', onClick: resetTransform },
        ].map(({ label, title, onClick }) => (
          <button key={title} onClick={onClick} title={isLockedStep ? 'Photo is locked. Select Crop or Template step to adjust photo.' : title} disabled={!hasImage || isLockedStep}
            className="px-2.5 py-1 rounded text-[11px] font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            {label}
          </button>
        ))}
        <div className="w-px h-4 bg-slate-800 mx-1" />
        {/* Keyboard shortcut chips — only shown in interactive (non-locked) mode */}
        {!isLockedStep && hasImage && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { keys: '↑↓←→', desc: 'Nudge' },
              { keys: 'Shift+↑↓←→', desc: 'Nudge ×5' },
              { keys: '+/−', desc: 'Zoom' },
              { keys: 'R', desc: 'Rotate' },
              { keys: 'Ctrl+Z', desc: 'Undo' },
              { keys: 'Ctrl+Y', desc: 'Redo' },
            ].map(({ keys, desc }) => (
              <div key={keys} className="flex items-center gap-1 text-[9px]">
                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono font-bold leading-tight">{keys}</span>
                <span className="text-slate-600">{desc}</span>
              </div>
            ))}
          </div>
        )}
        {isLockedStep && (
          <span className="text-[10px] text-slate-600 ml-1">🔒 Locked (go to Crop/Template to adjust photo)</span>
        )}
      </div>
    </div>
  );
}
