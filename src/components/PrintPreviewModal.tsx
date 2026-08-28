import React, { useState, useEffect } from 'react';
import { Printer, X, FileText, CheckCircle2, Sliders, DollarSign, Sparkles } from 'lucide-react';
import { sharedPrintCanvasRef } from '../passport-studio/utils/shared-canvas-ref';
import { sharedLayoutState } from '../passport-studio/utils/shared-layout-state';
import { printViaIframe } from '../passport-studio/services/export.service';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  onConfirmPrint: (details: { paperSize: string; colorMode: string; copies: number; totalPrice: number }) => void;
}

export default function PrintPreviewModal({
  isOpen,
  onClose,
  title = 'Studio_Photo_Sheet.pdf',
  onConfirmPrint
}: PrintPreviewModalProps) {
  const [paperSize, setPaperSize] = useState<string>('A4');
  const [colorMode, setColorMode] = useState<string>('Color');
  const [copies, setCopies] = useState<number>(1);
  const [scaling, setScaling] = useState<string>('Fit');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  // Capture live canvas preview on open or settings change
  useEffect(() => {
    if (!isOpen) return;
    const captureLivePreview = () => {
      const canvas = sharedPrintCanvasRef.current || document.querySelector('canvas');
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        try {
          setPreviewDataUrl(canvas.toDataURL('image/png', 0.95));
        } catch {
          setPreviewDataUrl(null);
        }
      }
    };
    captureLivePreview();
    const timer = setTimeout(captureLivePreview, 100);
    return () => clearTimeout(timer);
  }, [isOpen, paperSize, colorMode]);

  if (!isOpen) return null;

  // Rate calculation
  const getUnitPrice = () => {
    if (paperSize === 'A4' && colorMode === 'Monochrome') return 3;
    if (paperSize === 'A4' && colorMode === 'Color') return 10;
    if (paperSize === '4R') return 30;
    if (paperSize === 'Legal') return 5;
    if (paperSize === 'Stamp') return 300;
    return 10;
  };

  const totalPrice = getUnitPrice() * copies;

  const handleDirectPrint = () => {
    onConfirmPrint({ paperSize, colorMode, copies, totalPrice });
    onClose();

    const pw = paperSize === '4R' ? '102mm' : paperSize === 'Legal' ? '216mm' : '210mm';
    const ph = paperSize === '4R' ? '152mm' : paperSize === 'Legal' ? '356mm' : '297mm';
    const isGrayscale = colorMode === 'Monochrome';

    // If we have live canvas preview image, render it directly at 100% full paper dimensions
    const canvas = sharedPrintCanvasRef.current || document.querySelector('canvas');
    const dataUrl = canvas ? canvas.toDataURL('image/png', 1.0) : previewDataUrl;

    if (dataUrl) {
      const printHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>PrintHub Studio — ${title}</title>
          <style>
            @page {
              size: ${pw} ${ph};
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            html, body {
              width: ${pw};
              height: ${ph};
              margin: 0;
              padding: 0;
              background: #ffffff;
              overflow: hidden;
            }
            .print-sheet {
              width: ${pw};
              height: ${ph};
              display: flex;
              align-items: center;
              justify-content: center;
              background: #ffffff;
            }
            img {
              width: 100%;
              height: 100%;
              object-fit: contain;
              display: block;
              ${isGrayscale ? 'filter: grayscale(100%) contrast(110%);' : ''}
            }
          </style>
        </head>
        <body>
          <div class="print-sheet">
            <img src="${dataUrl}" />
          </div>
        </body>
        </html>
      `;

      printViaIframe(printHtml);
    } else {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                প্রিন্ট প্রিভিউ ও সরাসরি প্রিন্ট
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">ফাইল: <span className="font-mono text-indigo-300">{title}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3">
          
          {/* Left Controls Panel */}
          <div className="p-6 border-r border-slate-800 space-y-5 overflow-y-auto bg-slate-950/40">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                কাগজের সাইজ (Paper Size)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['A4', '4R Photo', 'Legal', 'Stamp Paper'].map((sz) => {
                  const rawVal = sz.split(' ')[0];
                  return (
                    <button
                      key={sz}
                      onClick={() => setPaperSize(rawVal)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                        paperSize === rawVal
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                কালার মোড (Color Mode)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setColorMode('Color')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                    colorMode === 'Color'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  🌈 কালার প্রিন্ট
                </button>
                <button
                  onClick={() => setColorMode('Monochrome')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                    colorMode === 'Monochrome'
                      ? 'bg-slate-700 text-white border-slate-600 shadow-md'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  ⬛ সাদা-কালো (B&W)
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                কপির সংখ্যা (Copies)
              </label>
              <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-2 rounded-xl">
                <button
                  onClick={() => setCopies(Math.max(1, copies - 1))}
                  className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-lg flex items-center justify-center transition-colors cursor-pointer"
                >
                  -
                </button>
                <span className="flex-1 text-center font-mono text-xl font-bold text-amber-300">
                  {copies}
                </span>
                <button
                  onClick={() => setCopies(copies + 1)}
                  className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-lg flex items-center justify-center transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Price Billing Summary Box */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/80 to-slate-900 border border-indigo-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>একক দর ({paperSize}):</span>
                <span className="font-mono text-slate-200">৳ {getUnitPrice()}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>মোট কপি:</span>
                <span className="font-mono text-slate-200">{copies}</span>
              </div>
              <div className="pt-2 border-t border-indigo-500/20 flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300">মোট বিল (Bill Amount):</span>
                <span className="text-xl font-bold font-mono text-emerald-400">৳ {totalPrice}</span>
              </div>
            </div>
          </div>

          {/* Right Live Paper Preview Area (Actual WYSIWYG Sheet) */}
          <div className="md:col-span-2 p-6 bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
            
            <div className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>লাইভ শিট প্রিভিউ ({paperSize} Size - {colorMode === 'Color' ? 'Color' : 'Black & White'})</span>
            </div>

            {/* Virtual Paper Sheet with Live Rendered Canvas */}
            <div className="relative bg-white rounded shadow-2xl p-2 flex items-center justify-center border border-slate-300 w-[270px] h-[370px] transition-transform hover:scale-[1.02] duration-300 overflow-hidden">
              {previewDataUrl ? (
                <img
                  src={previewDataUrl}
                  alt="Live Paper Preview"
                  className={`w-full h-full object-contain transition-all ${
                    colorMode === 'Monochrome' ? 'grayscale contrast-110' : ''
                  }`}
                />
              ) : (
                <div className="flex-1 w-full h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-300 rounded text-slate-800">
                  <Printer className="w-10 h-10 text-slate-400 mb-2 animate-pulse" />
                  <p className="text-xs font-bold">{title}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Ready for high DPI direct print</p>
                </div>
              )}
            </div>

            <p className="text-[10px] text-slate-500 mt-2 font-mono">
              300 DPI Ultra High-Resolution · Direct Printer Ready
            </p>

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            বাতিল করুন
          </button>

          <button
            onClick={handleDirectPrint}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all transform active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>সরাসরি প্রিন্ট পাঠান (৳ {totalPrice})</span>
          </button>
        </div>

      </div>
    </div>
  );
}
