/**
 * DocumentWorkspace.tsx
 * Enterprise Modular Document Scanner Studio (React 19 + TypeScript + Signals Architecture).
 * 
 * Features:
 * 1. Component-Based Architecture with Self-Contained Reusable Components
 * 2. Two-Way Data Binding Synchronized via DocumentScanService
 * 3. 1-Click Magic Filters (Magic Color, Clean B&W Photocopy, Grayscale, High Contrast)
 * 4. Multi-Page Batch Management with Drag Reorder & 300 DPI PDF Compilation
 * 5. 4-Corner Homography Perspective Warp with Auto-Orientation & In-Crop Rotation
 * 6. High-Performance Viewport with Smooth Zoom, Pan & Split Before/After Comparison
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  FileText, Upload, Sparkles, Printer, Download, CreditCard,
  Scissors, RotateCw, RotateCcw, Camera, LayoutGrid, CheckCircle2,
  FileCheck2, Plus, ShieldCheck, FolderOpen, Bell, Loader2, FolderUp,
  ChevronDown, Layers, Image as ImageIcon
} from 'lucide-react';
import {
  DocumentPageItem,
  documentScanService,
  DOC_PRESETS,
  DocPreset
} from '../../services/DocumentScanService';
import { nativeHardwareService } from '../../services/nativeHardwareService';
import DocumentPageList from './DocumentPageList';
import DocumentViewer from './DocumentViewer';
import DocumentFilterBar from './DocumentFilterBar';
import DocumentAdjustPanel from './DocumentAdjustPanel';
import NidComposerModal from './NidComposerModal';
import DocumentPrintSheetModal, { PrintSheetPageItem } from './DocumentPrintSheetModal';

interface DocumentWorkspaceProps {
  onAddRecentFile: (name: string, type: 'PDF' | 'Photo' | 'Passport' | 'CV' | 'Doc' | 'Design' | 'Scan') => void;
  language: 'en' | 'bn';
}

export default function DocumentWorkspace({ onAddRecentFile, language }: DocumentWorkspaceProps) {
  // Reactive Pages State (Subscribed to DocumentScanService)
  const [pages, setPages] = useState<DocumentPageItem[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [scanNotification, setScanNotification] = useState<string | null>(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  // Modals & Export Menu
  const [isNidComposerOpen, setIsNidComposerOpen] = useState<boolean>(false);
  const [isPrintSheetModalOpen, setIsPrintSheetModalOpen] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);

  const heroFileInputRef = useRef<HTMLInputElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  // Close Export Dropdown on Outside Click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    if (isExportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExportMenuOpen]);

  // Subscribe to Service State & Native Scanner Hot-Folder Watcher
  useEffect(() => {
    const unsubscribeDoc = documentScanService.subscribe((updatedPages, activeIdx) => {
      setPages(updatedPages);
      setActivePageIndex(activeIdx);
    });

    const handlePrintTrigger = () => {
      setIsPrintSheetModalOpen(true);
    };
    window.addEventListener('printhub:trigger-document-print', handlePrintTrigger);

    // Auto-import from scanner machine when new scan file arrives
    const unsubscribeScan = nativeHardwareService.onNewScan((scanEvent) => {
      const img = new Image();
      img.onload = () => {
        const newPage = documentScanService.createPageFromImage(
          img,
          scanEvent.fileName || `Scan_${new Date().toLocaleTimeString().replace(/:/g, '-')}.jpg`
        );
        documentScanService.addPages([newPage]);
        onAddRecentFile(scanEvent.fileName, 'Doc');
        setScanNotification(
          language === 'bn'
            ? `📄 স্ক্যানার থেকে নতুন পেজ এসেছে: ${scanEvent.fileName}`
            : `📄 New scan received: ${scanEvent.fileName}`
        );
        setTimeout(() => setScanNotification(null), 4500);
      };
      img.src = scanEvent.dataUrl;
    });

    return () => {
      unsubscribeDoc();
      unsubscribeScan();
      window.removeEventListener('printhub:trigger-document-print', handlePrintTrigger);
    };
  }, [language, onAddRecentFile]);

  const activePage = pages[activePageIndex] || null;

  // Handle Multi-File Upload (Supports PDF & Multi-format Images)
  const handleMultipleFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsLoadingFiles(true);
    try {
      const loadedPages = await documentScanService.loadFiles(files);
      if (loadedPages.length > 0) {
        onAddRecentFile(loadedPages[0].name, 'Doc');
        setScanNotification(
          language === 'bn'
            ? `✅ সফলভাবে ${loadedPages.length}টি পেজ লোড হয়েছে`
            : `✅ Successfully loaded ${loadedPages.length} page(s)`
        );
        setTimeout(() => setScanNotification(null), 3500);
      }
    } catch (err) {
      console.error('Failed to load document files:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Clipboard Paste Support (Supports both Image & PDF blobs)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const filesToLoad: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/') || items[i].type === 'application/pdf') {
          const blob = items[i].getAsFile();
          if (blob) filesToLoad.push(blob);
        }
      }
      if (filesToLoad.length > 0) {
        handleMultipleFiles(filesToLoad);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // 1. Download Current Active Page as 300 DPI PDF (e.g. Page 2)
  const handleDownloadCurrentPagePdf = async (pageSize: 'A4' | 'Legal' | 'Original' = 'A4') => {
    if (!activePage) return;
    setIsGeneratingPdf(true);
    setIsExportMenuOpen(false);
    try {
      const pdfBytes = await documentScanService.generatePdf([activePageIndex], pageSize);
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (activePage.name || `Page_${activePageIndex + 1}`)
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_\-\u0980-\u09FF]/g, '_');
      a.download = `${safeName}_Scan.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setScanNotification(
        language === 'bn'
          ? `✅ পেজ ${activePageIndex + 1} (${activePage.name}) PDF ডাউনলোড সম্পন্ন হয়েছে`
          : `✅ Page ${activePageIndex + 1} downloaded as PDF`
      );
      setTimeout(() => setScanNotification(null), 3500);
    } catch (err) {
      console.error('PDF Export failed:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 2. Download Any Specific Page by Index
  const handleDownloadSinglePage = async (idx: number, pageSize: 'A4' | 'Legal' | 'Original' = 'A4') => {
    const target = pages[idx];
    if (!target) return;
    setIsGeneratingPdf(true);
    try {
      const pdfBytes = await documentScanService.generatePdf([idx], pageSize);
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (target.name || `Page_${idx + 1}`)
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_\-\u0980-\u09FF]/g, '_');
      a.download = `${safeName}_Scan.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setScanNotification(
        language === 'bn'
          ? `✅ পেজ ${idx + 1} (${target.name}) PDF ডাউনলোড হয়েছে`
          : `✅ Page ${idx + 1} downloaded as PDF`
      );
      setTimeout(() => setScanNotification(null), 3500);
    } catch (err) {
      console.error('PDF Export failed:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 3. Download All Pages Merged as Multi-Page PDF
  const handleDownloadAllPagesPdf = async (pageSize: 'A4' | 'Legal' | 'Original' = 'A4') => {
    if (pages.length === 0) return;
    setIsGeneratingPdf(true);
    setIsExportMenuOpen(false);
    try {
      const pdfBytes = await documentScanService.generatePdf(undefined, pageSize);
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Document_All_${pages.length}_Pages_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setScanNotification(
        language === 'bn'
          ? `✅ মোট ${pages.length}টি পেজ একত্রিত করে PDF ডাউনলোড সম্পন্ন হয়েছে`
          : `✅ All ${pages.length} pages downloaded as PDF`
      );
      setTimeout(() => setScanNotification(null), 3500);
    } catch (err) {
      console.error('PDF Export failed:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 4. Download Current Active Page as High-Res JPG
  const handleDownloadCurrentPageImage = () => {
    if (!activePage) return;
    setIsExportMenuOpen(false);
    const cv = activePage.processedCanvas || activePage.warpedCanvas || activePage.sourceCanvas;
    if (!cv) return;
    const dataUrl = cv.toDataURL('image/jpeg', 0.96);
    const a = document.createElement('a');
    a.href = dataUrl;
    const safeName = (activePage.name || `Page_${activePageIndex + 1}`)
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_\-\u0980-\u09FF]/g, '_');
    a.download = `${safeName}_300DPI.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setScanNotification(
      language === 'bn'
        ? `✅ পেজ ${activePageIndex + 1} JPG ডাউনলোড সম্পন্ন হয়েছে`
        : `✅ Page ${activePageIndex + 1} downloaded as JPG`
    );
    setTimeout(() => setScanNotification(null), 3500);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden select-none font-sans">
      {/* ── Top Main Studio Toolbar ── */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between z-30 shrink-0">
        {/* Left: Branding & Quick Action Buttons */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs font-black tracking-wide bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                {language === 'bn' ? 'ডকুমেন্ট স্ক্যানার স্টুডিও' : 'Document Scanner Studio'}
              </h1>
              <span className="text-[9px] font-mono text-indigo-400 font-bold block -mt-0.5">
                AI Auto-Deskew & 300 DPI Export
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* 4-Corner Warp Toggle Button */}
          {activePage && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => documentScanService.updateActivePage({ isWarpMode: !activePage.isWarpMode })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-md cursor-pointer ${
                  activePage.isWarpMode
                    ? 'bg-amber-500 text-slate-950 shadow-amber-500/20 ring-2 ring-amber-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? '৪-কোণা ক্রপ' : '4-Corner Crop'}</span>
              </button>

              {/* 90° Rotations */}
              <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800">
                <button
                  onClick={() => documentScanService.rotateActivePage(false)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                  title="Rotate 90° CCW / বামে ঘোরান"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => documentScanService.rotateActivePage(true)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                  title="Rotate 90° CW / ডানে ঘোরান"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Center: 1-Click Magic Filter Bar */}
        {activePage && (
          <div className="hidden lg:flex items-center">
            <DocumentFilterBar
              activeMode={activePage.filterMode}
              onSelectMode={(mode) => {
                if (mode === 'original') {
                  documentScanService.updateActivePage({
                    filterMode: 'original',
                    colorBoost: 100,
                    textDarken: 100,
                    shadowStrength: 0,
                    brightness: 0,
                    contrast: 0,
                    sharpen: 0,
                    isWarpMode: false
                  });
                } else if (mode === 'magic_color') {
                  documentScanService.updateActivePage({
                    filterMode: 'magic_color',
                    colorBoost: 105,
                    textDarken: 120,
                    shadowStrength: 65,
                    brightness: 5,
                    contrast: 15,
                    sharpen: 30,
                    isWarpMode: false
                  });
                } else if (mode === 'clean_bw') {
                  documentScanService.updateActivePage({
                    filterMode: 'clean_bw',
                    shadowStrength: 50,
                    binarizeSensitivity: 50,
                    isWarpMode: false
                  });
                } else if (mode === 'high_contrast') {
                  documentScanService.updateActivePage({
                    filterMode: 'high_contrast',
                    contrast: 30,
                    sharpen: 20,
                    isWarpMode: false
                  });
                } else {
                  documentScanService.updateActivePage({ filterMode: mode, isWarpMode: false });
                }
              }}
              language={language}
            />
          </div>
        )}

        {/* Right: Export, NID Composer & Print Center */}
        <div className="flex items-center gap-2">
          {/* Desktop Hot-Folder Watcher Button */}
          {nativeHardwareService.isDesktop() && (
            <button
              onClick={async () => {
                const folder = await nativeHardwareService.selectScanFolder();
                if (folder) {
                  setScanNotification(
                    language === 'bn'
                      ? `📁 স্ক্যান ফোল্ডার সেট হয়েছে: ${folder}`
                      : `📁 Scanner folder set: ${folder}`
                  );
                  setTimeout(() => setScanNotification(null), 4000);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 shadow-md transition cursor-pointer"
              title="স্ক্যানার আউটপুট ফোল্ডার নির্বাচন করুন"
            >
              <FolderOpen className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden xl:inline">{language === 'bn' ? 'স্ক্যান ফোল্ডার' : 'Scan Folder'}</span>
            </button>
          )}

          {/* NID Composer Modal Button */}
          <button
            onClick={() => setIsNidComposerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 shadow-md transition cursor-pointer"
            title="NID 2-Sided Composer / এনআইডি কার্ড দুই পাশ একসাথে সাজান"
          >
            <CreditCard className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">{language === 'bn' ? 'NID কার্ড' : 'NID Composer'}</span>
          </button>

          {/* Multi-Up Print Sheet Arranger */}
          <button
            onClick={() => setIsPrintSheetModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 shadow-md transition cursor-pointer"
            title="Multi-Up Sheet Arranger & Direct Print"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">{language === 'bn' ? 'প্রিন্ট শিট' : 'Print Sheet'}</span>
          </button>

          {/* Direct 300 DPI PDF Download with Split / Dropdown Menu */}
          <div className="relative" ref={exportMenuRef}>
            <div className="flex items-center rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 shadow-lg shadow-emerald-950/60 overflow-hidden">
              {/* Main Download Button: Downloads Currently Active Page directly! */}
              <button
                disabled={pages.length === 0 || isGeneratingPdf}
                onClick={() => handleDownloadCurrentPagePdf('A4')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold text-white hover:bg-white/10 transition disabled:opacity-40 cursor-pointer"
                title={
                  pages.length > 1
                    ? (language === 'bn' ? `বর্তমান পেজ (${activePageIndex + 1}) PDF ডাউনলোড` : `Download Page ${activePageIndex + 1} PDF`)
                    : (language === 'bn' ? 'PDF ডাউনলোড' : 'Download PDF')
                }
              >
                {isGeneratingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
                <span>
                  {isGeneratingPdf
                    ? (language === 'bn' ? 'তৈরি হচ্ছে...' : 'Generating...')
                    : pages.length > 1
                    ? (language === 'bn' ? `পেজ ${activePageIndex + 1} PDF` : `Page ${activePageIndex + 1} PDF`)
                    : (language === 'bn' ? 'PDF ডাউনলোড' : 'Download PDF')}
                </span>
              </button>

              {/* Dropdown Toggle Button (When Multiple Pages or Extra Formats Available) */}
              {pages.length > 0 && (
                <button
                  disabled={isGeneratingPdf}
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  className="px-2 py-1.5 border-l border-white/20 text-white hover:bg-white/15 transition disabled:opacity-40 cursor-pointer"
                  title="Export Options / অন্যান্য ফরম্যাট ও সব পেজ ডাউনলোড"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown Menu */}
            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900/95 backdrop-blur-xl border border-slate-700/90 rounded-2xl shadow-2xl p-2 z-50 text-slate-200 animate-in fade-in zoom-in-95">
                <div className="px-2.5 py-1.5 border-b border-slate-800 text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                  {language === 'bn' ? 'ডাউনলোড অপশন (300 DPI)' : 'Export Options (300 DPI)'}
                </div>

                <div className="p-1 space-y-1">
                  {/* 1. Download Current Page PDF */}
                  <button
                    onClick={() => handleDownloadCurrentPagePdf('A4')}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl hover:bg-emerald-950/60 hover:text-emerald-300 transition text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                      <div>
                        <div>{language === 'bn' ? `বর্তমান পেজ #${activePageIndex + 1} PDF` : `Current Page #${activePageIndex + 1} PDF`}</div>
                        <div className="text-[10px] text-slate-400 font-normal truncate max-w-[150px]">
                          {activePage?.name || `Page ${activePageIndex + 1}`}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                      A4
                    </span>
                  </button>

                  {/* 2. Download All Pages PDF */}
                  {pages.length > 1 && (
                    <button
                      onClick={() => handleDownloadAllPagesPdf('A4')}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl hover:bg-indigo-950/60 hover:text-indigo-300 transition text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                        <div>
                          <div>{language === 'bn' ? `সবগুলো পেজ (${pages.length}টি) PDF` : `All ${pages.length} Pages Combined PDF`}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {language === 'bn' ? 'সব পাতা একসাথে ১ ফাইলে' : 'All pages in 1 multi-page PDF'}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">
                        {pages.length}P
                      </span>
                    </button>
                  )}

                  {/* 3. Download as High-Res JPG */}
                  <button
                    onClick={handleDownloadCurrentPageImage}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl hover:bg-amber-950/60 hover:text-amber-300 transition text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                      <div>
                        <div>{language === 'bn' ? `বর্তমান পেজ #${activePageIndex + 1} JPG` : `Current Page #${activePageIndex + 1} JPG`}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {language === 'bn' ? 'হাই-রেজুলেশন ছবি ফরম্যাট' : 'High quality photo export'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                      JPG
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Live Scanner Notification Toast ── */}
      {scanNotification && (
        <div className="bg-gradient-to-r from-indigo-900/90 via-teal-900/90 to-indigo-900/90 border-b border-teal-500/40 px-4 py-2 flex items-center justify-between text-xs font-bold text-teal-200 animate-fade-in z-20">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-400 animate-bounce" />
            <span>{scanNotification}</span>
          </div>
          <button
            onClick={() => setScanNotification(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded bg-slate-800 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Main Workspace Body ── */}
      <div className="flex-1 flex overflow-hidden">
        {pages.length === 0 ? (
          /* Empty State / Hero Dropzone */
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDraggingOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingOver(false);
              if (e.dataTransfer.files) handleMultipleFiles(e.dataTransfer.files);
            }}
            className="flex-1 flex items-center justify-center p-6 bg-slate-950/90"
          >
            <div
              onClick={() => {
                if (!isLoadingFiles) {
                  heroFileInputRef.current?.click();
                }
              }}
              className={`max-w-xl w-full p-10 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer group shadow-2xl relative overflow-hidden ${
                isDraggingOver
                  ? 'border-indigo-400 bg-indigo-950/40 scale-[1.02] shadow-indigo-500/20'
                  : 'border-slate-800 hover:border-indigo-500/80 bg-slate-900/40 hover:bg-slate-900/80'
              }`}
            >
              {/* Background ambient glow */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

              {isLoadingFiles ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 animate-pulse">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                  </div>
                  <h3 className="text-base font-bold text-slate-100">
                    {language === 'bn' ? 'ডকুমেন্ট প্রসেস ও লোড হচ্ছে...' : 'Processing Document & Loading Pages...'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {language === 'bn' ? 'অনুগ্রহ করে অপেক্ষা করুন, হাই-রেজুলেশন রেন্ডার হচ্ছে' : 'Please wait, rendering high-DPI canvas...'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform shadow-xl shadow-indigo-600/20 mb-4">
                    <Upload className="w-10 h-10 stroke-1 text-indigo-400 group-hover:text-indigo-300" />
                  </div>

                  <h2 className="text-lg font-bold text-slate-100 group-hover:text-white transition">
                    {language === 'bn' ? 'ডকুমেন্ট ছবি বা PDF ফাইল আপলোড করুন' : 'Upload Document Images or PDF Files'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1.5 max-w-md leading-relaxed">
                    {language === 'bn'
                      ? 'জন্মনিবন্ধন, এনআইডি, সার্টিফিকেট, বইয়ের পাতা বা PDF ফাইল এখানে ড্র্যাগ করুন অথবা ক্লিক করে নির্বাচন করুন (মাল্টি-পেজ সাপোর্টেড)'
                      : 'Drag & drop PDF files or document photos here, or click to browse. Supports Multi-page PDFs, A4, NID & Certificates.'}
                  </p>

                  <div className="mt-5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        heroFileInputRef.current?.click();
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-extrabold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer hover:scale-105"
                    >
                      <FolderUp className="w-4 h-4" />
                      <span>{language === 'bn' ? 'ফাইল নির্বাচন করুন' : 'Browse Document Files'}</span>
                    </button>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2 justify-center">
                    <span className="px-3 py-1 bg-slate-800/90 rounded-full text-[11px] font-mono text-indigo-300 border border-slate-700/80">
                      📄 Multi-Page PDF
                    </span>
                    <span className="px-3 py-1 bg-slate-800/90 rounded-full text-[11px] font-mono text-teal-300 border border-slate-700/80">
                      ⚡ Auto 4-Corner Warp
                    </span>
                    <span className="px-3 py-1 bg-slate-800/90 rounded-full text-[11px] font-mono text-amber-300 border border-slate-700/80">
                      ✨ Magic Color & B&W
                    </span>
                    <span className="px-3 py-1 bg-slate-800/90 rounded-full text-[11px] font-mono text-emerald-300 border border-slate-700/80">
                      🖨️ 300 DPI Sheet Print
                    </span>
                  </div>
                </>
              )}

              <input
                ref={heroFileInputRef}
                type="file"
                accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.bmp,.tiff"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleMultipleFiles(e.target.files);
                  }
                  e.target.value = '';
                }}
              />
            </div>
          </div>
        ) : (
          /* Multi-Page Studio UI */
          <>
            {/* Left: Page Manager Sidebar */}
            <DocumentPageList
              pages={pages}
              activePageIndex={activePageIndex}
              onSelectPage={(idx) => documentScanService.setActivePageIndex(idx)}
              onAddFiles={handleMultipleFiles}
              onDeletePage={(idx) => documentScanService.removePage(idx)}
              onDuplicatePage={(idx) => documentScanService.duplicatePage(idx)}
              onReorderPages={(from, to) => documentScanService.reorderPages(from, to)}
              onRotatePage={(idx, cw) => {
                documentScanService.setActivePageIndex(idx);
                documentScanService.rotateActivePage(cw);
              }}
              onDownloadPage={(idx) => handleDownloadSinglePage(idx)}
              language={language}
            />

            {/* Center: High-Performance Canvas Viewport */}
            <DocumentViewer
              activePage={activePage}
              onApplyWarp={() => documentScanService.applyWarpToActivePage()}
              onAutoDetect={() => {
                if (activePage) {
                  const detected = documentScanService.createPageFromImage(activePage.sourceCanvas, activePage.name).quad;
                  documentScanService.updateActivePage({ quad: detected });
                }
              }}
              onResetQuad={() => {
                if (activePage) {
                  const w = activePage.sourceCanvas.width;
                  const h = activePage.sourceCanvas.height;
                  documentScanService.updateActivePage({
                    quad: {
                      tl: { x: Math.round(w * 0.02), y: Math.round(h * 0.02) },
                      tr: { x: Math.round(w * 0.98), y: Math.round(h * 0.02) },
                      br: { x: Math.round(w * 0.98), y: Math.round(h * 0.98) },
                      bl: { x: Math.round(w * 0.02), y: Math.round(h * 0.98) },
                    }
                  });
                }
              }}
              onCancelWarp={() => documentScanService.updateActivePage({ isWarpMode: false })}
              onRotateInCrop={(cw) => documentScanService.rotateActivePage(cw)}
              onUpdateQuad={(newQuad) => documentScanService.updateActivePage({ quad: newQuad })}
              onSelectPreset={(preset) => documentScanService.changeActivePagePreset(preset)}
              language={language}
            />

            {/* Right: Enhancement Adjustments Panel */}
            {activePage && (
              <DocumentAdjustPanel
                activePage={activePage}
                onUpdateProperty={(updates) => documentScanService.updateActivePage(updates)}
                onSelectPreset={(preset) => documentScanService.changeActivePagePreset(preset)}
                onResetAdjustments={() => {
                  documentScanService.updateActivePage({
                    colorBoost: 100,
                    textDarken: 100,
                    shadowStrength: 0,
                    brightness: 0,
                    contrast: 0,
                    sharpen: 0,
                    binarizeSensitivity: 50,
                    deskewAngle: 0,
                  });
                }}
                language={language}
              />
            )}
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {/* 1. NID Composer Modal */}
      {isNidComposerOpen && (
        <NidComposerModal
          isOpen={isNidComposerOpen}
          onClose={() => setIsNidComposerOpen(false)}
          onAddAsNewPage={(composedCanvas, title) => {
            const newPage = documentScanService.createPageFromImage(composedCanvas, title || 'NID_Composed.jpg');
            documentScanService.addPages([newPage]);
            setIsNidComposerOpen(false);
          }}
          language={language}
        />
      )}

      {/* 2. Multi-Up Sheet Arranger & Print Modal */}
      {isPrintSheetModalOpen && (
        <DocumentPrintSheetModal
          isOpen={isPrintSheetModalOpen}
          onClose={() => setIsPrintSheetModalOpen(false)}
          pages={pages
            .map(p => {
              const cv = p.processedCanvas || p.warpedCanvas || p.sourceCanvas;
              const aspect = (cv && cv.width && cv.height) ? (cv.width / cv.height) : (210 / 297);
              const isCard = aspect > 1.25 || (p.selectedPreset && p.selectedPreset.widthMm < 140);
              const defW = isCard ? 85.6 : 210;
              const defH = isCard ? 54 : 297;

              return {
                id: p.id,
                name: p.name,
                canvas: cv as HTMLCanvasElement,
                selectedPreset: p.selectedPreset,
                widthMm: p.selectedPreset?.widthMm || defW,
                heightMm: p.selectedPreset?.heightMm || defH,
              };
            })
            .filter(p => !!p.canvas)}
          language={language}
        />
      )}
    </div>
  );
}
