/**
 * ColorAdjustPanel.tsx
 * Master Multi-Tab Inspector Panel with Global & Selective Local Mask Adjustments.
 * Supports Global | Local mode switcher, AI Smart Semantic Selection (Face, Skin, Neck, Hair, Eyes, Clothes, Background, Subject),
 * Brush/Eraser mask painting, Feathering, Show Mask Overlay, and Non-Destructive Multi-Mask Stack.
 */

import React, { useState } from 'react';
import { 
  Sliders, Wand2, Sparkles, SlidersHorizontal, Layers, Activity, History, 
  Sun, Eye, Scissors, Frame, Box, Image as ImageIcon, RefreshCw, Palette, Type, Download, Brush, Eraser, Pipette,
  CloudSun, Thermometer, Disc, Shield, Bookmark, Sparkle, LayoutTemplate, SplitSquareVertical,
  Check, Smile, QrCode, Barcode, PenTool, ImagePlus, Globe, Target, Plus, Trash2, EyeOff, RotateCcw,
  User, Shirt
} from 'lucide-react';
import { LocalAdjustmentStackItem, LocalAdjustmentValues, AiRegionType } from '../../engines/LocalAdjustmentEngine';

export interface ImageFilterProps {
  brightness: number;
  contrast: number;
  exposure: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  vibrance: number;
  saturation: number;
  temperature: number;
  tint: number;
  vignette: number;
  clarity: number;
  blur: number;
  sharpen: number;
  // Retouching (Identity-Preserving Beauty Suite)
  skinSmoothing: number;
  teethWhitening: number;
  faceLighting: number;
  lipRosyPink: number;   // 👄 Lip Pink Tint / ঠোঁটে গোলাপি ভাব (0 to 100)
  underEyeKajal: number; // 👁️ Under-Eye Kajal / চোখের নিচে কাজল (0 to 100)
  eyebrowEnhance: number; // 👁️ Eyebrows / ভ্রু গাড় করা (0 to 100)
  blushRosy: number;      // 🌸 Cheek Blush / গালে গোলাপি (0 to 100)
  redEyeFix: boolean;
  oilyShineReduction: number;
  // Canvas & Background
  bgColor: string;
  bgBlur: number;
  borderColor: string;
  borderSize: number;
  shadowColor: string;
  shadowBlur: number;
  brushColor: string;
  brushWidth: number;
}

interface ColorAdjustPanelProps {
  props: ImageFilterProps;
  onChange: (key: keyof ImageFilterProps, val: any) => void;

  // Local Adjustments Integration Props
  localAdjustmentsMode?: 'global' | 'local';
  onSetLocalAdjustmentMode?: (mode: 'global' | 'local') => void;
  localStack?: LocalAdjustmentStackItem[];
  activeLocalId?: string | null;
  onSelectLocalItem?: (id: string) => void;
  onAddLocalItem?: (name?: string, region?: AiRegionType) => void;
  onDeleteLocalItem?: (id: string) => void;
  onToggleLocalVisibility?: (id: string) => void;
  onUpdateLocalAdjustments?: (id: string, updates: Partial<LocalAdjustmentValues>) => void;
  onUpdateLocalMaskFeather?: (id: string, feather: number) => void;
  onUpdateLocalMaskOpacity?: (id: string, opacity: number) => void;
  onInvertLocalMask?: (id: string) => void;
  onClearLocalMask?: (id: string) => void;
  onTriggerAiSelect?: (region: AiRegionType) => void;
  onStartMakeupBrush?: (type: 'kajal' | 'lips' | 'blush' | 'eyebrow') => void;
  showMaskOverlay?: boolean;
  onToggleShowMaskOverlay?: () => void;
  localBrushMode?: 'brush' | 'eraser';
  onSetLocalBrushMode?: (mode: 'brush' | 'eraser') => void;
  localBrushSize?: number;
  onSetLocalBrushSize?: (size: number) => void;

  onSelectTool?: (tool: any) => void;

  onApplyPresetFilter: (preset: string) => void;
  onRemoveBg: () => void;
  onAiEnhance: () => void;
  onFaceRetouch: () => void;
  onPassportAutoFix: () => void;
  onUpscale4K: () => void;
  onSkyReplacement: () => void;
  onGenerativeFill: () => void;
  onOldPhotoRestore: () => void;
  onAiGenerateBg: () => void;
  onSetBgColor: (color: string) => void;
  onToggleBeforeAfter: () => void;
  isBeforeAfterActive: boolean;
  onGenerateQrCode: () => void;
  onGenerateBarcode: () => void;
  onAddSignature: () => void;
  onAddWatermark: () => void;
  isBgRemoving: boolean;
  language: 'en' | 'bn';
}

