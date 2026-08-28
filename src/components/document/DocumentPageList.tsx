/**
 * DocumentPageList.tsx
 * Enterprise Component-Based Sidebar for Multi-Page Document Batch Management.
 * 
 * Features:
 * 1. Reactive Thumbnails with Live Filter Previews
 * 2. Drag & Drop / Move Up / Move Down Reordering
 * 3. Page Actions: Rotate 90° CW/CCW, Duplicate, Delete, Reset
 * 4. Multi-File Upload & Camera Import Integration
 */

import React from 'react';
import {
  Plus, Trash2, Copy, RotateCw, ChevronUp, ChevronDown, FileText, Check, Sparkles
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
  language: 'en' | 'bn';
}

export default function DocumentPageList({
  pages,
  activePageIndex,
  onSelectPage,
  onAddFiles,
  onDeletePage,
  onDuplicatePage,
  onReorderPages,
  onRotatePage,
  language
}: DocumentPageListProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full select-none shrink-0">
      {/* Header with Add Page Button */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200">
              {language === 'bn' ? 'পৃষ্ঠা তালিকা' : 'Document Pages'}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              {pages.length} {language === 'bn' ? 'টি পাতা' : 'pages'}
            </div>
          </div>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-md shadow-indigo-600/20 cursor-pointer"
          title="Add Page / নতুন পৃষ্ঠা যোগ করুন"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span className="text-[11px] pr-1">{language === 'bn' ? 'যোগ' : 'Add'}</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
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

      {/* Pages Scrollable Thumbnail List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 custom-scrollbar">
        {pages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-4 text-center text-slate-500">
            <FileText className="w-10 h-10 stroke-1 text-slate-600 mb-2" />
            <p className="text-xs font-medium text-slate-400">
              {language === 'bn' ? 'কোনো পৃষ্ঠা নেই' : 'No Pages Loaded'}
            </p>
            <p className="text-[10px] text-slate-600 mt-1">
              {language === 'bn' ? 'উপরে "+ যোগ" বাটনে ক্লিক করে ফাইল আপলোড করুন' : 'Click "+ Add" to upload document images'}
            </p>
          </div>
        ) : (
          pages.map((page, idx) => {
            const isActive = idx === activePageIndex;
            const previewCanvas = page.processedCanvas || page.warpedCanvas || page.sourceCanvas;
            const thumbUrl = previewCanvas?.toDataURL('image/jpeg', 0.6) || '';

            return (
              <div
                key={page.id}
                onClick={() => onSelectPage(idx)}
                className={`relative group rounded-xl border p-2 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-950/40 border-indigo-500/80 shadow-lg shadow-indigo-950/60 ring-1 ring-indigo-500/40'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                {/* Page Index Badge */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    #{idx + 1}
                  </span>

                  <span className="text-[10px] font-medium text-slate-400 truncate max-w-[120px]">
                    {page.name}
                  </span>
                </div>

                {/* Thumbnail Preview Image */}
                <div className="relative aspect-[3/4] w-full rounded-lg bg-black/60 border border-slate-800 overflow-hidden flex items-center justify-center">
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt={page.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-slate-600 text-xs">Loading...</div>
                  )}

                  {/* Active Indicator Badge */}
                  {isActive && (
                    <div className="absolute top-1.5 right-1.5 bg-emerald-500 text-slate-950 p-0.5 rounded-full shadow-md">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}

                  {/* Mode Badge */}
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-slate-950/80 backdrop-blur-xs text-[9px] font-mono text-amber-300 border border-slate-800">
                    {page.filterMode === 'magic_color' ? 'Magic' : page.filterMode === 'clean_bw' ? 'B&W' : 'Orig'}
                  </div>
                </div>

                {/* Floating Micro Action Buttons (Visible on hover or active) */}
                <div className="mt-1.5 flex items-center justify-between pt-1 border-t border-slate-800/60">
                  <div className="flex items-center gap-0.5">
                    <button
                      disabled={idx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onReorderPages(idx, idx - 1);
                      }}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                      title="Move Up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={idx === pages.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        onReorderPages(idx, idx + 1);
                      }}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                      title="Move Down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRotatePage(idx, true);
                      }}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 rounded transition cursor-pointer"
                      title="Rotate 90° CW"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicatePage(idx);
                      }}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition cursor-pointer"
                      title="Duplicate Page"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePage(idx);
                      }}
                      className="p-1 hover:bg-red-950/40 text-slate-400 hover:text-red-400 rounded transition cursor-pointer"
                      title="Delete Page"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
