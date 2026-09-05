import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface ToolbarAction {
  id: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

interface ToolbarProps {
  actions: ToolbarAction[];
  className?: string;
}

export default function Toolbar({ actions, className = '' }: ToolbarProps) {
  return (
    <div className={`flex items-center gap-1.5 p-1.5 bg-slate-900 border border-slate-800 rounded-xl select-none ${className}`}>
      {actions.map((act) => {
        const Icon = act.icon;
        return (
          <button
            key={act.id}
            onClick={act.onClick}
            disabled={act.disabled}
            title={act.label}
            className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none ${
              act.active
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline text-[11px]">{act.label}</span>
          </button>
        );
      })}
    </div>
  );
}
