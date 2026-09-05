/**
 * ProcessingModal.tsx
 * Ultra-Sleek Studio AI Processing Overlay Modal.
 * Displays glowing laser scanner ring, animated progress bar, and status indicators.
 */

import React from 'react';
import { Loader2, Sparkles, Wand2, ShieldCheck } from 'lucide-react';

interface ProcessingModalProps {
  isOpen: boolean;
  message?: string;
  subMessage?: string;
  progress?: number;
  language: 'en' | 'bn';
}

export default function ProcessingModal({
  isOpen,
  message,
  subMessage,
  progress = 75,
  language
}: ProcessingModalProps) {
  if (!isOpen) return null;

  const defaultMsg = language === 'bn' 
    ? 'অত্যাধুনিক AI ব্যাকগ্রাউন্ড রিমুভ ও HD প্রসেসিং চলছে...' 
    : 'Running BiRefNet AI Background Removal & HD Matting...';

  const defaultSubMsg = language === 'bn'
    ? '১-৩ সেকেন্ডের মধ্যে মূল রেজোলিউশন বজায় রেখে কাটিং হচ্ছে'
    : 'Preserving 100% full original camera resolution in real-time';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-fade-in select-none">
      <div className="relative w-full max-w-sm bg-slate-900/90 border border-indigo-500/40 rounded-3xl shadow-[0_0_50px_rgba(79,70,229,0.3)] p-6 text-slate-100 flex flex-col items-center text-center overflow-hidden">
        
        {/* Animated Laser Scanning Beam Effect */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-pulse" />

        {/* Outer Glowing Pulsating AI Orb */}
        <div className="relative w-20 h-20 flex items-center justify-center mb-5">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 opacity-30 blur-xl animate-ping" />
          <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-indigo-500/50 flex items-center justify-center shadow-2xl z-10">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            <Sparkles className="w-4 h-4 text-purple-400 absolute top-2 right-2 animate-bounce" />
          </div>
        </div>

        {/* Processing Title */}
        <h3 className="text-base font-extrabold text-white mb-1 tracking-wide flex items-center justify-center gap-2">
          <Wand2 className="w-4 h-4 text-indigo-400" />
          <span>{message || defaultMsg}</span>
        </h3>

        {/* Subtext */}
        <p className="text-xs text-slate-400 mb-5 font-medium leading-relaxed">
          {subMessage || defaultSubMsg}
        </p>

        {/* Animated Progress Bar */}
        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800 p-0.5 mb-3">
          <div 
            style={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(99,102,241,0.8)] relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{language === 'bn' ? 'অরিজিনাল রেজোলিউশন সংরক্ষিত' : 'Original Resolution Preserved'}</span>
        </div>
      </div>
    </div>
  );
}
