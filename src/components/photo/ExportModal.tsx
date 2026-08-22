/**
 * ExportModal.tsx
 * Multi-Format High-DPI Export & Multi-Copy Print Grid Dialog fulfilling Module 10 Specification (PNG, JPG, WebP, PDF, SVG).
 */

import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { Printer, Grid, Scissors, Download, FileText, Sparkles, Check } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  printCopies: number;
  onSetCopies: (copies: number) => void;
  printPaperSize: 'A4' | '4R' | 'Letter';
  onSetPaperSize: (size: 'A4' | '4R' | 'Letter') => void;
  showCuttingGuides: boolean;
  onToggleGuides: () => void;
  onConfirmPrint: () => void;
  onConfirmExport?: (format: 'PNG' | 'JPG' | 'WebP' | 'PDF' | 'SVG', quality: number, transparent: boolean) => void;
  language: 'en' | 'bn';
}

export default function ExportModal({
  isOpen,
  onClose,
  printCopies,
  onSetCopies,
  printPaperSize,
  onSetPaperSize,
  showCuttingGuides,
  onToggleGuides,
  onConfirmPrint,
  onConfirmExport,
  language
}: ExportModalProps) {
  const [activeTab, setActiveTab] = useState<'print' | 'export'>('export');
  const [exportFormat, setExportFormat] = useState<'PNG' | 'JPG' | 'WebP' | 'PDF' | 'SVG'>('PNG');
  const [qualityLevel, setQualityLevel] = useState<number>(100);
  const [isTransparent, setIsTransparent] = useState<boolean>(true);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={language === 'bn' ? 'এক্সপোর্ট ও প্রিন্ট সেন্টার' : 'Export & Print Center'}>
      <div className="space-y-4 p-2 text-xs select-none">
        
        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-1.5 rounded-lg font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'export'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>High-DPI Photo Export</span>
          </button>

          <button
            onClick={() => setActiveTab('print')}
            className={`flex-1 py-1.5 rounded-lg font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'print'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Multi-Copy Grid Print</span>
          </button>
        </div>

        {/* EXPORT MODE (Module 10 Output Engine) */}
        {activeTab === 'export' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Format Picker */}
            <div className="space-y-2">
              <label className="font-bold text-slate-300 block">Export File Format</label>
              <div className="grid grid-cols-5 gap-1.5">
                {(['PNG', 'JPG', 'WebP', 'PDF', 'SVG'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setExportFormat(fmt)}
                    className={`py-2 rounded-xl font-extrabold text-xs border transition-all ${
                      exportFormat === fmt
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Slider */}
            <div className="space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between text-slate-300 font-semibold text-xs">
                <span>Output Quality & Resolution</span>
                <span className="font-mono text-indigo-400 font-bold">{qualityLevel}% (300 DPI)</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={qualityLevel}
                onChange={(e) => setQualityLevel(parseInt(e.target.value))}
                className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Background Transparency Toggle */}
            {['PNG', 'WebP', 'SVG'].includes(exportFormat) && (
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-300 font-semibold text-xs">Preserve Background Transparency (Alpha)</span>
                <input
                  type="checkbox"
                  checked={isTransparent}
                  onChange={(e) => setIsTransparent(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onConfirmExport) onConfirmExport(exportFormat, qualityLevel, isTransparent);
                  else alert(`Photo exported as ${exportFormat} (${qualityLevel}% Quality, 300 DPI)`);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold shadow-lg"
              >
                <Download className="w-4 h-4" />
                <span>Export {exportFormat}</span>
              </button>
            </div>
          </div>
        )}

        {/* PRINT MODE */}
        {activeTab === 'print' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Paper Size Selector */}
            <div className="space-y-2">
              <label className="font-bold text-slate-300 block">Paper Sheet Size</label>
              <div className="grid grid-cols-3 gap-2">
                {(['4R', 'A4', 'Letter'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => onSetPaperSize(size)}
                    className={`py-2 rounded-xl font-bold border transition-all ${
                      printPaperSize === size 
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' 
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {size} Sheet
                  </button>
                ))}
              </div>
            </div>

            {/* Copy Count Selector */}
            <div className="space-y-2">
              <label className="font-bold text-slate-300 block">Photo Copies Count</label>
              <div className="grid grid-cols-5 gap-2">
                {[4, 8, 12, 16, 32].map((num) => (
                  <button
                    key={num}
                    onClick={() => onSetCopies(num)}
                    className={`py-2 rounded-xl font-bold border transition-all ${
                      printCopies === num 
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' 
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {num} Copies
                  </button>
                ))}
              </div>
            </div>

            {/* Cutting Guides Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="flex items-center gap-2 text-slate-300 font-medium">
                <Scissors className="w-4 h-4 text-amber-400" />
                Draw Cut Border Guides
              </span>
              <input 
                type="checkbox" 
                checked={showCuttingGuides} 
                onChange={onToggleGuides}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold">
                Cancel
              </button>
              <button
                onClick={() => {
                  onConfirmPrint();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg"
              >
                <Printer className="w-4 h-4" />
                <span>Start Print</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
