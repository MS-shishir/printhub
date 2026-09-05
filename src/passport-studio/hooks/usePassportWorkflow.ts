// ── usePassportWorkflow Hook ──────────────────────────────────────────────
// Orchestrates the full 8-step passport photo workflow.
// Handles file input, face detection trigger, background processing, etc.

import { useCallback, useEffect, useRef } from 'react';
import { usePassportStore } from '../store';
import { useFaceDetection } from './useFaceDetection';
import { getTemplate } from '../services/template.service';
import { applyChromaKey, sampleCornerBackgroundColor, enhancePhotoTo4K, fillBackground } from '../services/image-processing.service';

export function usePassportWorkflow() {
  const { state, dispatch, showToast } = usePassportStore();
  const { detect, isDetecting } = useFaceDetection();
  const bgDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Step 2: Face Detection + Auto Crop ───────────────────────────────────
  // Defined FIRST so loadImageFile can reference it via a stable ref.
  const triggerFaceDetection = useCallback(async (
    src: string,
    naturalW: number,
    naturalH: number
  ) => {
    const template = getTemplate(state.selectedTemplateId, state.customWidth, state.customHeight);
    dispatch({ type: 'SET_FACE_DETECTION', payload: { result: null, detecting: true } });
    dispatch({ type: 'SET_PROCESSING', payload: { isProcessing: true, message: 'Detecting face…' } });

    try {
      const { face, crop } = await detect(src, naturalW ? template : template, naturalW, naturalH);

      dispatch({ type: 'SET_FACE_DETECTION', payload: { result: face, detecting: false } });

      if (face && crop) {
        dispatch({ type: 'SET_CROP_AREA', payload: crop });
        dispatch({ type: 'SET_AUTO_CROP_APPLIED', payload: true });
        const confidence = Math.round(face.confidence * 100);
        showToast(
          face.confidence > 0
            ? `Face detected (${confidence}% confidence). Auto-crop applied.`
            : 'Using smart center crop.',
          'success'
        );
      } else {
        showToast('Using standard center crop.', 'info');
      }
    } catch (err) {
      console.warn('[PassportWorkflow] Face detection error:', err);
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: { isProcessing: false } });
      dispatch({ type: 'SET_FACE_DETECTION', payload: { result: null, detecting: false } });
    }
  }, [state.selectedTemplateId, detect, dispatch, showToast]);

  // Stable ref so loadImageFile/loadImageFromDataUrl can call the latest
  // triggerFaceDetection without creating a circular dependency.
  const triggerFaceDetectionRef = useRef(triggerFaceDetection);
  useEffect(() => {
    triggerFaceDetectionRef.current = triggerFaceDetection;
  }, [triggerFaceDetection]);

  // ── Step 1: Load Image ──────────────────────────────────────────────────
  const loadImageFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file (JPEG, PNG, etc.)', 'error');
      return;
    }

    const blobUrl = URL.createObjectURL(file);

    // Get natural dimensions
    const img = new Image();
    img.src = blobUrl;
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });

    dispatch({
      type: 'SET_IMAGE',
      payload: {
        original: blobUrl,
        processed: blobUrl,
        name: file.name,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      },
    });

    // Auto-remove background by sampling background colors & running AI Subject Segmentation
    try {
      const keyRgb = await sampleCornerBackgroundColor(blobUrl);
      dispatch({
        type: 'SET_BG_CONFIG',
        payload: { type: 'ai_removed', keyColor: keyRgb, isEnabled: true, tolerance: 40, feather: 6 },
      });
    } catch (e) {
      console.warn('[Auto BG Sample]', e);
    }

    dispatch({
      type: 'UPSERT_TRAY_ITEM',
      payload: {
        name: file.name,
        croppedUrl: blobUrl,
        templateId: state.selectedTemplateId || 'bd_pp',
        widthMm: 40,
        heightMm: 50,
        defaultCopies: 4,
      },
    });

    dispatch({ type: 'SET_ACTIVE_PANEL', payload: 'crop' });
    showToast(`Background Auto-Removed! Crop & adjust for ${file.name}`, 'success');

    // Auto-trigger face detection via ref to avoid circular dependency
    triggerFaceDetectionRef.current(blobUrl, img.naturalWidth, img.naturalHeight);
  }, [dispatch, showToast, state.selectedTemplateId]);

  const loadImageFromDataUrl = useCallback(async (dataUrl: string, name = 'pasted_image.png') => {
    const img = new Image();
    img.src = dataUrl;
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });

    dispatch({
      type: 'SET_IMAGE',
      payload: {
        original: dataUrl,
        processed: dataUrl,
        name,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      },
    });

    try {
      const keyRgb = await sampleCornerBackgroundColor(dataUrl);
      dispatch({
        type: 'SET_BG_CONFIG',
        payload: { type: 'ai_removed', keyColor: keyRgb, isEnabled: true, tolerance: 40, feather: 6 },
      });
    } catch (e) {
      console.warn('[Auto BG Sample]', e);
    }

    dispatch({
      type: 'UPSERT_TRAY_ITEM',
      payload: {
        name,
        croppedUrl: dataUrl,
        templateId: state.selectedTemplateId || 'bd_pp',
        widthMm: 40,
        heightMm: 50,
        defaultCopies: 4,
      },
    });

    dispatch({ type: 'SET_ACTIVE_PANEL', payload: 'crop' });
    showToast('Background auto-removed! Crop step active.', 'success');
    triggerFaceDetectionRef.current(dataUrl, img.naturalWidth, img.naturalHeight);
  }, [dispatch, showToast, state.selectedTemplateId]);

  // ── Recalculate smart crop when template changes ──────────────────────
  const prevTemplateRef = useRef(state.selectedTemplateId);
  useEffect(() => {
    if (prevTemplateRef.current !== state.selectedTemplateId) {
      prevTemplateRef.current = state.selectedTemplateId;
      if (state.originalImage && state.imageNaturalWidth > 0) {
        triggerFaceDetection(state.originalImage, state.imageNaturalWidth, state.imageNaturalHeight);
      }
    }
  }, [state.selectedTemplateId, state.originalImage, state.imageNaturalWidth, state.imageNaturalHeight, triggerFaceDetection]);

  // ── Step 3: Chroma Key Background Removal (debounced) ─────────────────────
  // NOTE: Does NOT re-run when changing background preset color (state.bgConfig.color)
  // or when background has already been AI-removed.
  useEffect(() => {
    const activeImg = state.croppedImage || state.originalImage;
    if (!activeImg || !state.bgConfig.isEnabled || state.bgConfig.type === 'ai_removed') {
      if (!state.bgConfig.isEnabled && activeImg) {
        dispatch({ type: 'SET_PROCESSED_IMAGE', payload: activeImg });
      }
      return;
    }

    if (bgDebounce.current) clearTimeout(bgDebounce.current);
    bgDebounce.current = setTimeout(async () => {
      try {
        dispatch({ type: 'SET_PROCESSING', payload: { isProcessing: true, message: '✨ De-Fringing Chroma Key…' } });
        const result = await applyChromaKey(activeImg, state.bgConfig, state.faceDetection);
        dispatch({ type: 'SET_PROCESSED_IMAGE', payload: result });
      } catch (e) {
        console.warn('[BG Removal]', e);
      } finally {
        dispatch({ type: 'SET_PROCESSING', payload: { isProcessing: false } });
      }
    }, 200);

    return () => {
      if (bgDebounce.current) clearTimeout(bgDebounce.current);
    };
  }, [
    state.originalImage,
    state.bgConfig.isEnabled,
    state.bgConfig.type,
    state.bgConfig.keyColor,
    state.bgConfig.tolerance,
    state.bgConfig.feather,
    // state.bgConfig.color intentionally excluded so preset color selection is instant!
  ]);

  // ── Paste from Clipboard ─────────────────────────────────────────────────
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          await loadImageFile(file);
          break;
        }
      }
    }
  }, [loadImageFile]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  const handleKeyboard = useCallback((e: KeyboardEvent) => {
    // Ignore input text fields
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }

    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    // Undo: Ctrl+Z / Cmd+Z (without Shift)
    if (isCtrlOrCmd && key === 'z' && !e.shiftKey) {
      e.preventDefault();
      dispatch({ type: 'UNDO' });
      return;
    }

    // Redo: Ctrl+Y / Cmd+Y / Ctrl+Shift+Z / Cmd+Shift+Z
    if ((isCtrlOrCmd && key === 'y') || (isCtrlOrCmd && key === 'z' && e.shiftKey)) {
      e.preventDefault();
      dispatch({ type: 'REDO' });
      return;
    }

    // Save / Export File: Ctrl+S / Cmd+S -> Open Export & Download Panel
    if (isCtrlOrCmd && key === 's') {
      e.preventDefault();
      dispatch({ type: 'SET_ACTIVE_PANEL', payload: 'export' });
      showToast('ফাইল সেভ/ডাউনলোড অপশন ওপেন হয়েছে (Export & Download)', 'info');
      return;
    }

    // Interactive Photo Nudge & Transform Shortcuts (in Canvas Modes)
    if (['crop', 'template'].includes(state.activePanel)) {
      const step = e.shiftKey ? 20 : 4;
      if (key === 'arrowup') {
        e.preventDefault();
        dispatch({ type: 'SET_TRANSFORM', payload: { pan: { x: state.transform.pan.x, y: state.transform.pan.y - step } } });
      } else if (key === 'arrowdown') {
        e.preventDefault();
        dispatch({ type: 'SET_TRANSFORM', payload: { pan: { x: state.transform.pan.x, y: state.transform.pan.y + step } } });
      } else if (key === 'arrowleft') {
        e.preventDefault();
        dispatch({ type: 'SET_TRANSFORM', payload: { pan: { x: state.transform.pan.x - step, y: state.transform.pan.y } } });
      } else if (key === 'arrowright') {
        e.preventDefault();
        dispatch({ type: 'SET_TRANSFORM', payload: { pan: { x: state.transform.pan.x + step, y: state.transform.pan.y } } });
      } else if (key === '+' || key === '=') {
        e.preventDefault();
        dispatch({ type: 'SET_TRANSFORM', payload: { zoom: Math.min(10, state.transform.zoom * 1.1) } });
      } else if (key === '-' || key === '_') {
        e.preventDefault();
        dispatch({ type: 'SET_TRANSFORM', payload: { zoom: Math.max(0.05, state.transform.zoom * 0.9) } });
      } else if (key === 'r' && !isCtrlOrCmd) {
        e.preventDefault();
        dispatch({ type: 'SET_TRANSFORM', payload: { rotation: (state.transform.rotation + 90) % 360 } });
      }
    }
  }, [state.activePanel, state.transform, dispatch]);

  // ── 4K Photo Enhance & Unblur ──────────────────────────────────────────
  const enhanceImageTo4K = useCallback(async (options = { upscaleTo4K: true, unblurAmount: 0.75 }) => {
    const targetImage = state.processedImage || state.originalImage;
    if (!targetImage) return;

    dispatch({
      type: 'SET_PROCESSING',
      payload: { isProcessing: true, message: '✨ 4K AI Enhancing & Unblurring Photo…' },
    });

    try {
      const enhanced = await enhancePhotoTo4K(targetImage, options);

      // After enhancement (especially via FastAPI), the result may be a transparent PNG.
      // Composite with the current background color so it shows proper background.
      const currentBgColor = state.bgConfig.color || '#ffffff';
      const withBackground = await fillBackground(enhanced, currentBgColor);

      dispatch({ type: 'SET_PROCESSED_IMAGE', payload: withBackground });
      showToast('Photo enhanced to 4K Ultra HD & blur removed!', 'success');
    } catch (err) {
      console.warn('[Photo Enhance Error]', err);
      showToast('Failed to enhance photo.', 'error');
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: { isProcessing: false } });
    }
  }, [state.processedImage, state.originalImage, state.bgConfig.color, dispatch, showToast]);

  return {
    loadImageFile,
    loadImageFromDataUrl,
    triggerFaceDetection,
    enhanceImageTo4K,
    handlePaste,
    handleKeyboard,
    isDetecting,
  };
}
