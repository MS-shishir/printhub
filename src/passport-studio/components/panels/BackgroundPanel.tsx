import React, { useRef, useState } from 'react';
import { Paintbrush, Pipette, Sliders, Sparkles, Scissors, ChevronDown, ChevronUp } from 'lucide-react';
import { usePassportStore } from '../../store';
import { PRESET_BACKGROUNDS } from '../../utils/color-utils';
import { removeBackgroundClassical, removeBackgroundAI } from '../../services/image-processing.service';
import PortraitRetouchModal from '../modals/PortraitRetouchModal';

export default function BackgroundPanel() {
  const { state, dispatch } = usePassportStore();
  const { bgConfig } = state;
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [isRetouchModalOpen, setIsRetouchModalOpen] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Classical CV Matting Options
  const [edgeQuality, setEdgeQuality] = useState<'standard' | 'high' | 'maximum'>('high');
  const [edgeRadius, setEdgeRadius] = useState<number>(2);
  const [edgeShift, setEdgeShift] = useState<number>(-1.0);
  const [haloSuppression, setHaloSuppression] = useState<number>(85);
  const [decontamStrength, setDecontamStrength] = useState<number>(95);

  const updateBg = (partial: Partial<typeof bgConfig>) => {
    dispatch({ type: 'SET_BG_CONFIG', payload: partial });
  };

  const selectPreset = (hex: string) => {
    updateBg({ color: hex });
  };

  const handleRunClassicalRemoval = async () => {
    const targetImg = state.originalImage || state.processedImage;
    if (!targetImg) return;

    dispatch({
      type: 'SET_PROCESSING',
      payload: { isProcessing: true, message: '✨ Running High-Precision Classical CV Matting…' }
    });

    try {
      const transparentPng = await removeBackgroundClassical(targetImg, {
        tolerance: bgConfig.tolerance ?? 38,
        edgeQuality,
        edgeRadius: edgeQuality === 'maximum' ? 3 : edgeRadius,
        edgeShift,
        haloSuppression: haloSuppression / 100,
        decontaminateStrength: decontamStrength / 100,
        keyColor: bgConfig.isEnabled ? bgConfig.keyColor : undefined
      });

      dispatch({ type: 'SET_PROCESSED_IMAGE', payload: transparentPng });
      updateBg({ type: 'removed', isEnabled: true });
    } catch (err) {
      console.warn('[Classical BG Removal Error]', err);
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: { isProcessing: false } });
    }
  };

  const handleRestoreOriginal = () => {
    if (state.originalImage) {
      dispatch({ type: 'SET_PROCESSED_IMAGE', payload: state.originalImage });
      updateBg({ isEnabled: false, type: 'solid' });
    }
  };

  const handleToggleBgEnabled = () => {
    const nextState = !bgConfig.isEnabled;
    if (nextState) {
      handleRunClassicalRemoval();
    } else {
      handleRestoreOriginal();
    }
  };

  return (
    <div className="p-3.5 space-y-3.5 select-none">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Background</div>

      {/* Preset Colors */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Preset Colors</div>
        <div className="grid grid-cols-6 gap-1.5">
          {PRESET_BACKGROUNDS.map((bg) => (
            <button
              key={bg.hex}
              onClick={() => selectPreset(bg.hex)}
              title={bg.name}
              className={`relative h-8 rounded-lg border-2 transition-all hover:scale-105
                ${bgConfig.color === bg.hex
                  ? 'border-indigo-400 ring-2 ring-indigo-400/50 scale-105'
                  : 'border-slate-600 hover:border-slate-400'
                }`}
              style={{ background: bg.hex }}
            >
              {bgConfig.color === bg.hex && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/80 flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-indigo-600" />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Color Picker */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Custom Color</div>
        <div className="flex gap-2 items-center">
          <div
            className="w-8 h-8 rounded-lg border border-slate-600 cursor-pointer flex-shrink-0 hover:border-slate-400 transition-colors"
            style={{ background: bgConfig.color }}
            onClick={() => colorInputRef.current?.click()}
          />
          <input
            ref={colorInputRef}
            type="color"
            value={bgConfig.color}
            onChange={(e) => selectPreset(e.target.value)}
            className="sr-only"
          />
          <input
            type="text"
            value={bgConfig.color}
            onChange={(e) => {
              const val = e.target.value;
              if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
                selectPreset(val.length === 7 ? val : bgConfig.color);
                if (val.length <= 7) {
                  updateBg({ color: val });
                }
              }
            }}
            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-indigo-400"
            placeholder="#ffffff"
          />
        </div>
      </div>

      <div className="border-t border-slate-800" />

      {/* Classical CV Background Removal */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Scissors className="w-3 h-3 text-indigo-400" />
            <span>Background Remove (Classical CV)</span>
          </div>
          <button
            onClick={handleToggleBgEnabled}
            className={`relative w-8 h-4 rounded-full transition-colors cursor-pointer ${bgConfig.isEnabled ? 'bg-indigo-500' : 'bg-slate-600'}`}
          >
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-md transition-transform ${bgConfig.isEnabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* Edge Quality Selector */}
        <div className="space-y-1">
          <div className="text-[10px] text-slate-400 font-medium">Edge Quality</div>
          <div className="grid grid-cols-3 gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 text-[10px]">
            {(['standard', 'high', 'maximum'] as const).map((q) => (
              <button
                key={q}
                onClick={() => setEdgeQuality(q)}
                className={`py-1 px-1.5 rounded capitalize font-medium transition-all ${
                  edgeQuality === q
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons: Remove Background & Restore Original */}
        <div className="space-y-1.5">
          <button
            onClick={handleRunClassicalRemoval}
            disabled={!state.originalImage}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition-all shadow-md active:scale-98 disabled:opacity-40 cursor-pointer"
          >
            <Scissors className="w-4 h-4 text-indigo-200" />
            <span>{bgConfig.isEnabled ? '⚡ Re-Apply Background Removal' : '✂️ Remove Background'}</span>
          </button>

          {bgConfig.isEnabled && (
            <button
              onClick={handleRestoreOriginal}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-all border border-slate-700 cursor-pointer"
            >
              <span>↺ Restore Original Photo Background</span>
            </button>
          )}
        </div>

        {/* Advanced Matting Controls Accordion */}
        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/50">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-[10px] font-semibold text-slate-400 hover:text-slate-200 bg-slate-800/40 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Sliders className="w-3 h-3 text-indigo-400" />
              <span>Advanced Matting & Halo Controls</span>
            </div>
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showAdvanced && (
            <div className="p-2.5 space-y-2.5 text-[10px] text-slate-300 border-t border-slate-800 animate-fadeIn">
              {/* Tolerance */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Color Tolerance</span>
                  <span className="text-indigo-300 font-mono">{bgConfig.tolerance}%</span>
                </div>
                <input
                  type="range" min={1} max={100} step={1}
                  value={bgConfig.tolerance}
                  onChange={(e) => updateBg({ tolerance: +e.target.value })}
                  className="w-full accent-indigo-500"
                />
              </div>

              {/* Edge Radius */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Edge Radius</span>
                  <span className="text-indigo-300 font-mono">{edgeRadius} px</span>
                </div>
                <input
                  type="range" min={1} max={5} step={1}
                  value={edgeRadius}
                  onChange={(e) => setEdgeRadius(+e.target.value)}
                  className="w-full accent-indigo-500"
                />
              </div>

              {/* Edge Shift */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Edge Shift (Shrink)</span>
                  <span className="text-indigo-300 font-mono">{edgeShift.toFixed(1)} px</span>
                </div>
                <input
                  type="range" min={-3.0} max={3.0} step={0.2}
                  value={edgeShift}
                  onChange={(e) => setEdgeShift(+e.target.value)}
                  className="w-full accent-indigo-500"
                />
              </div>

              {/* Halo Suppression */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Halo / Fringe Suppression</span>
                  <span className="text-indigo-300 font-mono">{haloSuppression}%</span>
                </div>
                <input
                  type="range" min={0} max={100} step={5}
                  value={haloSuppression}
                  onChange={(e) => setHaloSuppression(+e.target.value)}
                  className="w-full accent-indigo-500"
                />
              </div>

              {/* Decontamination Strength */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Color Decontamination</span>
                  <span className="text-indigo-300 font-mono">{decontamStrength}%</span>
                </div>
                <input
                  type="range" min={0} max={100} step={5}
                  value={decontamStrength}
                  onChange={(e) => setDecontamStrength(+e.target.value)}
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4K Photo Enhance & Unblur Section */}
      <div className="border-t border-slate-800 pt-2.5 space-y-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">4K Photo Enhance & Unblur</span>
        </div>

        <button
          onClick={() => setIsRetouchModalOpen(true)}
          disabled={!state.originalImage}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md disabled:opacity-40"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>⚡ 4K Ultra HD Upscale & Unblur</span>
        </button>
      </div>

      {/* Dedicated AI Portrait Enhancer & Beauty Studio Modal */}
      <PortraitRetouchModal
        isOpen={isRetouchModalOpen}
        onClose={() => setIsRetouchModalOpen(false)}
      />
    </div>
  );
}

