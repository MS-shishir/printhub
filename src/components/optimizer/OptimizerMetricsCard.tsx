import React from 'react';
import {
  Gauge,
  Sparkles,
  AlertTriangle,
  FileImage,
  CheckCircle2,
  TrendingDown,
  Activity,
  Zap,
  Clock
} from 'lucide-react';
import { OptimizationReport, AppLanguage } from '../../engines/image-optimizer/types';

interface OptimizerMetricsCardProps {
  report: OptimizationReport | null;
  originalMeta: {
    fileName: string;
    width: number;
    height: number;
    sizeBytes: number;
    format: string;
    dpi: number;
    classification?: string;
  } | null;
  language: AppLanguage;
  isProcessing: boolean;
  onRunOptimization?: () => void;
}

export const OptimizerMetricsCard: React.FC<OptimizerMetricsCardProps> = ({
  report,
  originalMeta,
  language,
  isProcessing,
  onRunOptimization
}) => {
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getSsimColor = (score: number) => {
    if (score >= 0.96) return 'text-emerald-400';
    if (score >= 0.90) return 'text-cyan-400';
    if (score >= 0.80) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getPsnrColor = (db: number) => {
    if (db >= 40) return 'text-emerald-400';
    if (db >= 33) return 'text-cyan-400';
    if (db >= 27) return 'text-amber-400';
    return 'text-rose-400';
  };

  // State 1: No file loaded at all
  if (!originalMeta && !report) {
    return (
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 text-slate-400 text-xs flex items-center justify-between shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span className="font-medium">
            {language === 'bn'
              ? 'ইমেজ আপলোড করে অপ্টিমাইজেশন শুরু করুন...'
              : 'Upload an image to start high-quality compression & resolution management...'}
          </span>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-mono font-bold">
          Ready
        </span>
      </div>
    );
  }

  // State 2: File loaded but user has NOT clicked optimize yet (Original state)
  if (!report && originalMeta) {
    return (
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md flex flex-col gap-3">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <FileImage className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-slate-100 flex items-center gap-2">
                <span>{language === 'bn' ? 'ইমেজ ইনফরমেশন ও স্ট্যাটাস' : 'Image Information & Status'}</span>
                {originalMeta.classification && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 uppercase font-bold border border-indigo-500/30">
                    {originalMeta.classification}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                {originalMeta.fileName}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-bold font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'প্রসেসিংয়ের জন্য প্রস্তুত' : 'Ready to Optimize'}</span>
          </div>
        </div>

        {/* Comparison Grid (Original loaded vs Waiting for user to click optimize) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {/* Box 1: Original Image Details */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1">
              <span className="flex items-center gap-1.5">
                <FileImage className="w-3.5 h-3.5 text-indigo-400" />
                <span>{language === 'bn' ? 'অরিজিনাল ইমেজ' : 'Original Image'}</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 uppercase font-semibold">
                {originalMeta.format}
              </span>
            </div>

            <div className="mt-1">
              <div className="text-[10px] text-slate-500 font-medium">{language === 'bn' ? 'আসল সাইজ' : 'Original Size'}</div>
              <div className="text-sm font-extrabold text-slate-200 font-mono">
                {formatBytes(originalMeta.sizeBytes)}
              </div>
            </div>

            <div className="mt-1 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>{originalMeta.width} × {originalMeta.height} px</span>
              <span className="text-slate-400">{originalMeta.dpi} DPI</span>
            </div>
          </div>

          {/* Box 2: Pending Optimization */}
          <div className="bg-slate-950/50 p-3 rounded-xl border border-dashed border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                <span>{language === 'bn' ? 'প্রসেস করা ইমেজ' : 'Processed Image'}</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-500 uppercase">
                Pending
              </span>
            </div>

            <div className="mt-1 flex flex-col justify-center">
              <div className="text-xs text-slate-400 font-medium">
                {language === 'bn'
                  ? 'ডান পাশের সেটিংস ঠিক করে "Optimize Image Now" বাটনে ক্লিক করুন।'
                  : 'Configure right sidebar and click "Optimize Image Now".'}
              </div>
            </div>

            <div className="mt-1 pt-1.5 border-t border-slate-800/80 text-[10px] text-indigo-400 font-medium">
              {language === 'bn' ? 'এখনও কম্প্রেশন শুরু হয়নি' : 'Waiting for optimization'}
            </div>
          </div>

          {/* Box 3: Call to action */}
          <div className="bg-gradient-to-br from-indigo-950/30 to-slate-950 p-3 rounded-xl border border-indigo-500/20 flex flex-col justify-between">
            <div className="text-[11px] font-bold text-indigo-300">
              {language === 'bn' ? 'স্মার্ট অপ্টিমাইজার অ্যাকশন' : 'Smart Action'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {language === 'bn'
                ? 'আপনার ইমেজ কোয়ালিটি অক্ষুণ্ণ রেখে সর্বোচ্চ ফাইল সাইজ কমানো হবে।'
                : 'Maximum quality preservation with target file size solver.'}
            </div>
            {onRunOptimization && (
              <button
                onClick={onRunOptimization}
                disabled={isProcessing}
                className="mt-2 w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'এখনই অপ্টিমাইজ করুন' : 'Optimize Now'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // State 3: Optimization completed (Full Results & Metrics)
  const { input, output, quality, reduction, compression, warnings } = report;

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md flex flex-col gap-3">
      {/* ── Top Header Bar: Title, Category & Big Savings Pill ─────────────── */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 border border-indigo-400/30">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-extrabold text-slate-100 flex items-center gap-2">
              <span>{language === 'bn' ? 'অপ্টিমাইজেশন রেজাল্ট ও সাইজ তুলনা' : 'Optimization Result & Size Comparison'}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 uppercase font-bold border border-indigo-500/30">
                {input.classification}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
              {report.processingTimeMs}ms • {reduction.ratio} • {formatBytes(reduction.bytesSaved)} {language === 'bn' ? 'কমানো হয়েছে' : 'Saved'}
            </div>
          </div>
        </div>

        {/* Big Savings Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/40 text-emerald-300 shadow-md">
          <TrendingDown className="w-5 h-5 text-emerald-400" />
          <div className="text-right">
            <div className="text-sm font-black tracking-tight leading-none text-emerald-400">
              {reduction.percentage}%
            </div>
            <div className="text-[9px] uppercase font-bold tracking-wider text-emerald-300/80 mt-0.5">
              {language === 'bn' ? 'সাইজ সেভড' : 'SAVED'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Comparison Grid: Original vs Processed Details ────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {/* Box 1: Original Image Details */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <FileImage className="w-3.5 h-3.5 text-slate-400" />
              <span>{language === 'bn' ? 'অরিজিনাল ইমেজ' : 'Original Image'}</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 uppercase font-semibold">
              {input.format}
            </span>
          </div>

          <div className="mt-1">
            <div className="text-[10px] text-slate-500 font-medium">{language === 'bn' ? 'আসল সাইজ' : 'Original Size'}</div>
            <div className="text-sm font-extrabold text-slate-300 font-mono">
              {formatBytes(input.sizeBytes)}
            </div>
          </div>

          <div className="mt-1 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>{input.width} × {input.height} px</span>
            <span className="text-slate-400">{input.dpi} DPI</span>
          </div>
        </div>

        {/* Box 2: Processed / Optimized Image Details */}
        <div className="bg-gradient-to-br from-indigo-950/40 to-slate-950/80 p-3 rounded-xl border border-indigo-500/30 flex flex-col justify-between shadow-md shadow-indigo-950/20">
          <div className="flex items-center justify-between text-[11px] font-bold text-indigo-300 mb-1">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>{language === 'bn' ? 'প্রসেস করা অপ্টিমাইজড ইমেজ' : 'Processed Image'}</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 uppercase font-bold border border-indigo-500/30">
              {output.format}
            </span>
          </div>

          <div className="mt-1">
            <div className="text-[10px] text-indigo-300/80 font-medium">{language === 'bn' ? 'বর্তমান সাইজ' : 'Optimized Size'}</div>
            <div className="text-sm font-black text-emerald-400 font-mono flex items-center gap-2">
              <span>{formatBytes(output.sizeBytes)}</span>
              <span className="text-[10px] text-slate-400 font-normal line-through">
                {formatBytes(input.sizeBytes)}
              </span>
            </div>
          </div>

          <div className="mt-1 pt-1.5 border-t border-indigo-500/20 flex items-center justify-between text-[11px] text-indigo-200 font-mono font-bold">
            <span>{output.width} × {output.height} px</span>
            <span className="text-indigo-400">{output.dpi} DPI</span>
          </div>
        </div>

        {/* Box 3: Quality Metrics & Visual Score */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>{language === 'bn' ? 'ভিজুয়াল কোয়ালিটি স্কোর' : 'Visual Quality Score'}</span>
            </span>
            <span className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-slate-800 ${getSsimColor(quality.ssim)}`}>
              {quality.visualScore}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-1">
            <div>
              <div className="text-[10px] text-slate-500 font-medium">SSIM Similarity</div>
              <div className={`text-xs font-bold font-mono ${getSsimColor(quality.ssim)}`}>
                {quality.ssim.toFixed(3)} <span className="text-[9px] text-slate-500 font-normal">/ 1.0</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-medium">PSNR Fidelity</div>
              <div className={`text-xs font-bold font-mono ${getPsnrColor(quality.psnr)}`}>
                {quality.psnr} dB <span className="text-[9px] text-slate-500 font-normal">(Q{compression.appliedQuality})</span>
              </div>
            </div>
          </div>

          <div className="mt-1 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Entropy: {input.entropy}</span>
            <span>Edge: {quality.edgePreservationRatio * 100}%</span>
          </div>
        </div>
      </div>

      {/* Warnings & Notices */}
      {warnings.length > 0 && (
        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <div className="flex-1 leading-snug">{warnings[0]}</div>
        </div>
      )}
    </div>
  );
};
