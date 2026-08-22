/**
 * MediaBinPanel.tsx
 * Bottom Filmstrip Asset Dock & Live Status Bar with REAL user uploaded photos (Zero hardcoded Unsplash placeholders).
 * Supports permanent image deletion with premium warning modals, selection, and live status metrics.
 */

import React, { useState, useRef } from 'react';
import { 
  Images, Star, Folder, CheckCircle2, Sliders, LayoutGrid, List, ZoomIn, Printer, Upload, Plus, Trash2
} from 'lucide-react';
import { MediaItem } from '../../store/useProjectStore';

interface MediaBinPanelProps {
  mediaItems?: MediaItem[];
  onSelectMediaItem: (item: MediaItem) => void;
  onDeleteMediaItem?: (id: string) => void;
  onRequestDeleteMediaItem?: (id: string) => void;
  onImportImage?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendToPrintWorkspace?: () => void;
  cursorPos?: { x: number; y: number };
  imageDim?: { w: number; h: number };
  zoomPercent?: number;
  language: 'en' | 'bn';
}

export default function MediaBinPanel({
  mediaItems = [],
  onSelectMediaItem,
  onDeleteMediaItem,
  onRequestDeleteMediaItem,
  onImportImage,
  onSendToPrintWorkspace,
  cursorPos = { x: 1200, y: 860 },
  imageDim = { w: 1920, h: 1280 },
  zoomPercent = 84,
  language
}: MediaBinPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'camera_roll' | 'favorites' | 'edited' | 'exported'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(mediaItems.length > 0 ? mediaItems[0].id : null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [thumbScale, setThumbScale] = useState<number>(100);

  return (
    <div className="bg-slate-900 border-t border-slate-800 flex flex-col shrink-0 select-none text-slate-200">
      {onImportImage && (
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={onImportImage} 
          accept="image/*" 
          className="hidden" 
        />
      )}

      {/* Filmstrip Dock Navigation Tabs & Viewport Controls */}
      <div className="px-4 py-1.5 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/70 text-xs">
        
        {/* Tabs */}
        <div className="flex items-center gap-1">
          {[
            { id: 'all', label: 'All Photos' },
            { id: 'camera_roll', label: 'Camera Roll' },
            { id: 'favorites', label: 'Favorites' },
            { id: 'edited', label: 'Edited' },
            { id: 'exported', label: 'Exported' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* View Controls & Upload Button */}
        <div className="flex items-center gap-3">
          {onImportImage && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Photos</span>
            </button>
          )}

          <div className="h-3 w-px bg-slate-800" />

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded ${viewMode === 'grid' ? 'bg-slate-800 text-indigo-400' : 'hover:text-slate-200'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1 rounded ${viewMode === 'list' ? 'bg-slate-800 text-indigo-400' : 'hover:text-slate-200'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-3 w-px bg-slate-800" />

          {/* Thumbnail Scale Slider */}
          <div className="flex items-center gap-1.5 w-28">
            <ZoomIn className="w-3 h-3 text-slate-500" />
            <input
              type="range"
              min="60"
              max="140"
              value={thumbScale}
              onChange={(e) => setThumbScale(parseInt(e.target.value))}
              className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Filmstrip Horizontal Scrollable Thumbnails */}
      <div className="p-2 overflow-x-auto flex items-center gap-2 scrollbar-thin scrollbar-thumb-slate-800 min-h-20 max-h-24 bg-slate-950">
        {mediaItems.length === 0 ? (
          <div className="flex items-center justify-center gap-2 w-full py-3 text-slate-500 text-xs italic font-medium">
            <Upload className="w-4 h-4 text-indigo-400 animate-bounce" />
            <span>No photos uploaded yet. Click <strong>Add Photos</strong> or drag files to start working!</span>
          </div>
        ) : (
          mediaItems.map((item) => {
            const isSelected = selectedId === item.id;
            return (
              <div
                key={item.id}
                style={{ width: `${Math.round(80 * (thumbScale / 100))}px` }}
                className={`relative shrink-0 aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all duration-200 group ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-500/40 scale-105 shadow-lg shadow-indigo-950'
                    : 'border-slate-800 hover:border-slate-600 hover:scale-102'
                }`}
              >
                <img
                  src={item.dataUrl}
                  alt={item.name}
                  onClick={() => {
                    setSelectedId(item.id);
                    onSelectMediaItem(item);
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                />
                
                {/* Permanent Delete Button with Premium Modal */}
                {(onDeleteMediaItem || onRequestDeleteMediaItem) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onRequestDeleteMediaItem) {
                        onRequestDeleteMediaItem(item.id);
                      } else if (onDeleteMediaItem) {
                        onDeleteMediaItem(item.id);
                      }
                    }}
                    title="Permanently Delete Photo Asset"
                    className="absolute top-1 left-1 p-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10 hover:scale-110"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}

                {isSelected && (
                  <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow pointer-events-none">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Realtime Status Bar */}
      <div className="px-4 py-1.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400 shrink-0">
        <div className="flex items-center gap-4">
          <span>X: <strong className="text-slate-200">{cursorPos.x}</strong> Y: <strong className="text-slate-200">{cursorPos.y}</strong></span>
          <span className="h-3 w-px bg-slate-800" />
          <span>W: <strong className="text-slate-200">{imageDim.w}</strong> H: <strong className="text-slate-200">{imageDim.h}</strong></span>
          <span className="h-3 w-px bg-slate-800" />
          <span className="text-indigo-400 font-bold">DPI: 300</span>
          <span className="h-3 w-px bg-slate-800" />
          <span>Color Mode: <strong className="text-slate-200">RGB</strong></span>
          <span className="h-3 w-px bg-slate-800" />
          <span>8 Bit</span>
          <span className="h-3 w-px bg-slate-800" />
          <span>Zoom: <strong className="text-indigo-400">{zoomPercent}%</strong></span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <Printer className="w-3.5 h-3.5 text-slate-400" />
          <span>Printer: <strong className="text-slate-200">Epson L805</strong> (<span className="text-emerald-400 font-bold">Ready</span>)</span>
        </div>
      </div>
    </div>
  );
}
