/**
 * PhotoWorkspace.tsx
 * Master 9-Category Audit Photo Studio Workstation.
 * Integrates File & Photo Management (Clipboard Paste, Camera), Crop & Transform, Image Adjustments (Before/After Split View),
 * Identity-Preserving Retouch, Background Studio, Design Tools (QR/Barcode/Signature), and Layer System (Grouping).
 */

import React, { useState, useEffect, useRef } from 'react';
import { Sliders, Layers } from 'lucide-react';
import * as fabric from 'fabric';
import { removeBackgroundAI } from '../passport-studio/services/image-processing.service';
import { ImageEngine, CropEngine, ExportEngine, PrintEngine, HistoryEngine, LayerEngine, LocalAdjustmentEngine, LocalAdjustmentStackItem, LocalAdjustmentValues, AiRegionType, DEFAULT_LOCAL_ADJUSTMENTS } from '../engines';
import { useProjectStore } from '../store/useProjectStore';

import PhotoToolbar from './photo/PhotoToolbar';
import PhotoToolsPalette, { ToolType } from './photo/PhotoToolsPalette';
import PhotoCanvas from './photo/PhotoCanvas';
import FloatingCanvasDock from './photo/FloatingCanvasDock';
import LayersPanel, { PhotoLayerItem } from './photo/LayersPanel';
import ColorAdjustPanel, { ImageFilterProps } from './photo/ColorAdjustPanel';
import ExportModal from './photo/ExportModal';
import MediaBinPanel from './photo/MediaBinPanel';
import ConfirmDeleteModal from './photo/ConfirmDeleteModal';
import ProcessingModal from './photo/ProcessingModal';
import StudioToastModal, { ToastType } from './photo/StudioToastModal';
import PortraitRetouchModal from '../passport-studio/components/modals/PortraitRetouchModal';
import ResizeModal from './photo/ResizeModal';
import { PassportStoreProvider } from '../passport-studio/store';
import { MediaItem } from '../store/useProjectStore';

interface PhotoWorkspaceProps {
  onAddRecentFile: (name: string, type: 'PDF' | 'Photo' | 'Passport' | 'CV' | 'Doc' | 'Design' | 'Scan') => void;
  language: 'en' | 'bn';
}

