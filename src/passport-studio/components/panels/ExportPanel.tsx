import React, { useState, useEffect } from 'react';
import { Download, FileImage, FileType, Printer, Loader2, AlertCircle } from 'lucide-react';
import { usePassportStore } from '../../store';
import { useExport } from '../../hooks/useExport';
import { getTemplate } from '../../services/template.service';
import { sharedExportState, ExportPhotoItem } from '../../utils/shared-export-state';

export default function ExportPanel() {
  const { state } = usePassportStore();
  const { isExporting, exportError, downloadPNG, downloadJPEG, downloadPDF, printSheet } = useExport();
  const defaultTemplate = getTemplate(state.selectedTemplateId, state.customWidth, state.customHeight);
  const defaultImage = state.croppedImage || state.processedImage || state.originalImage;

  // Selected photo from sharedExportState
  const [selectedPhoto, setSelectedPhoto] = useState<ExportPhotoItem | null>(() => sharedExportState.getPhoto());

  useEffect(() => {
    return sharedExportState.subscribe(() => {
      setSelectedPhoto(sharedExportState.getPhoto());
    });
  }, []);

  const activePhotoUrl = selectedPhoto?.url || defaultImage;
  const activePhotoName = selectedPhoto?.name || state.photoName || 'Photo';
  const activeTemplateName = selectedPhoto?.templateName || defaultTemplate.name;
  const activeWidthMm = selectedPhoto?.widthMm || defaultTemplate.widthMm;
  const activeHeightMm = selectedPhoto?.heightMm || defaultTemplate.heightMm;

  const hasImage = !!activePhotoUrl;

  const activeTemplate = {
    ...defaultTemplate,
    name: activeTemplateName,
    widthMm: activeWidthMm,
    heightMm: activeHeightMm,
  };

  const ExportButton = ({ icon: Icon, label, sublabel, onClick, color = 'indigo', disabled = false }: {
    icon: React.ElementType;
    label: string;
    sublabel?: string;
    onClick: () => void;
    color?: 'indigo' | 'emerald' | 'violet' | 'amber';
    disabled?: boolean;
  }) => {
    const colorMap = {
      indigo: 'from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 shadow-indigo-900/30',
      emerald: 'from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 shadow-emerald-900/30',
      violet: 'from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 shadow-violet-900/30',
      amber: 'from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 shadow-amber-900/30',
    };
    return (
      <button
        onClick={onClick}
        disabled={disabled || isExporting || !hasImage}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-b ${colorMap[color]}
          text-white shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed
          hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <div className="text-left">
          <div className="text-sm font-bold">{label}</div>
          {sublabel && <div className="text-[10px] opacity-70">{sublabel}</div>}
        </div>
        {isExporting && <Loader2 className="w-4 h-4 ml-auto animate-spin" />}
      </button>
    );
  };

  return (
    <div className="p-4 space-y-4">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Export & Print</div>

      {!hasImage && (
        <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-[10px] text-amber-300">Upload and crop a photo first to enable export.</p>
        </div>
      )}

      {/* Single Photo Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          <span>Single Photo</span>
          {hasImage && (
            <span className="text-[9px] text-indigo-300 font-bold font-mono truncate max-w-[120px]">
              {activePhotoName}
            </span>
          )}
        </div>

        {hasImage && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800">
            <img src={activePhotoUrl} alt="Selected" className="w-8 h-10 object-cover rounded bg-slate-900 border border-slate-700 shrink-0" />
            <div className="min-w-0 text-[10px]">
              <div className="font-bold text-slate-200 truncate">{activePhotoName}</div>
              <div className="text-slate-500 font-mono">{activeTemplateName} ({activeWidthMm}×{activeHeightMm}mm)</div>
            </div>
          </div>
        )}
        <ExportButton
          icon={FileImage}
          label="Download PNG"
          sublabel={`${activeWidthMm}×${activeHeightMm}mm · 1200 DPI Ultra HD`}
          color="indigo"
          onClick={() => activePhotoUrl && downloadPNG(activePhotoUrl, activeTemplate)}
        />
        <ExportButton
          icon={FileImage}
          label="Download JPEG"
          sublabel="Ultra HD · 98% Quality"
          color="indigo"
          onClick={() => activePhotoUrl && downloadJPEG(activePhotoUrl, activeTemplate)}
        />
      </div>

      {/* Print Sheet Section */}
      <div className="space-y-2">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Print Sheet ({state.layoutConfig.copies} copies)
        </div>
        <ExportButton
          icon={FileType}
          label="Export PDF Sheet"
          sublabel={`${state.layoutConfig.paperSize.name} · Exact mm`}
          color="emerald"
          onClick={() => defaultImage && downloadPDF(defaultImage, defaultTemplate, state.layoutConfig, state.bgConfig.color)}
        />
        <ExportButton
          icon={Printer}
          label="🖨 Print Now"
          sublabel="Opens print dialog"
          color="violet"
          onClick={() => defaultImage && printSheet(defaultImage, defaultTemplate, state.layoutConfig, state.bgConfig.color)}
        />
      </div>

      {/* Export Status */}
      {exportError && (
        <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-[10px] text-red-300">{exportError}</p>
        </div>
      )}

      {isExporting && (
        <div className="bg-indigo-900/20 border border-indigo-700/30 rounded-lg p-3 flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />
          <p className="text-[10px] text-indigo-300 font-medium">Exporting high-resolution 1200 DPI Ultra HD image...</p>
        </div>
      )}

      {/* Quality Info */}
      <div className="border-t border-slate-700/50 pt-3 space-y-2">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Output Specs</div>
        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500">
          <div>DPI: <span className="text-slate-300">1200 Ultra HD</span></div>
          <div>Format: <span className="text-slate-300">sRGB</span></div>
          <div>Width: <span className="text-slate-300">{Math.round((activeWidthMm / 25.4) * 1200)}px</span></div>
          <div>Height: <span className="text-slate-300">{Math.round((activeHeightMm / 25.4) * 1200)}px</span></div>
        </div>
      </div>
    </div>
  );
}
