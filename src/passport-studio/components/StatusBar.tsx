import React from 'react';
import { usePassportStore } from '../store';
import { getTemplate } from '../services/template.service';
import { PRINT_DPI } from '../utils/mm-to-px';

export default function StatusBar() {
  const { state } = usePassportStore();
  const template = getTemplate(state.selectedTemplateId, state.customWidth, state.customHeight);

  const widthPx = Math.round((template.widthMm / 25.4) * PRINT_DPI);
  const heightPx = Math.round((template.heightMm / 25.4) * PRINT_DPI);
  const zoomPct = Math.round((state.transform?.zoom ?? 1) * 100);

  const items = [
    { label: 'Template', value: template.name },
    { label: 'Size', value: `${template.widthMm}×${template.heightMm}mm` },
    { label: 'Print Size', value: `${widthPx}×${heightPx}px` },
    { label: 'DPI', value: `${template.dpi}` },
    { label: 'Zoom', value: `${zoomPct}%` },
    { label: 'BG', value: state.bgConfig.color.toUpperCase() },
    state.originalImage ? { label: 'Photo', value: state.photoName || 'Loaded' } : null,
    state.faceDetection
      ? {
          label: 'Face',
          value: state.faceDetection.confidence > 0
            ? `✓ ${Math.round(state.faceDetection.confidence * 100)}%`
            : '⊙ Centered',
        }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="flex items-center gap-0 h-6 bg-slate-900 border-t border-slate-800 overflow-x-auto overflow-y-hidden shrink-0">
      {items.map(({ label, value }, i) => (
        <div
          key={label}
          className={`flex items-center gap-1.5 px-3 h-full text-[10px] shrink-0
            ${i < items.length - 1 ? 'border-r border-slate-800' : ''}
            ${i === 0 ? 'bg-indigo-900/30' : ''}`}
        >
          <span className="text-slate-500 font-semibold">{label}:</span>
          <span className="text-slate-300 font-mono">{value}</span>
        </div>
      ))}

      <div className="flex-1" />

      {/* Processing indicator */}
      {state.isProcessing && (
        <div className="flex items-center gap-1.5 px-3 h-full border-l border-slate-800">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-[10px] text-indigo-300">{state.processingMessage}</span>
        </div>
      )}

      {/* Offline badge */}
      <div className="flex items-center gap-1 px-3 h-full border-l border-slate-800 bg-emerald-900/20">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span className="text-[10px] text-emerald-400 font-semibold">OFFLINE</span>
      </div>
    </div>
  );
}
