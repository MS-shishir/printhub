/**
 * DocumentFilterBar.tsx
 * 1-Click Enterprise Document Magic Filter Mode Selector Bar.
 */

import React from 'react';
import { Sparkles, FileText, Palette, Moon, Zap, RotateCcw } from 'lucide-react';
import { DocumentFilterMode } from '../../engines/DocumentEnhanceEngine';

interface DocumentFilterBarProps {
  activeMode: DocumentFilterMode;
  onSelectMode: (mode: DocumentFilterMode) => void;
  language: 'en' | 'bn';
}

interface FilterOption {
  id: DocumentFilterMode;
  labelEn: string;
  labelBn: string;
  icon: React.ElementType;
  badge?: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  {
    id: 'magic_color',
    labelEn: 'Magic Color',
    labelBn: 'ম্যাজিক কালার',
    icon: Sparkles,
    badge: 'Popular',
  },
  {
    id: 'clean_bw',
    labelEn: 'Clean B&W',
    labelBn: 'ফটোকপি (B&W)',
    icon: FileText,
  },
  {
    id: 'grayscale',
    labelEn: 'Grayscale',
    labelBn: 'গ্রেস্কেল',
    icon: Moon,
  },
  {
    id: 'high_contrast',
    labelEn: 'High Contrast',
    labelBn: 'হাই কন্ট্রাস্ট',
    icon: Zap,
  },
  {
    id: 'original',
    labelEn: 'Original',
    labelBn: 'অরিজিনাল',
    icon: RotateCcw,
  },
];

export default function DocumentFilterBar({
  activeMode,
  onSelectMode,
  language
}: DocumentFilterBarProps) {
  return (
    <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner select-none overflow-x-auto">
      {FILTER_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isActive = activeMode === opt.id;

        return (
          <button
            key={opt.id}
            onClick={() => onSelectMode(opt.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              isActive
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30 scale-102'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
            <span>{language === 'bn' ? opt.labelBn : opt.labelEn}</span>
            {opt.badge && !isActive && (
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
