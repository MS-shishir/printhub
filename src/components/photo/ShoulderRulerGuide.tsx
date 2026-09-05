/**
 * ShoulderRulerGuide.tsx
 * Ultra-sleek Photoshop CC Grade Shoulder & Eye Alignment Level Ruler Bar.
 * Clean border without shadow, thin gradient progress track & crisp visible ruler scale ticks.
 */

import React, { useState, useRef } from 'react';
import { Ruler, Target, X, RefreshCw } from 'lucide-react';

interface ShoulderRulerGuideProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onRotateAngle: (angle: number) => void;
  currentAngle: number;
  onClose: () => void;
  language: 'en' | 'bn';
}

export default function ShoulderRulerGuide({
  containerRef,
  onRotateAngle,
  currentAngle,
  onClose,
  language
}: ShoulderRulerGuideProps) {
  const [shoulderY, setShoulderY] = useState<number>(65); // percentage from top (shoulder line)
  const [eyeY, setEyeY] = useState<number>(35); // percentage from top (eye line)
  const [rotation, setRotation] = useState<number>(currentAngle || 0);

  const isDraggingShoulder = useRef<boolean>(false);
  const isDraggingEye = useRef<boolean>(false);

  const handleMouseDownShoulder = (e: React.MouseEvent) => {
    e.stopPropagation();
    isDraggingShoulder.current = true;

    const handleMouseMove = (me: MouseEvent) => {
      if (!isDraggingShoulder.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeY = ((me.clientY - rect.top) / rect.height) * 100;
      setShoulderY(Math.max(10, Math.min(90, relativeY)));
    };

    const handleMouseUp = () => {
      isDraggingShoulder.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseDownEye = (e: React.MouseEvent) => {
    e.stopPropagation();
    isDraggingEye.current = true;

    const handleMouseMove = (me: MouseEvent) => {
      if (!isDraggingEye.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeY = ((me.clientY - rect.top) / rect.height) * 100;
      setEyeY(Math.max(5, Math.min(85, relativeY)));
    };

    const handleMouseUp = () => {
      isDraggingEye.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleAngleChange = (newAngle: number) => {
    setRotation(newAngle);
    onRotateAngle(newAngle);
  };

  const handleResetLevel = () => {
    setRotation(0);
    onRotateAngle(0);
  };

  return (
    <div className="absolute inset-0 z-20 pointer-events-none select-none overflow-hidden">
      
      {/* Exact Match Target UI: Top Floating Control Bar (No Shadow) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto bg-[#161a26]/98 border border-slate-800 p-2.5 px-4 rounded-[22px] shadow-none backdrop-blur-2xl flex items-center gap-3.5 text-white animate-fade-in z-30">
        
        {/* Left Icon Square Box */}
        <div className="w-11 h-11 bg-[#0f121d] rounded-xl border border-indigo-500/30 flex items-center justify-center relative group">
          <Ruler className="w-5 h-5 text-cyan-400 transition-transform group-hover:scale-110" />
        </div>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-slate-800/90" />

        {/* Text Label */}
        <div className="flex flex-col text-slate-300 font-semibold text-[11px] leading-tight tracking-wide pr-1">
          <span>{language === 'bn' ? 'রুলার' : 'Ruler'}</span>
          <span>{language === 'bn' ? 'লেভেল' : 'Level'}</span>
        </div>

        {/* Center Control Pill Box */}
        <div className="bg-[#0f121d] border border-slate-800/90 rounded-xl p-2 px-3.5 flex items-center gap-3">
          <Target className="w-4 h-4 text-purple-400 shrink-0" />

          {/* Live Tilt Angle Badge */}
          <div className="flex items-center gap-1 text-xs font-mono shrink-0">
            <span className="text-slate-400">{language === 'bn' ? 'এঙ্গেল:' : 'Tilt:'}</span>
            <span className={`font-bold ${rotation === 0 ? 'text-cyan-400' : 'text-amber-400'}`}>
              {rotation > 0 ? `+${rotation.toFixed(1)}°` : `${rotation.toFixed(1)}°`}
            </span>
          </div>

          {/* Ultra Thin Precision Slider Bar with High-Visibility Ruler Scale Ticks */}
          <div className="relative flex items-center justify-center w-36 h-6 px-1">
            {/* Crisp High-Visibility Scale Ticks Marks */}
            <div className="absolute inset-x-1 top-0 bottom-0 flex items-center justify-between pointer-events-none z-0">
              {Array.from({ length: 31 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-px transition-all ${
                    i % 5 === 0 ? 'h-3.5 bg-cyan-400/80' : 'h-2 bg-slate-600/70'
                  }`}
                />
              ))}
            </div>

            {/* Ultra-Thin Gradient Track Range Input */}
            <input
              type="range"
              min="-15"
              max="15"
              step="0.5"
              value={rotation}
              onChange={(e) => handleAngleChange(parseFloat(e.target.value))}
              className="w-full h-[2.5px] bg-gradient-to-r from-cyan-400 via-indigo-500 to-pink-500 rounded-full appearance-none cursor-pointer accent-cyan-400 relative z-10 opacity-90"
            />
          </div>

          {/* 1-Click 0° Straighten Button */}
          {rotation !== 0 && (
            <button
              onClick={handleResetLevel}
              className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all text-[10px] font-bold flex items-center gap-1"
              title="Straighten to 0°"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Right Close Square Box */}
        <button
          onClick={onClose}
          className="w-9 h-9 bg-[#0f121d] hover:bg-slate-800 rounded-xl border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          title="Close Level Guide"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Center Plumb Line (Vertical Center Axis) */}
      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px border-r border-dashed border-amber-400/40" />

      {/* Eye Level Guideline (Magenta Dashed Line) */}
      <div 
        className="absolute inset-x-0 border-b-[1.5px] border-dashed border-pink-500/80 flex items-center justify-between px-2 cursor-ns-resize pointer-events-auto group"
        style={{ top: `${eyeY}%` }}
        onMouseDown={handleMouseDownEye}
      >
        <span className="bg-[#0f121d]/90 border border-pink-500/50 text-pink-300 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold shadow-md">
          {language === 'bn' ? 'চোখের লেভেল (Eye Level)' : 'Eye Alignment Level'}
        </span>
        <div className="w-5 h-2.5 bg-pink-500 rounded-full border border-white shadow-md cursor-ns-resize group-hover:scale-110 transition-transform" />
      </div>

      {/* Shoulder Level Guideline (Clean Razor-Sharp Cyan Dashed Line - NO SHADOW) */}
      <div 
        className="absolute inset-x-0 border-b-[1.5px] border-dashed border-cyan-400 flex items-center justify-between px-2 cursor-ns-resize pointer-events-auto group"
        style={{ top: `${shoulderY}%` }}
        onMouseDown={handleMouseDownShoulder}
      >
        <span className="bg-[#0f121d]/90 border border-cyan-400/60 text-cyan-300 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold shadow-md">
          {language === 'bn' ? 'কাঁধের লেভেল (Shoulder Level)' : 'Shoulder Alignment Level'}
        </span>
        <div className="w-6 h-3 bg-cyan-400 rounded-full border border-white shadow-md cursor-ns-resize group-hover:scale-110 transition-transform flex items-center justify-center">
          <div className="w-2.5 h-0.5 bg-slate-950 rounded-full" />
        </div>
      </div>
    </div>
  );
}
