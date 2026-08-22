/**
 * ConfirmDeleteModal.tsx
 * Premium Studio Dark Glassmorphic Delete Warning Confirmation Modal.
 * Replaces browser default confirm() popups with high-contrast warning UI.
 */

import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  language: 'en' | 'bn';
}

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  language
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  const defaultTitle = language === 'bn' ? 'ছবিটি পারমানেন্টলি ডিলিট করতে চান?' : 'Permanently Delete Photo Asset?';
  const defaultMessage = language === 'bn' 
    ? 'এই অ্যাকশনটি বাতিল করা যাবে না। ক্যানভাস এবং প্রজেক্ট মেমোরি থেকে ছবিটি চিরতরে মুছে যাবে।' 
    : 'This action cannot be undone. The photo asset and all associated canvas layers will be permanently removed.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden p-6 text-slate-100 flex flex-col items-center text-center">
        
        {/* Glowing Red Warning Icon Header */}
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center mb-4 shadow-lg shadow-rose-950/50">
          <AlertTriangle className="w-8 h-8" />
        </div>

        {/* Title & Warning Body */}
        <h3 className="text-lg font-extrabold text-slate-100 mb-2">
          {title || defaultTitle}
        </h3>

        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          {message || defaultMessage}
        </p>

        {/* Action Buttons Bar */}
        <div className="grid grid-cols-2 gap-3 w-full">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors shadow-sm"
          >
            {language === 'bn' ? 'বাতিল' : 'Cancel'}
          </button>

          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs transition-transform hover:scale-105 shadow-lg shadow-rose-900/40 flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>{language === 'bn' ? 'পারমানেন্ট ডিলিট' : 'Delete Permanently'}</span>
          </button>
        </div>

        {/* Top-Right X Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
