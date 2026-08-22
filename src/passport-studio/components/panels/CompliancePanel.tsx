import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, RefreshCw, Loader2, Info } from 'lucide-react';
import { usePassportStore } from '../../store';
import { getTemplate } from '../../services/template.service';
import { checkPassportCompliance, ComplianceReport, ComplianceItem } from '../../services/compliance.service';

export default function CompliancePanel() {
  const { state, dispatch } = usePassportStore();
  const template = getTemplate(state.selectedTemplateId);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pass' | 'warn'>('all');

  const image = state.croppedImage || state.processedImage || state.originalImage;

  const runCheck = useCallback(async () => {
    if (!image) return;
    setIsChecking(true);
    try {
      const res = await checkPassportCompliance(
        image,
        template,
        state.faceDetection,
        state.imageNaturalWidth,
        state.imageNaturalHeight
      );
      setReport(res);
    } catch (err) {
      console.warn('[ComplianceCheck]', err);
    } finally {
      setIsChecking(false);
    }
  }, [image, template, state.faceDetection, state.imageNaturalWidth, state.imageNaturalHeight]);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  if (!image) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Compliance Checker</div>
        <div className="bg-slate-800/40 rounded-xl p-4 text-center space-y-2 border border-slate-700/40">
          <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs font-semibold text-slate-400">Upload a photo to run compliance checks</p>
        </div>
      </div>
    );
  }

  const filteredItems: ComplianceItem[] = report?.items.filter((item) => {
    if (filter === 'pass') return item.status === 'pass';
    if (filter === 'warn') return item.status !== 'pass';
    return true;
  }) ?? [];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Compliance Checker</div>
        <button
          onClick={runCheck}
          disabled={isChecking}
          title="Re-verify compliance"
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-30"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Overall Status Card */}
      {report && (
        <div
          className={`rounded-xl p-4 border transition-all ${
            report.overallStatus === 'pass'
              ? 'bg-emerald-950/40 border-emerald-500/30'
              : report.overallStatus === 'warn'
                ? 'bg-amber-950/40 border-amber-500/30'
                : 'bg-red-950/40 border-red-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shadow-lg ${
                  report.overallStatus === 'pass'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : report.overallStatus === 'warn'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
              >
                {report.score}%
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">
                    {report.overallStatus === 'pass'
                      ? 'Fully Compliant'
                      : report.overallStatus === 'warn'
                        ? 'Minor Warnings'
                        : 'Compliance Issues'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Passed {report.passedCount} of {report.totalCount} checks for {template.flag} {template.name}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      {report && (
        <div className="grid grid-cols-3 gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800 text-[10px]">
          <button
            onClick={() => setFilter('all')}
            className={`py-1 rounded font-bold transition-all ${filter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            All ({report.items.length})
          </button>
          <button
            onClick={() => setFilter('pass')}
            className={`py-1 rounded font-bold transition-all ${filter === 'pass' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Passed ({report.passedCount})
          </button>
          <button
            onClick={() => setFilter('warn')}
            className={`py-1 rounded font-bold transition-all ${filter === 'warn' ? 'bg-amber-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Warnings ({report.totalCount - report.passedCount})
          </button>
        </div>
      )}

      {/* Verification List */}
      <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
        {isChecking ? (
          <div className="py-8 text-center space-y-2">
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Verifying passport rules…</p>
          </div>
        ) : (
          filteredItems.map((item) => <ItemRow key={item.id} item={item} />)
        )}
      </div>

      {/* Next Step Button */}
      <button
        onClick={() => dispatch({ type: 'SET_ACTIVE_PANEL', payload: 'layout' })}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-lg shadow-indigo-900/30 transition-all mt-2"
      >
        <span>Next: Layout Settings →</span>
      </button>
    </div>
  );
}

const ItemRow: React.FC<{ item: ComplianceItem }> = ({ item }) => {
  const isPass = item.status === 'pass';
  const isWarn = item.status === 'warn';

  return (
    <div
      className={`p-2.5 rounded-lg border text-xs transition-all ${
        isPass
          ? 'bg-slate-800/40 border-slate-700/40'
          : isWarn
            ? 'bg-amber-950/20 border-amber-500/30'
            : 'bg-red-950/20 border-red-500/30'
      }`}
    >
      <div className="flex items-start gap-2">
        {isPass ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        ) : isWarn ? (
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        ) : (
          <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 truncate">{item.label}</span>
            <span
              className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                isPass ? 'bg-emerald-950/60 text-emerald-300' : 'bg-amber-950/60 text-amber-300'
              }`}
            >
              {item.valueStr}
            </span>
          </div>
          {item.details && <p className="text-[10px] text-slate-400 mt-0.5">{item.details}</p>}
        </div>
      </div>
    </div>
  );
}
