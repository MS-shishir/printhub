import React, { useRef } from 'react';
import * as fabric from 'fabric';
import { Loader2, Sparkles } from 'lucide-react';
import PhotoCropOverlay, { CropMode } from './PhotoCropOverlay';
import ShoulderRulerGuide from './ShoulderRulerGuide';
import LocalMaskPaintingOverlay from './LocalMaskPaintingOverlay';

interface PhotoCanvasProps {
  fabricCanvas?: fabric.Canvas | null;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  topRulerRef: React.RefObject<HTMLCanvasElement | null>;
  leftRulerRef: React.RefObject<HTMLCanvasElement | null>;
  showGrid: boolean;
  showRulers: boolean;
  showThirdsGuide: boolean;
  isCropActive: boolean;
  cropMode?: CropMode;
  onSetCropMode?: (mode: CropMode) => void;
  onApplyCropCanvas?: (resultCanvas: HTMLCanvasElement) => void;
  onCancelCrop: () => void;
  isProcessing?: boolean;
  showShoulderRuler?: boolean;
  currentRotationAngle?: number;
  onRotateAngle?: (angle: number) => void;
  onCloseShoulderRuler?: () => void;
  
  // Local Selective Adjustment Painting Overlay Props
  isLocalPaintingActive?: boolean;
  activeMaskCanvas?: HTMLCanvasElement | null;
  localBrushSize?: number;
  localBrushMode?: 'brush' | 'eraser';
  localBrushFeather?: number;
  onMaskUpdated?: () => void;

  language: 'en' | 'bn';
}

export default function PhotoCanvas({
  fabricCanvas,
  canvasRef,
  topRulerRef,
  leftRulerRef,
  showGrid,
  showRulers,
  showThirdsGuide,
  isCropActive,
  cropMode = 'normal',
  onSetCropMode,
  onApplyCropCanvas,
  onCancelCrop,
  isProcessing = false,
  showShoulderRuler = false,
  currentRotationAngle = 0,
  onRotateAngle,
  onCloseShoulderRuler,
  isLocalPaintingActive = false,
  activeMaskCanvas = null,
  localBrushSize = 30,
  localBrushMode = 'brush',
  localBrushFeather = 10,
  onMaskUpdated,
  language
}: PhotoCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activeObj = fabricCanvas?.getActiveObject();
  const activeImage = (activeObj?.isType('image') ? activeObj : fabricCanvas?.getObjects().find((o) => o.isType('image'))) as fabric.Image | null;

  return (
    <div className="relative flex-1 flex items-center justify-center bg-slate-950 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] overflow-hidden select-none">
      {/* Top & Left Rulers */}
      {showRulers && (
        <>
          <canvas 
            ref={topRulerRef} 
            className="absolute top-0 left-6 right-0 h-6 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 z-10 pointer-events-none" 
          />
          <canvas 
            ref={leftRulerRef} 
            className="absolute top-6 left-0 bottom-0 w-6 bg-slate-900/90 backdrop-blur-md border-r border-slate-800 z-10 pointer-events-none" 
          />
        </>
      )}

      {/* Center Workstation Canvas Container with High-Contrast Drop Shadow */}
      <div 
        ref={containerRef}
        className="relative border border-slate-800/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] rounded-sm overflow-hidden bg-white"
      >
        <canvas ref={canvasRef} />

        {/* Local Selective Mask Painting Brush/Eraser Overlay */}
        <LocalMaskPaintingOverlay
          fabricCanvas={fabricCanvas}
          activeImage={activeImage}
          maskCanvas={activeMaskCanvas}
          brushSize={localBrushSize}
          brushMode={localBrushMode}
          feather={localBrushFeather}
          isActive={isLocalPaintingActive}
          onMaskUpdated={() => onMaskUpdated && onMaskUpdated()}
        />

        {/* Rule of Thirds Guide Lines */}
        {showThirdsGuide && (
          <div className="absolute inset-0 pointer-events-none border border-indigo-500/20">
            <div className="absolute top-1/3 left-0 right-0 h-px bg-indigo-500/30" />
            <div className="absolute top-2/3 left-0 right-0 h-px bg-indigo-500/30" />
            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-indigo-500/30" />
            <div className="absolute left-2/3 top-0 bottom-0 w-px bg-indigo-500/30" />
          </div>
        )}

        {/* Professional Dual-Mode Crop Overlay (Normal Rectangular & 4-Corner Perspective Warp) */}
        {isCropActive && activeImage && (
          <PhotoCropOverlay
            fabricCanvas={fabricCanvas || null}
            activeImage={activeImage}
            cropMode={cropMode}
            onSetCropMode={(m) => onSetCropMode && onSetCropMode(m)}
            onApplyCrop={(res) => onApplyCropCanvas && onApplyCropCanvas(res)}
            onCancelCrop={onCancelCrop}
            language={language}
          />
        )}

        {/* Studio Shoulder & Eye Level Alignment Ruler Guide */}
        {showShoulderRuler && (
          <ShoulderRulerGuide
            containerRef={containerRef}
            currentAngle={currentRotationAngle}
            onRotateAngle={(ang) => onRotateAngle && onRotateAngle(ang)}
            onClose={() => onCloseShoulderRuler && onCloseShoulderRuler()}
            language={language}
          />
        )}

        {/* INLINE CANVAS LOADER */}
        {isProcessing && (
          <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-md z-30 flex flex-col items-center justify-center p-4 text-center select-none animate-fade-in">
            <div className="relative w-12 h-12 flex items-center justify-center mb-3">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 opacity-40 blur-md animate-ping" />
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin z-10" />
            </div>
            <span className="text-xs font-bold text-white tracking-wide mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>{language === 'bn' ? 'এআই ব্যাকগ্রাউন্ড প্রসেসিং চলছে...' : 'AI Processing in Progress...'}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {language === 'bn' ? '১০০% অরিজিনাল এইচডি রেজোলিউশন তৈরি হচ্ছে' : 'Preserving 100% Full HD Original Resolution'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
