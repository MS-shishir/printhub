/**
 * DocumentPageList.tsx
 * Enterprise High-Density Sidebar for Multi-Page Document Batch Management.
 * 
 * Features:
 * 1. Compact Pro Horizontal Page Cards (5-8 pages visible simultaneously)
 * 2. High-DPI Reactive Canvas Thumbnails
 * 3. Quick Action Toolbar: Rotate 90° CW, Duplicate, Delete, Move Up/Down
 * 4. Active Page Glowing Accent & Filter Mode Indicators
 * 5. Batch File Upload & Add Page Integration
 */

import React from 'react';
import {
  Plus, Trash2, Copy, RotateCw, ChevronUp, ChevronDown, FileText, Check, Layers, Download
} from 'lucide-react';
import { DocumentPageItem } from '../../services/DocumentScanService';

interface DocumentPageListProps {
  pages: DocumentPageItem[];
  activePageIndex: number;
  onSelectPage: (index: number) => void;
  onAddFiles: (files: FileList | File[]) => void;
  onDeletePage: (index: number) => void;
  onDuplicatePage: (index: number) => void;
  onReorderPages: (fromIndex: number, toIndex: number) => void;
  onRotatePage: (index: number, cw: boolean) => void;
  onDownloadPage?: (index: number) => void;
  language: 'en' | 'bn';
}

// Compact, High-Speed Canvas Thumbnail Renderer
const PageThumbnail = React.memo(function PageThumbnail({ canvas }: { canvas: HTMLCanvasElement | null | undefined }) {
  const thumbCanvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    if (!thumbCanvasRef.current || !canvas) return;
    const tc = thumbCanvasRef.current;
    const ctx = tc.getContext('2d');
    if (!ctx) return;

    if (tc.width !== 120 || tc.height !== 160) {
      tc.width = 120;
      tc.height = 160;
    }
    ctx.clearRect(0, 0, tc.width, tc.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(canvas, 0, 0, tc.width, tc.height);
  }, [canvas]);

  return (
    <canvas
      ref={thumbCanvasRef}
      className="w-full h-full object-contain block"
    />
  );
});

