import React, { useRef, useState } from 'react';
import { Paintbrush, Pipette, Sliders, Sparkles, Scissors } from 'lucide-react';
import { usePassportStore } from '../../store';
import { PRESET_BACKGROUNDS } from '../../utils/color-utils';
import { removeBackgroundAI } from '../../services/image-processing.service';
import PortraitRetouchModal from '../modals/PortraitRetouchModal';

export default function BackgroundPanel() {
  const { state, dispatch } = usePassportStore();
  const { bgConfig } = state;
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [isRetouchModalOpen, setIsRetouchModalOpen] = useState<boolean>(false);

  const updateBg = (partial: Partial<typeof bgConfig>) => {
    dispatch({ type: 'SET_BG_CONFIG', payload: partial });
  };

  const selectPreset = (hex: string) => {
    updateBg({ color: hex });
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

      {/* Chroma Key Removal */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Background Removal</div>
          <button
            onClick={() => updateBg({ isEnabled: !bgConfig.isEnabled })}
            className={`relative w-8 h-4 rounded-full transition-colors ${bgConfig.isEnabled ? 'bg-indigo-500' : 'bg-slate-600'}`}
          >
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-md transition-transform ${bgConfig.isEnabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* BiRefNet / RMBG-2.0 AI Remove Button */}
        <button
          onClick={async () => {
            const targetImg = state.processedImage || state.croppedImage || state.originalImage;
            if (!targetImg) return;
            dispatch({ type: 'SET_PROCESSING', payload: { isProcessing: true, message: '⚡ Running BiRefNet / RMBG-2.0 AI BG Removal…' } });
            try {
              const transparentPng = await removeBackgroundAI(targetImg, {
                model: 'birefnet',
                useFastAPI: true,
                enhance: true
              });
              dispatch({ type: 'SET_PROCESSED_IMAGE', payload: transparentPng });
              updateBg({ type: 'ai_removed', isEnabled: true });
            } catch (err) {
              console.warn(err);
            } finally {
              dispatch({ type: 'SET_PROCESSING', payload: { isProcessing: false } });
            }
          }}
          disabled={!state.originalImage}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold transition-all shadow-md disabled:opacity-40"
        >
          <Scissors className="w-3.5 h-3.5 text-purple-200" />
          <span>⚡ BiRefNet / RMBG-2.0 AI Remove BG</span>
        </button>

        {bgConfig.isEnabled && (
          <div className="space-y-2 animate-fadeIn">
            {/* Key Color */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Key Color</span>
                <div
                  className="w-5 h-5 rounded border border-slate-600 flex-shrink-0"
                  style={{ background: `rgb(${bgConfig.keyColor.r},${bgConfig.keyColor.g},${bgConfig.keyColor.b})` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-[10px] text-slate-400">
                {(['r', 'g', 'b'] as const).map((c) => (
                  <div key={c} className="space-y-0.5">
                    <label className="uppercase text-[9px]">{c}</label>
                    <input
                      type="number" min={0} max={255}
                      value={bgConfig.keyColor[c]}
                      onChange={(e) => updateBg({ keyColor: { ...bgConfig.keyColor, [c]: +e.target.value } })}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-slate-300 text-[10px] focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Tolerance */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Tolerance</span>
                <span className="text-indigo-300">{bgConfig.tolerance}%</span>
              </div>
              <input
                type="range" min={1} max={100} step={1}
                value={bgConfig.tolerance}
                onChange={(e) => updateBg({ tolerance: +e.target.value })}
                className="w-full accent-indigo-500"
              />
            </div>

            {/* Feather */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Edge Feather</span>
                <span className="text-indigo-300">{bgConfig.feather}</span>
              </div>
              <input
                type="range" min={0} max={20} step={1}
                value={bgConfig.feather}
                onChange={(e) => updateBg({ feather: +e.target.value })}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>
        )}
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
