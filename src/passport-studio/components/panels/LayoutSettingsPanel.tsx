import React from 'react';
import { LayoutGrid, Sliders, Scissors, FileText, ArrowRight, CheckCircle2, RotateCw } from 'lucide-react';
import { usePassportStore } from '../../store';
import { PAPER_SIZES } from '../../services/template.service';
import { getTemplate } from '../../services/template.service';
import { calculateLayout } from '../../services/layout.service';

export default function LayoutSettingsPanel() {
  const { state, dispatch } = usePassportStore();
  const { layoutConfig, processedTray } = state;
  const template = getTemplate(state.selectedTemplateId);
  const layout = calculateLayout(template, layoutConfig);

  const totalBatchCopies = processedTray.length > 0
    ? processedTray.reduce((acc, item) => acc + item.copies, 0)
    : layoutConfig.copies;

  return (
    <div className="p-4 space-y-5 select-none text-slate-100 flex flex-col h-full justify-between">
      <div className="space-y-5">
        {/* Panel Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Sheet & Print Settings</h3>
              <p className="text-[10px] text-slate-500">Configure paper size, margins & orientation</p>
            </div>
          </div>
        </div>

        {/* 1. Paper Size Selector */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Paper Size</span>
            <span className="text-[10px] text-indigo-400 font-mono">
              {layoutConfig.paperSize.widthMm}×{layoutConfig.paperSize.heightMm}mm
            </span>
          </label>
          <div className="grid grid-cols-1 gap-1.5">
            {PAPER_SIZES.map((paper) => {
              const isSelected = layoutConfig.paperSize.id === paper.id;
              return (
                <button
                  key={paper.id}
                  onClick={() => dispatch({ type: 'SET_LAYOUT', payload: { paperSize: paper } })}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-900/60 to-violet-900/60 border border-indigo-500/60 text-white shadow-lg shadow-indigo-950/50'
                      : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                      isSelected ? 'border-indigo-400 bg-indigo-500/20' : 'border-slate-700 bg-slate-900'
                    }`}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                    </div>
                    <span>{paper.name}</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-70">
                    {paper.widthMm}×{paper.heightMm}mm
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Grid & Margins Spacing */}
        <div className="space-y-3 pt-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Grid & Sheet Spacing
          </label>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-3">
            {([
              { key: 'gapMm', label: 'Photo Gap', min: 0, max: 10, unit: 'mm' },
              { key: 'marginMm', label: 'Page Margin', min: 0, max: 30, unit: 'mm' },
            ] as const).map(({ key, label, min, max, unit }) => (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">{label}</span>
                  <span className="text-[11px] font-bold font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {layoutConfig[key]}{unit}
                  </span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={1}
                  value={layoutConfig[key]}
                  onChange={(e) => dispatch({ type: 'SET_LAYOUT', payload: { [key]: +e.target.value } })}
                  className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>

        {/* 3. Photo Orientation & Cut Lines */}
        <div className="space-y-2 pt-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Orientation & Options
          </label>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => dispatch({ type: 'SET_LAYOUT', payload: { rotatePhotoDegrees: 0 } })}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                (layoutConfig.rotatePhotoDegrees || 0) === 0
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40 border border-indigo-400/40'
                  : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Portrait (0°)</span>
            </button>
            <button
              onClick={() => dispatch({ type: 'SET_LAYOUT', payload: { rotatePhotoDegrees: 90 } })}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                layoutConfig.rotatePhotoDegrees === 90
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40 border border-indigo-400/40'
                  : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5 rotate-90" />
              <span>Landscape (90°)</span>
            </button>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 space-y-2 mt-2">
            <label className="flex items-center justify-between cursor-pointer p-1 rounded-lg hover:bg-slate-900/50 transition">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-indigo-400" />
                <span className="text-xs text-slate-300 font-medium">Show Cut Lines</span>
              </div>
              <input
                type="checkbox"
                checked={!!layoutConfig.showCutlines}
                onChange={(e) => dispatch({ type: 'SET_LAYOUT', payload: { showCutlines: e.target.checked } })}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </label>
            <div className="h-px bg-slate-800/80" />
            <label className="flex items-center justify-between cursor-pointer p-1 rounded-lg hover:bg-slate-900/50 transition">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span className="text-xs text-slate-300 font-medium">Show Header Text</span>
              </div>
              <input
                type="checkbox"
                checked={!!layoutConfig.showPrintHeader}
                onChange={(e) => dispatch({ type: 'SET_LAYOUT', payload: { showPrintHeader: e.target.checked } })}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* 4. Layout Summary Card */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-xl p-3.5 space-y-2 border border-slate-800 shadow-inner">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5 text-indigo-400">
              <LayoutGrid className="w-4 h-4" /> Layout Summary
            </span>
            <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
              300 DPI High-Res
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Copies</div>
              <div className="text-sm font-black text-indigo-300 font-mono">{totalBatchCopies}</div>
            </div>
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Paper Size</div>
              <div className="text-xs font-bold text-slate-200 font-mono truncate">
                {layout.paperWidthMm}×{layout.paperHeightMm}mm
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="pt-3">
        <button
          onClick={() => dispatch({ type: 'SET_ACTIVE_PANEL', payload: 'export' })}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-xl shadow-indigo-950/60 transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <span>Next: Export & Print Sheet</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
