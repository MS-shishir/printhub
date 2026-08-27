/**
 * NidComposerModal.tsx
 * Production Dual-Side Bangladesh NID & Smart Card Joiner / Print Sheet Composer.
 * 
 * Features:
 * 1. Front + Back side document slots with quick upload / canvas import
 * 2. ISO/IEC 7810 ID-1 (85.60 × 53.98 mm) & Old Laminated NID (105 × 75 mm) presets at 300 DPI
 * 3. Side-by-Side and Over-Under sheet layouts on 4R & A4 paper
 * 4. Cut guides, margin control, instant 1-click Print & PDF Export
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  X, Upload, Printer, Download, CreditCard, LayoutGrid, Check, RefreshCw, Scissors, Sparkles
} from 'lucide-react';
import { mmToPx } from '../../passport-studio/utils/mm-to-px';
import { PrintEngine } from '../../engines/PrintEngine';
import { ExportEngine } from '../../engines/ExportEngine';

interface NidComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFrontCanvas?: HTMLCanvasElement | null;
  language: 'en' | 'bn';
}

type CardType = 'smart_nid' | 'old_nid' | 'driving_license';
type SheetLayout = 'side_by_side' | 'over_under';
type PaperType = '4R' | 'A4';

const CARD_SPECS: Record<CardType, { name: string; widthMm: number; heightMm: number }> = {
  smart_nid: { name: 'স্মার্ট এনআইডি (85.6 × 54mm)', widthMm: 85.6, heightMm: 53.98 },
  old_nid: { name: 'পুরাতন লেমিনেটিং এনআইডি (105 × 75mm)', widthMm: 105, heightMm: 75 },
  driving_license: { name: 'ড্রাইভিং লাইসেন্স (85.6 × 54mm)', widthMm: 85.6, heightMm: 53.98 },
};

export default function NidComposerModal({
  isOpen,
  onClose,
  initialFrontCanvas,
  language
}: NidComposerModalProps) {
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [cardType, setCardType] = useState<CardType>('smart_nid');
  const [sheetLayout, setSheetLayout] = useState<SheetLayout>('side_by_side');
  const [paperType, setPaperType] = useState<PaperType>('4R');
  const [showCutlines, setShowCutlines] = useState<boolean>(true);
  const [copies, setCopies] = useState<number>(1);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const frontInputRef = useRef<HTMLInputElement | null>(null);
  const backInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize with active canvas if passed
  useEffect(() => {
    if (initialFrontCanvas && !frontImage) {
      setFrontImage(initialFrontCanvas.toDataURL('image/png'));
    }
  }, [initialFrontCanvas, isOpen]);

  // Handle File Uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const res = evt.target?.result as string;
      if (side === 'front') setFrontImage(res);
      else setBackImage(res);
    };
    reader.readAsDataURL(file);
  };

  // Render Live Dual-Side Print Sheet Canvas (300 DPI)
  const generateSheetCanvas = (): HTMLCanvasElement | null => {
    const spec = CARD_SPECS[cardType];
    const dpi = 300;
    const cardWPx = Math.round(mmToPx(spec.widthMm, dpi));
    const cardHPx = Math.round(mmToPx(spec.heightMm, dpi));

    // Paper Dimensions in mm
    const paperWPx = paperType === '4R' ? Math.round(mmToPx(152, dpi)) : Math.round(mmToPx(210, dpi));
    const paperHPx = paperType === '4R' ? Math.round(mmToPx(102, dpi)) : Math.round(mmToPx(297, dpi));

    const canvas = document.createElement('canvas');
    canvas.width = paperWPx;
    canvas.height = paperHPx;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Fill white paper background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, paperWPx, paperHPx);

    const gapPx = Math.round(mmToPx(6, dpi));
    const marginPx = Math.round(mmToPx(10, dpi));

    const imgFront = new Image();
    const imgBack = new Image();

    const drawCardSlot = (img: HTMLImageElement | null, x: number, y: number, label: string) => {
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, x, y, cardWPx, cardHPx);
      } else {
        // Placeholder Slot
        ctx.fillStyle = '#F1F5F9';
        ctx.fillRect(x, y, cardWPx, cardHPx);
        ctx.fillStyle = '#64748B';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + cardWPx / 2, y + cardHPx / 2);
      }

      // Border outline
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, cardWPx, cardHPx);

      // Optional Cut Guides
      if (showCutlines) {
        ctx.strokeStyle = '#94A3B8';
        ctx.setLineDash([8, 8]);
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - 4, y - 4, cardWPx + 8, cardHPx + 8);
        ctx.setLineDash([]);
      }
    };

    // Calculate layout placements
    let startX = marginPx;
    let startY = marginPx;

    if (sheetLayout === 'side_by_side') {
      drawCardSlot(frontImage ? imgFront : null, startX, startY, 'FRONT SIDE');
      drawCardSlot(backImage ? imgBack : null, startX + cardWPx + gapPx, startY, 'BACK SIDE');
    } else {
      drawCardSlot(frontImage ? imgFront : null, startX, startY, 'FRONT SIDE');
      drawCardSlot(backImage ? imgBack : null, startX, startY + cardHPx + gapPx, 'BACK SIDE');
    }

    return canvas;
  };

  // Update Live Preview Canvas
  useEffect(() => {
    if (!isOpen) return;

    const render = () => {
      const sheet = generateSheetCanvas();
      if (!sheet || !previewCanvasRef.current) return;

      const pCanvas = previewCanvasRef.current;
      pCanvas.width = sheet.width;
      pCanvas.height = sheet.height;
      const pCtx = pCanvas.getContext('2d');
      if (pCtx) {
        pCtx.drawImage(sheet, 0, 0);
      }
    };

    const imgF = new Image();
    const imgB = new Image();
    let loadedCount = 0;
    const totalToLoad = (frontImage ? 1 : 0) + (backImage ? 1 : 0);

    if (totalToLoad === 0) {
      render();
      return;
    }

    const checkDone = () => {
      loadedCount++;
      if (loadedCount >= totalToLoad) render();
    };

    if (frontImage) {
      imgF.onload = checkDone;
      imgF.src = frontImage;
    }
    if (backImage) {
      imgB.onload = checkDone;
      imgB.src = backImage;
    }
  }, [isOpen, frontImage, backImage, cardType, sheetLayout, paperType, showCutlines]);

  const handlePrint = () => {
    const sheet = generateSheetCanvas();
    if (!sheet) return;
    PrintEngine.printCanvas(sheet);
  };

  const handleExportPdf = async () => {
    const sheet = generateSheetCanvas();
    if (!sheet) return;
    await ExportEngine.exportCanvas(sheet, {
      fileName: `NID_PrintSheet_${cardType}`,
      format: 'pdf',
      quality: 1.0,
    });
  };

  const handleExportJpg = async () => {
    const sheet = generateSheetCanvas();
    if (!sheet) return;
    await ExportEngine.exportCanvas(sheet, {
      fileName: `NID_PrintSheet_${cardType}`,
      format: 'jpeg',
      quality: 0.98,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-md">
              <CreditCard className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                <span>{language === 'bn' ? 'এনআইডি ডুয়াল-সাইড প্রিন্ট কম্পোজার' : 'NID Dual-Side Print Composer'}</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono border border-indigo-500/30">
                  300 DPI
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {language === 'bn' ? 'সামনে ও পেছনের অংশ নিখুঁত স্কেলে এক পেপারে সাজিয়ে প্রিন্ট করুন' : 'Align and print front + back sides on 4R or A4 paper with exact physical scale'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Left Controls, Right Live Preview */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Controls Panel */}
          <div className="w-84 border-r border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto bg-slate-950/50">
            {/* 1. Slot Pickers */}
            <div className="flex flex-col gap-2.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {language === 'bn' ? '১. কার্ডের উভয় পাশ সিলেক্ট করুন' : '1. Select Card Sides'}
              </label>

              <div className="grid grid-cols-2 gap-2">
                {/* Front Slot */}
                <div
                  onClick={() => frontInputRef.current?.click()}
                  className={`h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-2 cursor-pointer transition relative overflow-hidden ${
                    frontImage ? 'border-emerald-500/60 bg-emerald-950/20' : 'border-slate-700 hover:border-indigo-500 bg-slate-900/60'
                  }`}
                >
                  <input
                    ref={frontInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'front')}
                  />
                  {frontImage ? (
                    <>
                      <img src={frontImage} alt="Front" className="absolute inset-0 w-full h-full object-contain p-1" />
                      <div className="absolute bottom-1 right-1 bg-emerald-500 text-slate-950 rounded-full p-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-indigo-400 mb-1" />
                      <span className="text-[10px] font-bold text-slate-300">{language === 'bn' ? 'সামনের অংশ (Front)' : 'Front Side'}</span>
                    </>
                  )}
                </div>

                {/* Back Slot */}
                <div
                  onClick={() => backInputRef.current?.click()}
                  className={`h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-2 cursor-pointer transition relative overflow-hidden ${
                    backImage ? 'border-emerald-500/60 bg-emerald-950/20' : 'border-slate-700 hover:border-indigo-500 bg-slate-900/60'
                  }`}
                >
                  <input
                    ref={backInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'back')}
                  />
                  {backImage ? (
                    <>
                      <img src={backImage} alt="Back" className="absolute inset-0 w-full h-full object-contain p-1" />
                      <div className="absolute bottom-1 right-1 bg-emerald-500 text-slate-950 rounded-full p-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-indigo-400 mb-1" />
                      <span className="text-[10px] font-bold text-slate-300">{language === 'bn' ? 'পেছনের অংশ (Back)' : 'Back Side'}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Card Specification Preset */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {language === 'bn' ? '২. ডকুমেন্টের ধরন' : '2. Document Type'}
              </label>
              <select
                value={cardType}
                onChange={(e) => setCardType(e.target.value as CardType)}
                className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg p-2 font-bold focus:outline-none focus:border-indigo-500"
              >
                <option value="smart_nid">{CARD_SPECS.smart_nid.name}</option>
                <option value="old_nid">{CARD_SPECS.old_nid.name}</option>
                <option value="driving_license">{CARD_SPECS.driving_license.name}</option>
              </select>
            </div>

            {/* 3. Paper & Sheet Alignment */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {language === 'bn' ? '৩. পেপার ও লেআউট' : '3. Paper & Layout'}
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPaperType('4R')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition ${
                    paperType === '4R'
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  4R (4" × 6")
                </button>
                <button
                  onClick={() => setPaperType('A4')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition ${
                    paperType === 'A4'
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  A4 Paper
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSheetLayout('side_by_side')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition ${
                    sheetLayout === 'side_by_side'
                      ? 'bg-indigo-600/80 text-white border-indigo-400'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {language === 'bn' ? 'পাশাপাশি' : 'Side-by-Side'}
                </button>
                <button
                  onClick={() => setSheetLayout('over_under')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition ${
                    sheetLayout === 'over_under'
                      ? 'bg-indigo-600/80 text-white border-indigo-400'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {language === 'bn' ? 'উপরে-নিচে' : 'Over-Under'}
                </button>
              </div>

              <label className="flex items-center gap-2 mt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCutlines}
                  onChange={(e) => setShowCutlines(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span className="text-xs text-slate-300 flex items-center gap-1">
                  <Scissors className="w-3 h-3 text-amber-400" />
                  {language === 'bn' ? 'কাটার দাগ (Cut Guides) দেখান' : 'Show Cut Guides'}
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-slate-800">
              <button
                onClick={handlePrint}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{language === 'bn' ? 'সরাসরি প্রিন্ট দিন (Ctrl+P)' : 'Print Sheet Directly'}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleExportPdf}
                  className="py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-xs rounded-xl border border-indigo-500/30 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF Export</span>
                </button>
                <button
                  onClick={handleExportJpg}
                  className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>JPG Export</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Live Sheet Preview */}
          <div className="flex-1 bg-slate-950 p-6 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="max-w-full max-h-full p-2 bg-white rounded-lg shadow-2xl flex items-center justify-center border border-slate-300">
              <canvas
                ref={previewCanvasRef}
                className="max-w-[560px] max-h-[60vh] object-contain shadow-sm"
              />
            </div>

            <div className="mt-3 text-[11px] font-mono text-slate-400 flex items-center gap-3">
              <span>Paper: {paperType}</span>
              <span>•</span>
              <span>Card: {CARD_SPECS[cardType].widthMm} × {CARD_SPECS[cardType].heightMm} mm</span>
              <span>•</span>
              <span>Print Scale: 100% (1:1 Exact Physical Size)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
