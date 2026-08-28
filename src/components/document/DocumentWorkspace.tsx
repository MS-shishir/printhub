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
  FileCheck2, Plus, ShieldCheck
} from 'lucide-react';
import {
  DocumentPageItem,
  documentScanService,
  DOC_PRESETS,
  DocPreset
} from '../../services/DocumentScanService';
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

  // Modals
  const [isNidComposerOpen, setIsNidComposerOpen] = useState<boolean>(false);
  const [isPrintSheetModalOpen, setIsPrintSheetModalOpen] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  const heroFileInputRef = useRef<HTMLInputElement | null>(null);

  // Subscribe to Service State
  useEffect(() => {
    const unsubscribe = documentScanService.subscribe((updatedPages, activeIdx) => {
      setPages(updatedPages);
      setActivePageIndex(activeIdx);
    });
    return unsubscribe;
  }, []);

  const activePage = pages[activePageIndex] || null;

  // Handle Multi-File Upload
  const handleMultipleFiles = (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    let loadedPages: DocumentPageItem[] = [];
    let count = 0;

    fileList.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const src = evt.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const newPage = documentScanService.createPageFromImage(img, file.name || `Document_${idx + 1}.jpg`);
          loadedPages.push(newPage);
          count++;

          if (count === fileList.length) {
            documentScanService.addPages(loadedPages);
            onAddRecentFile(fileList[0].name, 'Doc');
          }
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    });
  };

  // Clipboard Paste Support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const blob = items[i].getAsFile();
          if (blob) {
            handleMultipleFiles([blob]);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Quick Multi-Page PDF Download
  const handleDownloadPdf = async () => {
    if (pages.length === 0) return;
    setIsGeneratingPdf(true);
    try {
      const pdfBytes = await documentScanService.generateMultiPagePdf('A4');
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Document_Scan_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF Export failed:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
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
              onSelectMode={(mode) => documentScanService.updateActivePage({ filterMode: mode, isWarpMode: false })}
              language={language}
            />
          </div>
        )}

        {/* Right: Export, NID Composer & Print Center */}
        <div className="flex items-center gap-2">
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

          {/* Direct 300 DPI PDF Download */}
          <button
            disabled={pages.length === 0 || isGeneratingPdf}
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/60 transition disabled:opacity-40 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>
              {isGeneratingPdf
                ? (language === 'bn' ? 'তৈরি হচ্ছে...' : 'Generating...')
                : (language === 'bn' ? 'PDF ডাউনলোড' : 'Download PDF')}
            </span>
          </button>
        </div>
      </header>

      {/* ── Main Workspace Body ── */}
      <div className="flex-1 flex overflow-hidden">
        {pages.length === 0 ? (
          /* Empty State / Hero Dropzone */
          <div className="flex-1 flex items-center justify-center p-6 bg-slate-950/90">
            <div
              onClick={() => heroFileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files) handleMultipleFiles(e.dataTransfer.files);
              }}
              className="max-w-xl w-full p-10 rounded-3xl border-2 border-dashed border-slate-800 hover:border-indigo-500 bg-slate-900/40 hover:bg-slate-900/80 transition-all flex flex-col items-center justify-center text-center cursor-pointer group shadow-2xl"
            >
              <div className="w-20 h-20 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform shadow-xl shadow-indigo-600/20 mb-4">
                <Upload className="w-10 h-10 stroke-1" />
              </div>

              <h2 className="text-lg font-bold text-slate-200">
                {language === 'bn' ? 'ডকুমেন্ট ছবি বা স্ক্যান কপি আপলোড করুন' : 'Upload Document Images or Scans'}
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                {language === 'bn'
                  ? 'জন্মনিবন্ধন, এনআইডি, সার্টিফিকেট বা বইয়ের পাতা ড্র্যাগ করুন অথবা ক্লিক করে নির্বাচন করুন (মাল্টি-পেজ সাপোর্টেড)'
                  : 'Drag & drop multiple document pages or click to browse. Supports A4, NID, Legal, Marksheets & Books.'}
              </p>

              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1 bg-slate-800 rounded-full text-[11px] font-mono text-indigo-300 border border-slate-700">
                  ⚡ Auto 4-Corner Warp
                </span>
                <span className="px-3 py-1 bg-slate-800 rounded-full text-[11px] font-mono text-amber-300 border border-slate-700">
                  ✨ Magic Color & B&W
                </span>
                <span className="px-3 py-1 bg-slate-800 rounded-full text-[11px] font-mono text-emerald-300 border border-slate-700">
                  📄 Multi-Page PDF
                </span>
              </div>

              <input
                ref={heroFileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleMultipleFiles(e.target.files);
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
              language={language}
            />

            {/* Right: Enhancement Adjustments Panel */}
            {activePage && (
              <DocumentAdjustPanel
                activePage={activePage}
                onUpdateProperty={(updates) => documentScanService.updateActivePage(updates)}
                onResetAdjustments={() => {
                  documentScanService.updateActivePage({
                    shadowStrength: 60,
                    brightness: 0,
                    contrast: 0,
                    sharpen: 25,
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
          pages={pages.map(p => ({
            id: p.id,
            name: p.name,
            canvas: p.processedCanvas || p.warpedCanvas || p.sourceCanvas,
            selectedPreset: p.selectedPreset,
          }))}
          language={language}
        />
      )}
    </div>
  );
}
