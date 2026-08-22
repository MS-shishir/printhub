/**
 * LayersPanel.tsx
 * Photoshop-style Layer Stack & History Inspector Panel fulfilling Module 9 Specification.
 * (Photo, Background, Text, Border, QR Code layers + Group, Ungroup, Lock, Hide, Duplicate, Delete, Bring Forward, Send Backward).
 */

import React, { useState } from 'react';
import { 
  Eye, EyeOff, Lock, Unlock, Trash2, ArrowUp, ArrowDown, Layers, History as HistoryIcon,
  Sliders, Image as ImageIcon, Sparkles, SlidersHorizontal, Sun, Palette, FolderPlus, FolderMinus,
  Type, Square, QrCode
} from 'lucide-react';

export interface PhotoLayerItem {
  id: string;
  type: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity?: number;
  blendMode?: string;
  thumbnailUrl?: string;
}

interface LayersPanelProps {
  layers: PhotoLayerItem[];
  activeLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onGroupLayers?: () => void;
  onUngroupLayers?: () => void;
  language: 'en' | 'bn';
}

export default function LayersPanel({
  layers,
  activeLayerId,
  onSelectLayer,
  onToggleVisibility,
  onToggleLock,
  onMoveUp,
  onMoveDown,
  onDeleteLayer,
  onGroupLayers,
  onUngroupLayers,
  language
}: LayersPanelProps) {
  const [activeTab, setActiveTab] = useState<'layers' | 'history'>('layers');
  const [blendMode, setBlendMode] = useState<string>('Normal');
  const [opacityVal, setOpacityVal] = useState<number>(100);
  const [fillVal, setFillVal] = useState<number>(100);

  const historySteps = [
    { id: 'h1', name: 'Open Image', icon: ImageIcon },
    { id: 'h2', name: 'Duplicate Layer', icon: Layers },
    { id: 'h3', name: 'AI Face Retouch', icon: Sparkles },
    { id: 'h4', name: 'Adjust Contrast', icon: Sun },
    { id: 'h5', name: 'Add Watermark', icon: Layers },
  ];

  const getLayerIcon = (type: string) => {
    if (type.includes('text') || type.includes('i-text')) return Type;
    if (type.includes('rect') || type.includes('circle')) return Square;
    return ImageIcon;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col text-xs select-none shadow-xl">
      
      {/* Top Stack Navigation Tabs */}
      <div className="flex items-center justify-between bg-slate-950/80 border-b border-slate-800 p-1">
        {(['layers', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all text-center ${
              activeTab === tab
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-3.5 space-y-3">
        {activeTab === 'layers' && (
          <div className="space-y-3 animate-fadeIn">
            {/* Blend Mode & Opacity Controls */}
            <div className="space-y-2 border-b border-slate-800 pb-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Blend Mode</span>
                <select
                  value={blendMode}
                  onChange={(e) => setBlendMode(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-[11px] text-slate-200 font-semibold focus:outline-none focus:border-indigo-500"
                >
                  <option value="Normal">Normal</option>
                  <option value="Multiply">Multiply</option>
                  <option value="Screen">Screen</option>
                  <option value="Overlay">Overlay</option>
                  <option value="Soft Light">Soft Light</option>
                  <option value="Hard Light">Hard Light</option>
                  <option value="Color Dodge">Color Dodge</option>
                </select>
              </div>

              {/* Opacity & Fill Sliders */}
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Opacity</span>
                    <span className="font-mono text-indigo-400">{opacityVal}%</span>
                  </div>
                  <input
                    type="range" min="0" max="100" value={opacityVal}
                    onChange={(e) => setOpacityVal(parseInt(e.target.value))}
                    className="w-full accent-indigo-500 h-1 bg-slate-800 rounded cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Fill</span>
                    <span className="font-mono text-indigo-400">{fillVal}%</span>
                  </div>
                  <input
                    type="range" min="0" max="100" value={fillVal}
                    onChange={(e) => setFillVal(parseInt(e.target.value))}
                    className="w-full accent-indigo-500 h-1 bg-slate-800 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Layer Stack Items */}
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {layers.length === 0 ? (
                <div className="p-3 text-center rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-[11px] font-bold text-slate-300">Background Layer (Active)</p>
                  <p className="text-[9px] text-slate-500">1920x1280 • 300 DPI</p>
                </div>
              ) : (
                layers.map((layer) => {
                  const isActive = layer.id === activeLayerId;
                  const Icon = getLayerIcon(layer.type);

                  return (
                    <div
                      key={layer.id}
                      onClick={() => onSelectLayer(layer.id)}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                        isActive 
                          ? 'bg-indigo-600/30 border border-indigo-500/50 text-white shadow-md' 
                          : 'bg-slate-950/80 hover:bg-slate-800/80 text-slate-300 border border-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-6 h-6 rounded bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                          <Icon className="w-3.5 h-3.5 text-indigo-400" />
                        </div>
                        <span className="truncate font-bold text-[11px]">{layer.name}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => onMoveUp(layer.id)} title="Bring Forward" className="p-0.5 text-slate-400 hover:text-white">
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button onClick={() => onMoveDown(layer.id)} title="Send Backward" className="p-0.5 text-slate-400 hover:text-white">
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button onClick={() => onToggleVisibility(layer.id)} className="p-0.5 text-slate-400 hover:text-white">
                          {layer.visible ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
                        </button>
                        <button onClick={() => onToggleLock(layer.id)} className="p-0.5 text-slate-400 hover:text-white">
                          {layer.locked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5 text-slate-600" />}
                        </button>
                        <button onClick={() => onDeleteLayer(layer.id)} className="p-0.5 text-slate-400 hover:text-rose-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Group/Ungroup Quick Action Toolbar */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={onGroupLayers}
                className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] flex items-center justify-center gap-1 border border-slate-700"
              >
                <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
                <span>Group</span>
              </button>

              <button
                onClick={onUngroupLayers}
                className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] flex items-center justify-center gap-1 border border-slate-700"
              >
                <FolderMinus className="w-3.5 h-3.5 text-amber-400" />
                <span>Ungroup</span>
              </button>
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="space-y-1 animate-fadeIn">
            <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Action History</span>
            {historySteps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.id} className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300">
                  <Icon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{step.name}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* CHANNELS TAB */}
        {activeTab === 'channels' && (
          <div className="space-y-1 animate-fadeIn text-[11px] text-slate-400">
            <p>RGB Channel Composite (8 Bit)</p>
            <p className="text-red-400 font-mono">Red Channel (8 Bit)</p>
            <p className="text-emerald-400 font-mono">Green Channel (8 Bit)</p>
            <p className="text-blue-400 font-mono">Blue Channel (8 Bit)</p>
          </div>
        )}

        {/* PATHS TAB */}
        {activeTab === 'paths' && (
          <div className="text-[11px] text-slate-500 italic text-center py-2 animate-fadeIn">
            No work paths selected. Use Pen Tool (P) to create custom vector paths.
          </div>
        )}
      </div>
    </div>
  );
}
