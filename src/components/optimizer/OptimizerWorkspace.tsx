import React, { useState, useEffect, useRef } from 'react';
import {
  ImageOptimizerEngine,
  OptimizationRequest,
  OptimizationReport,
  BatchItem,
  AppLanguage,
  STUDIO_PRESETS,
  StudioPreset,
  ImageAnalyzer,
  CropRegion
} from '../../engines/image-optimizer';
import { OptimizerToolbar } from './OptimizerToolbar';
import { OptimizerComparisonView } from './OptimizerComparisonView';
import { OptimizerMetricsCard } from './OptimizerMetricsCard';
import { OptimizerSettingsPanel } from './OptimizerSettingsPanel';
import { OptimizerLeftPanel } from './OptimizerLeftPanel';
import { OptimizerBatchQueue } from './OptimizerBatchQueue';

interface OptimizerWorkspaceProps {
  language: AppLanguage;
  onAddRecentFile?: (name: string, type: 'PDF' | 'Photo' | 'Passport' | 'CV' | 'Doc' | 'Design' | 'Scan') => void;
}

export const OptimizerWorkspace: React.FC<OptimizerWorkspaceProps> = ({
  language,
  onAddRecentFile
}) => {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [originalMeta, setOriginalMeta] = useState<{
    fileName: string;
    width: number;
    height: number;
    sizeBytes: number;
    format: string;
    dpi: number;
    classification?: string;
    entropy?: number;
  } | null>(null);

  const [report, setReport] = useState<OptimizationReport | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Crop & Framing State
  const [activeCrop, setActiveCrop] = useState<CropRegion | null>(null);
  const [targetAspectRatio, setTargetAspectRatio] = useState<number | undefined>(undefined);
  const [targetPresetName, setTargetPresetName] = useState<string | undefined>(undefined);

  // Active Optimization Configuration Request
  const [request, setRequest] = useState<OptimizationRequest>({
    source: '',
    mode: 'smart',
    presetId: 'balanced',
    compression: {
      mode: 'smart',
      qualityLevel: 'balanced',
      quality: 85,
      minimumQuality: 50,
      twoStageDownscale: true
    },
    resize: {
      enabled: false,
      keepAspectRatio: true,
      filter: 'lanczos3',
      targetDpi: 300
    },
    output: {
      format: 'auto',
      dpi: 300,
      preserveMetadata: true
    },
    sharpen: {
      enabled: true,
      mode: 'auto'
    }
  });

  // Batch Processor & Queue State
  const [batchQueue, setBatchQueue] = useState<BatchItem[]>([]);
  const batchProcessorRef = useRef(ImageOptimizerEngine.createBatchProcessor(3));

  // Handle Loading a New Source File (Read-Only analyze, do NOT auto-process)
  const handleLoadFile = async (file: File) => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (report?.output.dataUrl) URL.revokeObjectURL(report.output.dataUrl);

    const url = URL.createObjectURL(file);
    setCurrentFile(file);
    setOriginalUrl(url);
    setReport(null);
    setActiveCrop(null);

    // Fast image metadata & dimension extraction without modifying or compressing
    try {
      const meta = await ImageAnalyzer.detectFileMetadata(file);
      const canvas = await ImageAnalyzer.loadToCanvas(file);
      const analysis = ImageAnalyzer.analyze(canvas, meta.format, meta.dpi);

      setOriginalMeta({
        fileName: file.name,
        width: canvas.width,
        height: canvas.height,
        sizeBytes: file.size,
        format: meta.format.toUpperCase(),
        dpi: meta.dpi || 72,
        classification: analysis.classification,
        entropy: analysis.entropy
      });

      setRequest(prev => ({
        ...prev,
        source: file,
        fileName: file.name,
        fileSizeBytes: file.size
      }));
    } catch (err) {
      console.warn('Initial image load analysis warning:', err);
      setOriginalMeta({
        fileName: file.name,
        width: 0,
        height: 0,
        sizeBytes: file.size,
        format: file.type.split('/')[1]?.toUpperCase() || 'JPEG',
        dpi: 72
      });
    }
  };

  // Apply a Studio Preset & trigger aspect ratio framing box
  const handleApplyPreset = (preset: StudioPreset) => {
    if (preset.targetWidth && preset.targetHeight) {
      setTargetAspectRatio(preset.targetWidth / preset.targetHeight);
      setTargetPresetName(language === 'bn' ? preset.nameBn : preset.name);
    } else {
      setTargetAspectRatio(undefined);
      setTargetPresetName(undefined);
      setActiveCrop(null);
    }

    const newReq: Partial<OptimizationRequest> = {
      mode: preset.mode,
      presetId: preset.id,
      resize: preset.targetWidth
        ? {
            enabled: true,
            targetWidth: preset.targetWidth,
            targetHeight: preset.targetHeight,
            keepAspectRatio: true,
            targetDpi: preset.targetDpi || 300
          }
        : request.resize,
      compression: {
        mode: preset.mode,
        qualityLevel: preset.qualityLevel,
        targetSizeBytes: preset.targetMaxBytes,
        minimumQuality: 50,
        twoStageDownscale: true
      },
      output: {
        format: preset.format,
        dpi: preset.targetDpi || 300
      },
      sharpen: {
        enabled: preset.smartSharpen,
        mode: 'auto'
      }
    };

    setRequest(prev => ({ ...prev, ...newReq }));
  };

  // Run Optimization pipeline (Executed when user clicks "Optimize Image Now")
  const executeOptimization = async (
    fileToOptimize: File | null = currentFile,
    customReq?: OptimizationRequest
  ) => {
    const targetFile = fileToOptimize || currentFile;
    if (!targetFile) return;

    setIsProcessing(true);
    try {
      const activeReq = customReq || {
        ...request,
        source: targetFile,
        fileName: targetFile.name,
        fileSizeBytes: targetFile.size,
        crop: activeCrop || undefined
      };

      const result = await ImageOptimizerEngine.optimize(activeReq);
      setReport(result);

      if (onAddRecentFile) {
        onAddRecentFile(result.output.fileName, 'Photo');
      }
    } catch (err: any) {
      console.error('Optimization error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Upload multiple files / Drag & Drop
  const handleUploadFiles = (files: File[]) => {
    if (files.length === 0) return;

    if (files.length === 1 && batchQueue.length === 0) {
      handleLoadFile(files[0]);
    } else {
      // Add to batch queue
      const newItems = batchProcessorRef.current.addFiles(files, request);
      setBatchQueue([...batchProcessorRef.current.getQueue()]);

      // If no file is actively previewed, load the first one
      if (!currentFile) {
        handleLoadFile(files[0]);
      }
    }
  };

  // Batch Execution Handlers
  const handleStartBatch = async () => {
    setIsProcessing(true);
    await batchProcessorRef.current.processBatch((current, total, activeItem) => {
      setBatchQueue([...batchProcessorRef.current.getQueue()]);
      if (activeItem.report && activeItem.file === currentFile) {
        setReport(activeItem.report);
      }
    });
    setBatchQueue([...batchProcessorRef.current.getQueue()]);
    setIsProcessing(false);
  };

  const handleCancelBatch = () => {
    batchProcessorRef.current.cancel();
    setBatchQueue([...batchProcessorRef.current.getQueue()]);
    setIsProcessing(false);
  };

  const handleClearQueue = () => {
    batchProcessorRef.current.clearQueue();
    setBatchQueue([]);
  };

  const handleRemoveQueueItem = (id: string) => {
    batchProcessorRef.current.removeItem(id);
    setBatchQueue([...batchProcessorRef.current.getQueue()]);
  };

  // Download Current Optimized File
  const handleDownloadCurrent = () => {
    if (!report) return;
    const link = document.createElement('a');
    link.href = report.output.dataUrl;
    link.download = report.output.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy to System Clipboard
  const handleCopyToClipboard = async () => {
    if (!report) return;
    try {
      const item = new ClipboardItem({ [report.output.blob.type]: report.output.blob });
      await navigator.clipboard.write([item]);
    } catch (err) {
      console.warn('Direct image clipboard write failed:', err);
    }
  };

  // Cross-module Transfer
  const handleTransferToModule = (module: 'passport' | 'photo' | 'document') => {
    if (!report) return;

    if (module === 'passport') {
      window.dispatchEvent(
        new CustomEvent('printhub:load-passport-photo', {
          detail: {
            dataUrl: report.output.dataUrl,
            fileName: report.output.fileName
          }
        })
      );
      window.dispatchEvent(
        new CustomEvent('printhub:switch-module', { detail: 'passport' })
      );
    } else if (module === 'photo') {
      window.dispatchEvent(
        new CustomEvent('printhub:load-photo-file', {
          detail: {
            dataUrl: report.output.dataUrl,
            fileName: report.output.fileName
          }
        })
      );
      window.dispatchEvent(
        new CustomEvent('printhub:switch-module', { detail: 'photo' })
      );
    }
  };

  // Drag and drop listeners
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden relative select-none font-sans"
    >
      {/* ── Top Workspace Toolbar ───────────────────────────────────────────── */}
      <OptimizerToolbar
        report={report}
        language={language}
        isProcessing={isProcessing}
        onUploadFiles={handleUploadFiles}
        onDownloadCurrent={handleDownloadCurrent}
        onCopyToClipboard={handleCopyToClipboard}
        onTransferToModule={handleTransferToModule}
        onReset={() => {
          if (originalUrl) URL.revokeObjectURL(originalUrl);
          if (report?.output.dataUrl) URL.revokeObjectURL(report.output.dataUrl);
          setCurrentFile(null);
          setOriginalUrl(null);
          setOriginalMeta(null);
          setReport(null);
          setActiveCrop(null);
          setTargetAspectRatio(undefined);
          setTargetPresetName(undefined);
        }}
      />

      {/* ── Main Workspace Body (Balanced 2-Sided 3-Column Layout) ──────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* 1. LEFT PANEL: Clean Studio Presets, Print Sizes & Input Info */}
        <OptimizerLeftPanel
          request={request}
          language={language}
          originalMeta={originalMeta}
          onChangeRequest={(newReq) => {
            setRequest(prev => ({ ...prev, ...newReq }));
          }}
          onApplyPreset={handleApplyPreset}
        />

        {/* 2. CENTER STAGE: Clean Viewport with Framing Box & Bottom HUD */}
        <div className="flex-1 flex flex-col p-3 gap-3 min-w-0 overflow-hidden bg-slate-950">
          <OptimizerComparisonView
            originalUrl={originalUrl}
            optimizedUrl={report?.output.dataUrl || null}
            report={report}
            language={language}
            isProcessing={isProcessing}
            activeCrop={activeCrop}
            targetAspectRatio={targetAspectRatio}
            targetPresetName={targetPresetName}
            onCropChange={(crop) => setActiveCrop(crop)}
            onUploadFiles={handleUploadFiles}
          />

          {/* Bottom HUD: Real-time Metric Cards & Batch Queue */}
          <div className="flex flex-col gap-2.5 shrink-0">
            <OptimizerMetricsCard
              report={report}
              originalMeta={originalMeta}
              language={language}
              isProcessing={isProcessing}
              onRunOptimization={() => executeOptimization()}
            />

            {batchQueue.length > 0 && (
              <OptimizerBatchQueue
                queue={batchQueue}
                isProcessing={isProcessing}
                language={language}
                onStartBatch={handleStartBatch}
                onCancelBatch={handleCancelBatch}
                onClearQueue={handleClearQueue}
                onRemoveItem={handleRemoveQueueItem}
                onSelectActiveItem={(item) => {
                  handleLoadFile(item.file);
                }}
                onDownloadAll={() => {
                  batchQueue
                    .filter(q => q.report)
                    .forEach(q => {
                      if (!q.report) return;
                      const a = document.createElement('a');
                      a.href = q.report.output.dataUrl;
                      a.download = q.report.output.fileName;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    });
                }}
              />
            )}
          </div>
        </div>

        {/* 3. RIGHT PANEL: Granular Mode, Target Size, Resize & Compression Controls */}
        <OptimizerSettingsPanel
          request={request}
          language={language}
          isProcessing={isProcessing}
          hasFileLoaded={!!currentFile}
          onChangeRequest={(newReq) => {
            setRequest(prev => ({ ...prev, ...newReq }));
          }}
          onRunOptimization={() => executeOptimization()}
        />
      </div>

      {/* Drag & Drop Visual Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-indigo-950/80 border-4 border-dashed border-indigo-500 z-50 flex flex-col items-center justify-center backdrop-blur-sm pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-indigo-600/30 flex items-center justify-center text-indigo-300 animate-bounce">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white mt-3">
            {language === 'bn' ? 'ফাইলগুলো এখানে ছেড়ে দিন' : 'Drop Images to Optimize'}
          </h2>
          <p className="text-xs text-indigo-300">
            {language === 'bn' ? 'একাধিক ছবি একসাথে ব্যাচ অপ্টিমাইজ হবে' : 'Multiple images will be queued for batch processing'}
          </p>
        </div>
      )}
    </div>
  );
};

export default OptimizerWorkspace;
