import React, { useState } from 'react';
import { LayoutGrid, Plus, GripVertical, RotateCw, Trash2, Layers, Info, ImagePlus } from 'lucide-react';
import { usePassportStore } from '../../store';
import { COPY_COUNTS, getTemplate } from '../../services/template.service';
import { maxCopiesThatFit } from '../../services/layout.service';

export default function LayoutPanel() {
  const { state, dispatch } = usePassportStore();
  const { layoutConfig, processedTray } = state;
  const template = getTemplate(state.selectedTemplateId, state.customWidth, state.customHeight);
  const maxFit = maxCopiesThatFit(template, layoutConfig);

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const activePhoto = state.croppedImage || state.processedImage || state.originalImage;

  const handleSaveCurrentToTray = () => {
    if (!activePhoto) {
      dispatch({
        type: 'ADD_TOAST',
        payload: {
          id: 'tray_no_img',
          message: '⚠️ প্রথমে একটি ছবি আপলোড ও ক্রপ করুন!',
          type: 'warning',
          duration: 3000,
        },
      });
      return;
    }

    const wMm = state.selectedTemplateId === 'custom' ? state.customWidth : template.widthMm;
    const hMm = state.selectedTemplateId === 'custom' ? state.customHeight : template.heightMm;

    dispatch({
      type: 'ADD_TO_PROCESSED_TRAY',
      payload: {
        name: state.photoName || `Photo #${processedTray.length + 1}`,
        croppedUrl: activePhoto,
        templateId: state.selectedTemplateId,
        widthMm: wMm,
        heightMm: hMm,
        defaultCopies: layoutConfig.copies || 4,
      },
    });

    dispatch({
      type: 'ADD_TOAST',
      payload: {
        id: 'tray_add_' + Date.now(),
        message: `💾 বর্তমান ছবিটি (${wMm}×${hMm}mm) লেআউট ট্রেইতে সেভ হয়েছে!`,
        type: 'success',
        duration: 3000,
      },
    });
  };

  const handleProcessAnotherPhoto = () => {
    dispatch({ type: 'SET_ACTIVE_PANEL', payload: 'upload' });
    dispatch({
      type: 'ADD_TOAST',
      payload: {
        id: 'upload_next',
        message: '📷 নতুন ছবি আপলোড করুন। আগের ছবিটি ট্রেইতে সংরক্ষিত আছে।',
        type: 'info',
        duration: 3500,
      },
    });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    const itemToMove = processedTray[draggedIdx];
    const direction = targetIdx < draggedIdx ? 'up' : 'down';
    dispatch({ type: 'MOVE_TRAY_ITEM', payload: { id: itemToMove.id, direction } });
    setDraggedIdx(null);
  };

  return (
    <div className="p-4 space-y-3.5 select-none text-slate-100 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Batch Print Tray</h3>
            <p className="text-[10px] text-slate-500">Manage & reorder photos to print</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-indigo-400 font-mono font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            {processedTray.length} Photos
          </span>
          {processedTray.length > 0 && (
            <button
              onClick={() => dispatch({ type: 'CLEAR_PROCESSED_TRAY' })}
              className="text-[9px] font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-500/20 transition"
              title="Clear tray"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 shrink-0">
        {activePhoto && (
          <button
            onClick={handleSaveCurrentToTray}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-900/30"
          >
            <Plus className="w-4 h-4" />
            <span>Save Current Photo to Tray</span>
          </button>
        )}

        <button
          onClick={handleProcessAnotherPhoto}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-indigo-500/60 hover:bg-slate-800 text-slate-200 text-xs font-bold transition-all"
        >
          <ImagePlus className="w-4 h-4 text-emerald-400" />
          <span>+ Process Another Photo</span>
        </button>
      </div>

      {/* Processed Photos List / Empty State */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {processedTray.length === 0 ? (
          <div className="bg-slate-950/60 p-4 rounded-xl border border-dashed border-slate-800 text-center space-y-2 my-auto">
            <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-300">ট্রেইতে কোনো ছবি সেভ নেই</p>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              আপনি <strong>"Save Current Photo to Tray"</strong> চাপলে বর্তমান ছবিটি ট্রেইতে সেভ হবে। এরপর <strong>"+ Process Another Photo"</strong> চেপে একাধিক পাসপোর্ট ও স্ট্যাম্প ছবি ১টি পেজে একসাথে প্রিন্ট করতে পারবেন।
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>SAVED PHOTOS TRAY ({processedTray.length})</span>
              <span className="text-slate-500 font-normal">Drag handles to reorder</span>
            </div>

            {processedTray.map((item, idx) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, idx)}
                className={`bg-slate-950/90 border rounded-xl p-2.5 space-y-2.5 transition-all cursor-grab active:cursor-grabbing ${
                  draggedIdx === idx
                    ? 'border-indigo-500 bg-indigo-950/40 shadow-lg scale-[0.98]'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <GripVertical className="w-4 h-4 text-slate-600 shrink-0" />
                    <img
                      src={item.croppedUrl}
                      alt={item.name}
                      className={`w-9 h-11 object-cover rounded bg-slate-900 border border-slate-700 shrink-0 transition-transform ${
                        item.rotateDegrees === 90
                          ? 'rotate-90'
                          : item.rotateDegrees === 180
                          ? 'rotate-180'
                          : item.rotateDegrees === 270
                          ? '-rotate-90'
                          : ''
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-200 truncate">{item.name}</div>
                      <div className="text-[10px] text-indigo-400 font-mono font-semibold flex items-center gap-1.5 mt-0.5">
                        <span>
                          {item.rotateDegrees === 90 || item.rotateDegrees === 270
                            ? `${item.heightMm}×${item.widthMm}mm (90°)`
                            : `${item.widthMm}×${item.heightMm}mm`}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-400">{item.copies} কপি</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Per-photo Rotate Toggle */}
                    <button
                      onClick={() => dispatch({ type: 'TOGGLE_TRAY_ITEM_ROTATION', payload: item.id })}
                      className={`p-1.5 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
                        item.rotateDegrees === 90
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                      }`}
                      title="Rotate photo 90°"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>{item.rotateDegrees === 90 ? '90°' : '0°'}</span>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => dispatch({ type: 'REMOVE_FROM_TRAY', payload: item.id })}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition"
                      title="Remove from tray"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Per-photo Copy Count Selector */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px]">
                  <span className="text-slate-400 font-semibold">কপি সংখ্যা:</span>
                  <div className="flex gap-1">
                    {[1, 2, 4, 6, 8, 12].map((n) => (
                      <button
                        key={n}
                        onClick={() => dispatch({ type: 'UPDATE_TRAY_ITEM_COPIES', payload: { id: item.id, copies: n } })}
                        className={`w-6 h-6 rounded-md text-[10px] font-bold transition flex items-center justify-center ${
                          item.copies === n
                            ? 'bg-indigo-600 text-white shadow'
                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Copy Count Selector for saving photo to tray */}
      {processedTray.length === 0 && activePhoto && (
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2 shrink-0">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
            <span>ট্রে'তে যোগ করার কপি সংখ্যা</span>
            <span className="text-indigo-400 font-mono">max {maxFit} fit</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {COPY_COUNTS.map((n) => {
              const fits = n <= maxFit;
              return (
                <button
                  key={n}
                  onClick={() => fits && dispatch({ type: 'SET_LAYOUT', payload: { copies: n as any } })}
                  disabled={!fits}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    layoutConfig.copies === n
                      ? 'bg-indigo-600 text-white shadow'
                      : fits
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-900 text-slate-700 cursor-not-allowed'
                  }`}
                >
                  {n} কপি
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Info footer */}
      <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-2.5 flex items-start gap-2 text-[10px] text-indigo-300 shrink-0">
        <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
        <p>ডানপাশের Side Panel থেকে পেপার সাইজ এবং স্পেসিং এডজাস্ট করুন।</p>
      </div>
    </div>
  );
}
