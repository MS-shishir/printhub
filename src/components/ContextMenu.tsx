import React, { useEffect, useRef } from 'react';
import { Printer, Crop, Sparkles, FileText, Download, Trash2, Copy, Eye, ZoomIn } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
  onAction: (actionId: string) => void;
}

export default function ContextMenu({ x, y, isOpen, onClose, onAction }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const menuItems = [
    { id: 'print', label: 'সরাসরি প্রিন্ট প্রিভিউ', icon: Printer, shortcut: 'Ctrl+P' },
    { id: 'optimize', label: 'স্মার্ট সাইজ অপ্টিমাইজার (KB/MB)', icon: Sparkles, shortcut: 'Alt+4' },
    { id: 'crop', label: 'ছবি ক্রপ ও এডিট', icon: Crop },
    { id: 'bg-remove', label: 'ব্যাকগ্রাউন্ড চেঞ্জ করুন', icon: Sparkles },
    { id: 'pdf', label: 'PDF ফাইলে সেভ করুন', icon: FileText },
    { id: 'duplicate', label: 'ডুপ্লিকেট কপি বানান', icon: Copy },
    { id: 'view', label: 'জুম করে ফুল ভিউ দেখুন', icon: ZoomIn },
    { id: 'delete', label: 'মুছে ফেলুন', icon: Trash2, color: 'text-rose-400 hover:bg-rose-500/10' },
  ];

  return (
    <div
      ref={menuRef}
      style={{ top: `${y}px`, left: `${x}px` }}
      className="fixed z-50 w-60 bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl overflow-hidden p-1.5 backdrop-blur-md animate-fade-in"
    >
      <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 border-b border-slate-800 uppercase tracking-wider">
        স্টুডিও কুইক অপশন (Right Click)
      </div>
      <div className="py-1 space-y-0.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                onAction(item.id);
                onClose();
              }}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-xs font-medium transition-colors ${
                item.color || 'text-slate-200 hover:bg-indigo-600/20 hover:text-indigo-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.shortcut && (
                <span className="text-[10px] font-mono text-slate-400">{item.shortcut}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
