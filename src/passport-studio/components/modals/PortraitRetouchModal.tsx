import React, { useEffect, useState, useRef } from 'react';
import { X, Sparkles, Check, Loader2, Eye, Sliders, ShieldCheck, ZoomIn, ZoomOut, Maximize2, Target, ArrowRight } from 'lucide-react';
import { usePassportStore } from '../../store';
import {
  fetchPortraitFilterPreviews,
  fetchPipelineStepThumbnails,
  retouchPassportPhotoViaFastAPI,
  checkFastAPIBackendHealth,
  FilterPreviewItem,
  PipelineStepItem
} from '../../../services/fastapiBgRemoval';
import { fillBackground } from '../../services/image-processing.service';

interface PortraitRetouchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_LIST = [
  { id: 'original', name: 'Original', icon: '🟢', description: 'Untouched photo' },
  { id: 'natural', name: 'Natural HD', icon: '✨', description: 'Subtle smooth & clear unblur' },
  { id: 'soft_skin', name: 'Soft Skin', icon: '🌿', description: 'Skin smooth & shine fix' },
  { id: 'studio', name: 'Studio Pro', icon: '💼', description: 'Shadow removal & studio CLAHE' },
  { id: 'bright', name: 'Bright HD', icon: '☀️', description: 'Exposure & skin tone lift' },
  { id: 'balanced', name: 'Balanced', icon: '🎨', description: 'Color balance & even skin' },
  { id: 'shadow_fix', name: 'Shadow Fix', icon: '🌙', description: 'Deep facial shadow removal' },
  { id: 'premium', name: 'Premium HD', icon: '💎', description: 'Full 12-stage Face Unblur' },
];

