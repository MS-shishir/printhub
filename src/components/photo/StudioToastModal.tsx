/**
 * StudioToastModal.tsx
 * Universal Premium Dark Glassmorphic Studio Alert & Notification Toast System.
 * Completely eliminates browser native alert() and confirm() dialogs with sleek high-contrast UI.
 */

import React, { useEffect } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'info' | 'warning' | 'error' | 'success';

interface StudioToastModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: ToastType;
  autoCloseMs?: number;
  language: 'en' | 'bn';
}

export default function StudioToastModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'warning',
  autoCloseMs = 4000,
  language
}: StudioToastModalProps) {
  useEffect(() => {
    if (!isOpen || !autoCloseMs || type === 'success') return;
    const timer = setTimeout(() => {
      onClose();
    }, autoCloseMs);
    return () => clearTimeout(timer);
  }, [isOpen, autoCloseMs, onClose, type]);

  // Completely suppress success modal popups across the app
  if (!isOpen || type === 'success') return null;

  const typeConfig = {
    warning: {
      bgIcon: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      icon: AlertTriangle,
      defaultTitle: language === 'bn' ? 'সতর্কবার্তা' : 'Notice',
      btnGradient: 'bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold'
    },
    error: {
      bgIcon: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      icon: AlertCircle,
      defaultTitle: language === 'bn' ? 'ত্রুটি' : 'Error',
      btnGradient: 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold'
    },
    success: {
      bgIcon: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      icon: CheckCircle2,
      defaultTitle: language === 'bn' ? 'সফল হয়েছে' : 'Success',
      btnGradient: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold'
    },
    info: {
      bgIcon: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
      icon: Info,
      defaultTitle: language === 'bn' ? 'তথ্য' : 'Info',
      btnGradient: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold'
    }
  };

  const current = typeConfig[type];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden p-5 text-slate-100 flex flex-col items-center text-center">
        
        {/* Top Radial Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />

        {/* Icon Badge */}
        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-3 shadow-lg ${current.bgIcon}`}>
          <Icon className="w-6 h-6" />
        </div>

        {/* Title */}
        <h4 className="text-sm font-extrabold text-white mb-1 tracking-wide">
          {title || current.defaultTitle}
        </h4>

        {/* Message Body */}
        <p className="text-xs text-slate-300 font-medium mb-5 leading-relaxed">
          {message}
        </p>

        {/* OK Close Button */}
        <button
          onClick={onClose}
          className={`w-full py-2 rounded-xl text-xs shadow-md transition-all ${current.btnGradient}`}
        >
          {language === 'bn' ? 'ঠিক আছে' : 'Got it'}
        </button>

        {/* Top-Right X Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
