import React from 'react';
import {
  Layers,
  Play,
  XCircle,
  Trash2,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileImage,
  ArrowDownRight
} from 'lucide-react';
import { BatchItem, AppLanguage } from '../../engines/image-optimizer/types';

interface OptimizerBatchQueueProps {
  queue: BatchItem[];
  isProcessing: boolean;
  language: AppLanguage;
  onStartBatch: () => void;
  onCancelBatch: () => void;
  onClearQueue: () => void;
  onRemoveItem: (id: string) => void;
  onSelectActiveItem: (item: BatchItem) => void;
  onDownloadAll: () => void;
}

export const OptimizerBatchQueue: React.FC<OptimizerBatchQueueProps> = ({
  queue,
  isProcessing,
  language,
  onStartBatch,
  onCancelBatch,
  onClearQueue,
  onRemoveItem,
  onSelectActiveItem,
  onDownloadAll
}) => {
  const completedCount = queue.filter(q => q.status === 'completed').length;
  const failedCount = queue.filter(q => q.status === 'failed').length;
  const totalCount = queue.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (queue.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-3 shadow-xl backdrop-blur-md">
      {/* Header & Batch Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-slate-100">
            {language === 'bn' ? 'ব্যাচ প্রসেসিং কিউ' : 'Batch Image Queue'}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
            {completedCount} / {totalCount} Done
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {isProcessing ? (
            <button
              onClick={onCancelBatch}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-bold transition border border-rose-500/30 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'বাতিল' : 'Cancel'}</span>
            </button>
          ) : (
            <button
              onClick={onStartBatch}
              disabled={completedCount === totalCount}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition disabled:opacity-40 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{language === 'bn' ? 'সবগুলো প্রসেস করুন' : 'Start Batch'}</span>
            </button>
          )}

          {completedCount > 0 && (
            <button
              onClick={onDownloadAll}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition cursor-pointer"
              title="Download All Completed Files"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'সব ডাউনলোড' : 'Download All'}</span>
            </button>
          )}

          <button
            onClick={onClearQueue}
            disabled={isProcessing}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition disabled:opacity-40"
            title="Clear Queue"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {isProcessing && (
        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
          <div
            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* Queue List */}
      <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5 pr-1">
        {queue.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectActiveItem(item)}
            className="flex items-center justify-between p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-indigo-500/40 transition cursor-pointer group"
          >
            {/* Left: Thumbnail & Name */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                {item.previewUrl ? (
                  <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <FileImage className="w-4 h-4 text-slate-500" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-200 truncate group-hover:text-indigo-300">
                  {item.file.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {formatSize(item.file.size)}
                  {item.report && (
                    <span className="text-emerald-400 ml-1.5 font-bold">
                      → {formatSize(item.report.output.sizeBytes)} ({item.report.reduction.percentage}% saved)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Status Pill & Delete Action */}
            <div className="flex items-center gap-2">
              {item.status === 'completed' && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Done</span>
                </span>
              )}
              {item.status === 'processing' && (
                <span className="flex items-center gap-1 text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md font-semibold">
                  <div className="w-2.5 h-2.5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></div>
                  <span>Running</span>
                </span>
              )}
              {item.status === 'failed' && (
                <span className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md font-semibold">
                  <AlertCircle className="w-3 h-3" />
                  <span>Failed</span>
                </span>
              )}
              {item.status === 'idle' && (
                <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded-md font-mono">
                  Ready
                </span>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveItem(item.id);
                }}
                disabled={isProcessing}
                className="p-1 text-slate-500 hover:text-rose-400 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
