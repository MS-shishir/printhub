import React from 'react';
import { Sliders, Settings2, Palette, Type, Layers } from 'lucide-react';

interface PropertyPanelProps {
  title?: string;
  children: React.ReactNode;
}

export default function PropertyPanel({
  title = 'প্রপার্টি ইন্সপেক্টর',
  children
}: PropertyPanelProps) {
  return (
    <aside className="w-72 bg-slate-900 border-l border-slate-800 flex flex-col h-full overflow-hidden select-none shrink-0">
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <span>{title}</span>
        </div>
      </div>
      <div className="p-4 overflow-y-auto space-y-5 flex-1">
        {children}
      </div>
    </aside>
  );
}
