/**
 * InteractiveCropOverlay.tsx
 * Pure Photoshop CC Rubberband Drag-to-Select Crop Engine.
 * 1. Initially NO frame appears on canvas. Cursor is a crosshair (+).
 * 2. User clicks (MouseDown) and drags (MouseMove) to draw a crop selection rectangle.
 * 3. On MouseUp, 8 resize handles & Apply/Cancel buttons appear.
 * 4. User can adjust handles, pan the box, or click Apply to crop with 100% pixel accuracy.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Crop as CropIcon } from 'lucide-react';

interface InteractiveCropOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  cropBox: { left: number; top: number; width: number; height: number } | null;
  onCropBoxChange: (newBox: { left: number; top: number; width: number; height: number } | null) => void;
  onApplyCrop: () => void;
  onCancelCrop: () => void;
  language: 'en' | 'bn';
}

type HandleType = 
  | 'draw'
  | 'move' 
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  | 'top' | 'bottom' | 'left' | 'right';

export default function InteractiveCropOverlay({
  containerRef,
  cropBox,
  onCropBoxChange,
  onApplyCrop,
  onCancelCrop,
  language
}: InteractiveCropOverlayProps) {
  const [activeHandle, setActiveHandle] = useState<HandleType | null>(null);
  const isMouseDownRef = useRef<boolean>(false);

  const dragStartRef = useRef<{ 
    startX: number; 
    startY: number; 
    mouseX: number; 
    mouseY: number; 
    box: { left: number; top: number; width: number; height: number } 
  }>({
    startX: 0,
    startY: 0,
    mouseX: 0,
    mouseY: 0,
    box: { left: 0, top: 0, width: 0, height: 0 }
  });

  const getContainerRelativePos = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: clientX, y: clientY };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(rect.width, clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, clientY - rect.top))
    };
  };

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    // Ignore clicks on existing handles or action buttons
    if ((e.target as HTMLElement).closest('.crop-action-bar') || (e.target as HTMLElement).closest('.crop-handle')) {
      return;
    }

    e.preventDefault();
    isMouseDownRef.current = true;
    const pos = getContainerRelativePos(e.clientX, e.clientY);

    dragStartRef.current = {
      startX: pos.x,
      startY: pos.y,
      mouseX: e.clientX,
      mouseY: e.clientY,
      box: { left: pos.x, top: pos.y, width: 0, height: 0 }
    };

    setActiveHandle('draw');
  };

  const handleHandleMouseDown = (e: React.MouseEvent, handle: HandleType) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cropBox) return;

    isMouseDownRef.current = true;
    setActiveHandle(handle);

    dragStartRef.current = {
      startX: cropBox.left,
      startY: cropBox.top,
      mouseX: e.clientX,
      mouseY: e.clientY,
      box: { ...cropBox }
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDownRef.current || !activeHandle || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const containerW = rect.width;
      const containerH = rect.height;
      const pos = getContainerRelativePos(e.clientX, e.clientY);

      if (activeHandle === 'draw') {
        const startX = dragStartRef.current.startX;
        const startY = dragStartRef.current.startY;

        const left = Math.min(startX, pos.x);
        const top = Math.min(startY, pos.y);
        const width = Math.abs(pos.x - startX);
        const height = Math.abs(pos.y - startY);

        if (width > 2 || height > 2) {
          onCropBoxChange({
            left: Math.round(left),
            top: Math.round(top),
            width: Math.round(width),
            height: Math.round(height)
          });
        }
        return;
      }

      if (!cropBox) return;

      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      const initial = dragStartRef.current.box;

      let newLeft = initial.left;
      let newTop = initial.top;
      let newWidth = initial.width;
      let newHeight = initial.height;
      const minSize = 20;

      if (activeHandle === 'move') {
        newLeft = Math.max(0, Math.min(containerW - initial.width, initial.left + dx));
        newTop = Math.max(0, Math.min(containerH - initial.height, initial.top + dy));
      } else {
        if (activeHandle.includes('left')) {
          const maxDx = initial.width - minSize;
          const clampedDx = Math.min(maxDx, Math.max(-initial.left, dx));
          newLeft = initial.left + clampedDx;
          newWidth = initial.width - clampedDx;
        }
        if (activeHandle.includes('right')) {
          newWidth = Math.max(minSize, Math.min(containerW - initial.left, initial.width + dx));
        }
        if (activeHandle.includes('top')) {
          const maxDy = initial.height - minSize;
          const clampedDy = Math.min(maxDy, Math.max(-initial.top, dy));
          newTop = initial.top + clampedDy;
          newHeight = initial.height - clampedDy;
        }
        if (activeHandle.includes('bottom')) {
          newHeight = Math.max(minSize, Math.min(containerH - initial.top, initial.height + dy));
        }
      }

      onCropBoxChange({
        left: Math.round(newLeft),
        top: Math.round(newTop),
        width: Math.round(newWidth),
        height: Math.round(newHeight)
      });
    };

    const handleMouseUp = () => {
      isMouseDownRef.current = false;
      setActiveHandle(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeHandle, cropBox, containerRef, onCropBoxChange]);

  const hasValidBox = cropBox && cropBox.width >= 10 && cropBox.height >= 10;

  return (
    <div 
      onMouseDown={handleContainerMouseDown}
      className="absolute inset-0 z-30 overflow-hidden select-none cursor-crosshair pointer-events-auto"
    >
      {/* Top Banner Prompt when no box drawn yet */}
      {!hasValidBox && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl px-5 py-2.5 rounded-full border border-indigo-500/50 text-indigo-200 font-extrabold text-xs shadow-2xl flex items-center gap-2 pointer-events-none z-40 animate-pulse">
          <CropIcon className="w-4 h-4 text-indigo-400" />
          <span>{language === 'bn' ? 'ছবির ওপর মাউস দিয়ে টেনে (Click & Drag) ক্রপ ফ্রেম তৈরি করুন' : 'Click & Drag mouse across image to draw crop box'}</span>
        </div>
      )}

      {/* Render Backdrop & Handles ONLY after user draws a valid box */}
      {hasValidBox && (
        <>
          {/* 4 Dark Translucent Backdrop Dimming Regions */}
          <div style={{ height: `${cropBox.top}px` }} className="absolute top-0 left-0 right-0 bg-slate-950/70 backdrop-blur-[1px] pointer-events-none" />
          <div style={{ top: `${cropBox.top + cropBox.height}px` }} className="absolute bottom-0 left-0 right-0 bg-slate-950/70 backdrop-blur-[1px] pointer-events-none" />
          <div style={{ top: `${cropBox.top}px`, height: `${cropBox.height}px`, width: `${cropBox.left}px` }} className="absolute left-0 bg-slate-950/70 backdrop-blur-[1px] pointer-events-none" />
          <div style={{ top: `${cropBox.top}px`, height: `${cropBox.height}px`, left: `${cropBox.left + cropBox.width}px` }} className="absolute right-0 bg-slate-950/70 backdrop-blur-[1px] pointer-events-none" />

          {/* Main Rubberband Selection Rectangle */}
          <div
            onMouseDown={(e) => handleHandleMouseDown(e, 'move')}
            style={{
              left: `${cropBox.left}px`,
              top: `${cropBox.top}px`,
              width: `${cropBox.width}px`,
              height: `${cropBox.height}px`,
            }}
            className="absolute border-2 border-indigo-400 bg-indigo-500/10 cursor-move shadow-[0_0_0_1px_rgba(255,255,255,0.4)] group"
          >
            {/* Rule of Thirds 3x3 Grid Overlay */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-white/20" />
              <div className="border-r border-white/20" />
              <div className="" />
            </div>

            {/* 4 Corner L-Shaped Drag Handles */}
            <div 
              onMouseDown={(e) => handleHandleMouseDown(e, 'top-left')}
              className="crop-handle absolute -top-1.5 -left-1.5 w-4 h-4 border-t-3 border-l-3 border-white bg-indigo-600 shadow-md cursor-nwse-resize z-40 rounded-tl-sm hover:scale-125 transition-transform" 
            />
            <div 
              onMouseDown={(e) => handleHandleMouseDown(e, 'top-right')}
              className="crop-handle absolute -top-1.5 -right-1.5 w-4 h-4 border-t-3 border-r-3 border-white bg-indigo-600 shadow-md cursor-nesw-resize z-40 rounded-tr-sm hover:scale-125 transition-transform" 
            />
            <div 
              onMouseDown={(e) => handleHandleMouseDown(e, 'bottom-left')}
              className="crop-handle absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-3 border-l-3 border-white bg-indigo-600 shadow-md cursor-nesw-resize z-40 rounded-bl-sm hover:scale-125 transition-transform" 
            />
            <div 
              onMouseDown={(e) => handleHandleMouseDown(e, 'bottom-right')}
              className="crop-handle absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-3 border-r-3 border-white bg-indigo-600 shadow-md cursor-nwse-resize z-40 rounded-br-sm hover:scale-125 transition-transform" 
            />

            {/* 4 Edge Midpoint Handles */}
            <div 
              onMouseDown={(e) => handleHandleMouseDown(e, 'top')}
              className="crop-handle absolute -top-1 left-1/2 -translate-x-1/2 w-7 h-2 bg-white border border-indigo-600 rounded-full shadow cursor-ns-resize z-40 hover:scale-125 transition-transform" 
            />
            <div 
              onMouseDown={(e) => handleHandleMouseDown(e, 'bottom')}
              className="crop-handle absolute -bottom-1 left-1/2 -translate-x-1/2 w-7 h-2 bg-white border border-indigo-600 rounded-full shadow cursor-ns-resize z-40 hover:scale-125 transition-transform" 
            />
            <div 
              onMouseDown={(e) => handleHandleMouseDown(e, 'left')}
              className="crop-handle absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-7 bg-white border border-indigo-600 rounded-full shadow cursor-ew-resize z-40 hover:scale-125 transition-transform" 
            />
            <div 
              onMouseDown={(e) => handleHandleMouseDown(e, 'right')}
              className="crop-handle absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-7 bg-white border border-indigo-600 rounded-full shadow cursor-ew-resize z-40 hover:scale-125 transition-transform" 
            />

            {/* Floating Action Bar Overlaid Below Crop Rectangle */}
            <div className="crop-action-bar absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/95 backdrop-blur-xl px-3.5 py-1.5 rounded-full border border-indigo-500/40 shadow-2xl z-50 whitespace-nowrap">
              <button 
                onClick={onApplyCrop}
                className="flex items-center gap-1 px-3.5 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold rounded-lg text-xs transition-all shadow-md"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'প্রয়োগ করুন' : 'Apply Crop'}</span>
              </button>

              <button 
                onClick={onCancelCrop}
                className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs transition-all"
              >
                <X className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'বাতিল' : 'Cancel'}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
