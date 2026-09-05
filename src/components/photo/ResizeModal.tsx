/**
 * ResizeModal.tsx
 * Custom image canvas manual pixel resize modal tool.
 * Supports pixel width/height input, aspect ratio locking, target DPI scaling, and standard presets.
 */

import React, { useState, useEffect } from 'react';
import { Maximize2, Lock, Unlock, Check, X, RefreshCw } from 'lucide-react';

interface ResizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWidth: number;
  currentHeight: number;
  onApplyResize: (width: number, height: number, dpi: number) => void;
  language: 'en' | 'bn';
}

export default function ResizeModal({
  isOpen,
  onClose,
  currentWidth,
  currentHeight,
  onApplyResize,
  language,
}: ResizeModalProps) {
  const [width, setWidth] = useState<number>(currentWidth || 1920);
  const [height, setHeight] = useState<number>(currentHeight || 1080);
  const [dpi, setDpi] = useState<number>(300);
  const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(true);
  const [aspectRatio, setAspectRatio] = useState<number>(1);

  useEffect(() => {
    if (isOpen) {
      const w = currentWidth > 0 ? currentWidth : 1920;
      const h = currentHeight > 0 ? currentHeight : 1080;
      setWidth(w);
      setHeight(h);
      if (h > 0) setAspectRatio(w / h);
    }
  }, [isOpen, currentWidth, currentHeight]);

  if (!isOpen) return null;

  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (lockAspectRatio && val > 0 && aspectRatio > 0) {
      setHeight(Math.round(val / aspectRatio));
    }
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (lockAspectRatio && val > 0 && aspectRatio > 0) {
      setWidth(Math.round(val * aspectRatio));
    }
  };

  const handleApplyPreset = (w: number, h: number) => {
    setWidth(w);
    setHeight(h);
    if (h > 0) setAspectRatio(w / h);
  };

  const handleConfirm = () => {
    if (width > 0 && height > 0) {
      onApplyResize(width, height, dpi);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Maximize2 className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {language === 'bn' ? 'ইমেজ সাইজ রিসাইজ (Resize)' : 'Resize Image Canvas'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'bn' ? 'কাস্টম পিক্সেল ডাইমেনশন ও DPI রিসাইজ করুন' : 'Change pixel dimensions & DPI'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Preset Buttons */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              {language === 'bn' ? 'স্ট্যান্ডার্ড প্রিসেট:' : 'Quick Presets:'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleApplyPreset(413, 531)}
                className="px-2 py-1.5 bg-slate-800/70 hover:bg-indigo-600/20 hover:border-indigo-500/40 border border-slate-700/50 rounded-lg text-xs font-semibold transition text-slate-200 text-center"
              >
                BD Passport (413×531)
              </button>
              <button
                onClick={() => handleApplyPreset(1200, 1800)}
                className="px-2 py-1.5 bg-slate-800/70 hover:bg-indigo-600/20 hover:border-indigo-500/40 border border-slate-700/50 rounded-lg text-xs font-semibold transition text-slate-200 text-center"
              >
                4R Photo (1200×1800)
              </button>
              <button
                onClick={() => handleApplyPreset(1920, 1080)}
                className="px-2 py-1.5 bg-slate-800/70 hover:bg-indigo-600/20 hover:border-indigo-500/40 border border-slate-700/50 rounded-lg text-xs font-semibold transition text-slate-200 text-center"
              >
                Full HD (1920×1080)
              </button>
            </div>
          </div>

          {/* Width & Height Input Row */}
          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                {language === 'bn' ? 'প্রস্থ (Width in px):' : 'Width (px):'}
              </label>
              <input
                type="number"
                min="1"
                max="10000"
                value={width}
                onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                {language === 'bn' ? 'উচ্চতা (Height in px):' : 'Height (px):'}
              </label>
              <input
                type="number"
                min="1"
                max="10000"
                value={height}
                onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Controls: Lock Ratio & DPI */}
          <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                const nextLock = !lockAspectRatio;
                setLockAspectRatio(nextLock);
                if (nextLock && height > 0) setAspectRatio(width / height);
              }}
              className={`flex items-center gap-2 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition ${
                lockAspectRatio
                  ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {lockAspectRatio ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>{language === 'bn' ? 'এসপেক্ট রেশিও লক' : 'Lock Aspect Ratio'}</span>
            </button>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-400">DPI:</label>
              <select
                value={dpi}
                onChange={(e) => setDpi(parseInt(e.target.value))}
                className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-slate-200 focus:outline-none"
              >
                <option value={72}>72 DPI (Screen)</option>
                <option value={150}>150 DPI (Medium)</option>
                <option value={300}>300 DPI (Print Pro)</option>
                <option value={600}>600 DPI (Ultra HD)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-800 bg-slate-950/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            {language === 'bn' ? 'বাতিল' : 'Cancel'}
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>{language === 'bn' ? 'প্রয়োগ করুন' : 'Apply Resize'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