export default function PortraitRetouchModal({ isOpen, onClose }: PortraitRetouchModalProps) {
  const { state, dispatch } = usePassportStore();
  const [previews, setPreviews] = useState<Record<string, FilterPreviewItem>>({});
  const [pipelineSteps, setPipelineSteps] = useState<Record<string, PipelineStepItem>>({});
  const [isLoadingPreviews, setIsLoadingPreviews] = useState<boolean>(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('natural');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isProcessingFilter, setIsProcessingFilter] = useState<boolean>(false);
  const [isFastApiOnline, setIsFastApiOnline] = useState<boolean>(false);

  // Zoom & Pan State
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Use processedImage/croppedImage as base for retouching
  const baseImage = state.processedImage || state.croppedImage || state.originalImage;
  const currentBgColor = state.bgConfig.color || '#ffffff';
  const [beforeDisplayImage, setBeforeDisplayImage] = useState<string | null>(null);

  // Load preview thumbnails & pipeline step thumbnails when modal opens
  useEffect(() => {
    if (!isOpen || !baseImage) return;

    let isMounted = true;
    const initModal = async () => {
      setIsLoadingPreviews(true);

      checkFastAPIBackendHealth().then((online) => {
        if (isMounted) setIsFastApiOnline(online);
      });

      // Composite BEFORE image with active background color so BEFORE & AFTER comparison is 100% consistent
      try {
        const compositedBefore = await fillBackground(baseImage, currentBgColor);
        if (isMounted) setBeforeDisplayImage(compositedBefore);
      } catch {
        if (isMounted) setBeforeDisplayImage(baseImage);
      }

      try {
        const [thumbMap, stepsMap] = await Promise.all([
          fetchPortraitFilterPreviews(baseImage),
          fetchPipelineStepThumbnails(baseImage)
        ]);
        if (isMounted) {
          setPreviews(thumbMap);
          setPipelineSteps(stepsMap);
        }
      } catch (err) {
        console.warn('Failed to load filter previews or pipeline steps:', err);
      } finally {
        if (isMounted) setIsLoadingPreviews(false);
      }

      // Load initial preview image for 'natural' preset
      try {
        setIsProcessingFilter(true);
        const rawUrl = await retouchPassportPhotoViaFastAPI(baseImage, { preset: 'natural' });
        // Composite with current background color so AFTER preview shows correct BG
        const compositedUrl = await fillBackground(rawUrl, currentBgColor);
        if (isMounted) {
          setPreviewImage(compositedUrl);
          setSelectedPreset('natural');
        }
      } catch (err) {
        if (isMounted) setPreviewImage(baseImage);
      } finally {
        if (isMounted) setIsProcessingFilter(false);
      }
    };

    initModal();
    return () => {
      isMounted = false;
    };
  }, [isOpen, baseImage]);

  // Handle Preset Selection Change
  const handleSelectPreset = async (presetId: string) => {
    if (!baseImage || isProcessingFilter) return;
    setSelectedPreset(presetId);

    if (presetId === 'original') {
      // For original, show with proper background
      try {
        const withBg = await fillBackground(baseImage, currentBgColor);
        setPreviewImage(withBg);
      } catch {
        setPreviewImage(baseImage);
      }
      return;
    }

    setIsProcessingFilter(true);
    try {
      const rawUrl = await retouchPassportPhotoViaFastAPI(baseImage, { preset: presetId });
      // Composite with current background color so preview shows correct BG
      const compositedUrl = await fillBackground(rawUrl, currentBgColor);
      setPreviewImage(compositedUrl);
    } catch (err) {
      console.error('Filter preview generation error:', err);
    } finally {
      setIsProcessingFilter(false);
    }
  };

  // Zoom Controls
  const handleZoomIn = () => setZoomLevel((z) => Math.min(4.0, z + 0.5));
  const handleZoomOut = () => {
    setZoomLevel((z) => {
      const next = Math.max(1.0, z - 0.5);
      if (next === 1.0) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };
  const handleResetZoom = () => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
  };
  const handleFocusFace = () => {
    setZoomLevel(2.2);
    setPanOffset({ x: 0, y: -30 });
  };

  // Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1.0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomLevel <= 1.0) return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomLevel((z) => Math.min(4.0, z + 0.25));
    } else {
      setZoomLevel((z) => {
        const next = Math.max(1.0, z - 0.25);
        if (next === 1.0) setPanOffset({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // Permanently Apply Filter Effect (OK)
  const handleApplyFilter = async () => {
    if (!previewImage) return;

    // Update processedImage with retouched image
    dispatch({ type: 'SET_PROCESSED_IMAGE', payload: previewImage });
    dispatch({
      type: 'ADD_TOAST',
      payload: {
        id: 'filter_ok',
        message: `Applied ${selectedPreset.toUpperCase()} filter permanently!`,
        type: 'success',
        duration: 3000
      }
    });
    onClose();
  };

  if (!isOpen || !baseImage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>AI Portrait Enhancer & Studio Filters</span>
                {isFastApiOnline ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                    ⚡ FastAPI Ultra HD AI
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                    ✨ High-Speed Local 4K Canvas Engine
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Compare Before vs After side-by-side, inspect how each step works, select a filter, and click Apply (OK).
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>


        {/* Modal Main Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* Side-by-Side BEFORE vs. AFTER Comparison Viewport */}
          <div className="grid grid-cols-2 gap-3 h-[320px]">
            
            {/* BEFORE Box */}
            <div className="relative rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex flex-col items-center justify-center shadow-inner">
              <div className="absolute top-3 left-3 px-3 py-1 rounded-md bg-slate-900/90 border border-slate-700 text-[11px] font-bold text-slate-300 uppercase tracking-widest z-10">
                BEFORE
              </div>
              <img
                src={beforeDisplayImage || baseImage}
                alt="Before Original"
                className="max-h-full max-w-full object-contain p-2"
              />
            </div>

            {/* AFTER Box (Zoomable & Retouched) */}
            <div
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={`relative rounded-2xl bg-slate-950 border border-indigo-500/40 overflow-hidden flex items-center justify-center shadow-inner ${
                zoomLevel > 1.0 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
              }`}
            >
              <div className="absolute top-3 left-3 px-3 py-1 rounded-md bg-indigo-600/90 border border-indigo-400/50 text-[11px] font-bold text-white uppercase tracking-widest z-10 shadow-md">
                AFTER ({selectedPreset.toUpperCase()})
              </div>

              {/* Display Retouched Image with Zoom & Pan */}
              <div
                style={{
                  transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
                  transition: isDragging ? 'none' : 'transform 0.15s ease-out'
                }}
                className="w-full h-full flex items-center justify-center pointer-events-none p-2"
              >
                <img
                  src={previewImage || baseImage}
                  alt="After Retouched"
                  style={{ imageRendering: 'crisp-edges' }}
                  className="max-h-full max-w-full object-contain select-none"
                />
              </div>

              {/* Processing Overlay */}
              {isProcessingFilter && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-white z-20">
                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                  <span className="text-xs font-semibold text-slate-300">Retouching & applying {selectedPreset.toUpperCase()}…</span>
                </div>
              )}

              {/* Zoom Controls Bar */}
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-xl p-1 shadow-lg backdrop-blur-md z-10">
                <button
                  onClick={handleZoomIn}
                  title="Zoom In (+)"
                  className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleZoomOut}
                  title="Zoom Out (-)"
                  className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleResetZoom}
                  title="Fit Image (100%)"
                  className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <div className="w-[1px] h-3.5 bg-slate-700 mx-1" />
                <button
                  onClick={handleFocusFace}
                  title="Auto-Focus Face (2.2x)"
                  className="flex items-center gap-1 px-2 py-0.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded-md text-[10px] font-bold transition-colors"
                >
                  <Target className="w-3 h-3" />
                  <span>Face Zoom</span>
                </button>
                <span className="text-[10px] font-mono text-slate-400 px-1.5">
                  {Math.round(zoomLevel * 100)}%
                </span>
              </div>
            </div>

          </div>

          {/* "HOW EACH STEP WORKS" Visual Pipeline Progression Strip */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              HOW EACH STEP WORKS
            </div>

            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
              {[
                { id: 'original', label: '1. ORIGINAL' },
                { id: 'skin_mask', label: '2. SKIN MASK' },
                { id: 'smoothing', label: '3. SMOOTHING' },
                { id: 'oil_reduction', label: '4. OIL REDUCTION' },
                { id: 'final_output', label: '5. FINAL OUTPUT' }
              ].map((step, idx) => {
                const stepData = pipelineSteps[step.id];
                return (
                  <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center flex-1 min-w-[90px]">
                      <div className="w-full aspect-square rounded-lg bg-slate-900 overflow-hidden border border-slate-700/80 flex items-center justify-center shadow-md">
                        {stepData ? (
                          <img src={stepData.data_url} alt={step.label} className="w-full h-full object-cover" />
                        ) : (
                          <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                        )}
                      </div>
                      <span className="text-[9px] font-bold text-slate-300 mt-1 text-center font-mono">
                        {step.label}
                      </span>
                    </div>

                    {idx < 4 && (
                      <ArrowRight className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Filter Preset Selection Strip */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>Choose Filter Style for Cleaned Face</span>
              </span>
              {isLoadingPreviews && (
                <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-mono">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading previews…</span>
                </div>
              )}
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {PRESET_LIST.map((item) => {
                const isSelected = selectedPreset === item.id;
                const previewData = previews[item.id];

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectPreset(item.id)}
                    disabled={isProcessingFilter}
                    className={`relative group flex flex-col items-center p-1.5 rounded-xl border transition-all duration-200 text-left
                      ${isSelected
                        ? 'bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-950 scale-105'
                        : 'bg-slate-800/80 border-slate-700/80 hover:border-slate-500 hover:bg-slate-800'
                      }`}
                  >
                    <div className="relative w-full aspect-square rounded-lg bg-slate-900 overflow-hidden border border-slate-700/60 flex items-center justify-center">
                      {previewData ? (
                        <img
                          src={previewData.data_url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="text-lg">{item.icon}</div>
                      )}

                      {isSelected && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-md">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div className="mt-1 text-center w-full">
                      <div className="text-[10px] font-bold text-slate-200 truncate flex items-center justify-center gap-1">
                        <span>{item.name}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Modal Footer Action Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Official Passport & Visa Document Compliant</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleApplyFilter}
              disabled={isProcessingFilter || !previewImage}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-indigo-900/40 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Apply Filter (OK)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
