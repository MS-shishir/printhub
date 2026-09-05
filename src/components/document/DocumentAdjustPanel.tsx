import React, { useState, useEffect, useRef } from 'react';
import {
  Sun, Contrast, Scissors, Sparkles, Sliders, RefreshCw, Compass, Palette, Type,
  Check, Layers, Wand2, ChevronDown, ChevronUp, SlidersHorizontal
} from 'lucide-react';
import { DocumentPageItem, DOC_PRESETS, DocPreset } from '../../services/DocumentScanService';

interface DocumentAdjustPanelProps {
  activePage: DocumentPageItem;
  onUpdateProperty: (updates: Partial<DocumentPageItem>) => void;
  onSelectPreset?: (preset: DocPreset) => void;
  onResetAdjustments: () => void;
  language: 'en' | 'bn';
}

export default function DocumentAdjustPanel({
  activePage,
  onUpdateProperty,
  onSelectPreset,
  onResetAdjustments,
  language
}: DocumentAdjustPanelProps) {
  // Navigation Tab: 'enhance' (Smart AI tools) | 'tune' (Manual Light & Geometry) | 'presets' (All Document Sizes)
  const [activeTab, setActiveTab] = useState<'enhance' | 'tune' | 'presets'>('enhance');
  const [isPresetDropdownOpen, setIsPresetDropdownOpen] = useState<boolean>(false);

  // Local state for 120 FPS instant slider feedback
  const [colorBoost, setColorBoost] = useState<number>(activePage.colorBoost ?? 100);
  const [textDarken, setTextDarken] = useState<number>(activePage.textDarken ?? 100);
  const [shadowStrength, setShadowStrength] = useState<number>(activePage.shadowStrength);
  const [sharpen, setSharpen] = useState<number>(activePage.sharpen);
  const [brightness, setBrightness] = useState<number>(activePage.brightness);
  const [contrast, setContrast] = useState<number>(activePage.contrast);
  const [binarizeSensitivity, setBinarizeSensitivity] = useState<number>(activePage.binarizeSensitivity);
  const [deskewAngle, setDeskewAngle] = useState<number>(activePage.deskewAngle);

  const animFrameRef = useRef<number | null>(null);

  // Sync with activePage when switching pages or resetting
  useEffect(() => {
    setColorBoost(activePage.colorBoost ?? 100);
    setTextDarken(activePage.textDarken ?? 100);
    setShadowStrength(activePage.shadowStrength);
    setSharpen(activePage.sharpen);
    setBrightness(activePage.brightness);
    setContrast(activePage.contrast);
    setBinarizeSensitivity(activePage.binarizeSensitivity);
    setDeskewAngle(activePage.deskewAngle);
  }, [
    activePage.id,
    activePage.colorBoost,
    activePage.textDarken,
    activePage.shadowStrength,
    activePage.sharpen,
    activePage.brightness,
    activePage.contrast,
    activePage.binarizeSensitivity,
    activePage.deskewAngle
  ]);

  // RequestAnimationFrame pipeline dispatcher for 0ms latency real-time visual response
  const scheduleUpdate = (updates: Partial<DocumentPageItem>) => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
    }
    animFrameRef.current = requestAnimationFrame(() => {
      onUpdateProperty(updates);
      animFrameRef.current = null;
    });
  };

  const handleSliderChange = (key: keyof DocumentPageItem, val: number) => {
    if (key === 'colorBoost') setColorBoost(val);
    else if (key === 'textDarken') setTextDarken(val);
    else if (key === 'shadowStrength') setShadowStrength(val);
    else if (key === 'sharpen') setSharpen(val);
    else if (key === 'brightness') setBrightness(val);
    else if (key === 'contrast') setContrast(val);
    else if (key === 'binarizeSensitivity') setBinarizeSensitivity(val);
    else if (key === 'deskewAngle') setDeskewAngle(val);

    scheduleUpdate({ [key]: val });
  };

  const handleSliderCommit = (key: keyof DocumentPageItem, val: number) => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    onUpdateProperty({ [key]: val });
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const currentPresetName =
    activePage.selectedPreset?.id === 'smart_nid' ? 'স্মার্ট NID (ID-1)' :
    activePage.selectedPreset?.id === 'old_nid' ? 'পুরাতন NID' :
    activePage.selectedPreset?.id === 'birth_cert_a4' ? 'জন্ম নিবন্ধন / A4' :
    activePage.selectedPreset?.id === 'legal_doc' ? 'দলিল / Legal' :
    activePage.selectedPreset?.id === 'passport_photo' ? 'পাসপোর্ট ছবি' :
    activePage.selectedPreset?.id === 'certificate_a4' ? 'সার্টিফিকেট A4' :
    activePage.selectedPreset?.id === 'driving_license' ? 'ড্রাইভিং লাইসেন্স' :
    activePage.selectedPreset?.id === 'memo_a5' ? 'ক্যাশ মেমো A5' :
    activePage.selectedPreset?.name || 'ফ্রি / কাস্টম';

  // Popular Quick Chips
  const popularPresets = DOC_PRESETS.filter(p =>
    ['birth_cert_a4', 'smart_nid', 'old_nid', 'legal_doc'].includes(p.id)
  );

  return (
    <div className="w-80 bg-slate-950 border-l border-slate-800/80 flex flex-col h-full select-none shrink-0 font-sans shadow-2xl">
      {/* ── 1. Header (Compact 44px) ── */}
      <div className="px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sliders className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-100">
            {language === 'bn' ? 'অ্যাডজাস্টমেন্ট' : 'Adjustments'}
          </span>
        </div>

        <button
          onClick={onResetAdjustments}
          className="flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-medium text-slate-400 hover:text-amber-300 bg-slate-800/80 hover:bg-slate-800 rounded-md border border-slate-700/60 transition cursor-pointer"
          title="Reset Sliders / সব রিসেট করুন"
        >
          <RefreshCw className="w-2.5 h-2.5" />
          <span>{language === 'bn' ? 'রিসেট' : 'Reset'}</span>
        </button>
      </div>

      {/* ── 2. Top Compact Document Preset Bar (No Vertical Bloat) ── */}
      <div className="p-2.5 border-b border-slate-800/70 bg-slate-900/40 shrink-0 space-y-1.5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsPresetDropdownOpen(!isPresetDropdownOpen)}
            className="flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800/90 border border-slate-700/80 text-left transition cursor-pointer group"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm">{activePage.selectedPreset?.icon || '📄'}</span>
              <span className="text-xs font-bold text-amber-300 truncate">
                {currentPresetName}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <span className="text-[9.5px] font-mono text-slate-400 font-semibold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                {activePage.selectedPreset?.widthMm > 0
                  ? `${activePage.selectedPreset.widthMm}×${activePage.selectedPreset.heightMm}mm`
                  : 'Freeform'}
              </span>
              {isPresetDropdownOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
              )}
            </div>
          </button>
        </div>

        {/* Quick Popular Preset Chips */}
        {!isPresetDropdownOpen && (
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar-none py-0.5">
            {popularPresets.map((p) => {
              const isSel = activePage.selectedPreset?.id === p.id;
              const chipLabel =
                p.id === 'birth_cert_a4' ? 'A4' :
                p.id === 'smart_nid' ? 'স্মার্ট NID' :
                p.id === 'old_nid' ? 'পুরাতন NID' : 'দলিল';
              return (
                <button
                  key={p.id}
                  onClick={() => onSelectPreset && onSelectPreset(p)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 transition border cursor-pointer ${
                    isSel
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/80 ring-1 ring-amber-500/30'
                      : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {chipLabel}
                </button>
              );
            })}
            <button
              onClick={() => setIsPresetDropdownOpen(true)}
              className="px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 bg-slate-800/60 text-indigo-400 hover:text-indigo-300 border border-slate-700 cursor-pointer"
            >
              +সব
            </button>
          </div>
        )}

        {/* Expandable Full Preset Menu (Clean Overlay Drawer) */}
        {isPresetDropdownOpen && (
          <div className="pt-1 space-y-1 max-h-56 overflow-y-auto custom-scrollbar border-t border-slate-800 mt-2">
            <div className="grid grid-cols-2 gap-1.5">
              {DOC_PRESETS.map((preset) => {
                const isSelected = activePage.selectedPreset?.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      if (onSelectPreset) onSelectPreset(preset);
                      setIsPresetDropdownOpen(false);
                    }}
                    className={`p-2 rounded-lg text-left transition flex items-center justify-between border cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500 text-amber-200 ring-1 ring-amber-400/40'
                        : 'bg-slate-950 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="min-w-0 pr-1">
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-xs">{preset.icon}</span>
                        <div className="font-bold text-[10.5px] truncate">
                          {preset.id === 'smart_nid' ? 'স্মার্ট NID' :
                           preset.id === 'old_nid' ? 'পুরাতন NID' :
                           preset.id === 'birth_cert_a4' ? 'জন্মনিবন্ধন A4' :
                           preset.id === 'legal_doc' ? 'দলিল Legal' :
                           preset.id === 'passport_photo' ? 'পাসপোর্ট ছবি' :
                           preset.name}
                        </div>
                      </div>
                      <div className="text-[9px] font-mono text-slate-500">
                        {preset.widthMm > 0 ? `${preset.widthMm}×${preset.heightMm}mm` : 'Freeform'}
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 3. High-Density Segmented Tabs (AI Enhance vs Manual Tune) ── */}
      <div className="p-2.5 pb-0 shrink-0">
        <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab('enhance')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'enhance'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-300" />
            <span>{language === 'bn' ? 'স্মার্ট এনহ্যান্স' : 'AI Enhance'}</span>
          </button>

          <button
            onClick={() => setActiveTab('tune')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'tune'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-300" />
            <span>{language === 'bn' ? 'ফাইন টিউন' : 'Manual Tune'}</span>
          </button>
        </div>
      </div>

      {/* ── 4. Zero-Scroll Pro Controls Content ── */}
      <div className="flex-1 p-3 space-y-3 text-xs overflow-y-auto custom-scrollbar">
        
        {/* ── TAB 1: Smart AI Enhancements (Fits in One View without Scrolling!) ── */}
        {activeTab === 'enhance' && (
          <div className="space-y-2.5 animate-fade-in">
            
            {/* 🌙 Shadow Fix (ছায়া রিমুভ) */}
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/90 shadow-sm space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-amber-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  {language === 'bn' ? 'ছায়া রিমুভ (Shadow Fix)' : 'Shadow Removal'}
                </span>
                <span className="font-mono text-[10.5px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                  {shadowStrength}%
                </span>
              </div>
              
              <input
                type="range"
                min="0"
                max="100"
                value={shadowStrength}
                onChange={(e) => handleSliderChange('shadowStrength', Number(e.target.value))}
                onMouseUp={(e) => handleSliderCommit('shadowStrength', Number((e.target as HTMLInputElement).value))}
                onTouchEnd={(e) => handleSliderCommit('shadowStrength', Number((e.target as HTMLInputElement).value))}
                className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />

              <div className="flex items-center justify-between">
                <span className="text-[9px] text-slate-400">
                  {language === 'bn' ? 'কাগজ পরিষ্কার ও ছায়া দূর' : 'Paper lighting clean'}
                </span>
                <div className="flex gap-1">
                  {[0, 60, 100].map((val) => (
                    <button
                      key={val}
                      onClick={() => {
                        handleSliderChange('shadowStrength', val);
                        handleSliderCommit('shadowStrength', val);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold transition border cursor-pointer ${
                        shadowStrength === val
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {val === 0 ? 'Off' : `${val}%`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ✍️ Ink-Selective Text Darken (টেক্সট ডার্কেন) */}
            {activePage.filterMode !== 'clean_bw' && (
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/90 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-emerald-300">
                    <Type className="w-3.5 h-3.5 text-emerald-400" />
                    {language === 'bn' ? 'টেক্সট ডার্কেন (Text Darken)' : 'Text Darken'}
                  </span>
                  <span className="font-mono text-[10.5px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                    {textDarken === 100 ? '100% (Norm)' : `${textDarken}%`}
                  </span>
                </div>

                <input
                  type="range"
                  min="50"
                  max="200"
                  step="5"
                  value={textDarken}
                  onChange={(e) => handleSliderChange('textDarken', Number(e.target.value))}
                  onMouseUp={(e) => handleSliderCommit('textDarken', Number((e.target as HTMLInputElement).value))}
                  onTouchEnd={(e) => handleSliderCommit('textDarken', Number((e.target as HTMLInputElement).value))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />

                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-emerald-400/90 font-medium">
                    {language === 'bn' ? 'শুধু লেখার কালি ডার্ক হবে' : 'Inks & text strokes only'}
                  </span>
                  <div className="flex gap-1">
                    {[100, 150, 200].map((val) => (
                      <button
                        key={val}
                        onClick={() => {
                          handleSliderChange('textDarken', val);
                          handleSliderCommit('textDarken', val);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold transition border cursor-pointer ${
                          textDarken === val
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {val === 100 ? 'Norm' : `${val}%`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 🎨 Color Boost (কালার বুস্ট) */}
            {activePage.filterMode !== 'clean_bw' && activePage.filterMode !== 'grayscale' && (
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/90 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-pink-300">
                    <Palette className="w-3.5 h-3.5 text-pink-400" />
                    {language === 'bn' ? 'কালার বুস্ট (Color Boost)' : 'Color Boost'}
                  </span>
                  <span className="font-mono text-[10.5px] text-pink-400 font-bold bg-pink-500/10 px-1.5 py-0.2 rounded border border-pink-500/20">
                    {colorBoost === 0 ? '0% (B&W)' : `${colorBoost}%`}
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="200"
                  step="5"
                  value={colorBoost}
                  onChange={(e) => handleSliderChange('colorBoost', Number(e.target.value))}
                  onMouseUp={(e) => handleSliderCommit('colorBoost', Number((e.target as HTMLInputElement).value))}
                  onTouchEnd={(e) => handleSliderCommit('colorBoost', Number((e.target as HTMLInputElement).value))}
                  className="w-full accent-pink-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />

                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-slate-400">
                    {language === 'bn' ? 'সিল ও কালার টেক্সট' : 'Stamps & color vibrancy'}
                  </span>
                  <div className="flex gap-1">
                    {[0, 100, 160].map((val) => (
                      <button
                        key={val}
                        onClick={() => {
                          handleSliderChange('colorBoost', val);
                          handleSliderCommit('colorBoost', val);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold transition border cursor-pointer ${
                          colorBoost === val
                            ? 'bg-pink-500 text-slate-950 border-pink-400'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {val === 0 ? 'B&W' : val === 100 ? 'Norm' : `${val}%`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ⚡ Text Sharpening (টেক্সট শার্পনেস) */}
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/90 shadow-sm space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-indigo-300">
                  <Scissors className="w-3.5 h-3.5 text-indigo-400" />
                  {language === 'bn' ? 'টেক্সট শার্পনেস' : 'Text Sharpening'}
                </span>
                <span className="font-mono text-[10.5px] text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">
                  {sharpen}%
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={sharpen}
                onChange={(e) => handleSliderChange('sharpen', Number(e.target.value))}
                onMouseUp={(e) => handleSliderCommit('sharpen', Number((e.target as HTMLInputElement).value))}
                onTouchEnd={(e) => handleSliderCommit('sharpen', Number((e.target as HTMLInputElement).value))}
                className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />

              <div className="flex items-center justify-between">
                <span className="text-[9px] text-slate-400">
                  {language === 'bn' ? 'অক্ষরের প্রান্ত স্পষ্ট করা' : 'Edge crispness'}
                </span>
                <div className="flex gap-1">
                  {[0, 30, 70].map((val) => (
                    <button
                      key={val}
                      onClick={() => {
                        handleSliderChange('sharpen', val);
                        handleSliderCommit('sharpen', val);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold transition border cursor-pointer ${
                        sharpen === val
                          ? 'bg-indigo-500 text-white border-indigo-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {val === 0 ? 'Off' : `${val}%`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── TAB 2: Manual Fine-Tuning & Geometry (Zero-Scroll Compact Layout) ── */}
        {activeTab === 'tune' && (
          <div className="space-y-2.5 animate-fade-in">
            
            {/* Brightness */}
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/90 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                  <Sun className="w-3.5 h-3.5 text-amber-300" />
                  {language === 'bn' ? 'উজ্জ্বলতা (Brightness)' : 'Brightness'}
                </span>
                <span className="font-mono text-[10.5px] text-slate-300 font-bold bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                  {brightness > 0 ? `+${brightness}` : brightness}
                </span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={brightness}
                onChange={(e) => handleSliderChange('brightness', Number(e.target.value))}
                onMouseUp={(e) => handleSliderCommit('brightness', Number((e.target as HTMLInputElement).value))}
                onTouchEnd={(e) => handleSliderCommit('brightness', Number((e.target as HTMLInputElement).value))}
                className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Contrast */}
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/90 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                  <Contrast className="w-3.5 h-3.5 text-cyan-400" />
                  {language === 'bn' ? 'কন্ট্রাস্ট (Contrast)' : 'Contrast'}
                </span>
                <span className="font-mono text-[10.5px] text-slate-300 font-bold bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                  {contrast > 0 ? `+${contrast}` : contrast}
                </span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={contrast}
                onChange={(e) => handleSliderChange('contrast', Number(e.target.value))}
                onMouseUp={(e) => handleSliderCommit('contrast', Number((e.target as HTMLInputElement).value))}
                onTouchEnd={(e) => handleSliderCommit('contrast', Number((e.target as HTMLInputElement).value))}
                className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Binarization Threshold (Only for clean_bw mode) */}
            {activePage.filterMode === 'clean_bw' && (
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/90 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-bold text-amber-300">
                    {language === 'bn' ? 'ফটোকপি সেন্সিটিভিটি' : 'B&W Threshold'}
                  </span>
                  <span className="font-mono text-[10.5px] text-amber-300 font-bold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                    {binarizeSensitivity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={binarizeSensitivity}
                  onChange={(e) => handleSliderChange('binarizeSensitivity', Number(e.target.value))}
                  onMouseUp={(e) => handleSliderCommit('binarizeSensitivity', Number((e.target as HTMLInputElement).value))}
                  onTouchEnd={(e) => handleSliderCommit('binarizeSensitivity', Number((e.target as HTMLInputElement).value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            )}

            {/* Deskew Fine Rotation */}
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/90 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                  <Compass className="w-3.5 h-3.5 text-teal-400" />
                  {language === 'bn' ? 'ডেস্কিউ (সোজা করা)' : 'Fine Deskew Angle'}
                </span>
                <span className="font-mono text-[10.5px] text-teal-300 font-bold bg-teal-500/10 px-1.5 py-0.2 rounded border border-teal-500/20">
                  {deskewAngle}°
                </span>
              </div>
              <input
                type="range"
                min="-15"
                max="15"
                step="0.5"
                value={deskewAngle}
                onChange={(e) => handleSliderChange('deskewAngle', Number(e.target.value))}
                onMouseUp={(e) => handleSliderCommit('deskewAngle', Number((e.target as HTMLInputElement).value))}
                onTouchEnd={(e) => handleSliderCommit('deskewAngle', Number((e.target as HTMLInputElement).value))}
                className="w-full accent-teal-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono pt-0.5">
                <span>-15°</span>
                <button
                  onClick={() => {
                    setDeskewAngle(0);
                    handleSliderCommit('deskewAngle', 0);
                  }}
                  className="text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer transition px-1 py-0.2 rounded bg-slate-950 border border-slate-800"
                >
                  0° (Reset)
                </button>
                <span>+15°</span>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}




