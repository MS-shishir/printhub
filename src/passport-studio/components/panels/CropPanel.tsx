import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw, RotateCw, FlipHorizontal, FlipVertical, Maximize2, RefreshCw, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { usePassportStore } from '../../store';
import { getAllTemplates } from '../../services/template.service';

interface CropPanelProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onFlipH: () => void;
  onFlipV: () => void;
  onFit: () => void;
  onReset: () => void;
  onGetCroppedUrl?: () => string | null;
}

export default function CropPanel({
  onZoomIn, onZoomOut, onRotateLeft, onRotateRight,
  onFlipH, onFlipV, onFit, onReset, onGetCroppedUrl,
}: CropPanelProps) {
  const { state, dispatch } = usePassportStore();
  const templates = getAllTemplates();

  const handleApplyCrop = () => {
    const croppedUrl = onGetCroppedUrl?.() || state.croppedImage;
    if (croppedUrl) {
      dispatch({ type: 'SET_PROCESSED_IMAGE', payload: croppedUrl });
      dispatch({ type: 'SET_CROPPED_IMAGE', payload: croppedUrl });
      dispatch({
        type: 'SET_TRANSFORM',
        payload: { zoom: 1, pan: { x: 0, y: 0 }, rotation: 0, flipX: false, flipY: false },
      });

      const tpl = templates.find((t) => t.id === state.selectedTemplateId);
      dispatch({
        type: 'UPSERT_TRAY_ITEM',
        payload: {
          name: state.photoName || 'Processed Photo',
          croppedUrl,
          templateId: state.selectedTemplateId,
          widthMm: tpl?.widthMm || 35,
          heightMm: tpl?.heightMm || 45,
          defaultCopies: 4,
        },
      });
    }
    dispatch({ type: 'SET_ACTIVE_PANEL', payload: 'template' });
  };

  const ToolButton = ({ icon: Icon, label, onClick, active = false }: {
    icon: React.ElementType; label: string; onClick: () => void; active?: boolean;
  }) => (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center justify-center gap-1.5 p-1.5 rounded-lg text-[10px] font-bold transition-all
        ${active
          ? 'bg-indigo-600 text-white'
          : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/50'
        }`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="leading-none">{label}</span>
    </button>
  );

  return (
    <div className="p-3.5 space-y-3 select-none text-slate-200">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Crop & Adjust</div>

      {/* Zoom Controls */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase">
          <span>Zoom</span>
          <span className="text-indigo-300 font-bold">{Math.round(state.transform.zoom * 100)}%</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <ToolButton icon={ZoomIn} label="Zoom In" onClick={onZoomIn} />
          <ToolButton icon={ZoomOut} label="Zoom Out" onClick={onZoomOut} />
        </div>
      </div>

      {/* Rotate & Straighten */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase">
          <span>Rotate & Straighten</span>
          <span className="text-indigo-300 font-bold">
            {(() => {
              const r = state.transform.rotation;
              const norm = r > 180 ? r - 360 : r;
              return `${norm > 0 ? '+' : ''}${norm.toFixed(1)}°`;
            })()}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <ToolButton icon={RotateCcw} label="−90°" onClick={onRotateLeft} />
          <ToolButton icon={RotateCw} label="+90°" onClick={onRotateRight} />
        </div>

        {/* Fine Tilt Slider */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => dispatch({ type: 'SET_TRANSFORM', payload: { rotation: 0 } })}
            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 hover:bg-slate-700 font-bold shrink-0"
            title="Reset Angle"
          >
            0°
          </button>
          <input
            type="range"
            min={-20}
            max={20}
            step={0.5}
            value={(() => {
              const r = state.transform.rotation;
              return r > 180 ? r - 360 : r;
            })()}
            onChange={(e) => {
              const val = +e.target.value;
              dispatch({ type: 'SET_TRANSFORM', payload: { rotation: ((val % 360) + 360) % 360 } });
            }}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Flip & Fit */}
      <div className="space-y-1">
        <div className="text-[10px] font-semibold text-slate-500 uppercase">Flip & View</div>
        <div className="grid grid-cols-4 gap-1">
          <ToolButton icon={FlipHorizontal} label="Flip H" onClick={onFlipH} active={state.transform.flipX} />
          <ToolButton icon={FlipVertical} label="Flip V" onClick={onFlipV} active={state.transform.flipY} />
          <ToolButton icon={Maximize2} label="Fit" onClick={onFit} />
          <ToolButton icon={RefreshCw} label="Reset" onClick={onReset} />
        </div>
      </div>

      <div className="border-t border-slate-800" />

      {/* Overlay Toggles */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase">
          <span>Overlays & Guides</span>
          <button
            onClick={() => {
              if (state.faceDetection?.landmarks) {
                const { leftEye, rightEye } = state.faceDetection.landmarks;
                const dy = rightEye.y - leftEye.y;
                const dx = rightEye.x - leftEye.x;
                const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
                const correction = -angleDeg;
                const newRot = ((correction % 360) + 360) % 360;
                dispatch({ type: 'SET_TRANSFORM', payload: { rotation: newRot } });
              }
            }}
            className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-600/30 text-indigo-300 font-bold border border-indigo-500/40 hover:bg-indigo-600/50 transition-all"
          >
            ⚡ Auto-Level
          </button>
        </div>

        <div className="space-y-1">
          {([
            ['showShoulderGuide', 'Shoulder & Center Guide'],
            ['showFaceGuide', 'Face Guide'],
            ['showSafeArea', 'Safe Area'],
            ['showGrid', 'Grid'],
            ['showEyeLine', 'Eye Line'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => dispatch({ type: 'SET_GUIDE_VISIBILITY', payload: { [key]: !state[key] } })}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors
                ${state[key] ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800/80 text-slate-400 border border-slate-700/50'}`}
            >
              <span>{label}</span>
              {state[key] ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      </div>

      {/* Shoulder Line Height Adjustment */}
      {state.showShoulderGuide && (
        <div className="space-y-1 bg-slate-900/60 p-2 rounded-xl border border-slate-800 text-[10px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Shoulder Line Height</span>
            <span className="text-cyan-300 font-bold">{state.shoulderGuideYOffset}px</span>
          </div>
          <input
            type="range" min={-100} max={100} step={2}
            value={state.shoulderGuideYOffset}
            onChange={(e) => dispatch({ type: 'SET_SHOULDER_GUIDE_OFFSET', payload: +e.target.value })}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>
      )}

      {/* Primary Action: Apply Crop & Continue (Placed at Bottom with Professional Icon) */}
      <button
        onClick={handleApplyCrop}
        disabled={!state.originalImage}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white text-xs font-black transition-all shadow-lg shadow-emerald-950/40 disabled:opacity-40 mt-2"
      >
        <CheckCircle2 className="w-4 h-4 text-emerald-200" />
        <span>Apply Crop & Continue →</span>
      </button>
    </div>
  );
}
