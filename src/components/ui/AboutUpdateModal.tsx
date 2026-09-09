import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Download,
  AlertCircle,
  X,
  ShieldCheck,
  ArrowRight,
  HardDrive,
  Cpu,
  Layers,
  FileCheck2,
  ExternalLink
} from 'lucide-react';
import { updateService, UpdateState } from '../../services/updateService';
import { AppLanguage } from '../../types';
import logoImg from '../../assets/logo.png';

interface AboutUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: AppLanguage;
}

export default function AboutUpdateModal({
  isOpen,
  onClose,
  language,
}: AboutUpdateModalProps) {
  const [updateState, setUpdateState] = useState<UpdateState>(updateService.getState());
  const [isCheckingManual, setIsCheckingManual] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = updateService.subscribe((state) => {
      setUpdateState(state);
      if (state.status !== 'checking') {
        setIsCheckingManual(false);
      }
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const handleManualCheck = async () => {
    setIsCheckingManual(true);
    await updateService.checkForUpdates();
  };

  const handleStartDownload = async () => {
    await updateService.startDownloadUpdate();
  };

  const handleRestartAndInstall = async () => {
    await updateService.quitAndInstallUpdate();
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatSpeed = (bytesPerSec?: number) => {
    if (!bytesPerSec || bytesPerSec <= 0) return '0 KB/s';
    const kb = bytesPerSec / 1024;
    if (kb < 1024) return `${kb.toFixed(0)} KB/s`;
    return `${(kb / 1024).toFixed(1)} MB/s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-800/80 bg-gradient-to-b from-slate-800/50 to-transparent flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-slate-950 border border-indigo-500/30 p-2 flex items-center justify-center shadow-lg shadow-indigo-500/10">
              <img src={logoImg} alt="PrintHub Studio" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white font-mono">
                  PrintHub Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  v{updateState.currentVersion}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {language === 'bn'
                  ? 'প্রফেশনাল ফটো ও ডকুমেন্ট প্রিন্ট স্টুডিও ডেক্সটপ স্যুট'
                  : 'Professional Photo & Document Print Suite for Windows'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Update Status Card */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                {updateState.status === 'checking' || isCheckingManual ? (
                  <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
                ) : updateState.status === 'available' ? (
                  <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                ) : updateState.status === 'downloading' ? (
                  <Download className="w-5 h-5 text-cyan-400 animate-bounce" />
                ) : updateState.status === 'downloaded' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : updateState.status === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                )}

                <div>
                  <h3 className="text-sm font-bold text-white">
                    {updateState.status === 'checking' || isCheckingManual
                      ? language === 'bn' ? 'আপডেট খোঁজা হচ্ছে...' : 'Checking for updates...'
                      : updateState.status === 'available'
                      ? language === 'bn' ? `নতুন আপডেট পাওয়া গেছে: v${updateState.info?.version || ''}` : `New Update Available: v${updateState.info?.version || ''}`
                      : updateState.status === 'downloading'
                      ? language === 'bn' ? 'আপডেট ডাউনলোড হচ্ছে...' : 'Downloading Update...'
                      : updateState.status === 'downloaded'
                      ? language === 'bn' ? 'আপডেট ইন্সটলের জন্য প্রস্তুত! 🚀' : 'Update Ready to Install! 🚀'
                      : updateState.status === 'error'
                      ? language === 'bn' ? 'আপডেট চেক সম্পন্ন করা যায়নি' : 'Unable to Check for Updates'
                      : language === 'bn' ? 'আপনার PrintHub Studio আপ-টু-ডেট রয়েছে' : 'PrintHub Studio is Up-to-Date'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {updateState.status === 'checking' || isCheckingManual
                      ? language === 'bn' ? 'অনুগ্রহ করে অপেক্ষা করুন, রিলিজ সার্ভার যাচাই করা হচ্ছে' : 'Connecting to release server and verifying integrity...'
                      : updateState.status === 'available'
                      ? language === 'bn' ? 'ব্যাকগ্রাউন্ডে নতুন সংস্করণ ডাউনলোড করা যাবে।' : 'A newer release is available with new features & fixes.'
                      : updateState.status === 'downloading'
                      ? language === 'bn' ? 'ডাউনলোড সম্পন্ন হলে আপনি রিস্টার্ট দিয়ে আপডেট করতে পারবেন।' : 'Download runs seamlessly in background.'
                      : updateState.status === 'downloaded'
                      ? language === 'bn' ? 'সফটওয়্যার রিস্টার্ট দিয়ে নতুন ভার্সনে রূপান্তর করুন।' : 'Click restart to finalize the update without losing any data.'
                      : updateState.status === 'error'
                      ? updateState.error || (language === 'bn' ? 'ইন্টারনেট সংযোগ চেক করুন।' : 'Check your internet connection.')
                      : language === 'bn' ? `বর্তমান সংস্করণ: v${updateState.currentVersion}` : `Current installed version: v${updateState.currentVersion}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Downloading Progress Bar */}
            {updateState.status === 'downloading' && updateState.progress && (
              <div className="mt-4 space-y-2 pt-2 border-t border-slate-800/60">
                <div className="flex justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <Download className="w-3.5 h-3.5" />
                    {updateState.progress.percent}%
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {formatBytes(updateState.progress.transferred)} / {formatBytes(updateState.progress.total)} ({formatSpeed(updateState.progress.bytesPerSecond)})
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-300 shadow-sm shadow-cyan-400/50"
                    style={{ width: `${updateState.progress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons for Update */}
            <div className="mt-4 flex items-center gap-2.5 pt-2 border-t border-slate-800/60">
              {updateState.status === 'downloaded' ? (
                <>
                  <button
                    onClick={handleRestartAndInstall}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 transition active:scale-95 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>{language === 'bn' ? 'রিস্টার্ট ও আপডেট করুন (Restart & Update)' : 'Restart & Update Now'}</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                  >
                    <span>{language === 'bn' ? 'পরে (Later)' : 'Later'}</span>
                  </button>
                </>
              ) : updateState.status === 'available' ? (
                <button
                  onClick={handleStartDownload}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 transition active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{language === 'bn' ? 'আপডেট ডাউনলোড শুরু করুন' : 'Start Download'}</span>
                </button>
              ) : (
                <button
                  onClick={handleManualCheck}
                  disabled={updateState.status === 'checking' || isCheckingManual}
                  className="flex items-center gap-2 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold text-xs border border-slate-700 transition cursor-pointer active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${updateState.status === 'checking' || isCheckingManual ? 'animate-spin text-indigo-400' : ''}`} />
                  <span>{language === 'bn' ? 'নতুন আপডেট চেক করুন' : 'Check for Updates'}</span>
                </button>
              )}
            </div>
          </div>

          {/* User Data Safety Guarantee Card */}
          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-emerald-300">
                {language === 'bn' ? '১০০% ইউজার ডাটা নিরাপত্তা নিশ্চয়তা' : '100% User Data Protection'}
              </span>
              <p className="text-slate-400 mt-0.5 leading-relaxed text-[11px]">
                {language === 'bn'
                  ? 'সফটওয়্যার আপডেট চলাকালীন আপনার তৈরি করা পাসপোর্ট ছবি, ফটো মিডিয়া বিন, কাস্টমার ডাটাবেস এবং সকল কাস্টম সেটিংস পুরোপুরি সুরক্ষিত থাকবে।'
                  : 'Your customer records, photo media bins, saved templates, and custom settings remain 100% untouched and preserved during software updates.'}
              </p>
            </div>
          </div>

          {/* System & Architecture Info */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center gap-2 text-slate-300">
              <HardDrive className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <span className="text-slate-500 block text-[10px]">Platform Target</span>
                <span className="font-semibold">Windows 10 / 11 (x64)</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center gap-2 text-slate-300">
              <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="text-slate-500 block text-[10px]">Packaging Engine</span>
                <span className="font-semibold">Electron Builder + NSIS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>Copyright © 2026 PrintHub Studio</span>
          <span className="font-mono">Auto-Update Engine v2.0</span>
        </div>
      </div>
    </div>
  );
}
