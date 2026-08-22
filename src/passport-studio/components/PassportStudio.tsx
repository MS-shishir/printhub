import React, { useEffect, useRef, useCallback } from 'react';
import { Camera, Undo2, Redo2, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';
import { PassportStoreProvider, usePassportStore } from '../store';
import { usePassportWorkflow } from '../hooks/usePassportWorkflow';
import { PassportStudioProps } from '../types/passport-types';
import LeftSidebar from './LeftSidebar';
import MainCanvas, { CanvasEditorHandle } from './MainCanvas';
import PrintPreview from './PrintPreview';
import RightSidebar from './RightSidebar';
import StatusBar from './StatusBar';

// ─── Toast Renderer ────────────────────────────────────────────────────────
function ToastStack() {
  const { state, dispatch } = usePassportStore();
  if (!state.toasts.length) return null;

  const cfg = {
    success: { icon: <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />, cls: 'bg-emerald-950/95 border-emerald-500/30 text-emerald-100' },
    error:   { icon: <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />,   cls: 'bg-red-950/95 border-red-500/30 text-red-100' },
    warning: { icon: <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />, cls: 'bg-amber-950/95 border-amber-500/30 text-amber-100' },
    info:    { icon: <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />,     cls: 'bg-slate-900/95 border-slate-600/40 text-slate-200' },
  } as const;

  return (
    <div className="fixed bottom-8 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {state.toasts.map((t) => {
        const { icon, cls } = cfg[t.type];
        return (
          <div key={t.id}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border shadow-2xl text-xs font-semibold
              backdrop-blur-sm pointer-events-auto transition-all ${cls}`}>
            {icon}
            <span>{t.message}</span>
            <button onClick={() => dispatch({ type: 'REMOVE_TOAST', payload: t.id })}
              className="ml-2 opacity-50 hover:opacity-100 text-lg leading-none">×</button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Inner Component (needs store context) ────────────────────────────────
function PassportStudioInner({ onAddRecentFile }: PassportStudioProps) {
  const { state, dispatch } = usePassportStore();
  const { handlePaste, handleKeyboard } = usePassportWorkflow();
  const editorRef = useRef<CanvasEditorHandle | null>(null);

  // Register global keyboard + paste handlers & export triggers
  useEffect(() => {
    const handleOpenExport = () => {
      dispatch({ type: 'SET_ACTIVE_PANEL', payload: 'export' });
    };

    document.addEventListener('keydown', handleKeyboard);
    document.addEventListener('paste', handlePaste as EventListener);
    window.addEventListener('printhub:open-passport-export', handleOpenExport);
    return () => {
      document.removeEventListener('keydown', handleKeyboard);
      document.removeEventListener('paste', handlePaste as EventListener);
      window.removeEventListener('printhub:open-passport-export', handleOpenExport);
    };
  }, [handleKeyboard, handlePaste, dispatch]);

  // Report new files to parent
  useEffect(() => {
    if (state.croppedImage && state.photoName && onAddRecentFile) {
      onAddRecentFile(state.photoName, 'Passport');
    }
  }, [state.croppedImage]);

  // Editor controls (passed to sidebar)
  const editorControls = {
    zoomIn:           () => editorRef.current?.zoomIn(),
    zoomOut:          () => editorRef.current?.zoomOut(),
    rotateLeft:       () => editorRef.current?.rotateLeft(),
    rotateRight:      () => editorRef.current?.rotateRight(),
    flipH:            () => editorRef.current?.flipH(),
    flipV:            () => editorRef.current?.flipV(),
    fitToCanvas:      () => editorRef.current?.fitToCanvas(),
    resetTransform:   () => editorRef.current?.resetTransform(),
    getCroppedDataUrl:() => editorRef.current?.getCroppedDataUrl() || null,
  };

  const PANELS = [
    { id: 'upload',     label: 'Upload',     n: 1 },
    { id: 'crop',       label: 'Crop & Adjust', n: 2 },
    { id: 'template',   label: 'Template',   n: 3 },
    { id: 'compliance', label: 'Compliance', n: 4 },
    { id: 'layout',     label: 'Layout',     n: 5 },
    { id: 'export',     label: 'Export',     n: 6 },
  ];

  return (
    <div className="flex flex-col bg-slate-950 text-slate-100 overflow-hidden w-full h-full">
      {/* ── Top Bar ─────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-4 h-11 bg-slate-900 border-b border-slate-800 z-20">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
            <Camera className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-black text-white tracking-tight">Passport Studio</span>
            <span className="text-[10px] text-slate-500 ml-2 font-semibold">Pro</span>
          </div>
        </div>

        {/* Step Nav */}
        <div className="flex items-center gap-1">
          {PANELS.map(({ id, label, n }, i, arr) => {
            const isActive = state.activePanel === id;
            return (
              <React.Fragment key={id}>
                <button
                  onClick={() => dispatch({ type: 'SET_ACTIVE_PANEL', payload: id })}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all
                    ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black
                    ${isActive ? 'bg-white/20' : 'bg-slate-800'}`}>{n}</span>
                  <span className="hidden xl:inline">{label}</span>
                </button>
                {i < arr.length - 1 && <div className="w-2.5 h-px bg-slate-800" />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button onClick={() => dispatch({ type: 'UNDO' })} title="Undo (Ctrl+Z)"
            disabled={state.historyIndex <= 0}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-30">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={() => dispatch({ type: 'REDO' })} title="Redo (Ctrl+Y)"
            disabled={state.historyIndex >= state.history.length - 1}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-30">
            <Redo2 className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-slate-800" />
          <button
            onClick={() => dispatch({ type: 'SET_ACTIVE_PANEL', payload: 'export' })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold hover:from-indigo-500 hover:to-violet-500 transition-all shadow-md">
            🖨 Print
          </button>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <LeftSidebar editorControls={editorControls} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {['layout', 'export'].includes(state.activePanel) ? (
            <PrintPreview />
          ) : (
            <MainCanvas editorRef={editorRef} />
          )}
        </div>
        <RightSidebar />
      </div>

      {/* ── Status Bar ────────────────────────────────────────────────── */}
      <StatusBar />
    </div>
  );
}

// ─── Public Export ────────────────────────────────────────────────────────
export default function PassportStudio(props: PassportStudioProps) {
  return (
    <PassportStoreProvider>
      <PassportStudioInner {...props} />
    </PassportStoreProvider>
  );
}
