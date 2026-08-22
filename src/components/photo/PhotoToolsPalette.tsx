/**
 * PhotoToolsPalette.tsx
 * Pure Photo Editing Tool Palette
 * Clean, compact, 2-column layout focused exclusively on photo retouching & adjustment.
 */

import React, { useRef } from 'react';
import {
  Move, MousePointer, Crop as CropIcon, Brush, Eraser,
  Copy, Wand2, Sparkles, Pipette, Flame, Droplet, Sun, Contrast, ZoomIn, Hand, Upload, Ruler
} from 'lucide-react';

export type ToolType = 
  | 'move' | 'select' | 'crop' | 'ruler' | 'brush' | 'eraser' 
  | 'clone' | 'magic_remove' | 'ai_bg' | 'pipette' | 'blur' | 'sharpen' 
  | 'dodge' | 'burn' | 'zoom' | 'hand';

interface PhotoToolsPaletteProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  onImportImage?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  language: 'en' | 'bn';
}

const TOOL_LIST: { id: ToolType; icon: any; nameEn: string; nameBn: string }[] = [
  { id: 'move', icon: Move, nameEn: 'Move Tool', nameBn: 'মুভ (V)' },
  { id: 'select', icon: MousePointer, nameEn: 'Selection', nameBn: 'সিলেকশন' },
  { id: 'crop', icon: CropIcon, nameEn: 'Crop Tool', nameBn: 'ক্রপ (C)' },
  { id: 'ruler', icon: Ruler, nameEn: 'Passport Ruler', nameBn: 'রুলার' },
  { id: 'brush', icon: Brush, nameEn: 'Brush', nameBn: 'ব্রাশ (B)' },
  { id: 'eraser', icon: Eraser, nameEn: 'Eraser', nameBn: 'ইরেজার (E)' },
  { id: 'clone', icon: Copy, nameEn: 'Clone Stamp', nameBn: 'ক্লোন' },
  { id: 'magic_remove', icon: Wand2, nameEn: 'Magic Eraser', nameBn: 'ম্যাজিক' },
  { id: 'ai_bg', icon: Sparkles, nameEn: 'AI BG Remove', nameBn: 'AI রিমুভ' },
  { id: 'pipette', icon: Pipette, nameEn: 'Eyedropper', nameBn: 'আইড্রপার' },
  { id: 'blur', icon: Droplet, nameEn: 'Blur', nameBn: 'ব্লার' },
  { id: 'sharpen', icon: Sun, nameEn: 'Sharpen', nameBn: 'শার্পেন' },
  { id: 'dodge', icon: Contrast, nameEn: 'Dodge Lighten', nameBn: 'ডজ' },
  { id: 'burn', icon: Flame, nameEn: 'Burn Darken', nameBn: 'বার্ন' },
  { id: 'zoom', icon: ZoomIn, nameEn: 'Zoom In', nameBn: 'জুম (Z)' },
  { id: 'hand', icon: Hand, nameEn: 'Pan Hand', nameBn: 'প্যান (H)' },
];

export default function PhotoToolsPalette({ activeTool, onSelectTool, onImportImage, language }: PhotoToolsPaletteProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <aside className="w-[92px] bg-slate-900 border-r border-slate-800 flex flex-col items-center py-2 shrink-0 z-20 overflow-hidden select-none">
      <div className="w-full px-1.5 mb-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center p-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-[11px] shadow-lg transition-all active:scale-95 border border-indigo-400/30"
          title="Import Photo"
        >
          <Upload className="w-4 h-4 mb-0.5" />
          <span>{language === 'bn' ? 'আপলোড' : 'Import'}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onImportImage}
        />
      </div>

      <div className="w-full border-t border-slate-800 my-1" />

      {/* 2-Column Responsive Compact Grid Layout */}
      <div className="w-full px-1 grid grid-cols-2 gap-1 overflow-hidden">
        {TOOL_LIST.map((t) => {
          const Icon = t.icon;
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSelectTool(t.id)}
              className={`relative flex flex-col items-center justify-center py-2 rounded-xl transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md border border-indigo-400/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent'
              }`}
              title={language === 'bn' ? t.nameBn : t.nameEn}
            >
              <Icon className="w-4 h-4 mb-0.5 stroke-[2.2]" />
              <span className="text-[10.5px] font-bold tracking-tight text-center leading-tight truncate w-full px-0.5">
                {t.nameBn}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
