import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  Camera, Palette, Printer, Keyboard, Maximize2, Minimize2, Languages,
  Download, FileDown, FileText, Zap, Sparkles, Globe
} from 'lucide-react';
import { RecentFile, AppLanguage } from './types';
import logoImg from './assets/logo.png';

// Modals & UI Overlays
import ShortcutKeysModal from './components/ShortcutKeysModal';
import PrintPreviewModal from './components/PrintPreviewModal';
import ContextMenu from './components/ContextMenu';

// Lazy loaded heavy studio submodules
const PassportStudio = lazy(() => import('./passport-studio/components/PassportStudio'));
const PhotoWorkspace = lazy(() => import('./components/PhotoWorkspace'));
const DocumentWorkspace = lazy(() => import('./components/document/DocumentWorkspace'));
const OptimizerWorkspace = lazy(() => import('./components/optimizer/OptimizerWorkspace'));
const LinksWorkspace = lazy(() => import('./components/links/LinksWorkspace'));

const WorkstationLoader = () => (
  <div className="w-full h-full flex-1 flex flex-col items-center justify-center min-h-[450px] gap-3 text-slate-400 bg-slate-950 select-none">
    <div className="relative">
      <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-3 h-3 bg-indigo-500 rounded-full animate-ping"></div>
      </div>
    </div>
    <p className="text-xs font-bold tracking-widest uppercase text-slate-300">Loading Studio Engine...</p>
  </div>
);

type StudioModule = 'passport' | 'photo' | 'document' | 'optimizer' | 'links';


