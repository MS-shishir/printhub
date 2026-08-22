import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'pills' | 'underline';
}

export default function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'pills'
}: TabsProps) {
  if (variant === 'underline') {
    return (
      <div className="flex border-b border-slate-800 space-x-4">
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`pb-2 text-xs font-bold transition-all relative flex items-center gap-2 ${
                isActive ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  isActive ? 'bg-indigo-600/30 text-indigo-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/80 space-x-1">
      {tabs.map((t) => {
        const isActive = activeTab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              isActive
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <span>{t.label}</span>
            {t.count !== undefined && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                isActive ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
