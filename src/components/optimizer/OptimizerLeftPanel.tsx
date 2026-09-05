import React, { useState } from 'react';
import {
  Sparkles,
  Calculator,
  FileImage,
  UserCheck,
  Globe,
  Layers,
  Check,
  ChevronDown,
  ChevronUp,
  Crop,
  ShieldCheck,
  Target,
  FileSignature
} from 'lucide-react';
import {
  AppLanguage,
  OptimizationRequest,
  STUDIO_PRESETS,
  StudioPreset
} from '../../engines/image-optimizer';
import { PrintPhysicalCalculator } from './PrintPhysicalCalculator';

interface OptimizerLeftPanelProps {
  request: OptimizationRequest;
  language: AppLanguage;
  originalMeta: {
    fileName: string;
    width: number;
    height: number;
    sizeBytes: number;
    format: string;
    dpi: number;
    classification?: string;
    entropy?: number;
  } | null;
  onChangeRequest: (newReq: Partial<OptimizationRequest>) => void;
  onApplyPreset: (preset: StudioPreset) => void;
}

type FilterCategory = 'govt' | 'social' | 'size';

export const OptimizerLeftPanel: React.FC<OptimizerLeftPanelProps> = ({
  request,
  language,
  originalMeta,
  onChangeRequest,
  onApplyPreset
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('govt');
  const [isCalcOpen, setIsCalcOpen] = useState<boolean>(false);

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const filteredTemplates = STUDIO_PRESETS.filter(t => {
    if (activeFilter === 'govt') return t.category === 'official';
    if (activeFilter === 'social') return t.category === 'web';
    if (activeFilter === 'size') return t.category === 'general';
    return true;
  });

  return (
    <div className="w-80 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-full overflow-hidden select-none">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-xs text-slate-100 tracking-tight">
            {language === 'bn' ? 'শপ ও আবেদন টেমপ্লেট' : 'Shop & Form Templates'}
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-mono font-bold border border-indigo-500/20">
          {filteredTemplates.length} Presets
        </span>
      </div>

      {/* ── Scrollable Body ─────────────────────────────────────────────────── */}
      <div className="p-3 flex flex-col gap-2.5 flex-1 overflow-y-auto min-h-0">
        {/* ── Section 1: Input File Metadata ────────────────────────────────── */}
        {originalMeta && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex flex-col gap-1.5 shadow-sm shrink-0">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
              <span className="flex items-center gap-1.5 truncate">
                <FileImage className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">{originalMeta.fileName}</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 uppercase font-bold shrink-0">
                {originalMeta.format}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
              <span className="text-indigo-300 font-bold">{formatBytes(originalMeta.sizeBytes)}</span>
              <span>{originalMeta.width}×{originalMeta.height} px</span>
              <span>{originalMeta.dpi} DPI</span>
            </div>
          </div>
        )}

        {/* ── Section 2: 3 Clean Category Tabs (No 'সবগুলো' button) ─────────── */}
        <div className="shrink-0">
          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
            <button
              onClick={() => setActiveFilter('govt')}
              className={`py-1.5 rounded-lg transition text-center flex items-center justify-center gap-1 cursor-pointer ${
                activeFilter === 'govt'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-3 h-3" />
              <span>{language === 'bn' ? 'আবেদন' : 'Govt Form'}</span>
            </button>

            <button
              onClick={() => setActiveFilter('social')}
              className={`py-1.5 rounded-lg transition text-center flex items-center justify-center gap-1 cursor-pointer ${
                activeFilter === 'social'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>{language === 'bn' ? 'সোশ্যাল' : 'Social'}</span>
            </button>

            <button
              onClick={() => setActiveFilter('size')}
              className={`py-1.5 rounded-lg transition text-center flex items-center justify-center gap-1 cursor-pointer ${
                activeFilter === 'size'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Target className="w-3 h-3" />
              <span>{language === 'bn' ? 'সাইজ KB' : 'Size KB'}</span>
            </button>
          </div>
        </div>

        {/* ── Section 3: Templates List for Selected Category ───────────────── */}
        <div className="flex flex-col gap-1.5 flex-1">
          {filteredTemplates.map((preset) => {
            const isSelected = request.presetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onApplyPreset(preset)}
                className={`text-left p-2.5 rounded-xl border text-[11px] transition cursor-pointer flex flex-col gap-1 ${
                  isSelected
                    ? 'bg-gradient-to-r from-indigo-950/90 to-slate-950/90 border-indigo-500 text-white shadow-md shadow-indigo-950/40 ring-1 ring-indigo-500/50'
                    : 'bg-slate-950/60 border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                {/* Title & Target Max Bytes Indicator */}
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-100 flex items-center gap-1.5 truncate pr-1">
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    ) : (
                      <Crop className="w-3 h-3 text-slate-500 shrink-0" />
                    )}
                    <span className="truncate">{language === 'bn' ? preset.nameBn : preset.name}</span>
                  </div>

                  {preset.targetMaxBytes && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 shrink-0">
                      ≤{Math.round(preset.targetMaxBytes / 1024)} KB
                    </span>
                  )}
                </div>

                {/* Subtitle / Dimensions & Ratio */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                  {preset.targetWidth && preset.targetHeight ? (
                    <span className="text-slate-300">
                      {preset.targetWidth} × {preset.targetHeight} px
                    </span>
                  ) : (
                    <span>Quality Preset</span>
                  )}
                  {preset.targetDpi ? (
                    <span className="text-slate-400">{preset.targetDpi} DPI</span>
                  ) : (
                    <span className="text-slate-400 uppercase">{preset.format}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Section 4: Collapsible Print Physical Sizing Accordion ────────── */}
        <div className="pt-1 shrink-0">
          <button
            onClick={() => setIsCalcOpen(prev => !prev)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 hover:border-slate-700 text-xs font-bold transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Calculator className="w-3.5 h-3.5 text-indigo-400" />
              <span>{language === 'bn' ? 'কাস্টম পেপার ও সাইজ ক্যালকুলেটর' : 'Paper Size Calculator'}</span>
            </span>
            {isCalcOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {isCalcOpen && (
            <div className="mt-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <PrintPhysicalCalculator
                language={language}
                onApplyDimensions={(wPx, hPx, targetDpi) => {
                  onChangeRequest({
                    resize: {
                      enabled: true,
                      targetWidth: wPx,
                      targetHeight: hPx,
                      keepAspectRatio: true,
                      targetDpi
                    },
                    output: {
                      ...request.output,
                      format: request.output?.format || 'auto',
                      dpi: targetDpi
                    }
                  });
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