export default function App() {
  // Session starts fresh on page reload (or restores active tab)
  const [activeModule, setActiveModule] = useState<StudioModule>('passport');
  const [language, setLanguage] = useState<AppLanguage>('bn');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Modals & Context Controls
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState<boolean>(false);
  const [activeFileName, setActiveFileName] = useState<string>('Studio_Capture_01.jpg');

  const [contextMenuState, setContextMenuState] = useState<{ x: number; y: number; isOpen: boolean }>({
    x: 0,
    y: 0,
    isOpen: false
  });

  // Custom Professional Print System state
  const [customPrintSource, setCustomPrintSource] = useState<string | HTMLCanvasElement | null>(null);
  const [customPrintTitle, setCustomPrintTitle] = useState<string>('PrintHub_Studio_Document');
  const [customPrintPaperSize, setCustomPrintPaperSize] = useState<string>('A4');
  const [customPrintOrientation, setCustomPrintOrientation] = useState<string>('auto');
  const [customPrintCopies, setCustomPrintCopies] = useState<number>(1);

  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([
    { id: 'f1', name: 'Passport_35x45_8Copies.jpg', type: 'Passport', date: '2026-08-21', size: '3.8 MB' },
    { id: 'f2', name: 'Portrait_Retouch_Studio.png', type: 'Photo', date: '2026-08-21', size: '5.2 MB' },
  ]);

  const handleSwitchModule = (module: StudioModule) => {
    setActiveModule(module);
  };

  const handleAddRecentFile = (name: string, type: 'PDF' | 'Photo' | 'Passport' | 'CV' | 'Doc' | 'Design' | 'Scan') => {
    setRecentFiles(prev => [
      { id: `rec-${Date.now()}`, name, type, date: new Date().toISOString().split('T')[0], size: '2.5 MB' },
      ...prev.slice(0, 15)
    ]);
  };

  // Trigger File Save / Export (Ctrl + S)
  const handleFileSave = () => {
    if (activeModule === 'passport') {
      window.dispatchEvent(new CustomEvent('printhub:open-passport-export'));
    } else {
      window.dispatchEvent(new CustomEvent('printhub:open-photo-export'));
    }
  };

  // 1. Prevent Accidental Page Refresh / Tab Close with Unsaved Work in Web Browsers
  useEffect(() => {
    // In Electron Desktop environment, do not intercept beforeunload to ensure native [X] and close work immediately
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You have active editing work in Studio. Are you sure you want to leave?';
      return 'You have active editing work in Studio. Are you sure you want to leave?';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Listen for direct custom print events from any module
  useEffect(() => {
    const handleOpenCustomPrint = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail) {
        if (customEvt.detail.source) setCustomPrintSource(customEvt.detail.source);
        if (customEvt.detail.title) setCustomPrintTitle(customEvt.detail.title);
        if (customEvt.detail.paperSize) setCustomPrintPaperSize(customEvt.detail.paperSize);
        if (customEvt.detail.orientation) setCustomPrintOrientation(customEvt.detail.orientation);
        if (customEvt.detail.copies) setCustomPrintCopies(customEvt.detail.copies);
      }
      setIsPrintPreviewOpen(true);
    };

    window.addEventListener('printhub:open-custom-print', handleOpenCustomPrint);
    return () => {
      window.removeEventListener('printhub:open-custom-print', handleOpenCustomPrint);
    };
  }, []);

  // Listen for direct transfer from Photo Lab Editor -> Passport Studio
  useEffect(() => {
    const handleTransferToPassport = (e: Event) => {
      const customEvt = e as CustomEvent;
      setActiveModule('passport');

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('printhub:load-passport-photo', {
          detail: customEvt.detail
        }));
      }, 150);
    };

    window.addEventListener('printhub:transfer-to-passport', handleTransferToPassport);
    return () => {
      window.removeEventListener('printhub:transfer-to-passport', handleTransferToPassport);
    };
  }, []);

  // 2. Global Keyboard Shortcuts Handler (Ctrl+S, Ctrl+P, Alt+1, Alt+2, F11, ?)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleFileSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (activeModule === 'document') {
          window.dispatchEvent(new CustomEvent('printhub:trigger-document-print'));
        } else if (activeModule === 'photo') {
          window.dispatchEvent(new CustomEvent('printhub:open-photo-export'));
        } else if (activeModule === 'passport') {
          window.dispatchEvent(new CustomEvent('printhub:trigger-passport-print'));
        } else {
          setIsPrintPreviewOpen(true);
        }
      }
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsModalOpen(true);
      }
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
      // Quick Module Hotkeys (1: Passport, 2: Photo, 3: Document, 4: Optimizer, 5: Links)
      if (e.altKey && e.key === '1') handleSwitchModule('passport');
      if (e.altKey && e.key === '2') handleSwitchModule('photo');
      if (e.altKey && e.key === '3') handleSwitchModule('document');
      if (e.altKey && e.key === '4') handleSwitchModule('optimizer');
      if (e.altKey && e.key === '5') handleSwitchModule('links');
    };

    const handleModuleSwitchEvent = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail) {
        handleSwitchModule(customEvt.detail);
      }
    };

    window.addEventListener('printhub:switch-module', handleModuleSwitchEvent);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('printhub:switch-module', handleModuleSwitchEvent);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeModule]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuState({
      x: e.clientX,
      y: e.clientY,
      isOpen: true
    });
  };

  return (
    <div 
      onContextMenu={handleContextMenu}
      className="h-screen w-screen font-sans flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none"
    >
      {/* ── Top Professional Studio Header Bar ────────────────────────────── */}
      <header className="h-11 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 shrink-0 z-30 shadow-sm">
        {/* Brand & Studio Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900/90 border border-slate-700/80 flex items-center justify-center shadow-md shadow-cyan-500/10 overflow-hidden p-1 shrink-0">
              <img src={logoImg} alt="PrintHub Studio" className="w-full h-full object-contain drop-shadow-sm" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-white font-mono">PrintHub Studio</span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Clean Segmented Studio Switcher (Never Unmounts Workspaces) */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => handleSwitchModule('passport')}
              className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeModule === 'passport'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'পাসপোর্ট স্টুডিও' : 'Passport Studio'}</span>
            </button>

            <button
              onClick={() => handleSwitchModule('photo')}
              className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeModule === 'photo'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'ফটো ল্যাব এডিটর' : 'Photo Lab Editor'}</span>
            </button>

            <button
              onClick={() => handleSwitchModule('document')}
              className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeModule === 'document'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>{language === 'bn' ? 'ডকুমেন্ট স্ক্যানার' : 'Doc Scanner Studio'}</span>
            </button>

            <button
              onClick={() => handleSwitchModule('optimizer')}
              className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeModule === 'optimizer'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'bn' ? 'ইমেজ অপ্টিমাইজার' : 'Image Optimizer'}</span>
            </button>

            <button
              onClick={() => handleSwitchModule('links')}
              className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeModule === 'links'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language === 'bn' ? 'ওয়েব ও সেবা লিংক' : 'Links & Services'}</span>
            </button>
          </div>
        </div>

        {/* Top Right Quick Utility Tools & Save Action */}
        <div className="flex items-center gap-2">
          {/* File Save / Export Button (Ctrl + S) */}
          <button
            onClick={handleFileSave}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition active:scale-95 border border-indigo-400/30"
            title="Save / Export File to Computer (Ctrl + S)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'ফাইল সেভ (Ctrl+S)' : 'Save File (Ctrl+S)'}</span>
          </button>

          <div className="h-4 w-px bg-slate-800" />

          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold text-slate-300 hover:bg-slate-800 transition border border-slate-800"
            title="Switch Language"
          >
            <Languages className="w-3.5 h-3.5 text-indigo-400" />
            <span>{language === 'bn' ? 'বাংলা' : 'EN'}</span>
          </button>

          {/* Quick Print Preview */}
          <button
            onClick={() => setIsPrintPreviewOpen(true)}
            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-md transition"
            title={language === 'bn' ? 'প্রিন্ট প্রিভিউ (Ctrl+P)' : 'Print Preview (Ctrl+P)'}
          >
            <Printer className="w-4 h-4" />
          </button>

          {/* Shortcuts Help */}
          <button
            onClick={() => setIsShortcutsModalOpen(true)}
            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-md transition"
            title={language === 'bn' ? 'কীবোর্ড শর্টকাট (?)' : 'Keyboard Shortcuts (?)'}
          >
            <Keyboard className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-md transition"
            title={isFullscreen ? 'Exit Fullscreen (F11)' : 'Fullscreen (F11)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ── Main Studio Workstation Viewport (All Mounted & State-Preserved) ── */}
      <main className="flex-1 flex flex-col w-full h-full overflow-hidden relative bg-slate-950">
        <Suspense fallback={<WorkstationLoader />}>
          {/* Passport Studio Container (Always Alive in DOM) */}
          <div className={activeModule === 'passport' ? 'w-full h-full' : 'hidden'}>
            <PassportStudio
              onAddRecentFile={handleAddRecentFile}
              language={language}
            />
          </div>

          {/* Photo Lab Workspace Container (Always Alive in DOM) */}
          <div className={activeModule === 'photo' ? 'w-full h-full' : 'hidden'}>
            <PhotoWorkspace
              onAddRecentFile={handleAddRecentFile}
              language={language}
            />
          </div>

          {/* Document Scanner Workspace Container (Always Alive in DOM) */}
          <div className={activeModule === 'document' ? 'w-full h-full' : 'hidden'}>
            <DocumentWorkspace
              onAddRecentFile={handleAddRecentFile}
              language={language}
            />
          </div>

          {/* Smart Image Optimizer Studio Container (Always Alive in DOM) */}
          <div className={activeModule === 'optimizer' ? 'w-full h-full' : 'hidden'}>
            <OptimizerWorkspace
              onAddRecentFile={handleAddRecentFile}
              language={language}
            />
          </div>

          {/* Links & Useful Web Directory Container (Always Alive in DOM) */}
          <div className={activeModule === 'links' ? 'w-full h-full' : 'hidden'}>
            <LinksWorkspace
              onAddRecentFile={handleAddRecentFile}
              language={language}
            />
          </div>
        </Suspense>
      </main>


      {/* ── Global Floating Context Overlays & Modals ──────────────────────── */}
      <ShortcutKeysModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      <PrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => {
          setIsPrintPreviewOpen(false);
          setCustomPrintSource(null);
        }}
        title={customPrintTitle || activeFileName}
        sourceImageOrCanvas={customPrintSource}
        initialPaperSize={customPrintPaperSize}
        initialOrientation={customPrintOrientation}
        initialCopies={customPrintCopies}
        language={language}
        onConfirmPrint={(_details) => {
          setIsPrintPreviewOpen(false);
          setCustomPrintSource(null);
        }}
      />

      <ContextMenu
        x={contextMenuState.x}
        y={contextMenuState.y}
        isOpen={contextMenuState.isOpen}
        onClose={() => setContextMenuState({ ...contextMenuState, isOpen: false })}
        onAction={(actionId) => {
          if (actionId === 'print') setIsPrintPreviewOpen(true);
          if (actionId === 'optimize') handleSwitchModule('optimizer');
          if (actionId === 'crop' || actionId === 'bg-remove') handleSwitchModule('photo');
          if (actionId === 'passport') handleSwitchModule('passport');
        }}
      />
    </div>
  );
}
