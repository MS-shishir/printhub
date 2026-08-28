/**
 * DocumentAdjustPanel.tsx
 * Enterprise Real-Time Slider Adjustments Panel for Fine Document Enhancement.
 */

import React from 'react';
import { Sun, Contrast, Scissors, Sparkles, Sliders, RefreshCw, Compass } from 'lucide-react';
import { DocumentPageItem } from '../../services/DocumentScanService';

interface DocumentAdjustPanelProps {
  activePage: DocumentPageItem;
  onUpdateProperty: (updates: Partial<DocumentPageItem>) => void;
  onResetAdjustments: () => void;
  language: 'en' | 'bn';
}

export default function DocumentAdjustPanel({
  activePage,
  onUpdateProperty,
  onResetAdjustments,
  language
}: DocumentAdjustPanelProps) {
  return (
    <div className="w-72 bg-slate-900 border-l border-slate-800 flex flex-col h-full select-none shrink-0">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200">
              {language === 'bn' ? 'অ্যাডজাস্টমেন্ট কন্ট্রোল' : 'Enhance Adjustments'}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              {activePage.selectedPreset.name}
            </div>
          </div>
        </div>

        <button
          onClick={onResetAdjustments}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
          title="Reset Sliders / রিসেট করুন"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Sliders Container */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 custom-scrollbar text-xs">
        {/* 1. Shadow Removal */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              {language === 'bn' ? 'ছায়া রিমুভ (Shadow Fix)' : 'Shadow Removal'}
            </span>
            <span className="font-mono text-[11px] text-amber-300 font-bold">
              {activePage.shadowStrength}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={activePage.shadowStrength}
            onChange={(e) => onUpdateProperty({ shadowStrength: Number(e.target.value) })}
            className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
            <span>Off (0%)</span>
            <span>Balanced (60%)</span>
            <span>Max (100%)</span>
          </div>
        </div>

        {/* 2. Text Sharpening */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 font-bold">
              <Scissors className="w-3.5 h-3.5 text-indigo-400" />
              {language === 'bn' ? 'টেক্সট শার্পনেস' : 'Text Sharpening'}
            </span>
            <span className="font-mono text-[11px] text-indigo-300 font-bold">
              {activePage.sharpen}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={activePage.sharpen}
            onChange={(e) => onUpdateProperty({ sharpen: Number(e.target.value) })}
            className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* 3. Brightness */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 font-bold">
              <Sun className="w-3.5 h-3.5 text-amber-300" />
              {language === 'bn' ? 'উজ্জ্বলতা (Brightness)' : 'Brightness'}
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              {activePage.brightness > 0 ? `+${activePage.brightness}` : activePage.brightness}
            </span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={activePage.brightness}
            onChange={(e) => onUpdateProperty({ brightness: Number(e.target.value) })}
            className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* 4. Contrast */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 font-bold">
              <Contrast className="w-3.5 h-3.5 text-cyan-400" />
              {language === 'bn' ? 'কন্ট্রাস্ট (Contrast)' : 'Contrast'}
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              {activePage.contrast > 0 ? `+${activePage.contrast}` : activePage.contrast}
            </span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={activePage.contrast}
            onChange={(e) => onUpdateProperty({ contrast: Number(e.target.value) })}
            className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* 5. Binarization Threshold (Only relevant for clean_bw mode) */}
        {activePage.filterMode === 'clean_bw' && (
          <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-bold text-amber-300">
                {language === 'bn' ? 'ফটোকপি সেন্সিটিভিটি' : 'B&W Threshold'}
              </span>
              <span className="font-mono text-[11px] text-amber-300 font-bold">
                {activePage.binarizeSensitivity}%
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              value={activePage.binarizeSensitivity}
              onChange={(e) => onUpdateProperty({ binarizeSensitivity: Number(e.target.value) })}
              className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="text-[10px] text-slate-500">
              {language === 'bn' ? 'লেখা পাতলা বা গাঢ় করতে অ্যাডজাস্ট করুন' : 'Fine-tune text thickness & background threshold'}
            </div>
          </div>
        )}

        {/* 6. Deskew Fine Rotation */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 font-bold">
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              {language === 'bn' ? 'ডেস্কিউ (সোজা করা)' : 'Fine Deskew Angle'}
            </span>
            <span className="font-mono text-[11px] text-emerald-300 font-bold">
              {activePage.deskewAngle}°
            </span>
          </div>
          <input
            type="range"
            min="-15"
            max="15"
            step="0.5"
            value={activePage.deskewAngle}
            onChange={(e) => onUpdateProperty({ deskewAngle: Number(e.target.value) })}
            className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
            <span>-15°</span>
            <button
              onClick={() => onUpdateProperty({ deskewAngle: 0 })}
              className="text-indigo-400 hover:underline cursor-pointer"
            >
              0° (Reset)
            </button>
            <span>+15°</span>
          </div>
        </div>
      </div>
    </div>
  );
}
