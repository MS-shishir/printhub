import React, { useState, useEffect, useMemo } from 'react';
import { FileImage, Layers, Check, Sparkles } from 'lucide-react';
import { usePassportStore } from '../../store';
import { getTemplate } from '../../services/template.service';
import { sharedExportState, ExportPhotoItem } from '../../utils/shared-export-state';

export default function ExportPhotoListPanel() {
  const { state } = usePassportStore();
  const { processedTray, photoName, croppedImage, processedImage, originalImage, selectedTemplateId } = state;
  const template = getTemplate(selectedTemplateId);
  const currentSingleImage = croppedImage || processedImage || originalImage;

  // Build fixed photo list from processedTray if available, otherwise single active image
  const photoList = useMemo<ExportPhotoItem[]>(() => {
    if (processedTray.length > 0) {
      return processedTray.map((item, idx) => ({
        id: item.id,
        name: item.name || `Photo ${idx + 1}`,
        url: item.croppedUrl,
        widthMm: item.widthMm,
        heightMm: item.heightMm,
        templateName: getTemplate(item.templateId).name,
      }));
    }
    if (currentSingleImage) {
      return [{
        id: 'main_photo',
        name: photoName || 'Photo 1',
        url: currentSingleImage,
        widthMm: template.widthMm,
        heightMm: template.heightMm,
        templateName: template.name,
      }];
    }
    return [];
  }, [processedTray, currentSingleImage, photoName, template]);

  // Selected item ID for single photo download
  const [selectedPhotoId, setSelectedPhotoId] = useState<string>(() => {
    return photoList[0]?.id || '';
  });

  // Ensure initial active export photo is set
  useEffect(() => {
    if (photoList.length > 0) {
      const active = photoList.find(p => p.id === selectedPhotoId) || photoList[0];
      setSelectedPhotoId(active.id);
      sharedExportState.setPhoto(active);
    }
  }, [photoList]);

  const handleSelectPhoto = (item: ExportPhotoItem) => {
    setSelectedPhotoId(item.id);
    sharedExportState.setPhoto(item);
  };

  return (
    <div className="p-3.5 space-y-3.5 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Select Photo</span>
          </div>
          <p className="text-[10px] text-slate-500">
            Click photo to select for single download
          </p>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-[10px] font-bold text-indigo-300 font-mono">
          {photoList.length} Photos
        </span>
      </div>

      {/* Grid Layout (Fixed Order — No Reordering On Click) */}
      {photoList.length === 0 ? (
        <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 space-y-2">
          <FileImage className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs font-bold text-slate-400">No photos available</p>
          <p className="text-[10px] text-slate-600">Upload or crop a photo first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {photoList.map((item) => {
            const isSelected = selectedPhotoId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => handleSelectPhoto(item)}
                className={`group relative flex flex-col p-1.5 rounded-xl transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-2 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.45)] ring-1 ring-indigo-400/50'
                    : 'bg-slate-950/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Photo Thumbnail Container */}
                <div className="relative aspect-[3/3.8] w-full rounded-lg bg-slate-900 overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
                  <img
                    src={item.url}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Top-Right Glowing Checkmark Badge when selected */}
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-950 flex items-center justify-center animate-fadeIn">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Filename below thumbnail */}
                <div className="pt-1.5 pb-0.5 px-0.5 text-center">
                  <div className={`text-[10px] font-medium font-mono truncate transition-colors ${
                    isSelected ? 'text-indigo-200 font-bold' : 'text-slate-400 group-hover:text-slate-200'
                  }`}>
                    {item.name}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Information Tip */}
      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[10px] text-slate-400 space-y-1">
        <div className="font-bold text-slate-300 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Single Photo Download</span>
        </div>
        <p className="text-slate-500 leading-relaxed text-[9.5px]">
          Select any photo from the grid above, then use <strong className="text-indigo-300">Download PNG</strong> or <strong className="text-indigo-300">JPEG</strong> on the right sidebar.
        </p>
      </div>
    </div>
  );
}
