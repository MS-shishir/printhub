// ── Passport Studio — Zustand-like Store using Context + useReducer ────────
// Full undo/redo stack, separate history entries per operation.

import React, { createContext, useContext, useReducer, useCallback, useMemo, useRef } from 'react';
import {
  PassportState, PassportTemplate, LayoutConfig, BackgroundConfig,
  CropArea, FaceDetectionResult, ImageTransform, HistoryEntry, ToastMessage,
} from '../types/passport-types';
import { getPaperSize } from '../services/template.service';

// ─── Action Types ────────────────────────────────────────────────────────────
type PassportAction =
  | { type: 'SET_IMAGE'; payload: { original: string; processed: string; name: string; naturalWidth: number; naturalHeight: number } }
  | { type: 'SET_PROCESSED_IMAGE'; payload: string }
  | { type: 'SET_CROPPED_IMAGE'; payload: string | null }
  | { type: 'SET_TEMPLATE'; payload: { templateId: string; customWidth?: number; customHeight?: number } }
  | { type: 'SET_BG_CONFIG'; payload: Partial<BackgroundConfig> }
  | { type: 'SET_FACE_DETECTION'; payload: { result: FaceDetectionResult | null; error?: string | null; detecting?: boolean } }
  | { type: 'SET_CROP_AREA'; payload: CropArea | null }
  | { type: 'SET_AUTO_CROP_APPLIED'; payload: boolean }
  | { type: 'SET_TRANSFORM'; payload: Partial<ImageTransform> }
  | { type: 'SET_LAYOUT'; payload: Partial<LayoutConfig> }
  | { type: 'SET_ACTIVE_STEP'; payload: number }
  | { type: 'SET_ACTIVE_PANEL'; payload: string }
  | { type: 'SET_ACTIVE_TOOL'; payload: string }
  | { type: 'SET_GUIDE_VISIBILITY'; payload: Partial<Pick<PassportState, 'showFaceGuide' | 'showSafeArea' | 'showGrid' | 'showEyeLine' | 'showShoulderGuide'>> }
  | { type: 'SET_FACE_GUIDE_SCALE'; payload: number }
  | { type: 'SET_FACE_GUIDE_OFFSET'; payload: number }
  | { type: 'SET_SHOULDER_GUIDE_OFFSET'; payload: number }
  | { type: 'SET_PROCESSING'; payload: { isProcessing: boolean; message?: string } }
  | { type: 'ADD_TOAST'; payload: ToastMessage }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'ADD_TO_PROCESSED_TRAY'; payload: { name: string; croppedUrl: string; templateId: string; widthMm: number; heightMm: number; defaultCopies?: number } }
  | { type: 'UPDATE_TRAY_ITEM_COPIES'; payload: { id: string; copies: number } }
  | { type: 'TOGGLE_TRAY_ITEM_ROTATION'; payload: string }
  | { type: 'MOVE_TRAY_ITEM'; payload: { id: string; direction: 'up' | 'down' } }
  | { type: 'REMOVE_FROM_TRAY'; payload: string }
  | { type: 'CLEAR_PROCESSED_TRAY' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET' }
  | { type: 'RESTORE_HISTORY'; payload: HistoryEntry };

// ─── Initial State ────────────────────────────────────────────────────────────
const initialState: PassportState = {
  originalImage: null,
  processedImage: null,
  croppedImage: null,
  photoName: '',
  imageNaturalWidth: 0,
  imageNaturalHeight: 0,
  processedTray: [],

  selectedTemplateId: 'bd_pp',
  customWidth: 40,
  customHeight: 50,

  bgConfig: {
    type: 'solid',
    color: '#ffffff',
    keyColor: { r: 255, g: 255, b: 255 },
    tolerance: 40,
    feather: 5,
    isEnabled: false,
  },

  faceDetection: null,
  isDetectingFace: false,
  faceDetectionError: null,

  cropArea: null,
  autoCropApplied: false,

  transform: {
    zoom: 1,
    pan: { x: 0, y: 0 },
    rotation: 0,
    flipX: false,
    flipY: false,
  },

  layoutConfig: {
    copies: 8,
    paperSize: getPaperSize('a4'),
    customWidthMm: 210,
    customHeightMm: 297,
    gapMm: 3,
    marginMm: 10,
    alignPos: 'top-left',
    showCutlines: true,
    showPrintHeader: true,
    autoFit: true,
  },

  activeStep: 1,
  activePanel: 'upload',
  activeTool: 'select',
  showFaceGuide: true,
  showSafeArea: true,
  showGrid: false,
  showEyeLine: true,
  showShoulderGuide: true,
  faceGuideScale: 0.65,
  faceGuideYOffset: 0,
  shoulderGuideYOffset: 0,

  isProcessing: false,
  processingMessage: '',

  toasts: [],
  history: [],
  historyIndex: -1,
};

// Helper to push history entry on state modifications
function pushHistory(state: PassportState, nextState: Partial<PassportState>): PassportState {
  const transform = nextState.transform || state.transform;
  const cropArea = nextState.cropArea !== undefined ? nextState.cropArea : state.cropArea;
  const bgConfig = nextState.bgConfig || state.bgConfig;

  const currentEntry = { transform, cropArea, bgConfig, timestamp: Date.now() };
  const newHistory = [...state.history.slice(0, state.historyIndex + 1), currentEntry];
  if (newHistory.length > 30) newHistory.shift();

  return {
    ...state,
    ...nextState,
    history: newHistory,
    historyIndex: newHistory.length - 1,
  };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
function passportReducer(state: PassportState, action: PassportAction): PassportState {
  switch (action.type) {
    case 'SET_IMAGE': {
      const initEntry = {
        transform: initialState.transform,
        cropArea: null,
        bgConfig: { ...state.bgConfig, isEnabled: true },
        timestamp: Date.now(),
      };
      return {
        ...state,
        originalImage: action.payload.original,
        processedImage: action.payload.processed,
        photoName: action.payload.name,
        imageNaturalWidth: action.payload.naturalWidth,
        imageNaturalHeight: action.payload.naturalHeight,
        cropArea: null,
        autoCropApplied: false,
        faceDetection: null,
        transform: initialState.transform,
        bgConfig: { ...state.bgConfig, isEnabled: true },
        activeStep: 2,
        activePanel: 'crop',
        history: [initEntry],
        historyIndex: 0,
      };
    }

    case 'SET_PROCESSED_IMAGE':
      return { ...state, processedImage: action.payload };

    case 'SET_CROPPED_IMAGE':
      return { ...state, croppedImage: action.payload };

    case 'SET_TEMPLATE':
      return {
        ...state,
        selectedTemplateId: action.payload.templateId,
        customWidth: action.payload.customWidth ?? state.customWidth,
        customHeight: action.payload.customHeight ?? state.customHeight,
      };

    case 'SET_BG_CONFIG': {
      const newBg = { ...state.bgConfig, ...action.payload };
      return pushHistory(state, { bgConfig: newBg });
    }

    case 'SET_FACE_DETECTION':
      return {
        ...state,
        faceDetection: action.payload.result,
        isDetectingFace: action.payload.detecting ?? false,
        faceDetectionError: action.payload.error ?? null,
      };

    case 'SET_CROP_AREA':
      return pushHistory(state, { cropArea: action.payload });

    case 'SET_AUTO_CROP_APPLIED':
      return { ...state, autoCropApplied: action.payload };

    case 'SET_TRANSFORM': {
      const newPan = action.payload.pan
        ? { ...state.transform.pan, ...action.payload.pan }
        : state.transform.pan;
      const newTransform = {
        ...state.transform,
        ...action.payload,
        pan: newPan,
        zoom: action.payload.zoom != null
          ? Math.max(0.05, Math.min(10, action.payload.zoom))
          : state.transform.zoom,
        rotation: action.payload.rotation != null
          ? ((action.payload.rotation % 360) + 360) % 360
          : state.transform.rotation,
      };
      return pushHistory(state, { transform: newTransform });
    }

    case 'SET_LAYOUT':
      return { ...state, layoutConfig: { ...state.layoutConfig, ...action.payload } };

    case 'SET_ACTIVE_STEP':
      return { ...state, activeStep: action.payload };

    case 'SET_ACTIVE_PANEL':
      return { ...state, activePanel: action.payload };

    case 'SET_ACTIVE_TOOL':
      return { ...state, activeTool: action.payload as any };

    case 'SET_GUIDE_VISIBILITY':
      return { ...state, ...action.payload };

    case 'SET_FACE_GUIDE_SCALE':
      return { ...state, faceGuideScale: Math.max(0.1, Math.min(1, action.payload)) };

    case 'SET_FACE_GUIDE_OFFSET':
      return { ...state, faceGuideYOffset: action.payload };

    case 'SET_SHOULDER_GUIDE_OFFSET':
      return { ...state, shoulderGuideYOffset: action.payload };

    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload.isProcessing, processingMessage: action.payload.message ?? '' };

    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts.slice(-4), action.payload] };

    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.payload) };

    case 'ADD_TO_PROCESSED_TRAY': {
      const newItem = {
        id: `tray_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: action.payload.name || 'Processed Photo',
        croppedUrl: action.payload.croppedUrl,
        templateId: action.payload.templateId,
        widthMm: action.payload.widthMm,
        heightMm: action.payload.heightMm,
        copies: action.payload.defaultCopies || 4,
        addedAt: new Date().toLocaleTimeString(),
      };
      return {
        ...state,
        processedTray: [...state.processedTray, newItem],
      };
    }

    case 'UPDATE_TRAY_ITEM_COPIES': {
      return {
        ...state,
        processedTray: state.processedTray.map((item) =>
          item.id === action.payload.id ? { ...item, copies: action.payload.copies } : item
        ),
      };
    }

    case 'TOGGLE_TRAY_ITEM_ROTATION': {
      return {
        ...state,
        processedTray: state.processedTray.map((item) =>
          item.id === action.payload ? { ...item, rotateDegrees: ((item.rotateDegrees || 0) + 90) % 360 } : item
        ),
      };
    }

    case 'MOVE_TRAY_ITEM': {
      const idx = state.processedTray.findIndex((item) => item.id === action.payload.id);
      if (idx === -1) return state;
      const targetIdx = action.payload.direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= state.processedTray.length) return state;
      const newTray = [...state.processedTray];
      const [moved] = newTray.splice(idx, 1);
      newTray.splice(targetIdx, 0, moved);
      return { ...state, processedTray: newTray };
    }

    case 'REMOVE_FROM_TRAY': {
      return {
        ...state,
        processedTray: state.processedTray.filter((item) => item.id !== action.payload),
      };
    }

    case 'CLEAR_PROCESSED_TRAY': {
      return {
        ...state,
        processedTray: [],
      };
    }

    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      const entry = state.history[newIndex];
      return {
        ...state,
        transform: entry.transform,
        cropArea: entry.cropArea,
        bgConfig: entry.bgConfig,
        historyIndex: newIndex,
      };
    }

    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      const entry = state.history[newIndex];
      return {
        ...state,
        transform: entry.transform,
        cropArea: entry.cropArea,
        bgConfig: entry.bgConfig,
        historyIndex: newIndex,
      };
    }

    case 'RESTORE_HISTORY': {
      const entry = action.payload;
      const newHistory = [...state.history.slice(0, state.historyIndex + 1), entry];
      return {
        ...state,
        transform: entry.transform,
        cropArea: entry.cropArea,
        bgConfig: entry.bgConfig,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }

    case 'RESET':
      return { ...initialState };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface PassportStore {
  state: PassportState;
  dispatch: React.Dispatch<PassportAction>;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  pushHistory: () => void;
  showToast: (message: string, type: ToastMessage['type'], duration?: number) => void;
}

const PassportStoreContext = createContext<PassportStore | null>(null);

export function PassportStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(passportReducer, initialState);

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  const pushHistory = useCallback(() => {
    // Snapshot current state into history
    const entry: HistoryEntry = {
      transform: { ...state.transform },
      cropArea: state.cropArea ? { ...state.cropArea } : null,
      bgConfig: { ...state.bgConfig },
      timestamp: Date.now(),
    };
    dispatch({ type: 'RESTORE_HISTORY', payload: entry });
  }, [state.transform, state.cropArea, state.bgConfig]);

  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'info', duration = 3000) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    dispatch({ type: 'ADD_TOAST', payload: { id, message, type, duration } });
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: id }), duration);
  }, []);

  const value = useMemo(
    () => ({ state, dispatch, undo, redo, reset, pushHistory, showToast }),
    [state, undo, redo, reset, pushHistory, showToast]
  );

  return React.createElement(
    PassportStoreContext.Provider,
    { value },
    children
  );
}

export function usePassportStore(): PassportStore {
  const ctx = useContext(PassportStoreContext);
  if (!ctx) throw new Error('usePassportStore must be used within PassportStoreProvider');
  return ctx;
}