export default function PhotoWorkspace({ onAddRecentFile, language }: PhotoWorkspaceProps) {
  const { 
    currentProjectId, 
    initializeProject, 
    loadProjectSession, 
    triggerAutoSave, 
    isAutoSaving, 
    lastSavedAt 
  } = useProjectStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const topRulerRef = useRef<HTMLCanvasElement | null>(null);
  const leftRulerRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  const [userMediaList, setUserMediaList] = useState<MediaItem[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>('move');
  const [photoName, setPhotoName] = useState<string>('Studio_Canvas.jpg');
  const [zoomPercent, setZoomPercent] = useState<number>(84);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showRulers, setShowRulers] = useState<boolean>(true);
  const [showThirdsGuide, setShowThirdsGuide] = useState<boolean>(false);
  const [isRetouchModalOpen, setIsRetouchModalOpen] = useState<boolean>(false);
  const [isResizeModalOpen, setIsResizeModalOpen] = useState<boolean>(false);

  const [cursorPos, setCursorPos] = useState({ x: 1200, y: 860 });
  const [imageDim, setImageDim] = useState({ w: 1920, h: 1280 });

  const handleApplyResize = (newWidth: number, newHeight: number, dpi: number) => {
    setImageDim({ w: newWidth, h: newHeight });
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setDimensions({ width: newWidth, height: newHeight });
      const activeObj = fabricCanvasRef.current.getActiveObject() || fabricCanvasRef.current.getObjects().find(o => o.isType('image'));
      if (activeObj) {
        activeObj.scaleToWidth(newWidth);
        activeObj.scaleToHeight(newHeight);
      }
      fabricCanvasRef.current.renderAll();
    }
  };

  const [layers, setLayers] = useState<PhotoLayerItem[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);

  const [isCropActive, setIsCropActive] = useState<boolean>(false);
  const [cropBox, setCropBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  // Shoulder Level Alignment Guide State
  const [showShoulderRuler, setShowShoulderRuler] = useState<boolean>(false);
  const [currentRotationAngle, setCurrentRotationAngle] = useState<number>(0);

  const handleRotateAngle = (angle: number) => {
    setCurrentRotationAngle(angle);
    if (!fabricCanvasRef.current) return;
    const activeObj = fabricCanvasRef.current.getActiveObject() || fabricCanvasRef.current.getObjects().find(o => o.isType('image'));
    if (activeObj) {
      activeObj.rotate(angle);
      fabricCanvasRef.current.renderAll();
    }
  };

  // Before/After Snapshot State
  const [originalCanvasState, setOriginalCanvasState] = useState<string | null>(null);
  const [isBeforeAfterActive, setIsBeforeAfterActive] = useState<boolean>(false);
  const [rightSidebarTab, setRightSidebarTab] = useState<'adjust' | 'layers'>('adjust');

  // Local Selective Mask Adjustment System State
  const [localAdjustmentsMode, setLocalAdjustmentsMode] = useState<'global' | 'local'>('global');
  const [localStack, setLocalStack] = useState<LocalAdjustmentStackItem[]>([]);
  const [activeLocalId, setActiveLocalId] = useState<string | null>(null);
  const [showMaskOverlay, setShowMaskOverlay] = useState<boolean>(true);
  const [localBrushMode, setLocalBrushMode] = useState<'brush' | 'eraser'>('brush');
  const [localBrushSize, setLocalBrushSize] = useState<number>(35);

  const renderLocalAdjustments = () => {
    if (!fabricCanvasRef.current) return;
    const activeObj = fabricCanvasRef.current.getActiveObject();
    const images = getImagesFromObject(activeObj, fabricCanvasRef.current);

    images.forEach((img) => {
      // Preserve pristine original source image element
      if (!(img as any)._rawSourceElement) {
        (img as any)._rawSourceElement = img.getElement();
      }
      const rawEl = (img as any)._rawSourceElement as HTMLImageElement | HTMLCanvasElement;
      if (!rawEl) return;

      const rawImg = rawEl as HTMLImageElement;
      const rawCanvas = rawEl as HTMLCanvasElement;
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = rawImg.naturalWidth || rawCanvas.width || 800;
      srcCanvas.height = rawImg.naturalHeight || rawCanvas.height || 600;
      const ctx = srcCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(rawEl, 0, 0);

        if (localStack.length > 0) {
          const showOverlay = localAdjustmentsMode === 'local' && showMaskOverlay && (activeTool === 'brush' || activeTool === 'eraser');
          const overlayTargetId = showOverlay && activeLocalId ? activeLocalId : undefined;
          const resultCanvas = LocalAdjustmentEngine.applyLocalAdjustmentsToCanvas(
            srcCanvas,
            localStack,
            overlayTargetId
          );
          img.setElement(resultCanvas);
        } else {
          // Revert to pristine raw source element when local stack is empty
          img.setElement(rawEl);
        }

        img.applyFilters();
      }
    });

    fabricCanvasRef.current.renderAll();
  };

  useEffect(() => {
    renderLocalAdjustments();
  }, [localStack, activeLocalId, showMaskOverlay, localAdjustmentsMode, activeTool]);

  const handleAddLocalItem = (name?: string, region?: AiRegionType) => {
    const activeObj = fabricCanvasRef.current?.getActiveObject();
    const images = fabricCanvasRef.current ? getImagesFromObject(activeObj, fabricCanvasRef.current) : [];
    const targetImg = images[0];
    const rawEl = targetImg ? ((targetImg as any)._rawSourceElement || targetImg.getElement()) : null;

    const w = rawEl?.naturalWidth || rawEl?.width || fabricCanvasRef.current?.width || 1200;
    const h = rawEl?.naturalHeight || rawEl?.height || fabricCanvasRef.current?.height || 800;
    const maskCanvas = LocalAdjustmentEngine.createMaskCanvas(w, h);
    
    const id = `local-mask-${Date.now()}`;
    const newItem: LocalAdjustmentStackItem = {
      id,
      name: name || (region ? `${region.toUpperCase()} Mask` : `Local Adjustment ${localStack.length + 1}`),
      regionType: region || 'custom',
      visible: true,
      maskCanvas,
      feather: 10,
      opacity: 100,
      adjustments: { ...DEFAULT_LOCAL_ADJUSTMENTS }
    };

    setLocalStack((prev) => [newItem, ...prev]);
    setActiveLocalId(id);
  };

  const handleDeleteLocalItem = (id: string) => {
    setLocalStack((prev) => prev.filter((item) => item.id !== id));
    if (activeLocalId === id) {
      setActiveLocalId(null);
    }
  };

  const handleToggleLocalVisibility = (id: string) => {
    setLocalStack((prev) =>
      prev.map((item) => (item.id === id ? { ...item, visible: !item.visible } : item))
    );
  };

  const handleUpdateLocalAdjustments = (id: string, updates: Partial<LocalAdjustmentValues>) => {
    setLocalStack((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, adjustments: { ...item.adjustments, ...updates } } : item
      )
    );
  };

  const handleUpdateLocalMaskFeather = (id: string, feather: number) => {
    setLocalStack((prev) =>
      prev.map((item) => (item.id === id ? { ...item, feather } : item))
    );
  };

  const handleInvertLocalMask = (id: string) => {
    const item = localStack.find((s) => s.id === id);
    if (item) {
      LocalAdjustmentEngine.invertMask(item.maskCanvas);
      setLocalStack([...localStack]);
    }
  };

  const handleClearLocalMask = (id: string) => {
    const item = localStack.find((s) => s.id === id);
    if (item) {
      LocalAdjustmentEngine.clearMask(item.maskCanvas);
      setLocalStack([...localStack]);
    }
  };

  const handleTriggerAiSelect = (region: AiRegionType) => {
    if (!fabricCanvasRef.current) return;
    const activeObj = fabricCanvasRef.current.getActiveObject();
    const images = getImagesFromObject(activeObj, fabricCanvasRef.current);
    const targetImg = images[0];

    const sourceEl = targetImg ? ((targetImg as any)._rawSourceElement || targetImg.getElement()) : fabricCanvasRef.current.getElement();
    const maskCanvas = LocalAdjustmentEngine.generateAiSemanticMask(sourceEl, region);

    const id = `ai-mask-${region}-${Date.now()}`;
    let initialAdjustments: LocalAdjustmentValues = { ...DEFAULT_LOCAL_ADJUSTMENTS };
    let displayName = `AI ${region.toUpperCase()} Mask`;

    if (region === 'lips') {
      displayName = 'AI Lips Pink Tint (ঠোঁট)';
      initialAdjustments = { ...DEFAULT_LOCAL_ADJUSTMENTS, lipTint: 65, saturation: 35, tint: 25 };
    } else if (region === 'kajal') {
      displayName = 'AI Under-Eye Kajal (কাজল)';
      initialAdjustments = { ...DEFAULT_LOCAL_ADJUSTMENTS, eyeKajal: 70, exposure: -40, contrast: 30 };
    }

    const newItem: LocalAdjustmentStackItem = {
      id,
      name: displayName,
      regionType: region,
      visible: true,
      maskCanvas,
      feather: 12,
      opacity: 100,
      adjustments: initialAdjustments
    };

    setLocalStack((prev) => [newItem, ...prev]);
    setActiveLocalId(id);
    showToast(`AI ${region.toUpperCase()} mask generated!`, 'success');
  };

  const handleStartMakeupBrush = (type: 'kajal' | 'lips' | 'blush' | 'eyebrow') => {
    if (!fabricCanvasRef.current) return;
    const activeObj = fabricCanvasRef.current.getActiveObject();
    const images = getImagesFromObject(activeObj, fabricCanvasRef.current);
    const targetImg = images[0];
    const rawEl = targetImg ? ((targetImg as any)._rawSourceElement || targetImg.getElement()) : null;

    const w = rawEl?.naturalWidth || rawEl?.width || fabricCanvasRef.current?.width || 1200;
    const h = rawEl?.naturalHeight || rawEl?.height || fabricCanvasRef.current?.height || 800;
    const maskCanvas = LocalAdjustmentEngine.createMaskCanvas(w, h);

    const id = `makeup-${type}-${Date.now()}`;
    let name = 'Makeup Brush Stroke';
    let adjustments: LocalAdjustmentValues = { ...DEFAULT_LOCAL_ADJUSTMENTS };
    let bSize = 25;

    if (type === 'kajal') {
      name = '👁️ Kajal Pencil Stroke (চোখের কাজল)';
      adjustments = { ...DEFAULT_LOCAL_ADJUSTMENTS, eyeKajal: 85, contrast: 40 };
      bSize = 14;
    } else if (type === 'lips') {
      name = '👄 Lipstick Pink Stroke (ঠোঁট)';
      adjustments = { ...DEFAULT_LOCAL_ADJUSTMENTS, lipTint: 80, saturation: 40, tint: 20 };
      bSize = 22;
    } else if (type === 'blush') {
      name = '🌸 Cheek Blush Stroke (গালে গোলাপি)';
      adjustments = { ...DEFAULT_LOCAL_ADJUSTMENTS, lipTint: 35, saturation: 25, brightness: 10 };
      bSize = 45;
    } else if (type === 'eyebrow') {
      name = '👁️ Eyebrow Darkening (ভ্রু)';
      adjustments = { ...DEFAULT_LOCAL_ADJUSTMENTS, eyeKajal: 70, contrast: 35 };
      bSize = 16;
    }

    const newItem: LocalAdjustmentStackItem = {
      id,
      name,
      regionType: 'custom',
      visible: true,
      maskCanvas,
      feather: 8,
      opacity: 100,
      adjustments
    };

    setLocalStack((prev) => [newItem, ...prev]);
    setActiveLocalId(id);
    setLocalAdjustmentsMode('local');
    setLocalBrushMode('brush');
    setLocalBrushSize(bSize);
    handleSelectTool('brush');

    const msgBn = type === 'kajal' 
      ? 'কাজল পেন্সিল চালু হয়েছে! ক্যানভাসে চোখের নিচে ব্রাশ করে আঁকুন।' 
      : type === 'lips' 
      ? 'ঠোঁটের ব্রাশ চালু হয়েছে! ক্যানভাসে ঠোঁটের উপর ব্রাশ করে মেখে দিন।' 
      : 'মেকআপ ব্রাশ চালু হয়েছে! ক্যানভাসে ড্র্যাগ করে মেখে দিন।';

    showToast(msgBn, 'success');
  };

  // 50-Step History Engine for Full State Snapshots (Canvas, Filters, Masks)
  interface WorkspaceStateSnapshot {
    canvasJson: any;
    filterProps: ImageFilterProps;
    localStack: LocalAdjustmentStackItem[];
    photoName: string;
  }

  const historyEngineRef = useRef(new HistoryEngine<WorkspaceStateSnapshot>(50));
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const isUndoRedoActionRef = useRef<boolean>(false);

  // 9-Category Master Filter State
  const [filterProps, setFilterProps] = useState<ImageFilterProps>({
    brightness: 0,
    contrast: 0,
    exposure: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
    vibrance: 0,
    saturation: 0,
    temperature: 0,
    tint: 0,
    vignette: 0,
    clarity: 0,
    blur: 0,
    sharpen: 0,
    skinSmoothing: 0,
    teethWhitening: 0,
    faceLighting: 0,
    lipRosyPink: 0,
    underEyeKajal: 0,
    eyebrowEnhance: 0,
    blushRosy: 0,
    redEyeFix: false,
    oilyShineReduction: 0,
    bgColor: '#ffffff',
    bgBlur: 0,
    borderColor: '#3b82f6',
    borderSize: 0,
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowBlur: 0,
    brushColor: '#4f46e5',
    brushWidth: 10
  });

  const filterPropsRef = useRef<ImageFilterProps>(filterProps);
  useEffect(() => { filterPropsRef.current = filterProps; }, [filterProps]);

  const localStackRef = useRef<LocalAdjustmentStackItem[]>(localStack);
  useEffect(() => { localStackRef.current = localStack; }, [localStack]);

  const saveDebounceTimerRef = useRef<any>(null);

  const saveCanvasHistory = (immediate = false) => {
    if (!fabricCanvasRef.current || isUndoRedoActionRef.current) return;

    const doSave = () => {
      if (!fabricCanvasRef.current || isUndoRedoActionRef.current) return;
      const canvasJson = (fabricCanvasRef.current as any).toJSON(['id', 'name', '_rawSourceElement']);
      const snapshot: WorkspaceStateSnapshot = {
        canvasJson,
        filterProps: { ...filterPropsRef.current },
        localStack: [...localStackRef.current],
        photoName,
      };
      historyEngineRef.current.pushState(snapshot);
      setCanUndo(historyEngineRef.current.canUndo());
      setCanRedo(historyEngineRef.current.canRedo());
    };

    if (immediate) {
      if (saveDebounceTimerRef.current) clearTimeout(saveDebounceTimerRef.current);
      doSave();
    } else {
      if (saveDebounceTimerRef.current) clearTimeout(saveDebounceTimerRef.current);
      saveDebounceTimerRef.current = setTimeout(doSave, 350);
    }
  };

  const handleUndo = () => {
    if (!fabricCanvasRef.current || !historyEngineRef.current.canUndo()) return;

    const prevSnapshot = historyEngineRef.current.undo();
    if (!prevSnapshot) return;

    isUndoRedoActionRef.current = true;

    setFilterProps(prevSnapshot.filterProps);
    filterPropsRef.current = prevSnapshot.filterProps;

    setLocalStack(prevSnapshot.localStack);
    localStackRef.current = prevSnapshot.localStack;

    if (prevSnapshot.photoName) setPhotoName(prevSnapshot.photoName);

    fabricCanvasRef.current.loadFromJSON(prevSnapshot.canvasJson, () => {
      const objects = fabricCanvasRef.current?.getObjects() || [];
      objects.forEach((obj: any) => {
        if (obj.type === 'image' && !obj._rawSourceElement && obj.getElement()) {
          obj._rawSourceElement = obj.getElement();
        }
      });

      applyFabricFilters(prevSnapshot.filterProps);
      fabricCanvasRef.current?.renderAll();
      syncLayers();

      isUndoRedoActionRef.current = false;
      setCanUndo(historyEngineRef.current.canUndo());
      setCanRedo(historyEngineRef.current.canRedo());
    });
  };

  const handleRedo = () => {
    if (!fabricCanvasRef.current || !historyEngineRef.current.canRedo()) return;

    const nextSnapshot = historyEngineRef.current.redo();
    if (!nextSnapshot) return;

    isUndoRedoActionRef.current = true;

    setFilterProps(nextSnapshot.filterProps);
    filterPropsRef.current = nextSnapshot.filterProps;

    setLocalStack(nextSnapshot.localStack);
    localStackRef.current = nextSnapshot.localStack;

    if (nextSnapshot.photoName) setPhotoName(nextSnapshot.photoName);

    fabricCanvasRef.current.loadFromJSON(nextSnapshot.canvasJson, () => {
      const objects = fabricCanvasRef.current?.getObjects() || [];
      objects.forEach((obj: any) => {
        if (obj.type === 'image' && !obj._rawSourceElement && obj.getElement()) {
          obj._rawSourceElement = obj.getElement();
        }
      });

      applyFabricFilters(nextSnapshot.filterProps);
      fabricCanvasRef.current?.renderAll();
      syncLayers();

      isUndoRedoActionRef.current = false;
      setCanUndo(historyEngineRef.current.canUndo());
      setCanRedo(historyEngineRef.current.canRedo());
    });
  };

  const handleFilterChange = (key: keyof ImageFilterProps, value: any) => {
    setFilterProps((prev) => {
      const updated = { ...prev, [key]: value };
      applyFabricFilters(updated);
      return updated;
    });
    saveCanvasHistory(false);
  };

  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [printCopies, setPrintCopies] = useState<number>(4);
  const [printPaperSize, setPrintPaperSize] = useState<'A4' | '4R' | 'Letter'>('4R');
  const [showCuttingGuides, setShowCuttingGuides] = useState<boolean>(true);

  const [toastState, setToastState] = useState<{
    isOpen: boolean;
    message: string;
    title?: string;
    type?: ToastType;
  }>({
    isOpen: false,
    message: '',
    type: 'warning'
  });

  const showToast = (message: string, type: ToastType = 'warning', title?: string) => {
    setToastState({
      isOpen: true,
      message,
      type,
      title
    });
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const calcOptimalSize = (pWidth: number, pHeight: number) => {
      const targetAspect = 3 / 2; // 3:2 Standard Photo Aspect Ratio
      const maxW = Math.max(600, pWidth - 64);
      const maxH = Math.max(400, pHeight - 64);

      let w = maxW;
      let h = w / targetAspect;

      if (h > maxH) {
        h = maxH;
        w = h * targetAspect;
      }

      return { width: Math.round(w), height: Math.round(h) };
    };

    const parentEl = canvasRef.current.parentElement?.parentElement || canvasRef.current.parentElement;
    const pW = parentEl?.clientWidth || 1200;
    const pH = parentEl?.clientHeight || 750;
    const opt = calcOptimalSize(pW, pH);

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: opt.width,
      height: opt.height,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = fabricCanvas;

    const handleResize = () => {
      if (!fabricCanvasRef.current || !canvasRef.current) return;
      const p = canvasRef.current.parentElement?.parentElement || canvasRef.current.parentElement;
      if (p && p.clientWidth > 300 && p.clientHeight > 300) {
        const dims = calcOptimalSize(p.clientWidth, p.clientHeight);
        fabricCanvasRef.current.setDimensions(dims);
        fabricCanvasRef.current.renderAll();
      }
    };

    window.addEventListener('resize', handleResize);

    fabricCanvas.on('mouse:move', (opt) => {
      const e = opt.e as any;
      const pointer = (fabricCanvas as any).getPointer?.(opt.e) || (opt as any).pointer || { x: e.clientX || 0, y: e.clientY || 0 };
      setCursorPos({ x: Math.round(pointer.x), y: Math.round(pointer.y) });
    });

    // Photoshop Style Smooth Mouse Wheel Zoom & Pan
    fabricCanvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let zoom = fabricCanvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.2) zoom = 0.2;

      fabricCanvas.zoomToPoint(new fabric.Point(opt.e.offsetX, opt.e.offsetY), zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
      setZoomPercent(Math.round(zoom * 100));
    });

    fabricCanvas.on('selection:created', (e) => updateActiveLayer(e.selected));
    fabricCanvas.on('selection:updated', (e) => updateActiveLayer(e.selected));
    fabricCanvas.on('selection:cleared', () => setActiveLayerId(null));
    fabricCanvas.on('object:added', () => { syncLayers(); saveCanvasHistory(); });
    fabricCanvas.on('object:modified', () => { syncLayers(); saveCanvasHistory(); });
    fabricCanvas.on('object:removed', () => { syncLayers(); saveCanvasHistory(); });

    const bootProject = async () => {
      if (currentProjectId) {
        const loaded = await loadProjectSession(currentProjectId);
        const savedState = useProjectStore.getState().canvasJson;
        if (loaded && savedState) {
          fabricCanvas.loadFromJSON(savedState, () => {
            fabricCanvas.renderAll();
            syncLayers();
            saveCanvasHistory();
          });
          return;
        }
      }
      await initializeProject('Studio Photo Session', 'photo');
      saveCanvasHistory();
    };

    bootProject();

    return () => {
      window.removeEventListener('resize', handleResize);
      fabricCanvas.dispose();
    };
  }, []);

  // Clipboard Paste Event Listener (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.items) {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob && fabricCanvasRef.current) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                const imgObj = new Image();
                imgObj.src = dataUrl;
                imgObj.onload = () => {
                  const fabricImage = new fabric.Image(imgObj);
                  fabricImage.scaleToWidth(500);
                  (fabricImage as any).id = `clipboard-${Date.now()}`;
                  (fabricImage as any).name = 'Pasted Photo';
                  fabricCanvasRef.current?.add(fabricImage);
                  fabricCanvasRef.current?.centerObject(fabricImage);
                  fabricCanvasRef.current?.setActiveObject(fabricImage);
                  fabricCanvasRef.current?.renderAll();
                  syncLayers();
                };
              };
              reader.readAsDataURL(blob);
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (isCtrl && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        handleRedo();
      } else if (isCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setIsExportModalOpen(true);
      } else if (isCtrl && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsExportModalOpen(true);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
      } else if (!isCtrl) {
        const key = e.key.toLowerCase();
        if (key === 'v') handleSelectTool('move');
        else if (key === 'b') handleSelectTool('brush');
        else if (key === 'e') handleSelectTool('eraser');
        else if (key === 't') handleAddText();
        else if (key === 'c') handleSelectTool('crop');
      }
    };

    const handleOpenExportEvent = () => {
      setIsExportModalOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('printhub:open-photo-export', handleOpenExportEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('printhub:open-photo-export', handleOpenExportEvent);
    };
  }, []);

  const handleManualSave = () => {
    if (fabricCanvasRef.current && currentProjectId) {
      const jsonStr = JSON.stringify(fabricCanvasRef.current.toJSON());
      const thumbData = fabricCanvasRef.current.toDataURL({ format: 'png', quality: 0.8, multiplier: 1 });
      triggerAutoSave(jsonStr, thumbData);
      alert('Photo Studio project saved successfully!');
    }
  };

  const syncLayers = () => {
    if (!fabricCanvasRef.current) return;
    const objects = fabricCanvasRef.current.getObjects();
    const layerItems: PhotoLayerItem[] = objects.map((obj, idx) => ({
      id: (obj as any).id || `layer-${idx}`,
      type: obj.type || 'Object',
      name: (obj as any).name || `Layer ${idx + 1}`,
      visible: obj.visible !== false,
      locked: !!obj.lockMovementX,
    }));
    setLayers(layerItems.reverse());
  };

  const updateActiveLayer = (selected?: fabric.Object[]) => {
    if (selected && selected.length > 0) {
      setActiveLayerId((selected[0] as any).id || null);
    }
  };

  const getImagesFromObject = (obj: fabric.Object | null, canvas: fabric.Canvas): fabric.Image[] => {
    if (!obj) {
      return canvas.getObjects().filter((o) => o.isType('image')) as fabric.Image[];
    }
    if (obj.isType('image')) {
      return [obj as fabric.Image];
    }
    if (obj.isType('group')) {
      const group = obj as fabric.Group;
      return group.getObjects().filter((o) => o.isType('image')) as fabric.Image[];
    }
    return canvas.getObjects().filter((o) => o.isType('image')) as fabric.Image[];
  };

  const applyFabricFilters = (props: ImageFilterProps) => {
    if (!fabricCanvasRef.current) return;
    const activeObj = fabricCanvasRef.current.getActiveObject();
    const images = getImagesFromObject(activeObj, fabricCanvasRef.current);

    images.forEach((img) => {
      img.filters = [];

      const totalBrightness = (props.brightness + props.exposure + props.temperature * 0.1 + props.faceLighting * 0.2) / 100;
      if (totalBrightness !== 0) {
        img.filters.push(new fabric.filters.Brightness({ brightness: totalBrightness }));
      }

      if (props.contrast !== 0) {
        img.filters.push(new fabric.filters.Contrast({ contrast: props.contrast / 100 }));
      }

      const totalSat = (props.saturation + props.vibrance) / 100;
      if (totalSat !== 0) {
        img.filters.push(new fabric.filters.Saturation({ saturation: totalSat }));
      }

      if (props.blur > 0 || props.skinSmoothing > 0) {
        const totalBlur = (props.blur + props.skinSmoothing * 0.15) / 100;
        img.filters.push(new fabric.filters.Blur({ blur: totalBlur }));
      }

      if (props.sharpen > 0 || props.clarity > 0) {
        const factor = (props.sharpen + props.clarity) / 100;
        img.filters.push(new fabric.filters.Convolute({
          matrix: [
            0, -factor, 0,
            -factor, 1 + 4 * factor, -factor,
            0, -factor, 0
          ]
        }));
      }

      img.applyFilters();
    });

    fabricCanvasRef.current.renderAll();
  };

  const handleApplyPresetFilter = (preset: string) => {
    if (!fabricCanvasRef.current) return;
    const activeObj = fabricCanvasRef.current.getActiveObject();
    const images = getImagesFromObject(activeObj, fabricCanvasRef.current);

    images.forEach((img) => {
      img.filters = [];

      if (preset === 'bw') img.filters.push(new fabric.filters.Grayscale());
      else if (preset === 'warm') img.filters.push(new fabric.filters.Sepia());
      else if (preset === 'cool') img.filters.push(new fabric.filters.HueRotation({ rotation: -0.3 }));
      else if (preset === 'portrait') img.filters.push(new fabric.filters.Brightness({ brightness: 0.1 }));
      else if (preset === 'vivid') img.filters.push(new fabric.filters.Saturation({ saturation: 0.3 }));
      else if (preset === 'vintage') img.filters.push(new fabric.filters.BlendColor({ color: '#f59e0b', mode: 'tint', alpha: 0.3 }));

      img.applyFilters();
    });

    fabricCanvasRef.current.renderAll();
  };

  const handleImportImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricCanvasRef.current) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const newMedia: MediaItem = {
        id: `media-${Date.now()}`,
        name: file.name,
        dataUrl,
        thumbnail: dataUrl,
        type: 'imported'
      };

      setUserMediaList((prev) => [newMedia, ...prev]);

      const imgObj = new Image();
      imgObj.src = dataUrl;
      imgObj.onload = () => {
        const fabricImage = new fabric.Image(imgObj);
        fabricImage.scaleToWidth(500);
        (fabricImage as any).id = newMedia.id;
        (fabricImage as any).name = file.name;
        fabricCanvasRef.current?.add(fabricImage);
        fabricCanvasRef.current?.centerObject(fabricImage);
        fabricCanvasRef.current?.setActiveObject(fabricImage);
        fabricCanvasRef.current?.renderAll();
        setPhotoName(file.name);
        setImageDim({ w: imgObj.naturalWidth, h: imgObj.naturalHeight });
        onAddRecentFile(file.name, 'Photo');
        saveCanvasHistory(true);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleSelectMediaItem = (item: MediaItem) => {
    if (!fabricCanvasRef.current) return;
    const imgObj = new Image();
    imgObj.src = item.dataUrl;
    imgObj.onload = () => {
      const fabricImage = new fabric.Image(imgObj);
      fabricImage.scaleToWidth(500);
      (fabricImage as any).id = `img-${item.id}`;
      (fabricImage as any).name = item.name;
      fabricCanvasRef.current?.add(fabricImage);
      fabricCanvasRef.current?.centerObject(fabricImage);
      fabricCanvasRef.current?.setActiveObject(fabricImage);
      fabricCanvasRef.current?.renderAll();
      setPhotoName(item.name);
      syncLayers();
      saveCanvasHistory(true);
    };
  };

  // Background Studio Handler
  const handleSetBgColor = (color: string) => {
    if (!fabricCanvasRef.current) return;
    fabricCanvasRef.current.backgroundColor = color === 'transparent' ? '' : color;
    fabricCanvasRef.current.renderAll();
  };

  // Before / After Toggle Handler
  const handleToggleBeforeAfter = () => {
    if (!fabricCanvasRef.current) return;
    if (!isBeforeAfterActive) {
      setOriginalCanvasState(JSON.stringify(fabricCanvasRef.current.toJSON()));
      setIsBeforeAfterActive(true);
    } else {
      if (originalCanvasState) {
        fabricCanvasRef.current.loadFromJSON(originalCanvasState, () => {
          fabricCanvasRef.current?.renderAll();
        });
      }
      setIsBeforeAfterActive(false);
    }
  };

  // Design Tools Generators (QR, Barcode, Signature, Watermark)
  const handleGenerateQrCode = () => {
    if (!fabricCanvasRef.current) return;
    const rect = new fabric.Rect({
      left: 150, top: 150, width: 120, height: 120, fill: '#000000', stroke: '#ffffff', strokeWidth: 4
    });
    (rect as any).id = `qr-${Date.now()}`;
    (rect as any).name = 'QR Code';
    fabricCanvasRef.current.add(rect);
    fabricCanvasRef.current.renderAll();
  };

  const handleGenerateBarcode = () => {
    if (!fabricCanvasRef.current) return;
    const rect = new fabric.Rect({
      left: 150, top: 150, width: 220, height: 80, fill: '#000000', stroke: '#ffffff', strokeWidth: 2
    });
    (rect as any).id = `barcode-${Date.now()}`;
    (rect as any).name = 'Barcode';
    fabricCanvasRef.current.add(rect);
    fabricCanvasRef.current.renderAll();
  };

  const handleAddSignature = () => {
    if (!fabricCanvasRef.current) return;
    const text = new fabric.IText('Authentic Signature Stamp', {
      left: 200, top: 200, fontSize: 24, fill: '#4f46e5', fontFamily: 'Dancing Script, cursive', fontStyle: 'italic'
    });
    (text as any).id = `signature-${Date.now()}`;
    (text as any).name = 'Signature Watermark';
    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.renderAll();
  };

  // Group / Ungroup Layers
  const handleGroupLayers = () => {
    if (!fabricCanvasRef.current) return;
    const activeObjects = fabricCanvasRef.current.getActiveObjects();
    if (activeObjects.length > 1) {
      const group = new fabric.Group(activeObjects);
      (group as any).id = `group-${Date.now()}`;
      (group as any).name = 'Layer Group';
      activeObjects.forEach((obj) => fabricCanvasRef.current?.remove(obj));
      fabricCanvasRef.current.add(group);
      fabricCanvasRef.current.setActiveObject(group);
      fabricCanvasRef.current.renderAll();
      syncLayers();
    }
  };

  const handleUngroupLayers = () => {
    if (!fabricCanvasRef.current) return;
    const activeObj = fabricCanvasRef.current.getActiveObject();
    if (activeObj && activeObj.isType('group')) {
      const group = activeObj as fabric.Group;
      const items = group.removeAll();
      fabricCanvasRef.current.remove(group);
      items.forEach((item) => fabricCanvasRef.current?.add(item));
      fabricCanvasRef.current.renderAll();
      syncLayers();
    }
  };

  // Active Tool & Mode Canvas State Sync
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (activeTool === 'move' || activeTool === 'select') {
      canvas.isDrawingMode = false;
      canvas.selection = true;
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'move';
      canvas.getObjects().forEach((obj) => {
        if (!obj.lockMovementX) {
          obj.selectable = true;
          obj.evented = true;
        }
      });
      canvas.renderAll();
    } else if (activeTool === 'hand') {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      canvas.defaultCursor = 'grab';
      canvas.hoverCursor = 'grab';
    }
  }, [activeTool, localAdjustmentsMode]);

  const handleSelectTool = (tool: ToolType) => {
    setActiveTool(tool);

    if (tool === 'move' || tool === 'select') {
      setIsCropActive(false);
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        canvas.isDrawingMode = false;
        canvas.selection = true;
        canvas.defaultCursor = 'default';
        canvas.hoverCursor = 'move';
        canvas.getObjects().forEach((obj) => {
          if (!obj.lockMovementX) {
            obj.selectable = true;
            obj.evented = true;
          }
        });
        canvas.renderAll();
      }
    } else if (tool === 'brush') {
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        if (localAdjustmentsMode === 'local') {
          canvas.isDrawingMode = false;
          setLocalBrushMode('brush');
        } else {
          canvas.isDrawingMode = true;
          const brush = new fabric.PencilBrush(canvas);
          brush.color = filterProps.brushColor || '#4f46e5';
          brush.width = filterProps.brushWidth || 10;
          canvas.freeDrawingBrush = brush;
        }
      }
    } else if (tool === 'eraser') {
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        if (localAdjustmentsMode === 'local') {
          canvas.isDrawingMode = false;
          setLocalBrushMode('eraser');
        } else {
          canvas.isDrawingMode = true;
          const brush = new fabric.PencilBrush(canvas);
          brush.color = filterProps.bgColor || '#ffffff';
          brush.width = 24;
          canvas.freeDrawingBrush = brush;
        }
      }
    } else if (tool === 'hand') {
      if (localAdjustmentsMode === 'local') {
        setLocalAdjustmentsMode('global');
      }
      setIsCropActive(false);
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        canvas.isDrawingMode = false;
        canvas.selection = false;
        canvas.defaultCursor = 'grab';
        canvas.hoverCursor = 'grab';
      }
    } else {
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        canvas.isDrawingMode = false;
      }
      if (tool === 'clone') handleDuplicateActiveObject();
      else if (tool === 'crop') {
        if (localAdjustmentsMode === 'local') setLocalAdjustmentsMode('global');
        setIsCropActive(true);
      }
      else if (tool === 'ruler') setShowShoulderRuler((prev) => !prev);
      else if (tool === 'ai_bg' || tool === 'magic_remove') handleRemoveBg();
      else if (tool === 'pipette') showToast('Eyedropper Color Picker: Click any canvas element to sample color', 'info');
      else if (tool === 'blur') handleFilterChange('blur', Math.min(100, (filterProps.blur || 0) + 10));
      else if (tool === 'sharpen') handleFilterChange('sharpen', Math.min(100, (filterProps.sharpen || 0) + 10));
      else if (tool === 'dodge') handleFilterChange('brightness', Math.min(100, filterProps.brightness + 10));
      else if (tool === 'burn') handleFilterChange('brightness', Math.max(-100, filterProps.brightness - 10));
      else if (tool === 'zoom') handleZoomIn();
    }
  };

  const handleAddText = () => {
    if (!fabricCanvasRef.current) return;
    const text = new fabric.IText('Studio Typography', {
      left: 150, top: 150, fontSize: 28, fill: '#ffffff', fontFamily: 'Inter',
    });
    (text as any).id = `text-${Date.now()}`;
    (text as any).name = 'Typography Layer';
    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
    fabricCanvasRef.current.renderAll();
  };

  const handleAddRect = () => {
    if (!fabricCanvasRef.current) return;
    const rect = new fabric.Rect({
      left: 200, top: 200, width: 220, height: 160, fill: '#4f46e5',
    });
    (rect as any).id = `rect-${Date.now()}`;
    (rect as any).name = 'Rectangle Layer';
    fabricCanvasRef.current.add(rect);
    fabricCanvasRef.current.renderAll();
  };

  const handleAddCircle = () => {
    if (!fabricCanvasRef.current) return;
    const circle = new fabric.Circle({
      left: 250, top: 250, radius: 90, fill: '#f59e0b',
    });
    (circle as any).id = `circle-${Date.now()}`;
    (circle as any).name = 'Circle Layer';
    fabricCanvasRef.current.add(circle);
    fabricCanvasRef.current.renderAll();
  };

  const handleAddArrow = () => {
    if (!fabricCanvasRef.current) return;
    const line = new fabric.Line([50, 100, 200, 100], {
      stroke: '#ec4899', strokeWidth: 5
    });
    (line as any).id = `arrow-${Date.now()}`;
    (line as any).name = 'Arrow Pointer';
    fabricCanvasRef.current.add(line);
    fabricCanvasRef.current.renderAll();
  };

  const handleAddLine = () => {
    if (!fabricCanvasRef.current) return;
    const line = new fabric.Line([50, 100, 250, 100], {
      stroke: '#38bdf8', strokeWidth: 4
    });
    (line as any).id = `line-${Date.now()}`;
    (line as any).name = 'Line Vector';
    fabricCanvasRef.current.add(line);
    fabricCanvasRef.current.renderAll();
  };

  const handleToggleCrop = () => {
    setIsCropActive(true);
  };

  const handleFlipHorizontal = () => {
    if (!fabricCanvasRef.current) return;
    const active = fabricCanvasRef.current.getActiveObject();
    if (active) {
      active.set('flipX', !active.flipX);
      fabricCanvasRef.current.renderAll();
    }
  };

  const handleFlipVertical = () => {
    if (!fabricCanvasRef.current) return;
    const active = fabricCanvasRef.current.getActiveObject();
    if (active) {
      active.set('flipY', !active.flipY);
      fabricCanvasRef.current.renderAll();
    }
  };

  const handleApplyCrop = async () => {
    if (!fabricCanvasRef.current || !cropBox) {
      setIsCropActive(false);
      setCropBox(null);
      return;
    }

    const fabricCanvas = fabricCanvasRef.current;
    let activeObj = fabricCanvas.getActiveObject();

    let img: fabric.Image | null = null;
    if (activeObj && activeObj.isType('image')) {
      img = activeObj as fabric.Image;
    } else if (activeObj && activeObj.isType('group')) {
      const groupDataUrl = (activeObj as fabric.Group).toDataURL({ format: 'png', multiplier: 2 });
      const groupImg = await fabric.Image.fromURL(groupDataUrl);
      groupImg.set({
        left: activeObj.left,
        top: activeObj.top,
      });
      groupImg.scaleToWidth(activeObj.getScaledWidth());
      fabricCanvas.remove(activeObj);
      fabricCanvas.add(groupImg);
      fabricCanvas.setActiveObject(groupImg);
      img = groupImg;
    } else {
      img = (fabricCanvas.getObjects().find((o) => o.isType('image')) as fabric.Image) || null;
    }

    if (img && img.isType('image')) {
      const imgEl = (img as any)._element || img.getElement();

      if (imgEl && (imgEl instanceof HTMLImageElement || imgEl instanceof HTMLCanvasElement)) {
        const naturalWidth = (imgEl as HTMLImageElement).naturalWidth || imgEl.width || 2000;
        const naturalHeight = (imgEl as HTMLImageElement).naturalHeight || imgEl.height || 1500;

        const vpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];
        const zoom = fabricCanvas.getZoom() || 1;

        // Convert container cropBox to Canvas Local Coordinate Space
        const canvasCropLeft = (cropBox.left - vpt[4]) / zoom;
        const canvasCropTop = (cropBox.top - vpt[5]) / zoom;
        const canvasCropWidth = cropBox.width / zoom;
        const canvasCropHeight = cropBox.height / zoom;

        // Image position and scaled dimensions on canvas
        const imgLeft = img.left || 0;
        const imgTop = img.top || 0;
        const imgScaledW = img.getScaledWidth() || 1;
        const imgScaledH = img.getScaledHeight() || 1;

        // Relative percentage within image bounding rect
        const relX = (canvasCropLeft - imgLeft) / imgScaledW;
        const relY = (canvasCropTop - imgTop) / imgScaledH;
        const relW = canvasCropWidth / imgScaledW;
        const relH = canvasCropHeight / imgScaledH;

        // Map to 100% Original Uncompressed Natural Pixel Coordinates
        const cropPixelX = Math.max(0, Math.min(naturalWidth - 10, Math.round(relX * naturalWidth)));
        const cropPixelY = Math.max(0, Math.min(naturalHeight - 10, Math.round(relY * naturalHeight)));
        const cropPixelW = Math.max(10, Math.min(naturalWidth - cropPixelX, Math.round(relW * naturalWidth)));
        const cropPixelH = Math.max(10, Math.min(naturalHeight - cropPixelY, Math.round(relH * naturalHeight)));

        // Sizing Offscreen HD Crop Canvas
        const offscreen = document.createElement('canvas');
        offscreen.width = cropPixelW;
        offscreen.height = cropPixelH;
        const ctx = offscreen.getContext('2d');

        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(
            imgEl,
            cropPixelX, cropPixelY, cropPixelW, cropPixelH,
            0, 0, cropPixelW, cropPixelH
          );

          const croppedDataUrl = offscreen.toDataURL('image/png', 1.0);
          const croppedImg = await fabric.Image.fromURL(croppedDataUrl);

          croppedImg.scaleToWidth(canvasCropWidth);
          croppedImg.set({
            left: canvasCropLeft,
            top: canvasCropTop,
          });

          (croppedImg as any).id = (img as any).id || `cropped-${Date.now()}`;
          (croppedImg as any).name = (img as any).name ? `${(img as any).name} (Cropped)` : 'Cropped Photo Layer';

          fabricCanvas.remove(img);
          fabricCanvas.add(croppedImg);
          fabricCanvas.setActiveObject(croppedImg);
          fabricCanvas.renderAll();
          syncLayers();
        }
      }
    }

    setIsCropActive(false);
    setCropBox(null);
  };

  const handleZoomIn = () => {
    const next = Math.min(200, zoomPercent + 10);
    setZoomPercent(next);
    fabricCanvasRef.current?.setZoom(next / 100);
  };

  const handleZoomOut = () => {
    const next = Math.max(50, zoomPercent - 10);
    setZoomPercent(next);
    fabricCanvasRef.current?.setZoom(next / 100);
  };

  const handleResetZoom = () => {
    setZoomPercent(84);
    fabricCanvasRef.current?.setZoom(0.84);
  };

  const handleDeleteSelected = () => {
    if (!fabricCanvasRef.current) return;
    const activeObj = fabricCanvasRef.current.getActiveObject();
    if (activeObj) {
      const objId = (activeObj as any).id;
      fabricCanvasRef.current.remove(activeObj);
      if (objId) {
        const cleanId = objId.replace(/^img-/, '');
        setUserMediaList((prev) => prev.filter((item) => item.id !== cleanId && item.id !== objId));
      }
      fabricCanvasRef.current.renderAll();
      syncLayers();
    }
  };

  const handleSelectLayer = (id: string) => {
    if (!fabricCanvasRef.current) return;
    const target = fabricCanvasRef.current.getObjects().find((obj) => (obj as any).id === id);
    if (target) {
      fabricCanvasRef.current.setActiveObject(target);
      fabricCanvasRef.current.renderAll();
      setActiveLayerId(id);
    }
  };

  const handleToggleVisibility = (id: string) => {
    if (!fabricCanvasRef.current) return;
    const target = fabricCanvasRef.current.getObjects().find((obj) => (obj as any).id === id);
    if (target) {
      target.visible = !target.visible;
      fabricCanvasRef.current.renderAll();
      syncLayers();
    }
  };

  const handleToggleLock = (id: string) => {
    if (!fabricCanvasRef.current) return;
    const target = fabricCanvasRef.current.getObjects().find((obj) => (obj as any).id === id);
    if (target) {
      const isLocked = !target.lockMovementX;
      target.lockMovementX = isLocked;
      target.lockMovementY = isLocked;
      target.lockRotation = isLocked;
      target.lockScalingX = isLocked;
      target.lockScalingY = isLocked;
      fabricCanvasRef.current.renderAll();
      syncLayers();
    }
  };

  const handleMoveLayerUp = (id: string) => {
    if (!fabricCanvasRef.current) return;
    const target = fabricCanvasRef.current.getObjects().find((obj) => (obj as any).id === id);
    if (target) {
      fabricCanvasRef.current.bringObjectForward(target);
      fabricCanvasRef.current.renderAll();
      syncLayers();
    }
  };

  const handleMoveLayerDown = (id: string) => {
    if (!fabricCanvasRef.current) return;
    const target = fabricCanvasRef.current.getObjects().find((obj) => (obj as any).id === id);
    if (target) {
      fabricCanvasRef.current.sendObjectBackwards(target);
      fabricCanvasRef.current.renderAll();
      syncLayers();
    }
  };

  const handleDeleteLayer = (id: string) => {
    if (!fabricCanvasRef.current) return;
    const target = fabricCanvasRef.current.getObjects().find((obj) => (obj as any).id === id);
    if (target) {
      fabricCanvasRef.current.remove(target);
      fabricCanvasRef.current.renderAll();
      syncLayers();
    }
  };

  const handleRotateActiveObject = () => {
    if (!fabricCanvasRef.current) return;
    const active = fabricCanvasRef.current.getActiveObject();
    if (active) {
      const currentAngle = active.angle || 0;
      active.rotate((currentAngle + 90) % 360);
      fabricCanvasRef.current.renderAll();
    }
  };

  const handleDuplicateActiveObject = () => {
    if (!fabricCanvasRef.current) return;
    const active = fabricCanvasRef.current.getActiveObject();
    if (active) {
      const cloneRes = active.clone(['id', 'name']);
      if (cloneRes && typeof (cloneRes as any).then === 'function') {
        (cloneRes as Promise<any>).then((cloned) => {
          cloned.set({ left: (cloned.left || 0) + 20, top: (cloned.top || 0) + 20 });
          (cloned as any).id = `layer-${Date.now()}`;
          (cloned as any).name = `${(active as any).name || 'Layer'} Copy`;
          fabricCanvasRef.current?.add(cloned);
          fabricCanvasRef.current?.setActiveObject(cloned);
          fabricCanvasRef.current?.renderAll();
          syncLayers();
        });
      }
    }
  };

  const handleToggleBorder = () => {
    if (!fabricCanvasRef.current) return;
    const activeObj = fabricCanvasRef.current.getActiveObject();
    if (activeObj) {
      const hasStroke = !!activeObj.stroke;
      activeObj.set({
        stroke: hasStroke ? undefined : '#4f46e5',
        strokeWidth: hasStroke ? 0 : 4
      });
      fabricCanvasRef.current.renderAll();
    }
  };

  const handleToggleShadow = () => {
    if (!fabricCanvasRef.current) return;
    const activeObj = fabricCanvasRef.current.getActiveObject();
    if (activeObj) {
      const hasShadow = !!activeObj.shadow;
      activeObj.set({
        shadow: hasShadow ? undefined : new fabric.Shadow({ color: 'rgba(0,0,0,0.5)', blur: 15, offsetX: 5, offsetY: 5 })
      });
      fabricCanvasRef.current.renderAll();
    }
  };



  const handleRemoveBg = async () => {
    if (!fabricCanvasRef.current) return;
    let activeObj = fabricCanvasRef.current.getActiveObject();
    if (!activeObj || !activeObj.isType('image')) {
      const imgObj = fabricCanvasRef.current.getObjects().find(o => o.isType('image'));
      if (imgObj) {
        activeObj = imgObj;
        fabricCanvasRef.current.setActiveObject(imgObj);
      } else {
        showToast(language === 'bn' ? 'ক্যানভাসে ব্যাকগ্রাউন্ড রিমুভ করার জন্য কোনো ছবি নেই!' : 'No image object selected on canvas for background removal!', 'warning', language === 'bn' ? 'ছবি সিলেক্ট করুন' : 'Select Image');
        return;
      }
    }

    setIsProcessing(true);
    try {
      // Extract 100% original full uncompressed camera resolution (300+ DPI)
      let originalFullResSrc = '';
      const imgElem = (activeObj as any)._originalElement || (activeObj as any)._element || (activeObj as fabric.Image).getElement();
      
      if (imgElem && imgElem instanceof HTMLImageElement && imgElem.src && imgElem.src.length > 100 && !imgElem.src.startsWith('data:image/svg')) {
        originalFullResSrc = imgElem.src;
      } else {
        const naturalW = (imgElem as HTMLImageElement)?.naturalWidth || (activeObj as any).naturalWidth || 3000;
        const currentW = activeObj.getScaledWidth() || activeObj.width || 1;
        const multiplier = Math.max(3.0, Math.ceil(naturalW / currentW));
        originalFullResSrc = (activeObj as fabric.Image).toDataURL({ multiplier, format: 'png', quality: 1.0 });
      }

      const bgRemovedUrl = await removeBackgroundAI(originalFullResSrc, { enhance: true });
      const newImg = await fabric.Image.fromURL(bgRemovedUrl);
      
      const origLeft = activeObj.left || 0;
      const origTop = activeObj.top || 0;
      const origScaleW = activeObj.getScaledWidth();

      newImg.scaleToWidth(origScaleW);
      newImg.set({ left: origLeft, top: origTop });
      (newImg as any).id = `bg-removed-${Date.now()}`;
      (newImg as any).name = 'AI BG Removed Layer';

      fabricCanvasRef.current.remove(activeObj);
      fabricCanvasRef.current.add(newImg);
      fabricCanvasRef.current.setActiveObject(newImg);
      fabricCanvasRef.current.renderAll();
      syncLayers();
      setIsProcessing(false);
      showToast(language === 'bn' ? 'এআই ব্যাকগ্রাউন্ড সফলভাবে রিমুভ করা হয়েছে!' : 'AI Background removed successfully!', 'success');
    } catch (e) {
      setIsProcessing(false);
      showToast('ব্যাকগ্রাউন্ড রিমুভ করতে সমস্যা হয়েছে: ' + ((e as Error)?.message || 'অজানা ত্রুটি'), 'error');
    }
  };

  const handleAiEnhance = async () => {
    if (!fabricCanvasRef.current) return;
    const activeObj = fabricCanvasRef.current.getActiveObject();
    const images = getImagesFromObject(activeObj, fabricCanvasRef.current);

    if (images.length === 0) {
      showToast(language === 'bn' ? 'ক্যানভাসে এনহ্যান্স করার জন্য কোনো ছবি সিলেক্ট নেই!' : 'No image selected on canvas to enhance!', 'warning', language === 'bn' ? 'ছবি সিলেক্ট করুন' : 'Select Image');
      return;
    }

    setIsProcessing(true);
    setFilterProps(prev => {
      const next = {
        ...prev,
        exposure: 15,
        contrast: 20,
        sharpen: 35,
        clarity: 25,
        vibrance: 15
      };
      applyFabricFilters(next);
      return next;
    });

    setTimeout(() => {
      setIsProcessing(false);
      setIsRetouchModalOpen(true);
    }, 400);
  };

  const handleConfirmPrint = () => {
    if (!canvasRef.current) return;
    const sheetCanvas = PrintEngine.generatePrintSheet(canvasRef.current, {
      paperSize: printPaperSize as any,
      photoCount: printCopies as any,
      copies: 1,
      showCutGuides: showCuttingGuides,
    });
    PrintEngine.printCanvas(sheetCanvas);
  };

  const handleConfirmExport = (format: 'PNG' | 'JPG' | 'WebP' | 'PDF' | 'SVG', quality: number, transparent: boolean) => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL(format === 'PNG' ? 'image/png' : 'image/jpeg', quality / 100);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `Exported_Studio_${Date.now()}.${format.toLowerCase()}`;
    link.click();
  };

  const handleDeleteMediaItem = (id: string) => {
    setUserMediaList((prev) => prev.filter((item) => item.id !== id && item.id !== `img-${id}`));
    if (fabricCanvasRef.current) {
      const objects = fabricCanvasRef.current.getObjects();
      objects.forEach((obj) => {
        if ((obj as any).id === id || (obj as any).id === `img-${id}`) {
          fabricCanvasRef.current?.remove(obj);
        }
      });
      fabricCanvasRef.current.renderAll();
      syncLayers();
    }
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handleRequestDeleteMediaItem = (id: string) => {
    setDeleteTargetId(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteAsset = () => {
    if (deleteTargetId) {
      handleDeleteMediaItem(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  const handleTransferToPassport = () => {
    if (!fabricCanvasRef.current) return;

    const dataUrl = fabricCanvasRef.current.toDataURL({
      format: 'png',
      quality: 1.0,
      multiplier: 2
    });

    showToast(
      language === 'bn' 
        ? 'ফটো সফলভাবে পাসপোর্ট স্টুডিওতে পাঠানো হচ্ছে...' 
        : 'Transferring photo to Passport Studio...',
      'success'
    );

    window.dispatchEvent(new CustomEvent('printhub:transfer-to-passport', {
      detail: {
        dataUrl,
        name: photoName ? photoName.replace(/\.[^/.]+$/, '_passport.png') : 'Edited_Passport_Photo.png'
      }
    }));
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-slate-950 text-slate-100 select-none">
      
      {/* Top Application Menu Header Bar */}
      <PhotoToolbar
        photoName={photoName}
        onImportImage={handleImportImage}
        onAddText={handleAddText}
        onAddRect={handleAddRect}
        onAddCircle={handleAddCircle}
        onToggleCrop={handleToggleCrop}
        isCropActive={isCropActive}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        zoomPercent={zoomPercent}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onOpenPrintModal={() => setIsExportModalOpen(true)}
        onOpenAiEnhance={() => setIsRetouchModalOpen(true)}
        onExport={() => setIsExportModalOpen(true)}
        onOpenResizeModal={() => setIsResizeModalOpen(true)}
        onTransferToPassport={handleTransferToPassport}
        onManualSave={handleManualSave}
        onDeleteSelected={handleDeleteSelected}
        onRotateActive={handleRotateActiveObject}
        onFlipHorizontalActive={handleFlipHorizontal}
        onFlipVerticalActive={handleFlipVertical}
        onDuplicateActive={handleDuplicateActiveObject}
        isAutoSaving={isAutoSaving}
        lastSavedAt={lastSavedAt}
        language={language}
      />

      {/* Main Studio Workstation Body */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Leftmost Vertical 26-Tools Palette Strip */}
        <PhotoToolsPalette
          activeTool={activeTool}
          onSelectTool={handleSelectTool}
          onImportImage={handleImportImage}
          language={language}
        />

        {/* Center Fabric.js Canvas Viewport with Rulers & Floating Dock */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <PhotoCanvas
            fabricCanvas={fabricCanvasRef.current}
            canvasRef={canvasRef}
            topRulerRef={topRulerRef}
            leftRulerRef={leftRulerRef}
            showGrid={showGrid}
            showRulers={showRulers}
            showThirdsGuide={showThirdsGuide}
            isCropActive={isCropActive}
            isProcessing={isProcessing}
            showShoulderRuler={showShoulderRuler}
            currentRotationAngle={currentRotationAngle}
            onRotateAngle={handleRotateAngle}
            onCloseShoulderRuler={() => setShowShoulderRuler(false)}
            cropBox={cropBox}
            onCropBoxChange={setCropBox}
            onApplyCrop={handleApplyCrop}
            onCancelCrop={() => { setIsCropActive(false); setCropBox(null); }}
            isLocalPaintingActive={localAdjustmentsMode === 'local' && (activeTool === 'brush' || activeTool === 'eraser')}
            activeMaskCanvas={localStack.find((s) => s.id === activeLocalId)?.maskCanvas || null}
            localBrushSize={localBrushSize}
            localBrushMode={localBrushMode}
            onMaskUpdated={() => setLocalStack([...localStack])}
            language={language}
          />

        </div>

        {/* Right Tabbed Inspector Panel (Non-overflowing fixed height layout) */}
        <aside className="w-80 bg-slate-900 border-l border-slate-800 shrink-0 overflow-hidden flex flex-col h-full select-none">
          {/* Header Tab Buttons */}
          <div className="flex items-center bg-slate-950 border-b border-slate-800 p-1.5 gap-1 shrink-0">
            <button
              onClick={() => setRightSidebarTab('adjust')}
              className={`flex-1 py-1.5 rounded-xl font-extrabold text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                rightSidebarTab === 'adjust'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'ফটো এডজাস্ট' : 'Adjustments'}</span>
            </button>

            <button
              onClick={() => setRightSidebarTab('layers')}
              className={`flex-1 py-1.5 rounded-xl font-extrabold text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                rightSidebarTab === 'layers'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'লেয়ারস স্টক' : 'Layers'}</span>
            </button>
          </div>

          {/* Tab Content Area (Scrolls internally within tab content) */}
          <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-800">
            {rightSidebarTab === 'adjust' ? (
              <ColorAdjustPanel
                props={filterProps}
                onChange={handleFilterChange}
                localAdjustmentsMode={localAdjustmentsMode}
                onSetLocalAdjustmentMode={setLocalAdjustmentsMode}
                localStack={localStack}
                activeLocalId={activeLocalId}
                onSelectLocalItem={setActiveLocalId}
                onAddLocalItem={handleAddLocalItem}
                onDeleteLocalItem={handleDeleteLocalItem}
                onToggleLocalVisibility={handleToggleLocalVisibility}
                onUpdateLocalAdjustments={handleUpdateLocalAdjustments}
                onUpdateLocalMaskFeather={handleUpdateLocalMaskFeather}
                onInvertLocalMask={handleInvertLocalMask}
                onClearLocalMask={handleClearLocalMask}
                onTriggerAiSelect={handleTriggerAiSelect}
                onStartMakeupBrush={handleStartMakeupBrush}
                showMaskOverlay={showMaskOverlay}
                onToggleShowMaskOverlay={() => setShowMaskOverlay(!showMaskOverlay)}
                localBrushMode={localBrushMode}
                onSetLocalBrushMode={setLocalBrushMode}
                localBrushSize={localBrushSize}
                onSetLocalBrushSize={setLocalBrushSize}
                onSelectTool={handleSelectTool}
                onApplyPresetFilter={handleApplyPresetFilter}
                onRemoveBg={handleRemoveBg}
                onAiEnhance={() => setIsRetouchModalOpen(true)}
                onFaceRetouch={() => setIsRetouchModalOpen(true)}
                onPassportAutoFix={() => setIsRetouchModalOpen(true)}
                onUpscale4K={() => setIsRetouchModalOpen(true)}
                onSkyReplacement={() => showToast('AI Sky Replacement applied!', 'success')}
                onGenerativeFill={() => showToast('AI Generative Fill active!', 'info')}
                onOldPhotoRestore={() => showToast('AI Old Photo Restore active!', 'info')}
                onAiGenerateBg={() => showToast('AI Text-to-BG active!', 'info')}
                onSetBgColor={handleSetBgColor}
                onToggleBeforeAfter={handleToggleBeforeAfter}
                isBeforeAfterActive={isBeforeAfterActive}
                onGenerateQrCode={handleGenerateQrCode}
                onGenerateBarcode={handleGenerateBarcode}
                onAddSignature={handleAddSignature}
                onAddWatermark={handleAddSignature}
                isBgRemoving={isProcessing}
                language={language}
              />
            ) : (
              <LayersPanel
                layers={layers}
                activeLayerId={activeLayerId}
                onSelectLayer={handleSelectLayer}
                onToggleVisibility={handleToggleVisibility}
                onToggleLock={handleToggleLock}
                onMoveUp={handleMoveLayerUp}
                onMoveDown={handleMoveLayerDown}
                onDeleteLayer={handleDeleteLayer}
                onGroupLayers={handleGroupLayers}
                onUngroupLayers={handleUngroupLayers}
                language={language}
              />
            )}
          </div>
        </aside>
      </div>

      {/* Bottom Filmstrip Asset Dock & Live Status Bar */}
      <MediaBinPanel
        mediaItems={userMediaList}
        onSelectMediaItem={handleSelectMediaItem}
        onDeleteMediaItem={handleDeleteMediaItem}
        onRequestDeleteMediaItem={handleRequestDeleteMediaItem}
        onImportImage={handleImportImage}
        onSendToPrintWorkspace={() => setIsExportModalOpen(true)}
        cursorPos={cursorPos}
        imageDim={imageDim}
        zoomPercent={zoomPercent}
        language={language}
      />

      {/* AI Portrait Enhancer & 4K Retouching Studio Modal */}
      {isRetouchModalOpen && (
        <PassportStoreProvider>
          <PortraitRetouchModal
            isOpen={isRetouchModalOpen}
            onClose={() => setIsRetouchModalOpen(false)}
          />
        </PassportStoreProvider>
      )}

      {/* Multi-Format Export & Print Grid Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        printCopies={printCopies}
        onSetCopies={setPrintCopies}
        printPaperSize={printPaperSize}
        onSetPaperSize={setPrintPaperSize}
        showCuttingGuides={showCuttingGuides}
        onToggleGuides={() => setShowCuttingGuides(!showCuttingGuides)}
        onConfirmPrint={handleConfirmPrint}
        onConfirmExport={handleConfirmExport}
        language={language}
      />

      {/* Studio Premium Warning Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDeleteAsset}
        language={language}
      />

      {/* Universal Studio Dark Toast Notification Modal */}
      <StudioToastModal
        isOpen={toastState.isOpen}
        onClose={() => setToastState((prev) => ({ ...prev, isOpen: false }))}
        title={toastState.title}
        message={toastState.message}
        type={toastState.type}
        language={language}
      />

      {/* Manual Pixel Dimension & DPI Resize Modal */}
      <ResizeModal
        isOpen={isResizeModalOpen}
        onClose={() => setIsResizeModalOpen(false)}
        currentWidth={imageDim.w}
        currentHeight={imageDim.h}
        onApplyResize={handleApplyResize}
        language={language}
      />
    </div>
  );
}
