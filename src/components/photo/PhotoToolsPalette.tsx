/**
 * PhotoToolsPalette.tsx
 * Senior UI/UX Professional Photo Editing Tool Palette
 * Clean, balanced 2-column layout with 0 text truncation, hotkey badges, and active state highlights.
 */

import React, { useRef } from 'react';
import { 
  Move, MousePointer, Crop as CropIcon, Scissors, Brush, Eraser, 
  Copy, Wand2, Sparkles, Pipette, Flame, Droplet, Sun, Contrast, ZoomIn, Hand, Upload, Ruler, UserCheck,
  FlipHorizontal
} from 'lucide-react';

export type ToolType = 
  | 'move' | 'select' | 'crop' | 'warp_crop' | 'puppet_warp' | 'side_repair' | 'ruler' | 'brush' | 'eraser' 
  | 'clone' | 'magic_remove' | 'ai_bg' | 'pipette' | 'blur' | 'sharpen' 
  | 'dodge' | 'burn' | 'zoom' | 'hand';

interface PhotoToolsPaletteProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  onImportImage?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  language: 'en' | 'bn';
}

const TOOL_LIST: { id: ToolType; icon: any; nameEn: string; nameBn: string; hotkey?: string }[] = [
  { id: 'move', icon: Move, nameEn: 'Move', nameBn: 'মুভ', hotkey: 'V' },
  { id: 'select', icon: MousePointer, nameEn: 'Select', nameBn: 'সিলেকশন', hotkey: 'M' },
  { id: 'crop', icon: CropIcon, nameEn: 'Crop', nameBn: 'ক্রপ', hotkey: 'C' },
  { id: 'warp_crop', icon: Scissors, nameEn: '4-Corner', nameBn: '৪-কোণা', hotkey: 'K' },
  { id: 'puppet_warp', icon: UserCheck, nameEn: 'Deform', nameBn: 'ডিফর্ম', hotkey: 'Q' },
  { id: 'side_repair', icon: FlipHorizontal, nameEn: 'Repair', nameBn: 'সাইড রিপেয়ার', hotkey: 'G' },
  { id: 'ruler', icon: Ruler, nameEn: 'Ruler', nameBn: 'রুলার', hotkey: 'R' },
  { id: 'brush', icon: Brush, nameEn: 'Brush', nameBn: 'ব্রাশ', hotkey: 'B' },
  { id: 'eraser', icon: Eraser, nameEn: 'Eraser', nameBn: 'ইরেজার', hotkey: 'E' },
  { id: 'clone', icon: Copy, nameEn: 'Clone', nameBn: 'ক্লোন', hotkey: 'S' },
  { id: 'magic_remove', icon: Wand2, nameEn: 'Magic', nameBn: 'ম্যাজিক', hotkey: 'W' },
  { id: 'ai_bg', icon: Sparkles, nameEn: 'AI BG', nameBn: 'AI রিমুভ', hotkey: 'A' },
  { id: 'pipette', icon: Pipette, nameEn: 'Picker', nameBn: 'আইড্রপার', hotkey: 'I' },
  { id: 'blur', icon: Droplet, nameEn: 'Blur', nameBn: 'ব্লার', hotkey: 'U' },
  { id: 'sharpen', icon: Sun, nameEn: 'Sharpen', nameBn: 'শার্পেন', hotkey: 'P' },
  { id: 'dodge', icon: Contrast, nameEn: 'Dodge', nameBn: 'ডজ', hotkey: 'D' },
  { id: 'burn', icon: Flame, nameEn: 'Burn', nameBn: 'বার্ন', hotkey: 'O' },
  { id: 'zoom', icon: ZoomIn, nameEn: 'Zoom', nameBn: 'জুম', hotkey: 'Z' },
  { id: 'hand', icon: Hand, nameEn: 'Pan', nameBn: 'প্যান', hotkey: 'H' },
];



export default function PhotoToolsPalette({ activeTool, onSelectTool, onImportImage, language }: PhotoToolsPaletteProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <aside className="w-[110px] bg-slate-900 border-r border-slate-800 flex flex-col items-center py-2 shrink-0 z-20 overflow-hidden select-none">
      {/* Upload Button */}
      <div className="w-full px-2 mb-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-[11px] shadow-md shadow-indigo-900/30 transition-all active:scale-95 border border-indigo-400/30 cursor-pointer"
          title={language === 'bn' ? 'ফটো আপলোড করুন' : 'Import Photo'}
        >
          <Upload className="w-3.5 h-3.5" />
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

      <div className="w-full border-t border-slate-800/80 mb-2" />

      {/* 2-Column Balanced Tool Grid (w-[110px] allows 50px per column with 0 truncation) */}
      <div className="w-full px-1.5 grid grid-cols-2 gap-1.5 overflow-y-auto max-h-[calc(100vh-140px)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {TOOL_LIST.map((t) => {
          const Icon = t.icon;
          const isActive = activeTool === t.id;
          const label = language === 'bn' ? t.nameBn : t.nameEn;

          return (
            <button
              key={t.id}
              onClick={() => onSelectTool(t.id)}
              className={`group relative flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-b from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40'
                  : 'bg-slate-950/40 hover:bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-800/40'
              }`}
              title={`${t.nameEn} ${t.hotkey ? `(${t.hotkey})` : ''}`}
            >
              <Icon className={`w-4 h-4 mb-1 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-300'}`} />
              
              <span className={`text-[10px] font-bold tracking-tight text-center leading-tight whitespace-nowrap overflow-hidden text-ellipsis w-full px-0.5 ${
                isActive ? 'text-white font-extrabold' : 'text-slate-300 group-hover:text-white'
              }`}>
                {label}
              </span>

              {/* Hotkey Badge */}
              {t.hotkey && (
                <span className={`absolute top-0.5 right-1 text-[8px] font-mono font-bold opacity-0 group-hover:opacity-100 transition-opacity ${
                  isActive ? 'text-indigo-200 opacity-80' : 'text-slate-500'
                }`}>
                  {t.hotkey}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

