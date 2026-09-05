import React from 'react';
import {
  SlidersHorizontal,
  Target,
  Scaling,
  Zap,
  Check,
  Sparkles,
  Percent,
  Layers,
  Wand2
} from 'lucide-react';
import {
  ProcessingMode,
  OutputImageFormat,
  OptimizationRequest,
  AppLanguage,
  ResampleFilter
} from '../../engines/image-optimizer/types';

interface OptimizerSettingsPanelProps {
  request: OptimizationRequest;
  language: AppLanguage;
  isProcessing: boolean;
  hasFileLoaded: boolean;
  onChangeRequest: (newReq: Partial<OptimizationRequest>) => void;
  onRunOptimization: () => void;
}

export const OptimizerSettingsPanel: React.FC<OptimizerSettingsPanelProps> = ({
  request,
  language,
  isProcessing,
  hasFileLoaded,
  onChangeRequest,
  onRunOptimization
}) => {
  const activeMode = request.mode;

  const setTargetKb = (kb: number) => {
    onChangeRequest({
      mode: 'target_size',
      compression: {
        ...request.compression,
        mode: 'target_size',
        targetSizeBytes: kb * 1024,
        minimumQuality: request.compression?.minimumQuality || 50,
        twoStageDownscale: request.compression?.twoStageDownscale ?? true
      }
    });
  };

  return (
    <div className="w-80 sm:w-84 shrink-0 bg-slate-900 border-l border-slate-800 flex flex-col h-full overflow-y-auto select-none">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-xs text-slate-100 tracking-tight">
            {language === 'bn' ? 'কম্প্রেশন ও সাইজ কন্ট্রোল' : 'Compression Controls'}
          </span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold">
          Right Panel
        </span>
      </div>

      <div className="p-3 flex flex-col gap-3.5 flex-1">
        {/* ── Section 1: Processing Mode Tabs ─────────────────────────────── */}
        <div>
          <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
            {language === 'bn' ? 'প্রসেসিং মোড নির্বাচন করুন' : 'Select Processing Mode'}
          </label>
          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onChangeRequest({ mode: 'smart', presetId: undefined })}
              className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                activeMode === 'smart'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Smart</span>
            </button>

            <button
              onClick={() => onChangeRequest({ mode: 'target_size', presetId: undefined })}
              className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                activeMode === 'target_size'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Target className="w-3 h-3" />
              <span>Target KB</span>
            </button>

            <button
              onClick={() => onChangeRequest({ mode: 'resize', presetId: undefined })}
              className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                activeMode === 'resize'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Scaling className="w-3 h-3" />
              <span>Resize</span>
            </button>
          </div>
        </div>

        {/* ── Section 2: Target File Size Solver (When in Target Size Mode) ─── */}
        {activeMode === 'target_size' && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-indigo-400" />
                <span>{language === 'bn' ? 'টার্গেট ফাইল সাইজ' : 'Target File Size'}</span>
              </span>
              <span className="text-xs font-mono font-bold text-indigo-400">
                {Math.round((request.compression?.targetSizeBytes || 500 * 1024) / 1024)} KB
              </span>
            </div>

            {/* Quick KB Buttons */}
            <div className="grid grid-cols-4 gap-1">
              {[50, 100, 200, 500].map((kb) => (
                <button
                  key={kb}
                  onClick={() => setTargetKb(kb)}
                  className={`py-1 text-center rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer ${
                    Math.round((request.compression?.targetSizeBytes || 0) / 1024) === kb
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {kb} KB
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-1">
              {[1024, 2048, 5120].map((kb) => (
                <button
                  key={kb}
                  onClick={() => setTargetKb(kb)}
                  className={`py-1 text-center rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer ${
                    Math.round((request.compression?.targetSizeBytes || 0) / 1024) === kb
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {kb >= 1024 ? `${kb / 1024} MB` : `${kb} KB`}
                </button>
              ))}
            </div>

            {/* Custom KB Input */}
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">
                {language === 'bn' ? 'কাস্টম সাইজ (KB)' : 'Custom Target (KB)'}
              </label>
              <input
                type="number"
                value={Math.round((request.compression?.targetSizeBytes || 500 * 1024) / 1024)}
                onChange={(e) => setTargetKb(Math.max(10, parseInt(e.target.value) || 10))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none font-mono"
              />
            </div>

            {/* Minimum Quality Guard */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-[10px] text-slate-300 mb-1">
                <span>{language === 'bn' ? 'ন্যূনতম কোয়ালিটি ফ্লোর' : 'Quality Floor'}</span>
                <span className="font-mono text-indigo-400">
                  {request.compression?.minimumQuality || 50}%
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="85"
                value={request.compression?.minimumQuality || 50}
                onChange={(e) =>
                  onChangeRequest({
                    compression: {
                      ...request.compression,
                      mode: 'target_size',
                      minimumQuality: parseInt(e.target.value)
                    }
                  })
                }
                className="w-full accent-indigo-500"
              />
            </div>

            {/* 2-Stage Downscale Toggle */}
            <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer pt-0.5">
              <input
                type="checkbox"
                checked={request.compression?.twoStageDownscale ?? true}
                onChange={(e) =>
                  onChangeRequest({
                    compression: {
                      ...request.compression,
                      mode: 'target_size',
                      twoStageDownscale: e.target.checked
                    }
                  })
                }
                className="rounded accent-indigo-600"
              />
              <span>{language === 'bn' ? '২-স্টেপ স্মার্ট ডাউনস্কেলিং' : 'Allow 2-Stage Downscaling'}</span>
            </label>
          </div>
        )}

        {/* ── Section 3: Resize Controls ──────────────────────────────────── */}
        {(activeMode === 'resize' || request.resize?.enabled) && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                <Scaling className="w-3.5 h-3.5 text-indigo-400" />
                <span>{language === 'bn' ? 'ইমেজ রেজোলিউশন ও সাইজ' : 'Image Resizing'}</span>
              </span>
              <label className="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={request.resize?.enabled ?? false}
                  onChange={(e) =>
                    onChangeRequest({
                      resize: {
                        ...request.resize,
                        enabled: e.target.checked,
                        keepAspectRatio: request.resize?.keepAspectRatio ?? true
                      }
                    })
                  }
                  className="rounded accent-indigo-600"
                />
                <span>Enable</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Width (px)</label>
                <input
                  type="number"
                  value={request.resize?.targetWidth || ''}
                  placeholder="Auto"
                  onChange={(e) =>
                    onChangeRequest({
                      resize: {
                        ...request.resize,
                        enabled: true,
                        targetWidth: parseInt(e.target.value) || undefined,
                        keepAspectRatio: request.resize?.keepAspectRatio ?? true
                      }
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Height (px)</label>
                <input
                  type="number"
                  value={request.resize?.targetHeight || ''}
                  placeholder="Auto"
                  onChange={(e) =>
                    onChangeRequest({
                      resize: {
                        ...request.resize,
                        enabled: true,
                        targetHeight: parseInt(e.target.value) || undefined,
                        keepAspectRatio: request.resize?.keepAspectRatio ?? true
                      }
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Aspect Ratio & Filter */}
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={request.resize?.keepAspectRatio ?? true}
                  onChange={(e) =>
                    onChangeRequest({
                      resize: {
                        ...request.resize,
                        enabled: true,
                        keepAspectRatio: e.target.checked
                      }
                    })
                  }
                  className="rounded accent-indigo-600"
                />
                <span>{language === 'bn' ? 'অনুপাত বজায় রাখুন' : 'Keep Ratio'}</span>
              </label>

              <select
                value={request.resize?.filter || 'lanczos3'}
                onChange={(e) =>
                  onChangeRequest({
                    resize: {
                      ...request.resize,
                      enabled: true,
                      keepAspectRatio: request.resize?.keepAspectRatio ?? true,
                      filter: e.target.value as ResampleFilter
                    }
                  })
                }
                className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="lanczos3">Lanczos-3 (Crisp)</option>
                <option value="bicubic">Bicubic (Smooth)</option>
                <option value="area_average">Area Average</option>
              </select>
            </div>
          </div>
        )}

        {/* ── Section 4: Compression Quality Slider ───────────────────────── */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5 shadow-sm">
          <label className="text-[11px] font-bold text-slate-200 flex items-center justify-between">
            <span>{language === 'bn' ? 'কম্প্রেশন কোয়ালিটি' : 'Compression Quality'}</span>
            <span className="font-mono text-xs text-indigo-400 font-bold">
              {request.compression?.quality ?? 85}%
            </span>
          </label>

          <input
            type="range"
            min="10"
            max="100"
            value={request.compression?.quality ?? 85}
            onChange={(e) =>
              onChangeRequest({
                compression: {
                  ...request.compression,
                  mode: request.mode,
                  quality: parseInt(e.target.value)
                }
              })
            }
            className="w-full accent-indigo-500 cursor-pointer"
          />

          <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
            <span>10% (Smallest)</span>
            <span>85% (Balanced)</span>
            <span>100% (Lossless)</span>
          </div>
        </div>

        {/* ── Section 5: Format & DPI Selector ────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-bold text-slate-300 block mb-1">
              {language === 'bn' ? 'আউটপুট ফরম্যাট' : 'Output Format'}
            </label>
            <select
              value={request.output?.format || 'auto'}
              onChange={(e) =>
                onChangeRequest({
                  output: {
                    ...request.output,
                    format: e.target.value as OutputImageFormat
                  }
                })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value="auto">Auto (Smart Match)</option>
              <option value="jpeg">JPEG (.jpg)</option>
              <option value="webp">WebP (.webp)</option>
              <option value="png">PNG (.png)</option>
              <option value="avif">AVIF (.avif)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-300 block mb-1">
              {language === 'bn' ? 'টার্গেট DPI' : 'Target DPI'}
            </label>
            <select
              value={request.output?.dpi || 300}
              onChange={(e) =>
                onChangeRequest({
                  output: {
                    ...request.output,
                    format: request.output?.format || 'auto',
                    dpi: parseInt(e.target.value)
                  }
                })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value={300}>300 DPI (Studio Print)</option>
              <option value={200}>200 DPI (Photo Print)</option>
              <option value={150}>150 DPI (Document)</option>
              <option value={96}>96 DPI (Desktop)</option>
              <option value={72}>72 DPI (Web Standard)</option>
            </select>
          </div>
        </div>

        {/* ── Section 6: Smart Sharpening Toggle ──────────────────────────── */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300">
          <span className="flex items-center gap-1.5">
            <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>{language === 'bn' ? 'স্মার্ট এজ শার্পেনিং' : 'Smart Sharpening'}</span>
          </span>
          <input
            type="checkbox"
            checked={request.sharpen?.enabled ?? true}
            onChange={(e) =>
              onChangeRequest({
                sharpen: {
                  ...request.sharpen,
                  enabled: e.target.checked,
                  mode: 'auto'
                }
              })
            }
            className="rounded accent-indigo-600 cursor-pointer"
          />
        </div>
      </div>

      {/* ── Sticky Bottom Execution Action ──────────────────────────────────── */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/95 sticky bottom-0">
        <button
          onClick={onRunOptimization}
          disabled={isProcessing || !hasFileLoaded}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-40 cursor-pointer"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>{language === 'bn' ? 'প্রসেসিং হচ্ছে...' : 'Processing Image...'}</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 text-amber-300" />
              <span>{language === 'bn' ? 'ছবি অপ্টিমাইজ করুন (Optimize)' : 'Optimize Image Now'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
