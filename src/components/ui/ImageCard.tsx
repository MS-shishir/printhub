import React from 'react';
import { Eye, Download, Trash2, Printer } from 'lucide-react';

interface ImageCardProps {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  badge?: string;
  onPreview?: () => void;
  onPrint?: () => void;
  onDelete?: () => void;
}

export default function ImageCard({
  title,
  subtitle,
  imageUrl,
  badge,
  onPreview,
  onPrint,
  onDelete
}: ImageCardProps) {
  return (
    <div className="group relative rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 overflow-hidden transition-all duration-200 hover:shadow-xl">
      <div className="h-36 bg-slate-950 flex items-center justify-center relative overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="text-slate-600 font-mono text-xs">No Preview</div>
        )}
        {badge && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-[10px] font-bold text-amber-300">
            {badge}
          </span>
        )}
        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-xs">
          {onPreview && (
            <button
              onClick={onPreview}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              title="প্রিভিউ"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
          {onPrint && (
            <button
              onClick={onPrint}
              className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              title="প্রিন্ট করুন"
            >
              <Printer className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white transition-colors"
              title="মুছুন"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <div className="p-3">
        <h4 className="text-xs font-bold text-slate-200 truncate">{title}</h4>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