export default function ColorAdjustPanel({
  props,
  onChange,
  localAdjustmentsMode = 'global',
  onSetLocalAdjustmentMode,
  localStack = [],
  activeLocalId = null,
  onSelectLocalItem,
  onAddLocalItem,
  onDeleteLocalItem,
  onToggleLocalVisibility,
  onUpdateLocalAdjustments,
  onUpdateLocalMaskFeather,
  onUpdateLocalMaskOpacity,
  onInvertLocalMask,
  onClearLocalMask,
  onTriggerAiSelect,
  onStartMakeupBrush,
  showMaskOverlay = true,
  onToggleShowMaskOverlay,
  localBrushMode = 'brush',
  onSetLocalBrushMode,
  localBrushSize = 35,
  onSetLocalBrushSize,
  onSelectTool,
  onApplyPresetFilter,
  onRemoveBg,
  onAiEnhance,
  onFaceRetouch,
  onPassportAutoFix,
  onUpscale4K,
  onSkyReplacement,
  onGenerativeFill,
  onOldPhotoRestore,
  onAiGenerateBg,
  onSetBgColor,
  onToggleBeforeAfter,
  isBeforeAfterActive,
  onGenerateQrCode,
  onGenerateBarcode,
  onAddSignature,
  onAddWatermark,
  isBgRemoving,
  language
}: ColorAdjustPanelProps) {
  const [activeTab, setActiveTab] = useState<'properties' | 'retouch' | 'background' | 'effects' | 'ai_tools' | 'brand_kit' | 'templates'>('properties');
  const [localSubTab, setLocalSubTab] = useState<'tools' | 'stack' | 'sliders'>('tools');

  const activeLocalItem = localStack.find((s) => s.id === activeLocalId) || localStack[0] || null;

  const bgPresets = [
    { id: 'transparent', name: 'Transparent', color: 'transparent', border: 'border-dashed border-slate-600' },
    { id: 'white', name: 'Studio White', color: '#ffffff', border: 'border-slate-300' },
    { id: 'blue', name: 'Passport Blue', color: '#00a8ff', border: 'border-blue-400' },
    { id: 'red', name: 'Pass Red', color: '#e74c3c', border: 'border-red-400' },
    { id: 'green', name: 'Chroma Green', color: '#2ecc71', border: 'border-green-400' },
    { id: 'gray', name: 'Pro Gray', color: '#7f8c8d', border: 'border-slate-500' },
  ];

  const presetFilters = [
    { id: 'normal', name: 'Original', color: 'from-slate-700 to-slate-800' },
    { id: 'bw', name: 'B&W Film', color: 'from-slate-950 to-slate-900' },
    { id: 'warm', name: 'Warm Sun', color: 'from-amber-700 to-orange-800' },
    { id: 'cool', name: 'Cool Teal', color: 'from-cyan-800 to-blue-900' },
    { id: 'portrait', name: 'Soft Portrait', color: 'from-pink-800 to-rose-900' },
    { id: 'vivid', name: 'Vivid HDR', color: 'from-purple-700 to-indigo-800' },
    { id: 'vintage', name: 'Vintage 70s', color: 'from-amber-900 to-yellow-950' },
  ];

  const aiToolCards = [
    { id: 'ai_enhance', name: 'AI Enhance', icon: Sparkles, color: 'text-amber-400', action: onAiEnhance },
    { id: 'remove_bg', name: 'Remove Background', icon: Wand2, color: 'text-purple-400', action: onRemoveBg },
    { id: 'face_retouch', name: 'Face Retouch', icon: Eye, color: 'text-pink-400', action: onFaceRetouch },
    { id: 'sky_replacement', name: 'Sky Replacement', icon: CloudSun, color: 'text-sky-400', action: onSkyReplacement },
    { id: 'generative_fill', name: 'Generative Fill', icon: Box, color: 'text-emerald-400', action: onGenerativeFill },
    { id: 'upscale_4k', name: 'Real-ESRGAN 4K', icon: Sparkles, color: 'text-indigo-400', action: onUpscale4K },
    { id: 'restore_photo', name: 'Old Photo Restore', icon: RefreshCw, color: 'text-amber-300', action: onOldPhotoRestore },
    { id: 'generate_bg', name: 'AI Text-to-BG', icon: ImageIcon, color: 'text-fuchsia-400', action: onAiGenerateBg },
    { id: 'passport_fix', name: 'Passport Auto Fix', icon: Sun, color: 'text-cyan-400', action: onPassportAutoFix },
    { id: 'qr_code', name: 'QR Generator', icon: QrCode, color: 'text-indigo-400', action: onGenerateQrCode },
    { id: 'barcode', name: 'Barcode Generator', icon: Barcode, color: 'text-emerald-400', action: onGenerateBarcode },
    { id: 'signature', name: 'Sign & Watermark', icon: PenTool, color: 'text-pink-400', action: onAddSignature },
  ];

  const aiRegions: { id: AiRegionType; label: string; icon: any; color: string }[] = [
    { id: 'face', label: 'Face', icon: Smile, color: 'text-amber-400' },
    { id: 'skin', label: 'Skin', icon: Sparkles, color: 'text-pink-400' },
    { id: 'lips', label: 'Lips (ঠোঁট)', icon: Smile, color: 'text-rose-400' },
    { id: 'kajal', label: 'Kajal (কাজল)', icon: Eye, color: 'text-purple-400' },
    { id: 'neck', label: 'Neck', icon: User, color: 'text-cyan-400' },
    { id: 'hair', label: 'Hair', icon: Sparkles, color: 'text-purple-400' },
    { id: 'eyes', label: 'Eyes', icon: Eye, color: 'text-sky-400' },
    { id: 'clothes', label: 'Clothes', icon: Shirt, color: 'text-emerald-400' },
    { id: 'background', label: 'Background', icon: CloudSun, color: 'text-indigo-400' },
    { id: 'subject', label: 'Subject', icon: User, color: 'text-rose-400' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col text-xs select-none shadow-2xl">
      {/* Premium Senior UI/UX Horizontal Scrollable Sub-Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-950 p-2 border-b border-slate-800/80 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shrink-0 select-none">
        {[
          { id: 'properties', label: language === 'bn' ? 'এডজাস্ট' : 'Adjust', icon: SlidersHorizontal },
          { id: 'retouch', label: language === 'bn' ? 'রিটাচ' : 'Retouch', icon: Sparkles },
          { id: 'background', label: language === 'bn' ? 'ব্যাকগ্রাউন্ড' : 'Background', icon: ImageIcon },
          { id: 'effects', label: language === 'bn' ? 'ফিল্টারস' : 'Filters', icon: Palette },
          { id: 'ai_tools', label: language === 'bn' ? 'এআই স্যুট' : 'AI Suite', icon: Wand2 },
          { id: 'brand_kit', label: language === 'bn' ? 'ব্র্যান্ড কিট' : 'Brand Kit', icon: Bookmark },
          { id: 'templates', label: language === 'bn' ? 'টেমপ্লেটস' : 'Templates', icon: LayoutTemplate },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-extrabold rounded-xl shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40'
                  : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/60'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-200' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-3 space-y-4 max-h-[540px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
        
        {/* PROPERTIES TAB (Global | Local Adjustment System) */}
        {activeTab === 'properties' && (
          <div className="space-y-3 animate-fadeIn">
            
            {/* Global | Local Mode Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
              <button
                onClick={() => onSetLocalAdjustmentMode?.('global')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  localAdjustmentsMode === 'global'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Global</span>
              </button>

              <button
                onClick={() => onSetLocalAdjustmentMode?.('local')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  localAdjustmentsMode === 'local'
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Target className="w-3.5 h-3.5 text-pink-300" />
                <span>Local Selective</span>
              </button>
            </div>

            {/* GLOBAL ADJUSTMENT SLIDERS */}
            {localAdjustmentsMode === 'global' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-extrabold text-slate-200 uppercase tracking-wider text-[10px]">Global Photo Adjustments</span>
                  <button 
                    onClick={() => {
                      ['brightness', 'contrast', 'exposure', 'highlights', 'shadows', 'whites', 'blacks', 'vibrance', 'saturation', 'temperature', 'tint', 'vignette', 'clarity'].forEach(k => onChange(k as any, 0));
                    }}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 font-mono"
                  >
                    Reset All
                  </button>
                </div>

                {/* White Balance */}
                <div className="space-y-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider block flex items-center gap-1">
                    <Thermometer className="w-3 h-3 text-amber-400" />
                    White Balance
                  </span>
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400 text-[10px]">
                      <span>Temperature</span>
                      <span className="font-mono text-amber-400 font-bold">{props.temperature > 0 ? `+${props.temperature}` : props.temperature}</span>
                    </div>
                    <input type="range" min="-100" max="100" value={props.temperature || 0} onChange={(e) => onChange('temperature', parseInt(e.target.value))} className="w-full accent-amber-500 h-1 bg-slate-800 rounded-lg cursor-pointer" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400 text-[10px]">
                      <span>Tint</span>
                      <span className="font-mono text-pink-400 font-bold">{props.tint > 0 ? `+${props.tint}` : props.tint}</span>
                    </div>
                    <input type="range" min="-100" max="100" value={props.tint || 0} onChange={(e) => onChange('tint', parseInt(e.target.value))} className="w-full accent-pink-500 h-1 bg-slate-800 rounded-lg cursor-pointer" />
                  </div>
                </div>

                {/* Exposure, Contrast, Highlights, Shadows */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400 text-[10px]"><span>Exposure</span><span className="font-mono text-indigo-400 font-bold">{props.exposure}</span></div>
                  <input type="range" min="-100" max="100" value={props.exposure || 0} onChange={(e) => onChange('exposure', parseInt(e.target.value))} className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer" />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400 text-[10px]"><span>Contrast</span><span className="font-mono text-indigo-400 font-bold">{props.contrast}</span></div>
                  <input type="range" min="-100" max="100" value={props.contrast} onChange={(e) => onChange('contrast', parseInt(e.target.value))} className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer" />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400 text-[10px]"><span>Highlights</span><span className="font-mono text-indigo-400 font-bold">{props.highlights}</span></div>
                  <input type="range" min="-100" max="100" value={props.highlights || 0} onChange={(e) => onChange('highlights', parseInt(e.target.value))} className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer" />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400 text-[10px]"><span>Shadows</span><span className="font-mono text-indigo-400 font-bold">{props.shadows}</span></div>
                  <input type="range" min="-100" max="100" value={props.shadows || 0} onChange={(e) => onChange('shadows', parseInt(e.target.value))} className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer" />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400 text-[10px]"><span>Vignette</span><span className="font-mono text-cyan-400 font-bold">{props.vignette}</span></div>
                    <input type="range" min="0" max="100" value={props.vignette || 0} onChange={(e) => onChange('vignette', parseInt(e.target.value))} className="w-full accent-cyan-500 h-1 bg-slate-800 rounded-lg cursor-pointer" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400 text-[10px]"><span>Clarity</span><span className="font-mono text-cyan-400 font-bold">{props.clarity}</span></div>
                    <input type="range" min="0" max="100" value={props.clarity || 0} onChange={(e) => onChange('clarity', parseInt(e.target.value))} className="w-full accent-cyan-500 h-1 bg-slate-800 rounded-lg cursor-pointer" />
                  </div>
                </div>
              </div>
            )}

            {/* LOCAL SELECTIVE MASK SYSTEM */}
            {localAdjustmentsMode === 'local' && (
              <div className="space-y-2">
                {/* Compact 3-Subtab Selector Bar */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setLocalSubTab('tools')}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center justify-center gap-1 ${
                      localSubTab === 'tools'
                        ? 'bg-pink-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Target className="w-3 h-3" />
                    <span>AI & Tools</span>
                  </button>

                  <button
                    onClick={() => setLocalSubTab('stack')}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center justify-center gap-1 ${
                      localSubTab === 'stack'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    <span>Masks ({localStack.length})</span>
                  </button>

                  <button
                    onClick={() => setLocalSubTab('sliders')}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center justify-center gap-1 ${
                      localSubTab === 'sliders'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Sliders</span>
                  </button>
                </div>

                {/* Subtab 1: AI & Mask Painting Tools */}
                {localSubTab === 'tools' && (
                  <div className="space-y-2.5">
                    {/* 1. AI Smart Selection Grid */}
                    <div className="space-y-1.5 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] font-extrabold text-pink-400 uppercase tracking-wider block flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          1-Click AI Smart Selection
                        </span>
                      </span>
                      
                      <div className="grid grid-cols-4 gap-1">
                        {aiRegions.map((reg) => {
                          const Icon = reg.icon;
                          return (
                            <button
                              key={reg.id}
                              onClick={() => {
                                onTriggerAiSelect?.(reg.id);
                                setLocalSubTab('sliders');
                              }}
                              className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-slate-900 hover:bg-pink-950/60 border border-slate-800 hover:border-pink-500/50 transition-all group"
                              title={`AI Detect & Select ${reg.label}`}
                            >
                              <Icon className={`w-3.5 h-3.5 ${reg.color} group-hover:scale-110 transition-transform`} />
                              <span className="text-[9.5px] font-bold text-slate-300 group-hover:text-white mt-0.5">{reg.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Manual Mask Painting Tools */}
                    <div className="space-y-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-slate-300 uppercase tracking-wider">Mask Painting Tools</span>
                        <button
                          onClick={onToggleShowMaskOverlay}
                          className={`px-2 py-0.5 rounded-lg text-[9.5px] font-extrabold flex items-center gap-1 transition-all ${
                            showMaskOverlay
                              ? 'bg-pink-600 text-white shadow-md'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Eye className="w-3 h-3" />
                          <span>{showMaskOverlay ? 'Show Mask ON' : 'Show Mask OFF'}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            onSetLocalBrushMode?.('brush');
                            onSelectTool?.('brush');
                          }}
                          className={`flex-1 py-1.5 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 transition-all ${
                            localBrushMode === 'brush'
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Brush className="w-3.5 h-3.5" />
                          <span>Brush</span>
                        </button>

                        <button
                          onClick={() => {
                            onSetLocalBrushMode?.('eraser');
                            onSelectTool?.('eraser');
                          }}
                          className={`flex-1 py-1.5 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 transition-all ${
                            localBrushMode === 'eraser'
                              ? 'bg-pink-600 text-white shadow-md'
                              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Eraser className="w-3.5 h-3.5" />
                          <span>Eraser</span>
                        </button>

                        {activeLocalItem && (
                          <>
                            <button
                              onClick={() => onInvertLocalMask?.(activeLocalItem.id)}
                              className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-800"
                              title="Invert Selection Mask"
                            >
                              Invert
                            </button>
                            <button
                              onClick={() => onClearLocalMask?.(activeLocalItem.id)}
                              className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/60 text-rose-400 text-[10px] font-bold border border-slate-800"
                              title="Clear Selection Mask"
                            >
                              Clear
                            </button>
                          </>
                        )}
                      </div>

                      {/* Brush Size & Feather Sliders */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-slate-400 text-[10px]">
                          <span>Brush Size</span>
                          <span className="font-mono text-indigo-400 font-bold">{localBrushSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="150"
                          value={localBrushSize}
                          onChange={(e) => onSetLocalBrushSize?.(parseInt(e.target.value))}
                          className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>

                      {activeLocalItem && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-slate-400 text-[10px]">
                            <span>Feather / Soft Edge</span>
                            <span className="font-mono text-pink-400 font-bold">{activeLocalItem.feather}px</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="50"
                            value={activeLocalItem.feather}
                            onChange={(e) => onUpdateLocalMaskFeather?.(activeLocalItem.id, parseInt(e.target.value))}
                            className="w-full accent-pink-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Subtab 2: Multi-Mask Stack Manager */}
                {localSubTab === 'stack' && (
                  <div className="space-y-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-400" />
                        Local Adjustments Stack ({localStack.length})
                      </span>
                      <button
                        onClick={() => {
                          onAddLocalItem?.();
                          setLocalSubTab('sliders');
                        }}
                        className="px-2 py-1 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-[10px] flex items-center gap-1 shadow-md"
                      >
                        <Plus className="w-3 h-3" />
                        <span>New Mask</span>
                      </button>
                    </div>

                    <div className="space-y-1 max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
                      {localStack.map((item) => {
                        const isActive = item.id === activeLocalId;
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              onSelectLocalItem?.(item.id);
                              setLocalSubTab('sliders');
                            }}
                            className={`p-2 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                              isActive
                                ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-md'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/80'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-pink-400 animate-pulse' : 'bg-slate-600'}`} />
                              <span className="text-[10.5px] font-bold truncate">{item.name}</span>
                            </div>

                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => onToggleLocalVisibility?.(item.id)}
                                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                                title="Toggle Visibility"
                              >
                                {item.visible ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
                              </button>
                              <button
                                onClick={() => onDeleteLocalItem?.(item.id)}
                                className="p-1 hover:bg-rose-950 rounded-lg text-slate-400 hover:text-rose-400"
                                title="Delete Local Mask"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Subtab 3: Active Local Adjustment Controls */}
                {localSubTab === 'sliders' && (
                  <>
                    {activeLocalItem ? (
                      <div className="space-y-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <span className="text-[10px] font-extrabold text-pink-400 uppercase tracking-wider truncate">
                            Adjusting: {activeLocalItem.name}
                          </span>
                          <button
                            onClick={() => onUpdateLocalAdjustments?.(activeLocalItem.id, {
                              brightness: 0, exposure: 0, contrast: 0, highlights: 0, shadows: 0, saturation: 0, temperature: 0, tint: 0, sharpness: 0, clarity: 0
                            })}
                            className="text-[9.5px] font-bold text-indigo-400 hover:text-indigo-300 font-mono"
                          >
                            Reset Sliders
                          </button>
                        </div>

                        <div className="space-y-2">
                          <div className="space-y-1">
                            <div className="flex justify-between text-slate-400 text-[10px]">
                              <span>Mask Brightness</span>
                              <span className="font-mono text-amber-400 font-bold">{activeLocalItem.adjustments.brightness > 0 ? `+${activeLocalItem.adjustments.brightness}` : activeLocalItem.adjustments.brightness}</span>
                            </div>
                            <input
                              type="range"
                              min="-100"
                              max="100"
                              value={activeLocalItem.adjustments.brightness}
                              onChange={(e) => onUpdateLocalAdjustments?.(activeLocalItem.id, { brightness: parseInt(e.target.value) })}
                              className="w-full accent-amber-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-slate-400 text-[10px]">
                              <span>Mask Exposure</span>
                              <span className="font-mono text-indigo-400 font-bold">{activeLocalItem.adjustments.exposure > 0 ? `+${activeLocalItem.adjustments.exposure}` : activeLocalItem.adjustments.exposure}</span>
                            </div>
                            <input
                              type="range"
                              min="-100"
                              max="100"
                              value={activeLocalItem.adjustments.exposure}
                              onChange={(e) => onUpdateLocalAdjustments?.(activeLocalItem.id, { exposure: parseInt(e.target.value) })}
                              className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-slate-400 text-[10px]">
                              <span>Mask Contrast</span>
                              <span className="font-mono text-indigo-400 font-bold">{activeLocalItem.adjustments.contrast > 0 ? `+${activeLocalItem.adjustments.contrast}` : activeLocalItem.adjustments.contrast}</span>
                            </div>
                            <input
                              type="range"
                              min="-100"
                              max="100"
                              value={activeLocalItem.adjustments.contrast}
                              onChange={(e) => onUpdateLocalAdjustments?.(activeLocalItem.id, { contrast: parseInt(e.target.value) })}
                              className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-slate-400 text-[10px]">
                              <span>Mask Saturation</span>
                              <span className="font-mono text-pink-400 font-bold">{activeLocalItem.adjustments.saturation > 0 ? `+${activeLocalItem.adjustments.saturation}` : activeLocalItem.adjustments.saturation}</span>
                            </div>
                            <input
                              type="range"
                              min="-100"
                              max="100"
                              value={activeLocalItem.adjustments.saturation}
                              onChange={(e) => onUpdateLocalAdjustments?.(activeLocalItem.id, { saturation: parseInt(e.target.value) })}
                              className="w-full accent-pink-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-slate-400 text-[10px]">
                              <span>Mask Temperature</span>
                              <span className="font-mono text-amber-400 font-bold">{activeLocalItem.adjustments.temperature > 0 ? `+${activeLocalItem.adjustments.temperature}` : activeLocalItem.adjustments.temperature}</span>
                            </div>
                            <input
                              type="range"
                              min="-100"
                              max="100"
                              value={activeLocalItem.adjustments.temperature}
                              onChange={(e) => onUpdateLocalAdjustments?.(activeLocalItem.id, { temperature: parseInt(e.target.value) })}
                              className="w-full accent-amber-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-slate-400 text-[10px]">
                              <span>Mask Tint</span>
                              <span className="font-mono text-pink-400 font-bold">{activeLocalItem.adjustments.tint > 0 ? `+${activeLocalItem.adjustments.tint}` : activeLocalItem.adjustments.tint}</span>
                            </div>
                            <input
                              type="range"
                              min="-100"
                              max="100"
                              value={activeLocalItem.adjustments.tint || 0}
                              onChange={(e) => onUpdateLocalAdjustments?.(activeLocalItem.id, { tint: parseInt(e.target.value) })}
                              className="w-full accent-pink-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                            <div className="space-y-1">
                              <div className="flex justify-between text-slate-400 text-[10px]">
                                <span>Highlights</span>
                                <span className="font-mono text-indigo-400 font-bold">{activeLocalItem.adjustments.highlights > 0 ? `+${activeLocalItem.adjustments.highlights}` : activeLocalItem.adjustments.highlights}</span>
                              </div>
                              <input
                                type="range"
                                min="-100"
                                max="100"
                                value={activeLocalItem.adjustments.highlights || 0}
                                onChange={(e) => onUpdateLocalAdjustments?.(activeLocalItem.id, { highlights: parseInt(e.target.value) })}
                                className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                              />
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-slate-400 text-[10px]">
                                <span>Shadows</span>
                                <span className="font-mono text-indigo-400 font-bold">{activeLocalItem.adjustments.shadows > 0 ? `+${activeLocalItem.adjustments.shadows}` : activeLocalItem.adjustments.shadows}</span>
                              </div>
                              <input
                                type="range"
                                min="-100"
                                max="100"
                                value={activeLocalItem.adjustments.shadows || 0}
                                onChange={(e) => onUpdateLocalAdjustments?.(activeLocalItem.id, { shadows: parseInt(e.target.value) })}
                                className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <div className="flex justify-between text-slate-400 text-[10px]">
                                <span>Sharpness</span>
                                <span className="font-mono text-cyan-400 font-bold">{activeLocalItem.adjustments.sharpness || 0}%</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={activeLocalItem.adjustments.sharpness || 0}
                                onChange={(e) => onUpdateLocalAdjustments?.(activeLocalItem.id, { sharpness: parseInt(e.target.value) })}
                                className="w-full accent-cyan-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                              />
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-slate-400 text-[10px]">
                                <span>Clarity</span>
                                <span className="font-mono text-cyan-400 font-bold">{activeLocalItem.adjustments.clarity || 0}%</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={activeLocalItem.adjustments.clarity || 0}
                                onChange={(e) => onUpdateLocalAdjustments?.(activeLocalItem.id, { clarity: parseInt(e.target.value) })}
                                className="w-full accent-cyan-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 text-center text-slate-400 text-xs">
                        No active mask selected. Create a new mask or use AI Smart Selection.
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* RETOUCH TAB */}
        {activeTab === 'retouch' && (
          <div className="space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-extrabold text-pink-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Smile className="w-3.5 h-3.5" />
                Identity-Preserving Retouch & Makeup
              </span>
            </div>

            {/* Precision Brush Makeup Suite */}
            <div className="space-y-1.5 bg-slate-950 p-2.5 rounded-xl border border-pink-500/40 shadow-lg">
              <span className="text-[10px] font-extrabold text-pink-400 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Brush className="w-3.5 h-3.5 text-pink-400" />
                  {language === 'bn' ? 'ম্যানুয়াল মেকআপ ব্রাশ (Precision Brushes)' : 'Precision Makeup Brushes'}
                </span>
              </span>
              <p className="text-[9.5px] text-slate-400 leading-tight">
                {language === 'bn' 
                  ? 'বাটনে ক্লিক করে ক্যানভাসে সরাসরি ব্রাশ দিয়ে মেখে দিন। যেখানে ব্রাশ করবেন শুধু সেখানেই মেকআপ বসবে।' 
                  : 'Click a brush, then drag on canvas over eyes/lips to apply.'}
              </p>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  onClick={() => onStartMakeupBrush?.('kajal')}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 hover:bg-purple-950/80 border border-purple-500/50 hover:border-purple-400 text-slate-200 transition-all active:scale-95 group text-left shadow"
                >
                  <Eye className="w-4 h-4 text-purple-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold text-purple-300">{language === 'bn' ? 'কাজল পেন্সিল' : 'Kajal Pencil'}</span>
                    <span className="text-[9px] text-slate-400">{language === 'bn' ? 'চোখের নিচে আঁকুন' : 'Paint eye contour'}</span>
                  </div>
                </button>

                <button
                  onClick={() => onStartMakeupBrush?.('lips')}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 hover:bg-rose-950/80 border border-rose-500/50 hover:border-rose-400 text-slate-200 transition-all active:scale-95 group text-left shadow"
                >
                  <Smile className="w-4 h-4 text-rose-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold text-rose-300">{language === 'bn' ? 'ঠোঁট ব্রাশ (Lipstick)' : 'Lipstick Brush'}</span>
                    <span className="text-[9px] text-slate-400">{language === 'bn' ? 'ঠোঁটে গোলাপি মেখে দিন' : 'Paint rosy lip tint'}</span>
                  </div>
                </button>

                <button
                  onClick={() => onStartMakeupBrush?.('eyebrow')}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 hover:bg-sky-950/80 border border-sky-500/50 hover:border-sky-400 text-slate-200 transition-all active:scale-95 group text-left shadow"
                >
                  <Eye className="w-4 h-4 text-sky-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold text-sky-300">{language === 'bn' ? 'ভ্রু পেন্সিল' : 'Eyebrow Pencil'}</span>
                    <span className="text-[9px] text-slate-400">{language === 'bn' ? 'ভ্রু গাড় করুন' : 'Darken eyebrows'}</span>
                  </div>
                </button>

                <button
                  onClick={() => onStartMakeupBrush?.('blush')}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 hover:bg-pink-950/80 border border-pink-500/50 hover:border-pink-400 text-slate-200 transition-all active:scale-95 group text-left shadow"
                >
                  <Sparkles className="w-4 h-4 text-pink-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold text-pink-300">{language === 'bn' ? 'গালে ব্লাশ' : 'Cheek Blush'}</span>
                    <span className="text-[9px] text-slate-400">{language === 'bn' ? 'গালে গোলাপি আভা' : 'Cheek rosy blush'}</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {/* Lip Rosy Pink Tint */}
              <div className="space-y-1 bg-slate-950/70 p-2 rounded-xl border border-slate-800">
                <div className="flex justify-between text-slate-300 text-[10px] font-bold">
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <Smile className="w-3.5 h-3.5" />
                    {language === 'bn' ? 'ঠোঁটে গোলাপি ভাব (Lip Tint)' : 'Lip Rosy Pink Tint'}
                  </span>
                  <span className="font-mono text-rose-400 font-bold">{props.lipRosyPink || 0}%</span>
                </div>
                <input type="range" min="0" max="100" value={props.lipRosyPink || 0} onChange={(e) => onChange('lipRosyPink', parseInt(e.target.value))} className="w-full accent-rose-500 h-1 bg-slate-800 rounded-lg cursor-pointer" />
              </div>

              {/* Under-Eye Kajal & Eyeliner */}
              <div className="space-y-1 bg-slate-950/70 p-2 rounded-xl border border-slate-800">
                <div className="flex justify-between text-slate-300 text-[10px] font-bold">
                  <span className="flex items-center gap-1.5 text-purple-400">
                    <Eye className="w-3.5 h-3.5" />
                    {language === 'bn' ? 'চোখের নিচে কাজল (Kajal & Eyeliner)' : 'Under-Eye Kajal & Eyeliner'}
                  </span>
                  <span className="font-mono text-purple-400 font-bold">{props.underEyeKajal || 0}%</span>
                </div>
                <input type="range" min="0" max="100" value={props.underEyeKajal || 0} onChange={(e) => onChange('underEyeKajal', parseInt(e.target.value))} className="w-full accent-purple-500 h-1 bg-slate-800 rounded-lg cursor-pointer" />
              </div>

              {/* Eyebrows */}
              <div className="space-y-1 bg-slate-950/70 p-2 rounded-xl border border-slate-800">
                <div className="flex justify-between text-slate-300 text-[10px] font-bold">
                  <span className="flex items-center gap-1.5 text-sky-400">
                    <Eye className="w-3.5 h-3.5" />
                    {language === 'bn' ? 'ভ্রু গাড় করা (Eyebrow Darkening)' : 'Eyebrow Definition'}
                  </span>
                  <span className="font-mono text-sky-400 font-bold">{props.eyebrowEnhance || 0}%</span>
                </div>
                <input type="range" min="0" max="100" value={props.eyebrowEnhance || 0} onChange={(e) => onChange('eyebrowEnhance', parseInt(e.target.value))} className="w-full accent-sky-500 h-1 bg-slate-800 rounded-lg cursor-pointer" />
              </div>

              {/* Cheek Blush */}
              <div className="space-y-1 bg-slate-950/70 p-2 rounded-xl border border-slate-800">
                <div className="flex justify-between text-slate-300 text-[10px] font-bold">
                  <span className="flex items-center gap-1.5 text-pink-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    {language === 'bn' ? 'গালে গোলাপি আভা (Cheek Blush)' : 'Cheek Rosy Blush'}
                  </span>
                  <span className="font-mono text-pink-400 font-bold">{props.blushRosy || 0}%</span>
                </div>
                <input type="range" min="0" max="100" value={props.blushRosy || 0} onChange={(e) => onChange('blushRosy', parseInt(e.target.value))} className="w-full accent-pink-500 h-1 bg-slate-800 rounded-lg cursor-pointer" />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-400 text-[10px]"><span>Light Skin Smoothing</span><span className="font-mono text-pink-400 font-bold">{props.skinSmoothing || 0}%</span></div>
                <input type="range" min="0" max="100" value={props.skinSmoothing || 0} onChange={(e) => onChange('skinSmoothing', parseInt(e.target.value))} className="w-full accent-pink-500 h-1 bg-slate-800 rounded-lg cursor-pointer" />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-400 text-[10px]"><span>Teeth Whitening</span><span className="font-mono text-pink-400 font-bold">{props.teethWhitening || 0}%</span></div>
                <input type="range" min="0" max="100" value={props.teethWhitening || 0} onChange={(e) => onChange('teethWhitening', parseInt(e.target.value))} className="w-full accent-pink-500 h-1 bg-slate-800 rounded-lg cursor-pointer" />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-400 text-[10px]"><span>Face Studio Lighting</span><span className="font-mono text-pink-400 font-bold">{props.faceLighting || 0}%</span></div>
                <input type="range" min="0" max="100" value={props.faceLighting || 0} onChange={(e) => onChange('faceLighting', parseInt(e.target.value))} className="w-full accent-pink-500 h-1 bg-slate-800 rounded-lg cursor-pointer" />
              </div>
            </div>

            <button
              onClick={onFaceRetouch}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-extrabold text-xs shadow-lg flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Full AI Face Retouch Studio</span>
            </button>
          </div>
        )}

        {/* BACKGROUND STUDIO TAB */}
        {activeTab === 'background' && (
          <div className="space-y-3 animate-fadeIn">
            <span className="font-extrabold text-slate-200 uppercase tracking-wider text-[10px] block border-b border-slate-800 pb-2">Passport & Studio Backgrounds</span>
            <div className="grid grid-cols-3 gap-2">
              {bgPresets.map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => onSetBgColor(bg.color)}
                  className={`p-2.5 rounded-xl bg-slate-950 border hover:scale-105 transition-transform text-center flex flex-col items-center gap-1.5 ${bg.border}`}
                >
                  <div className="w-6 h-6 rounded-full border border-slate-700 shadow-inner" style={{ backgroundColor: bg.color }} />
                  <span className="text-[10px] font-bold text-slate-300">{bg.name}</span>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-2">
              <button onClick={onRemoveBg} className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md">
                <Wand2 className="w-3.5 h-3.5" />
                <span>Remove Background via AI</span>
              </button>
            </div>
          </div>
        )}

        {/* LIVE FILTER PREVIEW THUMBNAILS TAB */}
        {activeTab === 'effects' && (
          <div className="space-y-3 animate-fadeIn">
            <span className="font-extrabold text-slate-200 uppercase tracking-wider text-[10px] block border-b border-slate-800 pb-2">Live Filter Thumbnails</span>
            <div className="grid grid-cols-2 gap-2">
              {presetFilters.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onApplyPresetFilter(preset.id)}
                  className={`p-3 rounded-xl bg-gradient-to-br ${preset.color} hover:ring-2 hover:ring-indigo-400 text-left font-extrabold text-xs text-white transition-all shadow-md flex items-center justify-between group`}
                >
                  <span>{preset.name}</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI SUITE TAB */}
        {activeTab === 'ai_tools' && (
          <div className="space-y-3 animate-fadeIn">
            <span className="font-extrabold text-slate-200 uppercase tracking-wider text-[10px] block border-b border-slate-800 pb-2">12 AI Tools Suite</span>
            <div className="grid grid-cols-2 gap-2">
              {aiToolCards.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.id}
                    onClick={card.action}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/60 hover:bg-slate-800 transition-all text-center gap-1.5 group shadow-md"
                  >
                    <div className="p-2 rounded-xl bg-slate-900 group-hover:scale-110 transition-transform">
                      <Icon className={`w-4 h-4 ${card.color}`} />
                    </div>
                    <span className="text-[10px] font-extrabold text-slate-200 group-hover:text-white leading-tight">
                      {card.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* BRAND KIT TAB */}
        {activeTab === 'brand_kit' && (
          <div className="space-y-3 animate-fadeIn">
            <span className="font-extrabold text-slate-200 uppercase tracking-wider text-[10px] block border-b border-slate-800 pb-2">Brand Swatches</span>
            <div className="flex items-center gap-2 flex-wrap">
              {['#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#000000', '#ffffff'].map((c) => (
                <button key={c} onClick={() => onChange('brushColor', c)} style={{ backgroundColor: c }} className="w-6 h-6 rounded-full border border-slate-700 hover:scale-110 transition shadow" />
              ))}
            </div>
          </div>
        )}

        {/* TEMPLATES TAB */}
        {activeTab === 'templates' && (
          <div className="space-y-2 animate-fadeIn text-[11px] text-slate-300">
            <button className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500 text-left font-bold flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-indigo-400" />
              <span>Passport 8-Up Print Grid Sheet</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
