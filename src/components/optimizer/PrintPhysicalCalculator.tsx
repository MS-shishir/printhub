import React, { useState } from 'react';
import { Calculator, Printer, Check, ArrowRight } from 'lucide-react';
import { AppLanguage } from '../../engines/image-optimizer/types';
import { Resizer } from '../../engines/image-optimizer/Resizer';

interface PrintPhysicalCalculatorProps {
  language: AppLanguage;
  onApplyDimensions: (widthPx: number, heightPx: number, dpi: number) => void;
}

export const PrintPhysicalCalculator: React.FC<PrintPhysicalCalculatorProps> = ({
  language,
  onApplyDimensions
}) => {
  const [unit, setUnit] = useState<'mm' | 'cm' | 'inch'>('mm');
  const [widthVal, setWidthVal] = useState<number>(35);
  const [heightVal, setHeightVal] = useState<number>(45);
  const [dpi, setDpi] = useState<number>(300);

  // Compute equivalent pixel dimensions
  const getWidthInMm = (): number => {
    if (unit === 'cm') return widthVal * 10;
    if (unit === 'inch') return widthVal * 25.4;
    return widthVal;
  };

  const getHeightInMm = (): number => {
    if (unit === 'cm') return heightVal * 10;
    if (unit === 'inch') return heightVal * 25.4;
    return heightVal;
  };

  const calculatedPxW = Resizer.mmToPx(getWidthInMm(), dpi);
  const calculatedPxH = Resizer.mmToPx(getHeightInMm(), dpi);

  const applyPreset = (wMm: number, hMm: number, targetDpi: number = 300) => {
    if (unit === 'cm') {
      setWidthVal(wMm / 10);
      setHeightVal(hMm / 10);
    } else if (unit === 'inch') {
      setWidthVal(Math.round((wMm / 25.4) * 100) / 100);
      setHeightVal(Math.round((hMm / 25.4) * 100) / 100);
    } else {
      setWidthVal(wMm);
      setHeightVal(hMm);
    }
    setDpi(targetDpi);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
          <Calculator className="w-3.5 h-3.5 text-indigo-400" />
          <span>{language === 'bn' ? 'প্রিন্ট সাইজ ক্যালকুলেটর' : 'Print Size Calculator'}</span>
        </div>
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px] font-semibold">
          <button
            onClick={() => setUnit('mm')}
            className={`px-2 py-0.5 rounded ${unit === 'mm' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            MM
          </button>
          <button
            onClick={() => setUnit('cm')}
            className={`px-2 py-0.5 rounded ${unit === 'cm' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            CM
          </button>
          <button
            onClick={() => setUnit('inch')}
            className={`px-2 py-0.5 rounded ${unit === 'inch' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            INCH
          </button>
        </div>
      </div>

      {/* Quick Print Studio Presets */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => applyPreset(35, 45, 300)}
          className="text-[10px] px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-indigo-500/40 transition"
        >
          BD Passport (35×45mm)
        </button>
        <button
          onClick={() => applyPreset(20, 25, 300)}
          className="text-[10px] px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-indigo-500/40 transition"
        >
          Stamp (20×25mm)
        </button>
        <button
          onClick={() => applyPreset(102, 152, 300)}
          className="text-[10px] px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-indigo-500/40 transition"
        >
          4R Photo (4×6")
        </button>
        <button
          onClick={() => applyPreset(210, 297, 300)}
          className="text-[10px] px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-indigo-500/40 transition"
        >
          A4 Sheet (210×297mm)
        </button>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] text-slate-400 block mb-0.5">
            {language === 'bn' ? 'প্রস্থ' : 'Width'} ({unit})
          </label>
          <input
            type="number"
            value={widthVal}
            onChange={(e) => setWidthVal(Math.max(1, parseFloat(e.target.value) || 1))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-400 block mb-0.5">
            {language === 'bn' ? 'উচ্চতা' : 'Height'} ({unit})
          </label>
          <input
            type="number"
            value={heightVal}
            onChange={(e) => setHeightVal(Math.max(1, parseFloat(e.target.value) || 1))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-400 block mb-0.5">DPI</label>
          <select
            value={dpi}
            onChange={(e) => setDpi(parseInt(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none cursor-pointer"
          >
            <option value={300}>300 DPI (Print Pro)</option>
            <option value={200}>200 DPI (Fast Print)</option>
            <option value={150}>150 DPI (Draft)</option>
            <option value={96}>96 DPI (Standard)</option>
            <option value={72}>72 DPI (Web)</option>
          </select>
        </div>
      </div>

      {/* Conversion Result & Apply Button */}
      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800/80">
        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
          <span>{widthVal}×{heightVal}{unit}</span>
          <ArrowRight className="w-3 h-3 text-slate-500" />
          <span className="font-bold text-indigo-400">{calculatedPxW}×{calculatedPxH} px</span>
        </div>
        <button
          onClick={() => onApplyDimensions(calculatedPxW, calculatedPxH, dpi)}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition shadow-sm cursor-pointer"
        >
          <Check className="w-3 h-3" />
          <span>{language === 'bn' ? 'প্রয়োগ করুন' : 'Apply'}</span>
        </button>
      </div>
    </div>
  );
};
