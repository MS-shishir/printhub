/**
 * PhotoToolbar.tsx
 * Top Photoshop Application Menu & Control Bar with interactive dropdown menus and aspect ratio crop presets.
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Type, Square, Circle, Crop as CropIcon, ZoomIn, ZoomOut, Maximize, 
  Undo, Redo, Printer, Download, Save, Cloud, RefreshCw, Users, Sparkles,
  Search, ShieldCheck, ChevronDown, FolderOpen, Image as ImageIcon, RotateCw,
  Eye, Layers, HelpCircle, FileText, FlipHorizontal, FlipVertical
} from 'lucide-react';

interface PhotoToolbarProps {
  photoName?: string;
  onImportImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddText: () => void;
  onAddRect: () => void;
  onAddCircle: () => void;
  onToggleCrop: (aspectRatio?: number) => void;
  isCropActive: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  zoomPercent: number;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenPrintModal: () => void;
  onOpenAiEnhance: () => void;
  onExport: () => void;
  onOpenResizeModal?: () => void;
  onOpenSideRepair?: () => void;
  onTransferToPassport?: () => void;
  onManualSave?: () => void;
  onDeleteSelected?: () => void;
  onRotateActive?: () => void;
  onFlipHorizontalActive?: () => void;
  onFlipVerticalActive?: () => void;
  onDuplicateActive?: () => void;
  isAutoSaving?: boolean;
  lastSavedAt?: string | null;
  language: 'en' | 'bn';
}

export default function PhotoToolbar({
  photoName = 'IMG_2024_Portrait.jpg',
  onImportImage,
  onAddText,
  onAddRect,
  onAddCircle,
  onToggleCrop,
  isCropActive,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  zoomPercent,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenPrintModal,
  onOpenAiEnhance,
  onExport,
  onOpenResizeModal,
  onOpenSideRepair,
  onTransferToPassport,
  onManualSave,
  onDeleteSelected,
  onRotateActive,
  onFlipHorizontalActive,
  onFlipVerticalActive,
  onDuplicateActive,
  isAutoSaving,
  lastSavedAt,
  language
}: PhotoToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(true);
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = ['File', 'Edit', 'Image', 'Layer', 'Select', 'Filter', 'View', 'Window', 'Help'];

  return (
    <div className="bg-slate-900 border-b border-slate-800 flex flex-col shrink-0 select-none text-slate-200 relative z-50">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={onImportImage} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Single Action Toolbar */}
      <div className="px-4 py-2 flex items-center justify-between gap-3 text-xs">
        
        {/* Left Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Photo</span>
          </button>

          {onOpenResizeModal && (
            <button
              onClick={onOpenResizeModal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition-all"
              title="Resize Image Canvas (Dimensions & DPI)"
            >
              <Maximize className="w-3.5 h-3.5 text-indigo-400" />
              <span>Resize...</span>
            </button>
          )}

          {onOpenSideRepair && (
            <button
              onClick={onOpenSideRepair}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-500/40 text-indigo-200 font-semibold text-xs transition-all"
              title={language === 'bn' ? 'ম্যানুয়াল সাইড রিকনস্ট্রাকশন ও মেরামত' : 'Manual Side Reconstruction & Repair'}
            >
              <FlipHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              <span>{language === 'bn' ? 'সাইড মেরামত...' : 'Side Repair...'}</span>
            </button>
          )}


          <div className="h-4 w-px bg-slate-800 mx-0.5" />

          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors ${
              canUndo ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-900/50 text-slate-600 cursor-not-allowed border-slate-800'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>

          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors ${
              canRedo ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-900/50 text-slate-600 cursor-not-allowed border-slate-800'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-3.5 h-3.5" />
            <span>Redo</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-0.5" />

          <button
            onClick={onManualSave}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>

          {/* Auto Save Switch */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-semibold">Auto Save</span>
            <button
              onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
              className={`w-7 h-3.5 rounded-full transition-colors relative ${autoSaveEnabled ? 'bg-indigo-500' : 'bg-slate-700'}`}
            >
              <div className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${autoSaveEnabled ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        {/* Center Search & Viewport Navigation */}
        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative hidden md:block w-36">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Q..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2 py-1 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Zoom % */}
          <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 font-mono text-[11px]">
            <button onClick={onZoomOut} className="hover:text-white text-slate-400"><ZoomOut className="w-3.5 h-3.5" /></button>
            <span className="text-indigo-400 font-bold px-1">{zoomPercent}%</span>
            <button onClick={onZoomIn} className="hover:text-white text-slate-400"><ZoomIn className="w-3.5 h-3.5" /></button>
          </div>

          <button
            onClick={onResetZoom}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700"
          >
            Fit Screen
          </button>

          {/* Snap Switch */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-semibold">Snap</span>
            <button
              onClick={() => setSnapEnabled(!snapEnabled)}
              className={`w-7 h-3.5 rounded-full transition-colors relative ${snapEnabled ? 'bg-indigo-500' : 'bg-slate-700'}`}
            >
              <div className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${snapEnabled ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        {/* Right Output Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Send to Passport Studio 1-Click Action */}
          <button
            onClick={onTransferToPassport}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-900/30 transition-all border border-emerald-400/30"
            title={language === 'bn' ? 'এডিট করা ছবি সরাসরি পাসপোর্ট স্টুডিওতে পাঠান' : 'Send Edited Photo to Passport Studio'}
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-200" />
            <span>{language === 'bn' ? 'পাসপোর্ট স্টুডিওতে পাঠান' : 'To Passport Studio'}</span>
          </button>

          {/* Glowing AI Enhance Button */}
          <button
            onClick={onOpenAiEnhance}
            className="flex items-center gap-1.5 px-3.5 py-1 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold shadow-lg shadow-purple-900/30 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>AI Enhance</span>
          </button>

          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export</span>
          </button>

          <button
            onClick={onOpenPrintModal}
            className="flex items-center gap-1.5 px-3.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>
    </div>
  );
}
