import React from 'react';
import {
  Upload, Crop, Palette, Settings, LayoutGrid, Download, ShieldCheck,
  ChevronRight, ChevronLeft
} from 'lucide-react';
import { usePassportStore } from '../store';
import UploadPanel from './panels/UploadPanel';
import CropPanel from './panels/CropPanel';
import BackgroundPanel from './panels/BackgroundPanel';
import TemplatePanel from './panels/TemplatePanel';
import LayoutPanel from './panels/LayoutPanel';
import ExportPhotoListPanel from './panels/ExportPhotoListPanel';
import CompliancePanel from './panels/CompliancePanel';

interface EditorControls {
  zoomIn: () => void;
  zoomOut: () => void;
  rotateLeft: () => void;
  rotateRight: () => void;
  flipH: () => void;
  flipV: () => void;
  fitToCanvas: () => void;
  resetTransform: () => void;
  getCroppedDataUrl?: () => string | null;
}

interface LeftSidebarProps {
  editorControls: EditorControls;
}

const NAV_ITEMS = [
  { id: 'upload',     icon: Upload,      label: 'Upload',       color: 'text-indigo-400' },
  { id: 'crop',       icon: Crop,        label: 'Crop & Adjust',color: 'text-amber-400'  },
  { id: 'template',   icon: Settings,    label: 'Templates',    color: 'text-cyan-400'   },
  { id: 'compliance', icon: ShieldCheck, label: 'Compliance',   color: 'text-emerald-400' },
  { id: 'layout',     icon: LayoutGrid,  label: 'Layout',       color: 'text-purple-400' },
  { id: 'export',     icon: Download,    label: 'Export',       color: 'text-violet-400' },
];

const STEP_FLOW = ['upload', 'crop', 'template', 'compliance', 'layout', 'export'];

export default function LeftSidebar({ editorControls }: LeftSidebarProps) {
  const { state, dispatch } = usePassportStore();
  const activePanel = state.activePanel;

  const currentIdx = STEP_FLOW.indexOf(activePanel);
  const prevStep = currentIdx > 0 ? STEP_FLOW[currentIdx - 1] : null;
  const nextStep = currentIdx >= 0 && currentIdx < STEP_FLOW.length - 1 ? STEP_FLOW[currentIdx + 1] : null;

  const getStepLabel = (id: string) => {
    const found = NAV_ITEMS.find((n) => n.id === id);
    return found ? found.label : id;
  };

  return (
    <div className="flex h-full">
      {/* Icon Navigation Rail */}
      <div className="w-14 flex flex-col items-center py-3 gap-1 bg-slate-950 border-r border-slate-800 shrink-0">
        {NAV_ITEMS.map(({ id, icon: Icon, label, color }) => {
          const isActive = activePanel === id;
          return (
            <button
              key={id}
              onClick={() => dispatch({ type: 'SET_ACTIVE_PANEL', payload: id })}
              title={label}
              className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all
                ${isActive
                  ? 'bg-indigo-600/30 border border-indigo-500/50'
                  : 'hover:bg-slate-800 border border-transparent'
                }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-300' : color} transition-colors`} />
              <span className={`text-[8px] font-bold leading-none ${isActive ? 'text-indigo-300' : 'text-slate-600'}`}>
                {label.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Panel Content + Step Footer */}
      <div className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col h-full min-h-0">
        <div className="flex-1 overflow-y-auto min-h-0">
          {activePanel === 'upload'     && <UploadPanel />}
          {activePanel === 'crop'       && (
            <CropPanel
              onZoomIn={editorControls.zoomIn}
              onZoomOut={editorControls.zoomOut}
              onRotateLeft={editorControls.rotateLeft}
              onRotateRight={editorControls.rotateRight}
              onFlipH={editorControls.flipH}
              onFlipV={editorControls.flipV}
              onFit={editorControls.fitToCanvas}
              onReset={editorControls.resetTransform}
              onGetCroppedUrl={editorControls.getCroppedDataUrl}
            />
          )}
          {activePanel === 'template'   && <TemplatePanel onGetCroppedUrl={editorControls.getCroppedDataUrl} />}
          {activePanel === 'compliance' && <CompliancePanel />}
          {activePanel === 'layout'     && <LayoutPanel />}
          {activePanel === 'export'     && <ExportPhotoListPanel />}
        </div>

        {/* Step-by-Step Navigation Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
          {prevStep ? (
            <button
              onClick={() => dispatch({ type: 'SET_ACTIVE_PANEL', payload: prevStep })}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {nextStep ? (
            <button
              onClick={() => dispatch({ type: 'SET_ACTIVE_PANEL', payload: nextStep })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-900/40 ml-auto"
            >
              <span>Next ({getStepLabel(nextStep)})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="text-[10px] text-emerald-400 font-bold ml-auto flex items-center gap-1">
              <span>Ready for Print ✓</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
