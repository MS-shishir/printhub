import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

export interface NotificationProps {
  id?: string;
  type?: NotificationType;
  title: string;
  message?: string;
  isOpen: boolean;
  onClose: () => void;
  duration?: number; // Duration in ms
}

export default function Notification({
  type = 'info',
  title,
  message,
  isOpen,
  onClose,
  duration = 4000
}: NotificationProps) {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const typeConfig = {
    success: {
      icon: CheckCircle2,
      border: 'border-emerald-500/40',
      bg: 'bg-emerald-950/90',
      text: 'text-emerald-400',
    },
    warning: {
      icon: AlertTriangle,
      border: 'border-amber-500/40',
      bg: 'bg-amber-950/90',
      text: 'text-amber-400',
    },
    error: {
      icon: XCircle,
      border: 'border-rose-500/40',
      bg: 'bg-rose-950/90',
      text: 'text-rose-400',
    },
    info: {
      icon: Info,
      border: 'border-indigo-500/40',
      bg: 'bg-indigo-950/90',
      text: 'text-indigo-400',
    },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-fade-in">
      <div className={`p-4 rounded-xl border ${config.border} ${config.bg} backdrop-blur-md shadow-2xl flex items-start gap-3 text-slate-100`}>
        <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${config.text}`} />
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold">{title}</h4>
          {message && <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{message}</p>}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
