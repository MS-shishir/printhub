import React, { useRef, useState } from 'react';
import { Paintbrush, Pipette, Sliders, Sparkles, Scissors, ChevronDown, ChevronUp, Loader2, CheckCircle2, Zap } from 'lucide-react';
import { usePassportStore } from '../../store';
import { PRESET_BACKGROUNDS } from '../../utils/color-utils';
import { removeBackgroundClassical, removeBackgroundAI, enhancePhotoTo4K } from '../../services/image-processing.service';

export default function BackgroundPanel() {
  const { state, dispatch } = usePassportStore();
  const { bgConfig } = state;
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // 4K Direct Enhance State
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [enhanceProgress, setEnhanceProgress] = useState<number>(0);
  const [enhanceStatus, setEnhanceStatus] = useState<string>('');
  const [isEnhancedSuccess, setIsEnhancedSuccess] = useState<boolean>(false);

  // AI Background Removal Animation State
  const [isBgRemoving, setIsBgRemoving] = useState<boolean>(false);
  const [bgProgress, setBgProgress] = useState<number>(0);
  const [bgStatus, setBgStatus] = useState<string>('');
  const [isBgSuccess, setIsBgSuccess] = useState<boolean>(false);

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
    if (state.isProcessing || isBgRemoving) return;
    const targetImg = state.originalImage || state.processedImage;
    if (!targetImg) return;

    setIsBgRemoving(true);
    setIsBgSuccess(false);
    setBgProgress(6);
    setBgStatus('BiRefNet: Detecting subject contours & bounds…');

    // Smooth continuous non-stalling progress engine: continuously advances as long as loading continues
    let currentPct = 6.0;
    const progressTimer = setInterval(() => {
      const remaining = 99.0 - currentPct;
      // Graceful deceleration that never hits zero until complete
      const step = Math.max(0.06, remaining * 0.038);
      currentPct = Math.min(98.8, currentPct + step);
      const rounded = Math.floor(currentPct);
      setBgProgress(rounded);

      if (rounded < 28) {
        setBgStatus('BiRefNet: Detecting subject contours & bounds…');
      } else if (rounded < 58) {
        setBgStatus('Segmenting foreground & hair strands…');
      } else if (rounded < 82) {
        setBgStatus('ViTMatte: Refining alpha trimap & transparent edges…');
      } else {
        setBgStatus('Decontaminating color spill & finalizing cutout…');
      }
    }, 120);

    dispatch({
      type: 'SET_PROCESSING',
      payload: { isProcessing: true, message: '🧠 Running AI Omni Router (BGNinja)…' }
    });

    try {
      const transparentPng = await removeBackgroundAI(targetImg, {
        tolerance: bgConfig.tolerance ?? 38,
        edgeQuality,
        edgeRadius: edgeQuality === 'maximum' ? 3 : edgeRadius,
        edgeShift,
        haloSuppression: haloSuppression / 100,
        decontaminateStrength: decontamStrength / 100,
        keyColor: bgConfig.isEnabled ? bgConfig.keyColor : undefined
      });

      clearInterval(progressTimer);
      setBgProgress(100);
      setBgStatus('✓ Background Removed Successfully!');
      setIsBgSuccess(true);

      dispatch({ type: 'SET_PROCESSED_IMAGE', payload: transparentPng });
      updateBg({ type: 'removed', isEnabled: true });

      setTimeout(() => {
        setIsBgSuccess(false);
        setBgProgress(0);
        setBgStatus('');
      }, 3000);
    } catch (err) {
      clearInterval(progressTimer);
      console.warn('[Classical BG Removal Error]', err);
    } finally {
      setIsBgRemoving(false);
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

  const handleDirect4KEnhance = async () => {
    if (isEnhancing) return;
    const targetImg = state.processedImage || state.croppedImage || state.originalImage;
    if (!targetImg) return;

    setIsEnhancing(true);
    setIsEnhancedSuccess(false);
    setEnhanceProgress(5);
    setEnhanceStatus('Analyzing facial structure & hair edges…');

    // Smooth continuous non-stalling progress engine: calibrated to continuously advance throughout the 20-25s neural execution
    let currentPct = 5.0;
    const progressTimer = setInterval(() => {
      const remaining = 99.0 - currentPct;
      const step = Math.max(0.04, remaining * 0.009);
      currentPct = Math.min(98.8, currentPct + step);
      const rounded = Math.floor(currentPct);
      setEnhanceProgress(rounded);

      if (rounded < 25) {
        setEnhanceStatus('Analyzing facial structure & fine hair contours…');
      } else if (rounded < 50) {
        setEnhanceStatus('Real-ESRGAN: Deep Residual Neural Super-Resolution…');
      } else if (rounded < 78) {
        setEnhanceStatus('Synthesizing fine facial features, iris & beard micro-details…');
      } else {
        setEnhanceStatus('Finalizing 4K Ultra HD synthesis & alpha protection…');
      }
    }, 120);

    try {
      const enhancedResult = await enhancePhotoTo4K(targetImg, { scaleFactor: 2.0 });

      clearInterval(progressTimer);
      setEnhanceProgress(100);
      setEnhanceStatus('✓ 4K Ultra HD Complete!');

      // Update state directly with the enhanced image
      dispatch({ type: 'SET_PROCESSED_IMAGE', payload: enhancedResult });
      if (!bgConfig.isEnabled) {
        dispatch({ type: 'SET_ORIGINAL_IMAGE', payload: enhancedResult });
      }

      dispatch({
        type: 'ADD_TOAST',
        payload: {
          id: `enhance_${Date.now()}`,
          message: '⚡ Photo enhanced to 4K Ultra HD & blur removed!',
          type: 'success',
          duration: 3500,
        },
      });

      setIsEnhancedSuccess(true);
      setTimeout(() => {
        setIsEnhancedSuccess(false);
        setEnhanceProgress(0);
        setEnhanceStatus('');
      }, 3500);
    } catch (err) {
      clearInterval(progressTimer);
      console.warn('[Direct 4K Enhance Error]', err);
      dispatch({
        type: 'ADD_TOAST',
        payload: {
          id: `enhance_err_${Date.now()}`,
          message: 'Failed to enhance photo. Please try again.',
          type: 'error',
          duration: 3000,
        },
      });
      setEnhanceProgress(0);
      setEnhanceStatus('');
    } finally {
      setIsEnhancing(false);
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

      {/* AI Omni Router Background Removal */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
            <span>AI Background (Omni Router)</span>
          </div>
          {isBgRemoving ? (
            <span className="text-[10px] font-mono font-bold text-indigo-400 animate-pulse">
              {bgProgress}%
            </span>
          ) : (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
              BGNinja Tier 1
            </span>
          )}
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
            disabled={!state.originalImage || isBgRemoving}
            className={`w-full relative overflow-hidden flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 disabled:opacity-40 cursor-pointer ${
              isBgSuccess
                ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                : isBgRemoving
                ? 'bg-slate-800 text-slate-200 cursor-wait border border-indigo-500/40'
                : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white hover:shadow-indigo-500/25'
            }`}
          >
            {/* Progress Fill Bar inside Button */}
            {isBgRemoving && (
              <div
                className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-indigo-500/30 to-purple-500/50 transition-all duration-200 ease-out"
                style={{ width: `${bgProgress}%` }}
              />
            )}

            <div className="relative z-10 flex items-center justify-center gap-2">
              {isBgRemoving ? (
                <>
                  <Loader2 className="w-4 h-4 text-indigo-300 animate-spin" />
                  <span>Removing BG… {bgProgress}%</span>
                </>
              ) : isBgSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>✓ Background Removed</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-200" />
                  <span>{bgConfig.isEnabled ? '⚡ Re-Apply AI Background Removal' : '✂️ AI Remove Background'}</span>
                </>
              )}
            </div>
          </button>

          {/* Real-Time Detailed Progress Status Bar */}
          {isBgRemoving && (
            <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1.5 animate-fadeIn">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-300 font-medium truncate pr-2">{bgStatus}</span>
                <span className="text-indigo-400 font-mono font-bold shrink-0">{bgProgress}%</span>
              </div>
              {/* Progress track */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-200"
                  style={{ width: `${bgProgress}%` }}
                />
              </div>
            </div>
          )}

          {bgConfig.isEnabled && !isBgRemoving && (
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              4K Photo Enhance & Unblur
            </span>
          </div>
          {isEnhancing && (
            <span className="text-[10px] font-mono font-bold text-amber-400 animate-pulse">
              {enhanceProgress}%
            </span>
          )}
        </div>

        {/* Action Button with direct inline loading & percentage */}
        <button
          onClick={handleDirect4KEnhance}
          disabled={(!state.originalImage && !state.processedImage) || isEnhancing}
          className={`w-full relative overflow-hidden flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
            isEnhancedSuccess
              ? 'bg-emerald-600 text-white shadow-emerald-500/20'
              : isEnhancing
              ? 'bg-slate-800 text-slate-200 cursor-wait border border-amber-500/40'
              : 'bg-gradient-to-r from-amber-600 via-indigo-600 to-violet-600 hover:from-amber-500 hover:to-violet-500 text-white hover:shadow-indigo-500/25 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
        >
          {/* Progress Fill Bar inside Button */}
          {isEnhancing && (
            <div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-amber-500/30 to-indigo-500/50 transition-all duration-200 ease-out"
              style={{ width: `${enhanceProgress}%` }}
            />
          )}

          <div className="relative z-10 flex items-center justify-center gap-2">
            {isEnhancing ? (
              <>
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                <span>Processing 4K… {enhanceProgress}%</span>
              </>
            ) : isEnhancedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>✓ 4K Ultra HD Complete</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>⚡ 4K Ultra HD Upscale & Unblur</span>
              </>
            )}
          </div>
        </button>

        {/* Real-Time Detailed Progress Status Bar */}
        {isEnhancing && (
          <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-300 font-medium truncate pr-2">{enhanceStatus}</span>
              <span className="text-amber-400 font-mono font-bold shrink-0">{enhanceProgress}%</span>
            </div>
            {/* Progress track */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-200"
                style={{ width: `${enhanceProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