export default React.memo(function DocumentPageList({
  pages,
  activePageIndex,
  onSelectPage,
  onAddFiles,
  onDeletePage,
  onDuplicatePage,
  onReorderPages,
  onRotatePage,
  onDownloadPage,
  language
}: DocumentPageListProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  return (
    <div className="w-68 bg-slate-950 border-r border-slate-800/80 flex flex-col h-full select-none shrink-0 font-sans shadow-2xl">
      {/* ── 1. Header (Compact 44px) ── */}
      <div className="px-3 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>{language === 'bn' ? 'পেজ তালিকা' : 'Pages'}</span>
              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/15 px-1.5 py-0.2 rounded-full font-bold">
                {pages.length}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-600/30 transition cursor-pointer"
          title="Add Page / নতুন পেজ যোগ করুন"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>{language === 'bn' ? 'যোগ' : 'Add'}</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.bmp,.tiff"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onAddFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />
      </div>

      {/* ── 2. Compact Page List (High Density Pro Card Layout) ── */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 custom-scrollbar">
        {pages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-4 text-center text-slate-500">
            <FileText className="w-10 h-10 stroke-1 text-slate-600 mb-2" />
            <p className="text-xs font-medium text-slate-400">
              {language === 'bn' ? 'কোনো পেজ নেই' : 'No Pages Loaded'}
            </p>
            <p className="text-[10px] text-slate-600 mt-1">
              {language === 'bn' ? 'উপরে "+ যোগ" বাটনে ক্লিক করুন' : 'Click "+ Add" to upload'}
            </p>
          </div>
        ) : (
          pages.map((page, idx) => {
            const isActive = idx === activePageIndex;
            const previewCanvas = page.previewCanvas || page.processedCanvas || page.warpedCanvas || page.sourceCanvas;
            const filterLabel =
              page.filterMode === 'magic_color' ? 'Magic' :
              page.filterMode === 'clean_bw' ? 'B&W' :
              page.filterMode === 'grayscale' ? 'Gray' :
              page.filterMode === 'high_contrast' ? 'High' : 'Orig';

            return (
              <div
                key={page.id}
                onClick={() => onSelectPage(idx)}
                className={`group rounded-xl border p-2 transition-all cursor-pointer relative overflow-hidden ${
                  isActive
                    ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-950/60 ring-1 ring-indigo-500/50'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                {/* Horizontal Card Layout: Left Thumbnail + Right Metadata & Controls */}
                <div className="flex gap-2.5 items-center">
                  
                  {/* Left: Aspect-Preserved Mini Thumbnail */}
                  <div className="relative w-14 h-18 rounded-lg bg-black/80 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center shadow-inner group-hover:border-slate-700">
                    <PageThumbnail canvas={previewCanvas} />

                    {/* Active Checkmark Badge */}
                    {isActive && (
                      <div className="absolute top-1 right-1 bg-emerald-500 text-slate-950 p-0.5 rounded-full shadow-md">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}

                    {/* Filter Mode Mini Badge */}
                    <div className="absolute bottom-0.5 left-0.5 px-1 py-0.2 rounded bg-slate-950/90 text-[8px] font-mono text-amber-300 font-bold border border-slate-800/80">
                      {filterLabel}
                    </div>
                  </div>

                  {/* Right: Page Details & Quick Action Bar */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between h-18 py-0.5">
                    
                    {/* Top Row: Index + Page Title + Preset */}
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                            isActive ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
                          }`}>
                            #{idx + 1}
                          </span>
                          <span className="text-[11px] font-bold text-slate-200 truncate">
                            {language === 'bn' ? `পেজ ${idx + 1}` : `Page ${idx + 1}`}
                          </span>
                        </div>

                        <span className="text-[9px] font-mono text-slate-400 bg-slate-950 px-1 py-0.2 rounded border border-slate-800 truncate max-w-[70px]">
                          {page.selectedPreset?.name?.split(' ')[0] || 'A4'}
                        </span>
                      </div>

                      <div className="text-[9px] text-slate-500 truncate mt-0.5">
                        {page.name}
                      </div>
                    </div>

                    {/* Bottom Row: Micro Action Toolbar */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/50">
                      {/* Reorder Up / Down */}
                      <div className="flex items-center gap-0.5">
                        <button
                          disabled={idx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            onReorderPages(idx, idx - 1);
                          }}
                          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
                          title="Move Up / উপরে নিন"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          disabled={idx === pages.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            onReorderPages(idx, idx + 1);
                          }}
                          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
                          title="Move Down / নিচে নিন"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Download, Rotate, Duplicate, Delete */}
                      <div className="flex items-center gap-0.5">
                        {onDownloadPage && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDownloadPage(idx);
                            }}
                            className="p-1 hover:bg-emerald-950/60 text-slate-400 hover:text-emerald-400 rounded transition cursor-pointer"
                            title={language === 'bn' ? `পেজ ${idx + 1} PDF ডাউনলোড` : `Download Page ${idx + 1} PDF`}
                          >
                            <Download className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRotatePage(idx, true);
                          }}
                          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-indigo-300 rounded transition cursor-pointer"
                          title="Rotate 90° CW / ঘোরান"
                        >
                          <RotateCw className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicatePage(idx);
                          }}
                          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-teal-300 rounded transition cursor-pointer"
                          title="Duplicate Page / কপি করুন"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePage(idx);
                          }}
                          className="p-1 hover:bg-red-950/60 text-slate-400 hover:text-red-400 rounded transition cursor-pointer"
                          title="Delete Page / ডিলিট করুন"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── 3. Bottom Summary Bar ── */}
      {pages.length > 0 && (
        <div className="p-2 border-t border-slate-800 bg-slate-900/60 text-[10px] text-slate-400 flex items-center justify-between shrink-0 font-mono">
          <span>মোট: {pages.length} পেজ</span>
          <span className="text-emerald-400 font-bold">300 DPI Ready</span>
        </div>
      )}
    </div>
  );
});

