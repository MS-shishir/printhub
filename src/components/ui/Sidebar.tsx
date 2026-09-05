import React from 'react';
import { LucideIcon, ChevronRight } from 'lucide-react';
import logoImg from '../../assets/logo.png';

export interface SidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
  color?: string;
  badge?: string;
}

interface SidebarProps {
  items: SidebarItem[];
  activeId: string;
  onSelect: (id: string) => void;
  brandName?: string;
  brandSubtitle?: string;
}

export default function Sidebar({
  items,
  activeId,
  onSelect,
  brandName = 'PrintHub Studio',
  brandSubtitle = 'Mirpur Center, Dhaka'
}: SidebarProps) {
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800/80 flex flex-col justify-between p-3 space-y-3 shrink-0 overflow-y-auto select-none">
      <div className="space-y-3">
        <div className="px-3 py-2.5 flex items-center gap-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
          <div className="w-8 h-8 rounded-lg bg-slate-900/90 border border-slate-700/80 flex items-center justify-center shadow-md shadow-cyan-500/10 overflow-hidden p-1 shrink-0">
            <img src={logoImg} alt="PrintHub" className="w-full h-full object-contain drop-shadow-sm" />
          </div>
          <div>
            <h2 className="font-extrabold text-xs tracking-tight text-slate-100 uppercase">{brandName}</h2>
            <p className="text-[9px] text-indigo-400 font-bold tracking-widest uppercase mt-0.5">{brandSubtitle}</p>
          </div>
        </div>

        <nav className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/20 border border-indigo-500/30'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.color || 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-200" />}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
