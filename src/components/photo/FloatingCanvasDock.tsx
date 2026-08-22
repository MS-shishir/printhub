/**
 * FloatingCanvasDock.tsx
 * Floating 1-Click Quick Action Dock overlaid on canvas bottom
 * (Undo, Redo, Crop, Rotate, AI Enhance, Remove BG, Shadow, Border, Frame, Duplicate, Delete).
 */

import React from 'react';
import {
  Undo2, Redo2, Crop as CropIcon, RotateCw, Sparkles, Wand2, Moon, Square, Image as ImageIcon, Copy, Trash2
} from 'lucide-react';

interface FloatingCanvasDockProps {
  onUndo?: () => void;
  onRedo?: () => void;
  onCrop: () => void;
  onRotate: () => void;
  onAiEnhance: () => void;
  onRemoveBg: () => void;
  onShadow: () => void;
  onBorder: () => void;
  onFrame: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isProcessing?: boolean;
  language: 'en' | 'bn';
}

export default function FloatingCanvasDock({
  onUndo,
  onRedo,
  onCrop,
  onRotate,
  onAiEnhance,
  onRemoveBg,
  onShadow,
  onBorder,
  onFrame,
  onDuplicate,
  onDelete,
  isProcessing,
  language
}: FloatingCanvasDockProps) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-slate-900/95 border border-slate-700/90 p-1.5 rounded-2xl shadow-2xl backdrop-blur-2xl animate-fadeIn text-slate-200">
      {onUndo && (
        <button
          onClick={onUndo}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all"
          title="Undo (Ctrl + Z)"
        >
          <Undo2 className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">{language === 'bn' ? 'আন্ডু' : 'Undo'}</span>
        </button>
      )}

      {onRedo && (
        <button
          onClick={onRedo}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all"
          title="Redo (Ctrl + Y)"
        >
          <Redo2 className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">{language === 'bn' ? 'রিডু' : 'Redo'}</span>
        </button>
      )}

      <div className="w-px h-4 bg-slate-700 mx-0.5" />

      <button
        onClick={onCrop}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all"
        title="Crop Image"
      >
        <CropIcon className="w-3.5 h-3.5 text-amber-400" />
        <span>{language === 'bn' ? 'ক্রপ' : 'Crop'}</span>
      </button>

      <button
        onClick={onRotate}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all"
        title="Rotate 90°"
      >
        <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
        <span>{language === 'bn' ? 'ঘুরান' : 'Rotate'}</span>
      </button>

      <button
        onClick={onAiEnhance}
        disabled={isProcessing}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-900/30 disabled:opacity-50"
        title="AI 4K Enhance & Retouch"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
        <span>{language === 'bn' ? 'AI এনহ্যান্স' : 'AI Enhance'}</span>
      </button>

      <button
        onClick={onRemoveBg}
        disabled={isProcessing}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all disabled:opacity-50"
        title="Remove Background"
      >
        <Wand2 className="w-3.5 h-3.5 text-purple-400" />
        <span>{language === 'bn' ? 'BG রিমুভ' : 'Remove BG'}</span>
      </button>

      <button
        onClick={onShadow}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all"
        title="Toggle Drop Shadow"
      >
        <Moon className="w-3.5 h-3.5 text-indigo-400" />
        <span>{language === 'bn' ? 'শ্যাডো' : 'Shadow'}</span>
      </button>

      <button
        onClick={onBorder}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all"
        title="Add Stroke Border"
      >
        <Square className="w-3.5 h-3.5 text-emerald-400" />
        <span>{language === 'bn' ? 'বর্ডার' : 'Border'}</span>
      </button>

      <button
        onClick={onFrame}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all"
        title="Apply Passport Frame"
      >
        <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
        <span>{language === 'bn' ? 'ফ্রেমিং' : 'Frame'}</span>
      </button>

      <button
        onClick={onDuplicate}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all"
        title="Duplicate Layer"
      >
        <Copy className="w-3.5 h-3.5 text-slate-400" />
        <span>{language === 'bn' ? 'কপি' : 'Duplicate'}</span>
      </button>

      <div className="w-px h-4 bg-slate-700 mx-0.5" />

      <button
        onClick={onDelete}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 text-xs font-bold transition-all shadow-md"
        title="Delete Selected Layer (Delete Key)"
      >
        <Trash2 className="w-3.5 h-3.5 text-rose-300" />
        <span>{language === 'bn' ? 'ডিলিট' : 'Delete'}</span>
      </button>
    </div>
  );
}
