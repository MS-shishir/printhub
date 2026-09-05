import React, { useRef, useCallback, useState } from 'react';
import { Upload, Camera, Clipboard, Image as ImageIcon, Zap, Users, Stamp, Sliders } from 'lucide-react';
import { usePassportStore } from '../../store';
import { usePassportWorkflow } from '../../hooks/usePassportWorkflow';
import JointPhotoComposerModal from '../modals/JointPhotoComposerModal';

export default function UploadPanel() {
  const { state, dispatch } = usePassportStore();
  const { loadImageFile, loadImageFromDataUrl } = usePassportWorkflow();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const [isJointModalOpen, setIsJointModalOpen] = useState<boolean>(false);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await loadImageFile(file);
    e.target.value = '';
  }, [loadImageFile]);

  const handleConfirmJointPhoto = useCallback(async (dataUrl: string, name: string) => {
    await loadImageFromDataUrl(dataUrl, name);
    dispatch({ type: 'SET_TEMPLATE', payload: { templateId: 'bd_joint_pp' } });
    dispatch({ type: 'SET_ACTIVE_PANEL', payload: 'crop' });
    dispatch({
      type: 'ADD_TOAST',
      payload: {
        id: 'joint_applied',
        message: '👫 ২ জনের কাস্টম যৌথ ছবি সফলভাবে তৈরি হয়ে পাসপোর্ট স্টুডিওতে লোড হয়েছে! ক্রপিং অপশনগুলো চেক করুন।',
        type: 'success',
        duration: 4000,
      },
    });
  }, [loadImageFromDataUrl, dispatch]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    dropRef.current?.classList.remove('ring-2', 'ring-indigo-500');
    const file = e.dataTransfer.files?.[0];
    if (file) await loadImageFile(file);
  }, [loadImageFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dropRef.current?.classList.add('ring-2', 'ring-indigo-500');
  }, []);

  const handleDragLeave = useCallback(() => {
    dropRef.current?.classList.remove('ring-2', 'ring-indigo-500');
  }, []);

  const handlePasteClick = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imgType = item.types.find((t) => t.startsWith('image/'));
        if (imgType) {
          const blob = await item.getType(imgType);
          const url = URL.createObjectURL(blob);
          await loadImageFromDataUrl(url, 'clipboard_image.png');
          return;
        }
      }
    } catch {
      dispatch({ type: 'ADD_TOAST', payload: { id: 'clip_err', message: 'Press Ctrl+V to paste an image', type: 'info', duration: 3000 } });
    }
  }, [loadImageFromDataUrl, dispatch]);

  return (
    <div className="p-4 space-y-4">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Upload Photo</div>

      {/* Drop Zone */}
      <div
        ref={dropRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className="relative border-2 border-dashed border-slate-600 rounded-xl p-5 text-center cursor-pointer transition-all hover:border-indigo-400 hover:bg-indigo-500/5 group"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/bmp"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
            <Upload className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-300">Drop photo here</p>
            <p className="text-[11px] text-slate-500 mt-0.5">or click to browse single photo</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
        >
          <Camera className="w-3.5 h-3.5" />
          Browse
        </button>
        <button
          onClick={handlePasteClick}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold transition-colors"
        >
          <Clipboard className="w-3.5 h-3.5" />
          Paste
        </button>
      </div>

      {/* Current Image Info */}
      {state.originalImage && (
        <div className="bg-slate-800/60 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-300 truncate">{state.photoName}</span>
          </div>
          {state.imageNaturalWidth > 0 && (
            <div className="text-[10px] text-slate-500">
              {state.imageNaturalWidth} × {state.imageNaturalHeight}px
            </div>
          )}
          {state.faceDetection && (
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] text-amber-300 font-semibold">
                {state.faceDetection.confidence > 0
                  ? `Face detected (${Math.round(state.faceDetection.confidence * 100)}%)`
                  : 'Smart crop applied'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Next Step */}
      {state.originalImage && (
        <button
          onClick={() => dispatch({ type: 'SET_ACTIVE_PANEL', payload: 'crop' })}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-lg shadow-indigo-900/30 transition-all mt-2"
        >
          <span>Next: Crop & Adjust →</span>
        </button>
      )}

      {/* Interactive Joint Photo Studio Modal */}
      <JointPhotoComposerModal
        isOpen={isJointModalOpen}
        onClose={() => setIsJointModalOpen(false)}
        onConfirmJointPhoto={handleConfirmJointPhoto}
      />
    </div>
  );
}
