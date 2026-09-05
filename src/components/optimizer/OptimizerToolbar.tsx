import React, { useRef } from 'react';
import {
  Upload,
  Download,
  Copy,
  Camera,
  Palette,
  FileText,
  RotateCcw,
  Sparkles,
  Check,
  Zap
} from 'lucide-react';
import { AppLanguage, OptimizationReport } from '../../engines/image-optimizer/types';

interface OptimizerToolbarProps {
  report: OptimizationReport | null;
  language: AppLanguage;
  isProcessing: boolean;
  onUploadFiles: (files: File[]) => void;
  onDownloadCurrent: () => void;
  onCopyToClipboard: () => void;
  onTransferToModule: (module: 'passport' | 'photo' | 'document') => void;
  onReset: () => void;
}

export const OptimizerToolbar: React.FC<OptimizerToolbarProps> = ({
  report,
  language,
  isProcessing,
  onUploadFiles,
  onDownloadCurrent,
  onCopyToClipboard,
  onTransferToModule,
  onReset
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  return (
    <div className="h-12 bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between z-20 shrink-0 select-none">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        multiple
        accept="image/*"
        className="hidden"
      />

      {/* Left: Brand & File Actions */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 text-indigo-300">
          <Zap className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-bold text-xs tracking-tight">
            {language === 'bn' ? 'স্মার্ট ইমেজ অপ্টিমাইজার' : 'Smart Image Optimizer'}
          </span>
        </div>

        <div className="h-4 w-px bg-slate-800" />

        {/* Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{language === 'bn' ? 'ছবি আপলোড' : 'Upload Images'}</span>
        </button>

        {report && (
          <button
            onClick={onReset}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
            title="Reset / Clear Image"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Right: Export & Cross-Module Transfer Actions */}
      <div className="flex items-center gap-2">
        {report && (
          <>
            {/* Copy to Clipboard */}
            <button
              onClick={onCopyToClipboard}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700 cursor-pointer"
              title="Copy to Clipboard"
            >
              <Copy className="w-3.5 h-3.5 text-indigo-400" />
              <span>{language === 'bn' ? 'কপি' : 'Copy'}</span>
            </button>

            {/* Transfer Dropdown / Buttons */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => onTransferToModule('passport')}
                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Send to Passport Studio"
              >
                <Camera className="w-3 h-3 text-indigo-400" />
                <span>Passport</span>
              </button>
              <button
                onClick={() => onTransferToModule('photo')}
                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Send to Photo Lab Editor"
              >
                <Palette className="w-3 h-3 text-purple-400" />
                <span>Photo Lab</span>
              </button>
            </div>

            {/* Main Download Button */}
            <button
              onClick={onDownloadCurrent}
              className="flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition active:scale-95 border border-emerald-400/30 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'ডাউনলোড' : 'Download File'}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
