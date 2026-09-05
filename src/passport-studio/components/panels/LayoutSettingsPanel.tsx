import React, { useState, useEffect } from 'react';
import { LayoutGrid, Sliders, Scissors, FileText, ArrowRight, CheckCircle2, RotateCw, ArrowLeftRight, Sparkles } from 'lucide-react';
import { usePassportStore } from '../../store';
import { PAPER_SIZES } from '../../services/template.service';
import { getTemplate } from '../../services/template.service';
import { calculateLayout } from '../../services/layout.service';

export default function LayoutSettingsPanel() {
  const { state, dispatch } = usePassportStore();
  const { layoutConfig, processedTray } = state;
  const template = getTemplate(state.selectedTemplateId, state.customWidth, state.customHeight);
  const layout = calculateLayout(template, layoutConfig);

  const totalBatchCopies = processedTray.length > 0
    ? processedTray.reduce((acc, item) => acc + item.copies, 0)
    : layoutConfig.copies;

  // Local string state for smooth typing & backspacing without input locking
  const [paperWidthInput, setPaperWidthInput] = useState<string>(() => String(layoutConfig.paperSize.widthMm || 210));
  const [paperHeightInput, setPaperHeightInput] = useState<string>(() => String(layoutConfig.paperSize.heightMm || 297));

  useEffect(() => {
    if (layoutConfig.paperSize.widthMm != null && String(layoutConfig.paperSize.widthMm) !== paperWidthInput && parseFloat(paperWidthInput) !== layoutConfig.paperSize.widthMm) {
      setPaperWidthInput(String(layoutConfig.paperSize.widthMm));
    }
  }, [layoutConfig.paperSize.widthMm]);

  useEffect(() => {
    if (layoutConfig.paperSize.heightMm != null && String(layoutConfig.paperSize.heightMm) !== paperHeightInput && parseFloat(paperHeightInput) !== layoutConfig.paperSize.heightMm) {
      setPaperHeightInput(String(layoutConfig.paperSize.heightMm));
    }
  }, [layoutConfig.paperSize.heightMm]);

  const handleCustomPaperWidthChange = (valStr: string) => {
    setPaperWidthInput(valStr);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed) && parsed > 0) {
      dispatch({
        type: 'SET_LAYOUT',
        payload: {
          paperSize: {
            id: 'custom',
            name: `Custom (${parsed}×${layoutConfig.paperSize.heightMm}mm)`,
            widthMm: parsed,
            heightMm: layoutConfig.paperSize.heightMm,
          },
        },
      });
    }
  };

  const handleCustomPaperWidthBlur = () => {
    const parsed = parseFloat(paperWidthInput);
    const valid = isNaN(parsed) || parsed < 20 ? 210 : Math.min(1500, parsed);
    setPaperWidthInput(String(valid));
    dispatch({
      type: 'SET_LAYOUT',
      payload: {
        paperSize: {
          id: 'custom',
          name: `Custom (${valid}×${layoutConfig.paperSize.heightMm}mm)`,
          widthMm: valid,
          heightMm: layoutConfig.paperSize.heightMm,
        },
      },
    });
  };

  const handleCustomPaperHeightChange = (valStr: string) => {
    setPaperHeightInput(valStr);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed) && parsed > 0) {
      dispatch({
        type: 'SET_LAYOUT',
        payload: {
          paperSize: {
            id: 'custom',
            name: `Custom (${layoutConfig.paperSize.widthMm}×${parsed}mm)`,
            widthMm: layoutConfig.paperSize.widthMm,
            heightMm: parsed,
          },
        },
      });
    }
  };

  const handleCustomPaperHeightBlur = () => {
    const parsed = parseFloat(paperHeightInput);
    const valid = isNaN(parsed) || parsed < 20 ? 297 : Math.min(1500, parsed);
    setPaperHeightInput(String(valid));
    dispatch({
      type: 'SET_LAYOUT',
      payload: {
        paperSize: {
          id: 'custom',
          name: `Custom (${layoutConfig.paperSize.widthMm}×${valid}mm)`,
          widthMm: layoutConfig.paperSize.widthMm,
          heightMm: valid,
        },
      },
    });
  };

  const applyCustomPaperPreset = (w: number, h: number, label: string) => {
    setPaperWidthInput(String(w));
    setPaperHeightInput(String(h));
    dispatch({
      type: 'SET_LAYOUT',
      payload: {
        paperSize: {
          id: 'custom',
          name: `${label} (${w}×${h}mm)`,
          widthMm: w,
          heightMm: h,
        },
      },
    });
  };

  const handleSwapPaperOrientation = () => {
    const currentW = layoutConfig.paperSize.widthMm;
    const currentH = layoutConfig.paperSize.heightMm;
    setPaperWidthInput(String(currentH));
    setPaperHeightInput(String(currentW));
    dispatch({
      type: 'SET_LAYOUT',
      payload: {
        paperSize: {
          ...layoutConfig.paperSize,
          id: 'custom',
          widthMm: currentH,
          heightMm: currentW,
        },
      },
    });
  };

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
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Paper Size
            </label>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-indigo-400 font-mono font-bold bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/30">
                {layoutConfig.paperSize.widthMm}×{layoutConfig.paperSize.heightMm}mm
              </span>
              <button
                onClick={handleSwapPaperOrientation}
                title="Rotate Sheet 90° (Swap Width & Height)"
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              >
                <ArrowLeftRight className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {PAPER_SIZES.map((paper) => {
              const isSelected = layoutConfig.paperSize.id === paper.id;
              return (
                <button
                  key={paper.id}
                  onClick={() => {
                    if (paper.id === 'custom') {
                      const w = parseFloat(paperWidthInput) || 210;
                      const h = parseFloat(paperHeightInput) || 297;
                      dispatch({
                        type: 'SET_LAYOUT',
                        payload: {
                          paperSize: {
                            id: 'custom',
                            name: `Custom (${w}×${h}mm)`,
                            widthMm: w,
                            heightMm: h,
                          },
                        },
                      });
                    } else {
                      dispatch({ type: 'SET_LAYOUT', payload: { paperSize: paper } });
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
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
                    {isSelected && paper.id === 'custom'
                      ? `${layoutConfig.paperSize.widthMm}×${layoutConfig.paperSize.heightMm}mm`
                      : `${paper.widthMm}×${paper.heightMm}mm`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom Paper Size Input Box & Quick Presets */}
          {layoutConfig.paperSize.id === 'custom' && (
            <div className="p-3 bg-indigo-950/20 border border-indigo-500/30 rounded-xl space-y-3 mt-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Custom Paper Dimensions (মিলিমিটার)</span>
                </span>
                <button
                  onClick={handleSwapPaperOrientation}
                  className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-200 bg-indigo-900/40 hover:bg-indigo-800/50 px-2 py-0.5 rounded border border-indigo-500/30 transition"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Swap W↔H</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Width (mm)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={paperWidthInput}
                      onChange={(e) => handleCustomPaperWidthChange(e.target.value)}
                      onBlur={handleCustomPaperWidthBlur}
                      min={20}
                      max={1500}
                      className="w-full bg-slate-950 border border-indigo-500/40 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono font-bold focus:outline-none focus:border-indigo-400 transition"
                      placeholder="210"
                    />
                    <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-500 font-mono">mm</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Height (mm)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={paperHeightInput}
                      onChange={(e) => handleCustomPaperHeightChange(e.target.value)}
                      onBlur={handleCustomPaperHeightBlur}
                      min={20}
                      max={1500}
                      className="w-full bg-slate-950 border border-indigo-500/40 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono font-bold focus:outline-none focus:border-indigo-400 transition"
                      placeholder="297"
                    />
                    <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-500 font-mono">mm</span>
                  </div>
                </div>
              </div>

              {/* Quick Paper Preset Pills */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[9.5px] text-slate-400 font-medium">Quick Sheet Sizes:</div>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { label: 'Legal', w: 215.9, h: 355.6 },
                    { label: 'A3', w: 297, h: 420 },
                    { label: 'A3+ / Super', w: 329, h: 483 },
                    { label: '6R (6×8")', w: 152.4, h: 203.2 },
                    { label: '8R (8×10")', w: 203.2, h: 254 },
                    { label: '12×18" Sheet', w: 304.8, h: 457.2 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => applyCustomPaperPreset(preset.w, preset.h, preset.label)}
                      className="px-1.5 py-1 rounded-md bg-slate-900/90 hover:bg-indigo-600/30 border border-slate-800 hover:border-indigo-500/50 text-[9.5px] text-slate-300 hover:text-white font-mono transition text-center truncate"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Grid & Margins Spacing */}
        <div className="space-y-3 pt-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Grid & Margins Spacing
          </label>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-3">
            {/* Photo Gap */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Photo Gap</span>
                <span className="text-[11px] font-bold font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  {layoutConfig.gapMm ?? 3}mm
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={layoutConfig.gapMm ?? 3}
                onChange={(e) => dispatch({ type: 'SET_LAYOUT', payload: { gapMm: +e.target.value } })}
                className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Page Margin */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Page Margin</span>
                <span className="text-[11px] font-bold font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  {layoutConfig.marginMm ?? 3}mm
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={layoutConfig.marginMm ?? 3}
                onChange={(e) => {
                  const val = +e.target.value;
                  dispatch({
                    type: 'SET_LAYOUT',
                    payload: {
                      marginMm: val,
                      marginTopMm: val,
                      marginBottomMm: val,
                      marginLeftMm: val,
                      marginRightMm: val,
                    },
                  });
                }}
                className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 3. Dashed Cut Lines & Spacing Offset (ডট ডট কাটলাইন ও ফাঁকা) */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Dashed Cut Lines (ডট ডট কাটলাইন)
            </label>
            <span className="text-[10px] text-cyan-400 font-mono font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
              {layoutConfig.showCutlines ? `${layoutConfig.cutlineOffsetMm || 0}mm Offset` : 'OFF'}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2.5">
            <label className="flex items-center justify-between cursor-pointer p-1 rounded-lg hover:bg-slate-900/50 transition">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-slate-200 font-medium">Show Dashed Cut Lines</span>
              </div>
              <input
                type="checkbox"
                checked={!!layoutConfig.showCutlines}
                onChange={(e) => dispatch({ type: 'SET_LAYOUT', payload: { showCutlines: e.target.checked } })}
                className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
              />
            </label>

            {layoutConfig.showCutlines && (
              <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                {/* Cutline Offset / Spacing from photo */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Cutline Spacing (ছবির সাথে ফাঁকা)</span>
                    <span className="text-[11px] font-bold font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                      {(layoutConfig.cutlineOffsetMm || 0) === 0 ? '0mm (লাগানো)' : `${layoutConfig.cutlineOffsetMm}mm ফাঁকা`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={3.0}
                    step={0.5}
                    value={layoutConfig.cutlineOffsetMm ?? 0}
                    onChange={(e) => dispatch({ type: 'SET_LAYOUT', payload: { cutlineOffsetMm: +e.target.value } })}
                    className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  {/* Quick offset buttons */}
                  <div className="grid grid-cols-4 gap-1 pt-0.5">
                    {[
                      { label: '0mm (লাগানো)', val: 0 },
                      { label: '+1mm', val: 1 },
                      { label: '+1.5mm', val: 1.5 },
                      { label: '+2mm', val: 2 },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        onClick={() => dispatch({ type: 'SET_LAYOUT', payload: { cutlineOffsetMm: btn.val } })}
                        className={`py-1 rounded text-[9px] font-medium transition border ${
                          (layoutConfig.cutlineOffsetMm ?? 0) === btn.val
                            ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Corner Crosshair Extension */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Corner Crosshairs (কোনা বাড়তি লাইন)</span>
                    <span className="text-[11px] font-bold font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                      {layoutConfig.cutlineExtensionMm ?? 2.0}mm
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={4.0}
                    step={0.5}
                    value={layoutConfig.cutlineExtensionMm ?? 2.0}
                    onChange={(e) => dispatch({ type: 'SET_LAYOUT', payload: { cutlineExtensionMm: +e.target.value } })}
                    className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. Printer Roller Gripper Safe Zone (রোলার মার্জিন) */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Printer Roller Safe Zone (রোলার সেফ মার্জিন)
            </label>
            <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
              {layoutConfig.rollerSafeMarginMm || 8}mm
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Bottom Gripper Safe Margin</span>
              <span className="text-[11px] font-bold font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {layoutConfig.rollerSafeMarginMm || 8}mm
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={layoutConfig.rollerSafeMarginMm ?? 8}
              onChange={(e) => {
                const val = +e.target.value;
                dispatch({ type: 'SET_LAYOUT', payload: { rollerSafeMarginMm: val, marginBottomMm: val } });
              }}
              className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />

            {/* Quick Roller Margin Presets */}
            <div className="grid grid-cols-3 gap-1 pt-1">
              {[
                { label: 'Epson/Canon (8mm)', val: 8 },
                { label: 'Standard (10mm)', val: 10 },
                { label: 'Borderless (0mm)', val: 0 },
              ].map((p) => (
                <button
                  key={p.label}
                  onClick={() => dispatch({ type: 'SET_LAYOUT', payload: { rollerSafeMarginMm: p.val, marginBottomMm: p.val } })}
                  className={`py-1 px-1.5 rounded text-[9.5px] font-medium transition border ${
                    (layoutConfig.rollerSafeMarginMm ?? 8) === p.val
                      ? 'bg-amber-950/80 border-amber-500/60 text-amber-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <label className="flex items-center justify-between cursor-pointer pt-1.5 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-400">Show Roller Safe Guide on Canvas</span>
              <input
                type="checkbox"
                checked={!!layoutConfig.showRollerGuide}
                onChange={(e) => dispatch({ type: 'SET_LAYOUT', payload: { showRollerGuide: e.target.checked } })}
                className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* 5. Photo Orientation & Header Text */}
        <div className="space-y-2 pt-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Orientation & Header
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
                <FileText className="w-4 h-4 text-slate-500" />
                <span className="text-xs text-slate-300 font-medium">Show Header Text on Sheet</span>
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
