import React from 'react';
import { usePassportStore } from '../store';
import BackgroundPanel from './panels/BackgroundPanel';
import LayoutSettingsPanel from './panels/LayoutSettingsPanel';
import ExportPanel from './panels/ExportPanel';
import TemplateToolsPanel from './panels/TemplateToolsPanel';

export default function RightSidebar() {
  const { state } = usePassportStore();
  const activePanel = state.activePanel;

  // Show right sidebar for crop, template, layout, and export steps
  if (!['crop', 'template', 'layout', 'export'].includes(activePanel)) {
    return null;
  }

  return (
    <div className="w-80 shrink-0 flex flex-col bg-slate-900 border-l border-slate-800 overflow-hidden h-full min-h-0 z-10 shadow-2xl">
      <div className="flex-1 overflow-y-auto min-h-0">
        {activePanel === 'crop' && <BackgroundPanel />}
        {activePanel === 'template' && <TemplateToolsPanel />}
        {activePanel === 'layout' && <LayoutSettingsPanel />}
        {activePanel === 'export' && <ExportPanel />}
      </div>
    </div>
  );
}
