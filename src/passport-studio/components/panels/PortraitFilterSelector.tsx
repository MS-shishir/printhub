import React, { useEffect, useState } from 'react';
import { Sparkles, Check, Loader2, RefreshCw } from 'lucide-react';
import { usePassportStore } from '../../store';
import { fetchPortraitFilterPreviews, retouchPassportPhotoViaFastAPI, FilterPreviewItem } from '../../../services/fastapiBgRemoval';

const PRESET_LIST = [
  { id: 'original', name: 'Original', icon: '🟢', description: 'Untouched photo' },
  { id: 'natural', name: 'Natural', icon: '✨', description: 'Subtle smooth & natural tone' },
  { id: 'soft_skin', name: 'Soft Skin', icon: '🌿', description: 'Skin smooth & shine fix' },
  { id: 'studio', name: 'Studio', icon: '💼', description: 'Shadow removal & contrast' },
  { id: 'bright', name: 'Bright', icon: '☀️', description: 'Exposure & skin tone lift' },
  { id: 'balanced', name: 'Balanced', icon: '🎨', description: 'Color balance & even skin' },
  { id: 'shadow_fix', name: 'Shadow Fix', icon: '🌙', description: 'Remove facial shadows' },
  { id: 'premium', name: 'Premium', icon: '💎', description: 'Full 12-stage retouching' },
];

export default function PortraitFilterSelector() {
  const { state, dispatch } = usePassportStore();
  const [previews, setPreviews] = useState<Record<string, FilterPreviewItem>>({});
  const [isLoadingPreviews, setIsLoadingPreviews] = useState<boolean>(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('original');
  const [applyingPreset, setApplyingPreset] = useState<string | null>(null);

  const baseImage = state.processedImage || state.croppedImage || state.originalImage;

  // Load preview thumbnails whenever base image changes
  useEffect(() => {
    if (!baseImage) return;

    let isMounted = true;
    const loadPreviews = async () => {
      setIsLoadingPreviews(true);
      try {
        const thumbMap = await fetchPortraitFilterPreviews(baseImage);
        if (isMounted) {
          setPreviews(thumbMap);
        }
      } catch (err) {
        console.warn('Failed to load filter previews from backend:', err);
      } finally {
        if (isMounted) setIsLoadingPreviews(false);
      }
    };

    loadPreviews();
    return () => {
      isMounted = false;
    };
  }, [baseImage]);

  const applyFilter = async (presetId: string) => {
    if (!baseImage || applyingPreset) return;
    setSelectedPreset(presetId);
    setApplyingPreset(presetId);

    if (presetId === 'original') {
      dispatch({ type: 'SET_PROCESSED_IMAGE', payload: baseImage });
      setApplyingPreset(null);
      dispatch({
        type: 'ADD_TOAST',
        payload: { id: 'filter_orig', message: 'Restored original photo.', type: 'info', duration: 2000 }
      });
      return;
    }

    dispatch({
      type: 'SET_PROCESSING',
      payload: { isProcessing: true, message: `✨ Applying ${presetId.toUpperCase()} Portrait Filter…` }
    });

    try {
      const retouchedUrl = await retouchPassportPhotoViaFastAPI(baseImage, { preset: presetId });
      dispatch({ type: 'SET_PROCESSED_IMAGE', payload: retouchedUrl });
      dispatch({
        type: 'ADD_TOAST',
        payload: {
          id: `filter_${presetId}`,
          message: `Applied ${presetId.toUpperCase()} filter successfully!`,
          type: 'success',
          duration: 3000
        }
      });
    } catch (err) {
      console.error('Filter application error:', err);
      dispatch({
        type: 'ADD_TOAST',
        payload: { id: 'filter_err', message: 'Backend service offline or filter error.', type: 'error', duration: 3000 }
      });
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: { isProcessing: false } });
      setApplyingPreset(null);
    }
  };

  if (!baseImage) return null;

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Portrait Filters</span>
        </div>
        {isLoadingPreviews && (
          <div className="flex items-center gap-1 text-[10px] text-indigo-400 font-mono">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Loading previews…</span>
          </div>
        )}
      </div>

      {/* Grid of Preview Cards */}
      <div className="grid grid-cols-4 gap-2">
        {PRESET_LIST.map((item) => {
          const isSelected = selectedPreset === item.id;
          const isApplying = applyingPreset === item.id;
          const previewData = previews[item.id];

          return (
            <button
              key={item.id}
              onClick={() => applyFilter(item.id)}
              disabled={isApplying}
              title={item.description}
              className={`relative group flex flex-col items-center p-1.5 rounded-xl border transition-all duration-200 text-left
                ${isSelected
                  ? 'bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-900/30 scale-[1.02]'
                  : 'bg-slate-800/80 border-slate-700/80 hover:border-slate-500 hover:bg-slate-800'
                }`}
            >
              {/* Thumbnail Image Box */}
              <div className="relative w-full aspect-square rounded-lg bg-slate-900 overflow-hidden border border-slate-700/60 flex items-center justify-center">
                {previewData ? (
                  <img
                    src={previewData.data_url}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex items-center justify-center text-lg">{item.icon}</div>
                )}

                {/* Selected Checkmark Badge */}
                {isSelected && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-md">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}

                {/* Loading Spinner */}
                {isApplying && (
                  <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                  </div>
                )}
              </div>

              {/* Title & Icon Label */}
              <div className="mt-1.5 text-center w-full">
                <div className="text-[10px] font-bold text-slate-200 truncate flex items-center justify-center gap-1">
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
