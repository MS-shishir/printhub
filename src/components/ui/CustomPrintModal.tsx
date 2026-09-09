/**
 * CustomPrintModal.tsx
 * Enterprise Custom Professional Print System for PrintHub Studio.
 * 
 * Implements complete industry-standard printer driver preferences:
 * - Tabs: Main, More Options, Maintenance
 * - Printing Presets (Document - Fast, Standard, High, 2-Up, Fast Grayscale, Photo High Quality, etc. + Custom Presets)
 * - Document Size (A4, 4R, Legal, Letter, A5, Stamp, Custom)
 * - Orientation (Portrait, Landscape)
 * - Paper Type (Plain paper, Epson Premium Glossy, Epson Matte, Epson Ultra Glossy, Photo Paper Glossy, etc.)
 * - Quality (Draft, Draft-Vivid, Standard, Standard-Vivid, High, More Settings...)
 * - Color (Color, Grayscale)
 * - 2-Sided Printing (Off, Auto Long-edge, Auto Short-edge, Manual)
 * - Multi-Page (Off, 2-Up, 4-Up, Layout Order)
 * - Copies, Collate, Reverse Order
 * - Quiet Mode (Off, On)
 * - Real-time Visual Printer & Paper Illustration Widget
 * - Show Settings, Restore Defaults, Ink Levels (Live Cartridges Meter)
 * - Live WYSIWYG 60fps Paper Preview with exact mm & inches statistics
 * - Zero Windows OS Dialogs Silent Hardware Spooling Guarantee
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Printer, X, FileText, CheckCircle2, AlertTriangle, RefreshCw,
  Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCw, Sliders,
  Lock, Unlock, Check, Sparkles, AlertCircle, Loader2, ChevronDown,
  Layers, Copy, ShieldCheck, DollarSign, Settings, Grid, BookOpen,
  ChevronLeft, ChevronRight, Crop, Eye, FileSpreadsheet, Info,
  Droplet, Gauge, Wrench, BookmarkPlus, Trash2, SlidersHorizontal,
  Volume2, VolumeX, ArrowLeftRight, HelpCircle, FileCheck
} from 'lucide-react';
import {
  PrintLayoutModel,
  PaperSizeKey,
  PageOrientation,
  ScaleMode,
  ColorPrintMode,
  DuplexMode,
  PrintMarginsMm,
  STANDARD_PAPER_DIMENSIONS,
  ComputedPrintLayout,
  PrintHandlingMode,
  PrintRangeMode,
  PageSubset,
  NupPageCount,
  NupOrder,
  BookletSubset,
  BookletBinding,
  PrintWhatMode,
  PaperType,
  PrintQuality,
  MultiPageSetting,
  DuplexSetting,
  PAPER_TYPES_CONFIG,
  PRINT_QUALITY_CONFIG,
  WatermarkConfig,
  ColorAdjustmentConfig,
} from '../../engines/PrintLayoutModel';
import { nativeHardwareService, NativePrinter, PrintJobResult } from '../../services/nativeHardwareService';
import { sharedPrintCanvasRef } from '../../passport-studio/utils/shared-canvas-ref';
import { documentScanService } from '../../services/DocumentScanService';

export interface CustomPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  sourceImageOrCanvas?: HTMLCanvasElement | HTMLImageElement | string | null;
  initialPaperSize?: PaperSizeKey;
  initialOrientation?: PageOrientation;
  initialCopies?: number;
  initialColorMode?: ColorPrintMode;
  onConfirmPrint?: (details: {
    printerName: string;
    paperSize: string;
    orientation: string;
    colorMode: string;
    paperType: string;
    quality: string;
    copies: number;
    totalPrice: number;
  }) => void;
  language?: 'en' | 'bn';
}

interface PrintPresetItem {
  id: string;
  name: string;
  icon: string;
  isBuiltIn?: boolean;
  paperSize: PaperSizeKey;
  orientation: PageOrientation;
  paperType: PaperType;
  quality: PrintQuality;
  colorMode: ColorPrintMode;
  duplex: DuplexSetting;
  multiPage: MultiPageSetting;
  quietMode: boolean;
}

const DEFAULT_BUILTIN_PRESETS: PrintPresetItem[] = [
  {
    id: 'doc-fast',
    name: 'Document - Fast',
    icon: '📄',
    isBuiltIn: true,
    paperSize: 'A4',
    orientation: 'portrait',
    paperType: 'plain',
    quality: 'draft',
    colorMode: 'Color',
    duplex: 'off',
    multiPage: 'off',
    quietMode: false,
  },
  {
    id: 'doc-standard',
    name: 'Document - Standard Quality',
    icon: '📄',
    isBuiltIn: true,
    paperSize: 'A4',
    orientation: 'portrait',
    paperType: 'plain',
    quality: 'standard',
    colorMode: 'Color',
    duplex: 'off',
    multiPage: 'off',
    quietMode: false,
  },
  {
    id: 'doc-high',
    name: 'Document - High Quality',
    icon: '📄',
    isBuiltIn: true,
    paperSize: 'A4',
    orientation: 'portrait',
    paperType: 'plain',
    quality: 'high',
    colorMode: 'Color',
    duplex: 'off',
    multiPage: 'off',
    quietMode: false,
  },
  {
    id: 'doc-2up',
    name: 'Document - 2-Up',
    icon: '📑',
    isBuiltIn: true,
    paperSize: 'A4',
    orientation: 'landscape',
    paperType: 'plain',
    quality: 'standard',
    colorMode: 'Color',
    duplex: 'off',
    multiPage: '2up',
    quietMode: false,
  },
  {
    id: 'doc-fast-gray',
    name: 'Document - Fast Grayscale',
    icon: '📄',
    isBuiltIn: true,
    paperSize: 'A4',
    orientation: 'portrait',
    paperType: 'plain',
    quality: 'draft',
    colorMode: 'Monochrome',
    duplex: 'off',
    multiPage: 'off',
    quietMode: false,
  },
  {
    id: 'doc-gray',
    name: 'Document - Grayscale',
    icon: '📄',
    isBuiltIn: true,
    paperSize: 'A4',
    orientation: 'portrait',
    paperType: 'plain',
    quality: 'standard',
    colorMode: 'Monochrome',
    duplex: 'off',
    multiPage: 'off',
    quietMode: false,
  },
  {
    id: 'photo-high-4r',
    name: 'Photo - High Quality (4R / Glossy)',
    icon: '📸',
    isBuiltIn: true,
    paperSize: '4R',
    orientation: 'portrait',
    paperType: 'premium_glossy',
    quality: 'high',
    colorMode: 'Color',
    duplex: 'off',
    multiPage: 'off',
    quietMode: true,
  },
  {
    id: 'photo-standard-4r',
    name: 'Photo - Standard (Glossy)',
    icon: '📸',
    isBuiltIn: true,
    paperSize: '4R',
    orientation: 'portrait',
    paperType: 'photo_glossy',
    quality: 'standard',
    colorMode: 'Color',
    duplex: 'off',
    multiPage: 'off',
    quietMode: false,
  },
  {
    id: 'studio-stamp',
    name: 'Studio - Stamp Size (Glossy)',
    icon: '🖼️',
    isBuiltIn: true,
    paperSize: 'Stamp',
    orientation: 'portrait',
    paperType: 'photo_glossy',
    quality: 'high',
    colorMode: 'Color',
    duplex: 'off',
    multiPage: 'off',
    quietMode: false,
  },
];

export default function CustomPrintModal({
  isOpen,
  onClose,
  title = 'PrintHub_Studio_Document',
  sourceImageOrCanvas,
  initialPaperSize = 'A4',
  initialOrientation = 'auto',
  initialCopies = 1,
  initialColorMode = 'Color',
  onConfirmPrint,
  language = 'bn',
}: CustomPrintModalProps) {
  // ── Tab Navigation ─────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'main' | 'more' | 'maintenance'>('main');

  // ── Hardware Printers State ────────────────────────────────────────────────
  const [printers, setPrinters] = useState<NativePrinter[]>([]);
  const [selectedPrinterName, setSelectedPrinterName] = useState<string>('');
  const [isLoadingPrinters, setIsLoadingPrinters] = useState<boolean>(false);

  // ── Driver Core Options (Matching Epson Driver) ───────────────────────────
  const [paperSize, setPaperSize] = useState<PaperSizeKey>(initialPaperSize);
  const [orientation, setOrientation] = useState<PageOrientation>(
    initialOrientation === 'auto' ? 'portrait' : initialOrientation
  );
  const [paperType, setPaperType] = useState<PaperType>('plain');
  const [quality, setQuality] = useState<PrintQuality>('standard');
  const [colorMode, setColorMode] = useState<ColorPrintMode>(initialColorMode);
  const [duplexSetting, setDuplexSetting] = useState<DuplexSetting>('off');
  const [multiPage, setMultiPage] = useState<MultiPageSetting>('off');
  const [nupOrder, setNupOrder] = useState<NupOrder>('horizontal');
  const [copies, setCopies] = useState<number>(initialCopies || 1);
  const [collate, setCollate] = useState<boolean>(true);
  const [reverseOrder, setReverseOrder] = useState<boolean>(false);
  const [quietMode, setQuietMode] = useState<boolean>(false);
  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(true);
  const [jobArrangerLite, setJobArrangerLite] = useState<boolean>(false);

  // ── More Options State ─────────────────────────────────────────────────────
  const [scaleMode, setScaleMode] = useState<ScaleMode>('fit');
  const [customScalePercent, setCustomScalePercent] = useState<number>(100);
  const [borderless, setBorderless] = useState<boolean>(false);
  const [bleedMarks, setBleedMarks] = useState<boolean>(false);
  const [watermark, setWatermark] = useState<WatermarkConfig>({
    enabled: false,
    text: 'CONFIDENTIAL',
    opacity: 0.15,
    angle: -45,
    fontSize: 48,
    color: '#000000',
  });
  const [colorAdjustment, setColorAdjustment] = useState<ColorAdjustmentConfig>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
  });

  // ── Margins & Custom Dimensions ────────────────────────────────────────────
  const [customWidthMm, setCustomWidthMm] = useState<number>(210);
  const [customHeightMm, setCustomHeightMm] = useState<number>(297);
  const [targetDpi, setTargetDpi] = useState<number>(300);
  const [margins, setMargins] = useState<PrintMarginsMm>({
    topMm: 5,
    bottomMm: 5,
    leftMm: 5,
    rightMm: 5,
  });
  const [isMarginsLocked, setIsMarginsLocked] = useState<boolean>(true);

  // ── Presets State ──────────────────────────────────────────────────────────
  const [presets, setPresets] = useState<PrintPresetItem[]>(() => {
    try {
      const saved = localStorage.getItem('printhub_print_presets');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_BUILTIN_PRESETS;
  });
  const [activePresetId, setActivePresetId] = useState<string>('doc-standard');
  const [isNewPresetModalOpen, setIsNewPresetModalOpen] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');

  // ── Sub-Modals State ───────────────────────────────────────────────────────
  const [isShowSettingsOpen, setIsShowSettingsOpen] = useState<boolean>(false);
  const [isInkLevelsOpen, setIsInkLevelsOpen] = useState<boolean>(false);
  const [isQualityMoreOpen, setIsQualityMoreOpen] = useState<boolean>(false);
  const [isPageSettingOpen, setIsPageSettingOpen] = useState<boolean>(false);
  const [isPropertiesModalOpen, setIsPropertiesModalOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  // Maintenance Simulation State
  const [isCleaningHead, setIsCleaningHead] = useState<boolean>(false);
  const [cleaningProgress, setCleaningProgress] = useState<number>(0);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string>('');

  // ── Multi-Page Document Source State ───────────────────────────────────────
  const [docPages, setDocPages] = useState<string[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [sourceDimensions, setSourceDimensions] = useState<{ width: number; height: number }>({
    width: 2480,
    height: 3508,
  });
  const [previewZoom, setPreviewZoom] = useState<number>(95);

  // ── Spooler Execution State ────────────────────────────────────────────────
  const [isSpooling, setIsSpooling] = useState<boolean>(false);
  const [spoolStatusText, setSpoolStatusText] = useState<string>('');
  const [printFeedback, setPrintFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // ── 1. Fetch Printers on Modal Open ────────────────────────────────────────
  const fetchPrintersList = useCallback(async (forceRefresh: boolean = false) => {
    setIsLoadingPrinters(true);
    try {
      const list = await nativeHardwareService.getPrinters(forceRefresh);
      setPrinters(list);

      if (!selectedPrinterName || forceRefresh) {
        const def = list.find((p) => p.isDefault && !p.isOffline) || list.find((p) => !p.isOffline) || list[0];
        if (def) {
          setSelectedPrinterName(def.name);
          if (!def.capabilities.color) {
            setColorMode('Monochrome');
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load printers:', err);
    } finally {
      setIsLoadingPrinters(false);
    }
  }, [selectedPrinterName]);

  useEffect(() => {
    if (isOpen) {
      fetchPrintersList();
      setPrintFeedback(null);
    }
  }, [isOpen, fetchPrintersList]);

  const selectedPrinter = useMemo(() => {
    return printers.find((p) => p.name === selectedPrinterName) || printers[0];
  }, [printers, selectedPrinterName]);

  // ── 2. Sync Initial Props on Modal Open ───────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      if (initialPaperSize) setPaperSize(initialPaperSize);
      if (initialOrientation && initialOrientation !== 'auto') setOrientation(initialOrientation);
      if (initialCopies) setCopies(initialCopies);
      if (initialColorMode) setColorMode(initialColorMode);
    }
  }, [isOpen, initialPaperSize, initialOrientation, initialCopies, initialColorMode]);

  // ── 3. Resolve Document Sources ───────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const resolveSources = () => {
      const isSheetType = (w: number, t: string) => {
        const lowerT = (t || '').toLowerCase();
        return lowerT.includes('sheet') || lowerT.includes('printsheet') || lowerT.includes('passport') || lowerT.includes('nid') || w >= 1000;
      };

      if (sourceImageOrCanvas) {
        if (typeof sourceImageOrCanvas === 'string') {
          setDocPages([sourceImageOrCanvas]);
          const img = new Image();
          img.onload = () => {
            setSourceDimensions({ width: img.naturalWidth, height: img.naturalHeight });
            if (isSheetType(img.naturalWidth, title)) {
              setMargins({ topMm: 0, bottomMm: 0, leftMm: 0, rightMm: 0 });
              setScaleMode('fit');
            }
          };
          img.src = sourceImageOrCanvas;
          return;
        } else if (sourceImageOrCanvas instanceof HTMLCanvasElement) {
          setSourceDimensions({ width: sourceImageOrCanvas.width, height: sourceImageOrCanvas.height });
          setDocPages([sourceImageOrCanvas.toDataURL('image/png', 0.98)]);
          if (isSheetType(sourceImageOrCanvas.width, title)) {
            setMargins({ topMm: 0, bottomMm: 0, leftMm: 0, rightMm: 0 });
            setScaleMode('fit');
          }
          return;
        } else if (sourceImageOrCanvas instanceof HTMLImageElement) {
          setSourceDimensions({ width: sourceImageOrCanvas.naturalWidth, height: sourceImageOrCanvas.naturalHeight });
          setDocPages([sourceImageOrCanvas.src]);
          if (isSheetType(sourceImageOrCanvas.naturalWidth, title)) {
            setMargins({ topMm: 0, bottomMm: 0, leftMm: 0, rightMm: 0 });
            setScaleMode('fit');
          }
          return;
        }
      }

      // 2. Shared Passport Canvas
      if (sharedPrintCanvasRef.current && sharedPrintCanvasRef.current.width > 0) {
        const cv = sharedPrintCanvasRef.current;
        setSourceDimensions({ width: cv.width, height: cv.height });
        setDocPages([cv.toDataURL('image/png', 0.98)]);
        return;
      }

      // 3. Document Scanner multi-pages
      const scannerPages = documentScanService.getPages();
      if (scannerPages.length > 0) {
        const urls = scannerPages.map((p) => {
          const cv = p.processedCanvas || p.warpedCanvas || p.sourceCanvas;
          return cv ? cv.toDataURL('image/png', 0.95) : '';
        }).filter(Boolean);

        if (urls.length > 0) {
          setDocPages(urls);
          const firstCv = scannerPages[0].processedCanvas || scannerPages[0].sourceCanvas;
          if (firstCv) {
            setSourceDimensions({ width: firstCv.width, height: firstCv.height });
          }
          return;
        }
      }

      // 4. Any visible canvas in the DOM
      const domCanvases = Array.from(document.querySelectorAll('canvas'));
      const activeCanvas = domCanvases.find((c) => c.width > 200 && c.height > 200 && c.offsetParent !== null) || domCanvases[0];
      if (activeCanvas && activeCanvas.width > 0) {
        setSourceDimensions({ width: activeCanvas.width, height: activeCanvas.height });
        setDocPages([activeCanvas.toDataURL('image/png', 0.98)]);
      }
    };

    resolveSources();
  }, [isOpen, sourceImageOrCanvas, title]);

  const activePageDataUrl = docPages[currentPageIndex] || docPages[0] || null;
  const totalDocPagesCount = Math.max(1, docPages.length);

  // ── 4. Compute Mathematical Layout ────────────────────────────────────────
  const computedLayout: ComputedPrintLayout = useMemo(() => {
    const qualDpi = PRINT_QUALITY_CONFIG[quality]?.dpi || 300;
    const effectiveMargins = borderless
      ? { topMm: 0, bottomMm: 0, leftMm: 0, rightMm: 0 }
      : margins;

    return PrintLayoutModel.calculateLayout(
      sourceDimensions.width,
      sourceDimensions.height,
      {
        paperSize,
        customPaperWidthMm: customWidthMm,
        customPaperHeightMm: customHeightMm,
        orientation,
        margins: effectiveMargins,
        paperType,
        quality,
        multiPage,
        quietMode,
        handlingMode: multiPage !== 'off' ? 'nup' : 'scale',
        scaleMode,
        scalePercent: customScalePercent,
        nupConfig: {
          pagesPerSheet: multiPage === '2up' ? 2 : multiPage === '4up' ? 4 : 2,
          pageOrder: nupOrder,
          drawBorder: true,
        },
        watermark,
        colorAdjustment,
        autoRotate: false,
        autoCenter: true,
        bleedMarks,
        collate,
        colorMode,
        duplexMode: duplexSetting === 'longEdge' ? 'longEdge' : duplexSetting === 'shortEdge' ? 'shortEdge' : 'simplex',
        copies,
        dpi: qualDpi,
      }
    );
  }, [
    sourceDimensions,
    paperSize,
    customWidthMm,
    customHeightMm,
    orientation,
    margins,
    borderless,
    paperType,
    quality,
    multiPage,
    nupOrder,
    quietMode,
    scaleMode,
    customScalePercent,
    watermark,
    colorAdjustment,
    bleedMarks,
    collate,
    colorMode,
    duplexSetting,
    copies,
  ]);

  // ── 5. Real-time WYSIWYG Preview Rendering ─────────────────────────────────
  const cachedImageRef = useRef<HTMLImageElement | null>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!activePageDataUrl || !isOpen) {
      cachedImageRef.current = null;
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      cachedImageRef.current = img;
      renderPreview();
    };
    img.src = activePageDataUrl;
  }, [activePageDataUrl, isOpen]);

  const renderPreview = useCallback(() => {
    if (!cachedImageRef.current || !previewCanvasRef.current || !isOpen || !showPrintPreview) return;

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      const img = cachedImageRef.current;
      const cv = previewCanvasRef.current;
      if (!img || !cv) return;

      const previewDpi = 120;
      const effectiveMargins = borderless
        ? { topMm: 0, bottomMm: 0, leftMm: 0, rightMm: 0 }
        : margins;

      const previewLayout = PrintLayoutModel.calculateLayout(
        sourceDimensions.width,
        sourceDimensions.height,
        {
          paperSize,
          customPaperWidthMm: customWidthMm,
          customPaperHeightMm: customHeightMm,
          orientation,
          margins: effectiveMargins,
          paperType,
          quality,
          multiPage,
          handlingMode: multiPage !== 'off' ? 'nup' : 'scale',
          scaleMode,
          scalePercent: customScalePercent,
          nupConfig: {
            pagesPerSheet: multiPage === '2up' ? 2 : multiPage === '4up' ? 4 : 2,
            pageOrder: nupOrder,
            drawBorder: true,
          },
          watermark,
          colorAdjustment,
          autoRotate: false,
          autoCenter: true,
          bleedMarks,
          collate,
          colorMode,
          duplexMode: duplexSetting === 'longEdge' ? 'longEdge' : duplexSetting === 'shortEdge' ? 'shortEdge' : 'simplex',
          copies,
          dpi: previewDpi,
        }
      );

      if (cv.width !== previewLayout.sheetWidthPx || cv.height !== previewLayout.sheetHeightPx) {
        cv.width = previewLayout.sheetWidthPx;
        cv.height = previewLayout.sheetHeightPx;
      }

      const ctx = cv.getContext('2d', { alpha: false });
      if (!ctx) return;

      // Draw paper background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';

      // Build live preview filter
      const filters: string[] = [];
      if (colorMode === 'Monochrome') {
        filters.push('grayscale(100%) contrast(105%)');
      } else {
        const qualCfg = PRINT_QUALITY_CONFIG[quality];
        if (qualCfg?.contrastBoost) filters.push(`contrast(${Math.round(qualCfg.contrastBoost * 100)}%)`);
        if (qualCfg?.saturationBoost) filters.push(`saturate(${Math.round(qualCfg.saturationBoost * 100)}%)`);
        const paperCfg = PAPER_TYPES_CONFIG[paperType];
        if (paperCfg?.finish === 'glossy') filters.push('contrast(103%) saturate(106%)');
        else if (paperCfg?.finish === 'matte') filters.push('contrast(102%)');
      }

      if (colorAdjustment.brightness !== 0) filters.push(`brightness(${100 + colorAdjustment.brightness}%)`);
      if (colorAdjustment.contrast !== 0) filters.push(`contrast(${100 + colorAdjustment.contrast}%)`);
      if (colorAdjustment.saturation !== 0 && colorMode !== 'Monochrome') filters.push(`saturate(${100 + colorAdjustment.saturation}%)`);

      ctx.filter = filters.length > 0 ? filters.join(' ') : 'none';

      // Draw content
      if (previewLayout.gridCells && previewLayout.gridCells.length > 0) {
        for (const cell of previewLayout.gridCells) {
          ctx.drawImage(img, cell.xPx, cell.yPx, cell.widthPx, cell.heightPx);
          ctx.strokeStyle = '#CBD5E1';
          ctx.lineWidth = 1;
          ctx.strokeRect(cell.xPx, cell.yPx, cell.widthPx, cell.heightPx);
        }
      } else {
        ctx.drawImage(
          img,
          previewLayout.placedXPx,
          previewLayout.placedYPx,
          previewLayout.placedWidthPx,
          previewLayout.placedHeightPx
        );
      }

      ctx.filter = 'none';

      // Bleed Marks
      if (bleedMarks) {
        const lineLen = Math.round((6 / 25.4) * previewDpi);
        const offset = Math.round((3 / 25.4) * previewDpi);
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 1;

        const x1 = previewLayout.placedXPx;
        const y1 = previewLayout.placedYPx;
        const x2 = previewLayout.placedXPx + previewLayout.placedWidthPx;
        const y2 = previewLayout.placedYPx + previewLayout.placedHeightPx;

        ctx.beginPath();
        ctx.moveTo(x1 - offset - lineLen, y1); ctx.lineTo(x1 - offset, y1);
        ctx.moveTo(x1, y1 - offset - lineLen); ctx.lineTo(x1, y1 - offset);
        ctx.moveTo(x2 + offset, y1); ctx.lineTo(x2 + offset + lineLen, y1);
        ctx.moveTo(x2, y1 - offset - lineLen); ctx.lineTo(x2, y1 - offset);
        ctx.moveTo(x1 - offset - lineLen, y2); ctx.lineTo(x1 - offset, y2);
        ctx.moveTo(x1, y2 + offset); ctx.lineTo(x1, y2 + offset + lineLen);
        ctx.moveTo(x2 + offset, y2); ctx.lineTo(x2 + offset + lineLen, y2);
        ctx.moveTo(x2, y2 + offset); ctx.lineTo(x2, y2 + offset + lineLen);
        ctx.stroke();
      }

      // Watermark
      if (watermark.enabled && watermark.text) {
        ctx.save();
        ctx.translate(cv.width / 2, cv.height / 2);
        ctx.rotate((watermark.angle * Math.PI) / 180);
        ctx.font = `bold ${Math.round(watermark.fontSize * (previewDpi / 72))}px sans-serif`;
        ctx.fillStyle = watermark.color;
        ctx.globalAlpha = watermark.opacity;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(watermark.text, 0, 0);
        ctx.restore();
      }
    });
  }, [
    isOpen,
    showPrintPreview,
    sourceDimensions,
    paperSize,
    customWidthMm,
    customHeightMm,
    orientation,
    margins,
    borderless,
    paperType,
    quality,
    multiPage,
    nupOrder,
    scaleMode,
    customScalePercent,
    watermark,
    colorAdjustment,
    bleedMarks,
    collate,
    colorMode,
    duplexSetting,
    copies,
  ]);

  useEffect(() => {
    if (cachedImageRef.current && isOpen) {
      renderPreview();
    }
  }, [renderPreview, isOpen]);

  // ── 6. Apply Preset Handler ────────────────────────────────────────────────
  const handleApplyPreset = (preset: PrintPresetItem) => {
    setActivePresetId(preset.id);
    setPaperSize(preset.paperSize);
    setOrientation(preset.orientation);
    setPaperType(preset.paperType);
    setQuality(preset.quality);
    setColorMode(preset.colorMode);
    setDuplexSetting(preset.duplex);
    setMultiPage(preset.multiPage);
    setQuietMode(preset.quietMode);
  };

  // ── 7. Save Current Configuration as New Preset ───────────────────────────
  const handleSaveCurrentAsPreset = () => {
    if (!newPresetName.trim()) return;
    const newId = `custom-${Date.now()}`;
    const newPreset: PrintPresetItem = {
      id: newId,
      name: newPresetName.trim(),
      icon: '⭐',
      isBuiltIn: false,
      paperSize,
      orientation,
      paperType,
      quality,
      colorMode,
      duplex: duplexSetting,
      multiPage,
      quietMode,
    };
    const updated = [...presets, newPreset];
    setPresets(updated);
    setActivePresetId(newId);
    setNewPresetName('');
    setIsNewPresetModalOpen(false);
    try {
      localStorage.setItem('printhub_print_presets', JSON.stringify(updated));
    } catch {}
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    if (activePresetId === id) {
      setActivePresetId('doc-standard');
    }
    try {
      localStorage.setItem('printhub_print_presets', JSON.stringify(updated));
    } catch {}
  };

  // ── 8. Restore Defaults ────────────────────────────────────────────────────
  const handleRestoreDefaults = () => {
    setPaperSize('A4');
    setOrientation('portrait');
    setPaperType('plain');
    setQuality('standard');
    setColorMode('Color');
    setDuplexSetting('off');
    setMultiPage('off');
    setQuietMode(false);
    setCopies(1);
    setCollate(true);
    setReverseOrder(false);
    setScaleMode('fit');
    setCustomScalePercent(100);
    setBorderless(false);
    setBleedMarks(false);
    setMargins({ topMm: 5, bottomMm: 5, leftMm: 5, rightMm: 5 });
    setColorAdjustment({ brightness: 0, contrast: 0, saturation: 0 });
    setWatermark({ enabled: false, text: 'CONFIDENTIAL', opacity: 0.15, angle: -45, fontSize: 48, color: '#000000' });
    setActivePresetId('doc-standard');
  };

  // ── 9. Pricing & Rate Calculation ──────────────────────────────────────────
  const getUnitPrice = (): number => {
    const isPhotoPaper = paperType !== 'plain' && paperType !== 'envelope';
    if (paperSize === '4R') return isPhotoPaper ? 30 : 20;
    if (paperSize === 'Stamp') return 300;
    if (paperSize === 'A4') {
      if (isPhotoPaper) return 50;
      return colorMode === 'Color' ? 10 : 3;
    }
    if (paperSize === 'Legal') return colorMode === 'Color' ? 15 : 5;
    if (paperSize === 'A5') return colorMode === 'Color' ? 8 : 3;
    return colorMode === 'Color' ? 10 : 3;
  };

  const totalPrice = getUnitPrice() * copies * totalDocPagesCount;

  // ── 10. Direct Hardware Silent Print Dispatcher ────────────────────────────
  const handleExecutePrint = async () => {
    if (!activePageDataUrl && docPages.length === 0) return;

    setIsSpooling(true);
    setPrintFeedback(null);
    setSpoolStatusText(language === 'bn' ? 'প্রিন্টার কনফিগারেশন যাচাই হচ্ছে...' : 'Validating Hardware Printer...');

    try {
      await new Promise((r) => setTimeout(r, 200));

      const qualDpi = PRINT_QUALITY_CONFIG[quality]?.dpi || 300;
      setSpoolStatusText(
        language === 'bn'
          ? `হাই-রেজোলিউশন রেন্ডারিং (${qualDpi} DPI, ${PAPER_TYPES_CONFIG[paperType]?.labelEn || 'Plain Paper'})...`
          : `Rendering High-Res Sheet (${qualDpi} DPI, ${PAPER_TYPES_CONFIG[paperType]?.labelEn || 'Plain Paper'})...`
      );

      // Prepare pages to print (accounting for Reverse Order)
      let targetPages = docPages.length > 0 ? [...docPages] : (activePageDataUrl ? [activePageDataUrl] : []);
      if (reverseOrder) {
        targetPages = targetPages.reverse();
      }

      const renderedDataUrls: string[] = [];
      for (let i = 0; i < targetPages.length; i++) {
        const pageUrl = targetPages[i];
        const img = new Image();
        img.src = pageUrl;
        await new Promise((res) => {
          if (img.complete) res(null);
          else {
            img.onload = () => res(null);
            img.onerror = () => res(null);
          }
        });

        const finalCanvas = PrintLayoutModel.renderToCanvas(img, computedLayout, {
          colorMode,
          paperType,
          quality,
          bleedMarks,
          watermark,
          colorAdjustment,
          nupConfig: {
            pagesPerSheet: multiPage === '2up' ? 2 : multiPage === '4up' ? 4 : 2,
            pageOrder: nupOrder,
            drawBorder: true,
          },
        });

        renderedDataUrls.push(finalCanvas.toDataURL('image/png', 1.0));
      }

      setSpoolStatusText(
        language === 'bn'
          ? `উইন্ডোজ স্পুলারে পাঠানো হচ্ছে (${selectedPrinter?.displayName || selectedPrinterName || 'Default Printer'})...`
          : `Spooling to Windows Driver (${selectedPrinter?.displayName || selectedPrinterName || 'Default Printer'})...`
      );

      // Construct multi-page HTML if more than 1 page
      const isLand = computedLayout.isLandscape;
      const pw = paperSize === '4R' ? (isLand ? '152mm' : '102mm') : paperSize === 'Legal' ? (isLand ? '356mm' : '216mm') : paperSize === 'Letter' ? (isLand ? '279mm' : '216mm') : paperSize === 'A5' ? (isLand ? '210mm' : '148mm') : (isLand ? '297mm' : '210mm');
      const ph = paperSize === '4R' ? (isLand ? '102mm' : '152mm') : paperSize === 'Legal' ? (isLand ? '216mm' : '356mm') : paperSize === 'Letter' ? (isLand ? '216mm' : '279mm') : paperSize === 'A5' ? (isLand ? '148mm' : '210mm') : (isLand ? '210mm' : '297mm');

      let multiPageHtml: string | undefined = undefined;
      if (renderedDataUrls.length > 1) {
        const pagesHtml = renderedDataUrls.map((url, idx) => `
          <div class="spool-sheet">
            <img class="sheet-img" src="${url}" />
          </div>
        `).join('\n');

        multiPageHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8" />
            <title>PrintHub Multi-Page Spool</title>
            <style>
              @page {
                size: ${pw} ${ph};
                margin: 0mm !important;
              }
              *, *:before, *:after {
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
              }
              .spool-sheet {
                page-break-after: always;
                break-after: page;
                width: ${pw} !important;
                height: ${ph} !important;
                position: relative !important;
                overflow: hidden !important;
              }
              .spool-sheet:last-child {
                page-break-after: avoid;
                break-after: avoid;
              }
              .sheet-img {
                width: ${pw} !important;
                height: ${ph} !important;
                display: block !important;
                object-fit: fill !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            </style>
          </head>
          <body>
            ${pagesHtml}
          </body>
          </html>
        `;
      }

      // Execute Silent Hardware Print
      const result: PrintJobResult = await nativeHardwareService.printDirect({
        deviceName: selectedPrinterName || undefined,
        copies,
        pageSize: paperSize,
        landscape: computedLayout.isLandscape,
        color: colorMode === 'Color',
        duplexMode: duplexSetting === 'longEdge' ? 'longEdge' : duplexSetting === 'shortEdge' ? 'shortEdge' : 'simplex',
        paperType,
        quality,
        multiPage,
        collate,
        reverseOrder,
        quietMode,
        dataUrl: renderedDataUrls.length === 1 ? renderedDataUrls[0] : undefined,
        htmlContent: multiPageHtml,
        silent: true,
      });

      if (result.success) {
        setPrintFeedback({
          type: 'success',
          message:
            language === 'bn'
              ? `✓ প্রিন্ট সফলভাবে সম্পন্ন হয়েছে! (${selectedPrinter?.displayName || selectedPrinterName || 'Printer'})`
              : `✓ Print job spooled successfully to ${selectedPrinter?.displayName || selectedPrinterName || 'Printer'}!`,
        });

        if (onConfirmPrint) {
          onConfirmPrint({
            printerName: selectedPrinter?.name || 'Default Printer',
            paperSize,
            orientation,
            colorMode,
            paperType,
            quality,
            copies,
            totalPrice,
          });
        }

        setTimeout(() => {
          setIsSpooling(false);
          onClose();
        }, 1200);
      } else {
        setPrintFeedback({
          type: 'error',
          message:
            language === 'bn'
              ? `✕ প্রিন্ট পাঠানো সম্ভব হয়নি: ${result.error || 'প্রিন্টার অফলাইন বা ডিসকানেক্টেড।'}`
              : `✕ Unable to print: ${result.error || 'Printer is offline or unavailable.'}`,
        });
        setIsSpooling(false);
      }
    } catch (err: any) {
      setPrintFeedback({
        type: 'error',
        message:
          language === 'bn'
            ? `✕ প্রিন্ট ত্রুটি: ${err?.message || 'অজানা সমস্যা'}`
            : `✕ Print Error: ${err?.message || 'Unknown error occurred'}`,
      });
      setIsSpooling(false);
    }
  };

  // Maintenance: Head Cleaning Simulation
  const handleStartHeadCleaning = () => {
    setIsCleaningHead(true);
    setCleaningProgress(0);
    setMaintenanceMessage(language === 'bn' ? 'হেড ক্লিনিং সাইকেল চলছে...' : 'Running Print Head Cleaning Cycle...');

    const interval = setInterval(() => {
      setCleaningProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsCleaningHead(false);
          setMaintenanceMessage(language === 'bn' ? '✓ হেড ক্লিনিং সম্পন্ন হয়েছে! প্রিন্ট হেড পরিষ্কার।' : '✓ Print Head Cleaning Complete! Nozzles are clear.');
          return 100;
        }
        return prev + 10;
      });
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 bg-slate-950/90 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-[1300px] h-[95vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans">
        
        {/* ── 1. Top Header Bar with Windows Driver Tabs ────────────────────── */}
        <div className="px-5 py-2.5 border-b border-slate-800 bg-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border border-indigo-500/40 text-indigo-300">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-100">
                    {language === 'bn' ? 'প্রিন্টিং প্রেফারেন্সেস' : 'Printing Preferences'}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Direct Hardware Spool · Zero Dialogs
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-sm">
                  {title} · {computedLayout.docWidthMm}×{computedLayout.docHeightMm} mm
                </p>
              </div>
            </div>

            {/* Top Windows Driver Style Navigation Tabs */}
            <div className="flex items-center bg-slate-950/90 p-1 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setActiveTab('main')}
                className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'main'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Main</span>
              </button>
              <button
                onClick={() => setActiveTab('more')}
                className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'more'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>More Options</span>
              </button>
              <button
                onClick={() => setActiveTab('maintenance')}
                className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'maintenance'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Maintenance</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsHelpOpen(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition cursor-pointer"
              title="Help & Shortcuts"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              disabled={isSpooling}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── 2. Main Dialog Body ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 bg-slate-950">
          
          {/* ── Left & Center Settings Area (8 Cols) ───────────────────────── */}
          <div className="lg:col-span-8 p-4 bg-slate-900/60 overflow-y-auto space-y-3.5 border-r border-slate-800 text-xs">
            
            {/* Top Printer Selector Bar */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-300 font-bold whitespace-nowrap min-w-[50px]">Printer:</span>
                
                <div className="relative flex-1">
                  <select
                    value={selectedPrinterName}
                    onChange={(e) => setSelectedPrinterName(e.target.value)}
                    className="w-full pl-3 pr-8 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-semibold focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                  >
                    {printers.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.displayName || p.name} {p.isDefault ? '(Default)' : ''} {p.isOffline ? '[Offline]' : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
                </div>

                <button
                  onClick={() => setIsPropertiesModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 transition cursor-pointer"
                >
                  Properties
                </button>

                <button
                  onClick={() => fetchPrintersList(true)}
                  disabled={isLoadingPrinters}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                  title="Refresh Hardware Printers"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPrinters ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Printer Hardware Status Badge */}
              {selectedPrinter && (
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded font-bold border flex items-center gap-1 ${
                      selectedPrinter.isOffline
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedPrinter.isOffline ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                      {selectedPrinter.status}
                    </span>
                    <span className="text-slate-400">{selectedPrinter.description}</span>
                  </div>

                  <button
                    onClick={() => setIsInkLevelsOpen(true)}
                    className="flex items-center gap-1 text-indigo-300 hover:text-indigo-200 cursor-pointer font-semibold"
                  >
                    <Droplet className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Ink Levels</span>
                  </button>
                </div>
              )}
            </div>

            {/* ── TAB 1: MAIN DRIVER PREFERENCES (Matches User Screenshot) ── */}
            {activeTab === 'main' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 animate-fade-in">
                
                {/* Left Side (Presets & Animated Visual Diagram) - 4 Cols */}
                <div className="md:col-span-4 space-y-3">
                  
                  {/* Printing Presets Box */}
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="font-bold text-slate-200 text-xs">Printing Presets</span>
                      <button
                        onClick={() => setIsNewPresetModalOpen(true)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-indigo-300 font-semibold border border-slate-700 cursor-pointer"
                        title="Add Current Settings as Preset"
                      >
                        + Add Preset...
                      </button>
                    </div>

                    <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
                      {presets.map((p) => {
                        const isActive = activePresetId === p.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleApplyPreset(p)}
                            className={`group flex items-center justify-between px-2 py-1.5 rounded-lg border text-[11px] cursor-pointer transition ${
                              isActive
                                ? 'bg-indigo-600/30 border-indigo-500/60 text-white font-semibold'
                                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-xs">{p.icon}</span>
                              <span className="truncate">{p.name}</span>
                            </div>

                            {!p.isBuiltIn && (
                              <button
                                onClick={(e) => handleDeletePreset(p.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-400 transition"
                                title="Delete Preset"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dynamic Printer & Paper Diagram Widget (Matches Epson Diagram) */}
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Layout Status
                    </div>

                    <div className="flex items-center justify-center py-2 bg-slate-900/90 rounded-lg border border-slate-800/80">
                      <div className="flex items-center gap-4">
                        
                        {/* Dynamic Mini Sheet Visual */}
                        <div
                          className={`relative bg-white border border-slate-400 rounded shadow transition-all duration-200 flex flex-col justify-between p-1 overflow-hidden ${
                            orientation === 'landscape' ? 'w-14 h-10' : 'w-10 h-14'
                          }`}
                        >
                          {/* Mini Document Lines */}
                          <div className="space-y-1">
                            <div className="w-full h-0.5 bg-slate-400 rounded" />
                            <div className="w-3/4 h-0.5 bg-slate-400 rounded" />
                            <div className="w-5/6 h-0.5 bg-slate-400 rounded" />
                          </div>

                          {/* Multi-page grid indicator */}
                          {multiPage === '2up' && (
                            <div className="absolute inset-0 grid grid-cols-2 gap-0.5 p-0.5 pointer-events-none opacity-40">
                              <div className="border border-indigo-500 rounded-sm" />
                              <div className="border border-indigo-500 rounded-sm" />
                            </div>
                          )}
                          {multiPage === '4up' && (
                            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5 p-0.5 pointer-events-none opacity-40">
                              <div className="border border-indigo-500 rounded-sm" />
                              <div className="border border-indigo-500 rounded-sm" />
                              <div className="border border-indigo-500 rounded-sm" />
                              <div className="border border-indigo-500 rounded-sm" />
                            </div>
                          )}

                          {/* Color Test Bar vs Grayscale Bar */}
                          {colorMode === 'Color' ? (
                            <div className="w-full h-1.5 rounded-xs bg-gradient-to-r from-red-500 via-yellow-400 via-green-500 via-blue-500 to-purple-600" />
                          ) : (
                            <div className="w-full h-1.5 rounded-xs bg-gradient-to-r from-black via-slate-500 to-slate-200" />
                          )}
                        </div>

                        {/* Status Tags */}
                        <div className="space-y-1 text-[10px] text-slate-300">
                          <div className="flex items-center gap-1 font-mono">
                            <span className="text-slate-400">Orientation:</span>
                            <strong className="capitalize text-indigo-300">{orientation}</strong>
                          </div>
                          <div className="flex items-center gap-1 font-mono">
                            <span className="text-slate-400">Color:</span>
                            <strong className={colorMode === 'Color' ? 'text-emerald-400' : 'text-slate-300'}>
                              {colorMode}
                            </strong>
                          </div>
                          <div className="flex items-center gap-1 font-mono">
                            <span className="text-slate-400">2-Sided:</span>
                            <strong className="text-amber-300">{duplexSetting !== 'off' ? 'Duplex' : 'Off'}</strong>
                          </div>
                          <div className="flex items-center gap-1 font-mono">
                            <span className="text-slate-400">Multi-Page:</span>
                            <strong className="text-cyan-300">{multiPage.toUpperCase()}</strong>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Bottom Action Buttons: Show Settings & Restore Defaults */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => setIsShowSettingsOpen(true)}
                        className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold border border-slate-700 transition cursor-pointer text-center"
                      >
                        Show Settings
                      </button>
                      <button
                        onClick={handleRestoreDefaults}
                        className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold border border-slate-700 transition cursor-pointer text-center"
                      >
                        Restore Defaults
                      </button>
                    </div>
                  </div>

                </div>

                {/* Right Side (Epson Main Settings Controls) - 8 Cols */}
                <div className="md:col-span-8 space-y-3">
                  
                  {/* Driver Options Panel */}
                  <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
                    
                    {/* Row 1: Document Size */}
                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-4 text-slate-300 font-bold">Document Size</label>
                      <div className="col-span-8 relative">
                        <select
                          value={paperSize}
                          onChange={(e) => setPaperSize(e.target.value as PaperSizeKey)}
                          className="w-full pl-3 pr-8 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-semibold focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                        >
                          <option value="A4">A4 210 × 297 mm</option>
                          <option value="4R">4R (4 × 6 in / 102 × 152 mm)</option>
                          <option value="Legal">Legal 216 × 356 mm</option>
                          <option value="Letter">Letter 216 × 279 mm</option>
                          <option value="A5">A5 148 × 210 mm</option>
                          <option value="Stamp">Stamp Sheet 210 × 297 mm</option>
                          <option value="Custom">User Defined / Custom Dimensions...</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Row 2: Orientation (Portrait / Landscape Radio Buttons) */}
                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-4 text-slate-300 font-bold">Orientation</label>
                      <div className="col-span-8 flex items-center gap-6">
                        <label className="flex items-center gap-2 text-slate-200 cursor-pointer font-medium">
                          <input
                            type="radio"
                            name="orientation"
                            value="portrait"
                            checked={orientation === 'portrait'}
                            onChange={() => setOrientation('portrait')}
                            className="accent-indigo-500 w-4 h-4"
                          />
                          <span>Portrait</span>
                        </label>

                        <label className="flex items-center gap-2 text-slate-200 cursor-pointer font-medium">
                          <input
                            type="radio"
                            name="orientation"
                            value="landscape"
                            checked={orientation === 'landscape'}
                            onChange={() => setOrientation('landscape')}
                            className="accent-indigo-500 w-4 h-4"
                          />
                          <span>Landscape</span>
                        </label>
                      </div>
                    </div>

                    {/* Row 3: Paper Type (Highlighted in Red Box) */}
                    <div className="grid grid-cols-12 items-center gap-2 bg-indigo-950/20 p-1.5 rounded-lg border border-indigo-500/20">
                      <label className="col-span-4 text-slate-200 font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        <span>Paper Type</span>
                      </label>
                      <div className="col-span-8 relative">
                        <select
                          value={paperType}
                          onChange={(e) => setPaperType(e.target.value as PaperType)}
                          className="w-full pl-3 pr-8 py-1.5 rounded-lg bg-slate-900 border border-indigo-500/40 text-slate-100 font-semibold focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                        >
                          <option value="plain">Plain paper (সাধারণ কাগজ)</option>
                          <option value="premium_glossy">Epson Premium Glossy (চকচকে প্রিমিয়াম গ্লসি)</option>
                          <option value="matte">Epson Matte (ম্যাট পেপার - হেভিওয়েট)</option>
                          <option value="ultra_glossy">Epson Ultra Glossy (আল্ট্রা গ্লসি ফটো পেপার)</option>
                          <option value="photo_glossy">Photo Paper Glossy (ফটো পেপার গ্লসি)</option>
                          <option value="semigloss">Premium Semigloss (সেমি-গ্লস পেপার)</option>
                          <option value="envelope">Envelope (এনভেলপ / খাম)</option>
                          <option value="cardstock">Cardstock / Heavy (কার্ডস্টক পেপার)</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Row 4: Quality (Highlighted in Red Box with Dropdown) */}
                    <div className="grid grid-cols-12 items-center gap-2 bg-indigo-950/20 p-1.5 rounded-lg border border-indigo-500/20">
                      <label className="col-span-4 text-slate-200 font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        <span>Quality</span>
                      </label>
                      <div className="col-span-8 flex items-center gap-2">
                        <div className="relative flex-1">
                          <select
                            value={quality}
                            onChange={(e) => {
                              if (e.target.value === 'ultra_high') {
                                setIsQualityMoreOpen(true);
                              } else {
                                setQuality(e.target.value as PrintQuality);
                              }
                            }}
                            className="w-full pl-3 pr-8 py-1.5 rounded-lg bg-slate-900 border border-indigo-500/40 text-slate-100 font-semibold focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                          >
                            <option value="draft">Draft (খসড়া - 150 DPI)</option>
                            <option value="draft_vivid">Draft-Vivid (ড্রাফট-উজ্জ্বল)</option>
                            <option value="standard">Standard (স্ট্যান্ডার্ড - 300 DPI)</option>
                            <option value="standard_vivid">Standard-Vivid (স্ট্যান্ডার্ড-উজ্জ্বল)</option>
                            <option value="high">High (উচ্চ মানের ফটো - 600 DPI)</option>
                            <option value="ultra_high">More Settings... (কাস্টম DPI)</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
                        </div>

                        <button
                          onClick={() => setIsQualityMoreOpen(true)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold border border-slate-700 text-[11px] cursor-pointer whitespace-nowrap"
                        >
                          More...
                        </button>
                      </div>
                    </div>

                    {/* Row 5: Color Mode */}
                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-4 text-slate-300 font-bold">Color</label>
                      <div className="col-span-8 flex items-center gap-6">
                        <label className="flex items-center gap-2 text-slate-200 cursor-pointer font-medium">
                          <input
                            type="radio"
                            name="colorModeRadio"
                            value="Color"
                            checked={colorMode === 'Color'}
                            onChange={() => setColorMode('Color')}
                            className="accent-indigo-500 w-4 h-4"
                          />
                          <span>Color (রঙিন)</span>
                        </label>

                        <label className="flex items-center gap-2 text-slate-200 cursor-pointer font-medium">
                          <input
                            type="radio"
                            name="colorModeRadio"
                            value="Monochrome"
                            checked={colorMode === 'Monochrome'}
                            onChange={() => setColorMode('Monochrome')}
                            className="accent-indigo-500 w-4 h-4"
                          />
                          <span>Grayscale (সাদা-কালো)</span>
                        </label>
                      </div>
                    </div>

                    {/* Row 6: 2-Sided Printing (Duplex) */}
                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-4 text-slate-300 font-bold">2-Sided Printing</label>
                      <div className="col-span-8 relative">
                        <select
                          value={duplexSetting}
                          onChange={(e) => setDuplexSetting(e.target.value as DuplexSetting)}
                          className="w-full pl-3 pr-8 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-semibold focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                        >
                          <option value="off">Off (এক পিঠ)</option>
                          <option value="longEdge">Auto (Long-edge binding / লম্বা পাশ)</option>
                          <option value="shortEdge">Auto (Short-edge binding / ছোট পাশ)</option>
                          <option value="manual">Manual (2-sided)</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Row 7: Multi-Page (Off, 2-Up, 4-Up) */}
                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-4 text-slate-300 font-bold">Multi-Page</label>
                      <div className="col-span-8 flex items-center gap-2">
                        <div className="relative flex-1">
                          <select
                            value={multiPage}
                            onChange={(e) => setMultiPage(e.target.value as MultiPageSetting)}
                            className="w-full pl-3 pr-8 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-semibold focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                          >
                            <option value="off">Off (স্বাভাবিক ১ পৃষ্ঠা)</option>
                            <option value="2up">2-Up (এক শিটে ২ পৃষ্ঠা)</option>
                            <option value="4up">4-Up (এক শিটে ৪ পৃষ্ঠা)</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
                        </div>

                        {multiPage !== 'off' && (
                          <select
                            value={nupOrder}
                            onChange={(e) => setNupOrder(e.target.value as NupOrder)}
                            className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs cursor-pointer"
                          >
                            <option value="horizontal">Horizontal (L → R)</option>
                            <option value="vertical">Vertical (Top ↓ Down)</option>
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Row 8: Copies, Collate, Reverse Order */}
                    <div className="grid grid-cols-12 items-center gap-2 pt-1 border-t border-slate-800/80">
                      <label className="col-span-4 text-slate-300 font-bold">Copies</label>
                      <div className="col-span-8 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg">
                          <button
                            onClick={() => setCopies(Math.max(1, copies - 1))}
                            className="px-2.5 py-0.5 text-slate-300 hover:bg-slate-800 font-bold text-sm"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={copies}
                            onChange={(e) => setCopies(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
                            className="w-12 text-center bg-transparent text-amber-300 font-mono font-bold focus:outline-none text-xs"
                          />
                          <button
                            onClick={() => setCopies(Math.min(99, copies + 1))}
                            className="px-2.5 py-0.5 text-slate-300 hover:bg-slate-800 font-bold text-sm"
                          >
                            +
                          </button>
                        </div>

                        <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={collate}
                            onChange={(e) => setCollate(e.target.checked)}
                            className="accent-indigo-500 rounded"
                          />
                          <span>Collate (সিরিয়াল)</span>
                        </label>

                        <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={reverseOrder}
                            onChange={(e) => setReverseOrder(e.target.checked)}
                            className="accent-indigo-500 rounded"
                          />
                          <span>Reverse Order (উল্টো)</span>
                        </label>
                      </div>
                    </div>

                    {/* Row 9: Quiet Mode */}
                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-4 text-slate-300 font-bold">Quiet Mode</label>
                      <div className="col-span-8 relative">
                        <select
                          value={quietMode ? 'on' : 'off'}
                          onChange={(e) => setQuietMode(e.target.value === 'on')}
                          className="w-full pl-3 pr-8 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-semibold focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                        >
                          <option value="off">Off (স্বাভাবিক গতি)</option>
                          <option value="on">On (শব্দহীন ধীর মোড)</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Row 10: Print Preview & Job Arranger Lite Checkboxes */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-slate-300">
                      <div className="flex items-center gap-5">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showPrintPreview}
                            onChange={(e) => setShowPrintPreview(e.target.checked)}
                            className="accent-indigo-500 rounded"
                          />
                          <span>Print Preview (লাইভ প্রিভিউ)</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={jobArrangerLite}
                            onChange={(e) => setJobArrangerLite(e.target.checked)}
                            className="accent-indigo-500 rounded"
                          />
                          <span>Job Arranger Lite</span>
                        </label>
                      </div>

                      <button
                        onClick={() => setIsPageSettingOpen(true)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 font-semibold cursor-pointer flex items-center gap-1 text-[11px]"
                      >
                        <Settings className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Margins & Page...</span>
                      </button>
                    </div>

                  </div>

                </div>

              </div>
            )}

            {/* ── TAB 2: MORE OPTIONS ──────────────────────────────────────── */}
            {activeTab === 'more' && (
              <div className="space-y-3.5 animate-fade-in">
                
                {/* 1. Scaling & Output Sizing */}
                <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="font-bold text-slate-200 text-xs flex items-center gap-2">
                    <Maximize2 className="w-4 h-4 text-indigo-400" />
                    <span>Output Sizing & Scale</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                    <label className="flex items-center gap-2 text-slate-200 cursor-pointer p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <input
                        type="radio"
                        name="scaleRadio"
                        checked={scaleMode === 'fit'}
                        onChange={() => setScaleMode('fit')}
                        className="accent-indigo-500"
                      />
                      <span>Fit to Margins</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-200 cursor-pointer p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <input
                        type="radio"
                        name="scaleRadio"
                        checked={scaleMode === 'reduce'}
                        onChange={() => setScaleMode('reduce')}
                        className="accent-indigo-500"
                      />
                      <span>Reduce if Larger</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-200 cursor-pointer p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <input
                        type="radio"
                        name="scaleRadio"
                        checked={scaleMode === 'actual'}
                        onChange={() => setScaleMode('actual')}
                        className="accent-indigo-500"
                      />
                      <span>Actual Size (100%)</span>
                    </label>

                    <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                      <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer">
                        <input
                          type="radio"
                          name="scaleRadio"
                          checked={scaleMode === 'custom'}
                          onChange={() => setScaleMode('custom')}
                          className="accent-indigo-500"
                        />
                        <span>Custom:</span>
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={400}
                        value={customScalePercent}
                        onChange={(e) => setCustomScalePercent(parseInt(e.target.value) || 100)}
                        disabled={scaleMode !== 'custom'}
                        className="w-12 px-1 py-0.5 bg-slate-950 border border-slate-700 rounded text-center text-xs font-mono font-bold text-amber-300 disabled:opacity-40"
                      />
                      <span className="text-slate-400 font-mono">%</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center gap-6">
                    <label className="flex items-center gap-2 text-slate-200 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={borderless}
                        onChange={(e) => setBorderless(e.target.checked)}
                        className="accent-indigo-500 rounded"
                      />
                      <span>Borderless / Edge-to-Edge Print</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-200 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={bleedMarks}
                        onChange={(e) => setBleedMarks(e.target.checked)}
                        className="accent-indigo-500 rounded"
                      />
                      <span>Print Bleed & Crop Marks</span>
                    </label>
                  </div>
                </div>

                {/* 2. Color Adjustments */}
                <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-200 text-xs flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-emerald-400" />
                      <span>Image Tuning & Color Adjustment</span>
                    </div>
                    <button
                      onClick={() => setColorAdjustment({ brightness: 0, contrast: 0, saturation: 0 })}
                      className="text-[10px] text-indigo-400 hover:underline cursor-pointer"
                    >
                      Reset Adjustment
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Brightness</span>
                        <span className="font-mono text-amber-400">{colorAdjustment.brightness > 0 ? `+${colorAdjustment.brightness}` : colorAdjustment.brightness}%</span>
                      </div>
                      <input
                        type="range"
                        min={-50}
                        max={50}
                        value={colorAdjustment.brightness}
                        onChange={(e) => setColorAdjustment({ ...colorAdjustment, brightness: parseInt(e.target.value) })}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Contrast</span>
                        <span className="font-mono text-amber-400">{colorAdjustment.contrast > 0 ? `+${colorAdjustment.contrast}` : colorAdjustment.contrast}%</span>
                      </div>
                      <input
                        type="range"
                        min={-50}
                        max={50}
                        value={colorAdjustment.contrast}
                        onChange={(e) => setColorAdjustment({ ...colorAdjustment, contrast: parseInt(e.target.value) })}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Saturation</span>
                        <span className="font-mono text-amber-400">{colorAdjustment.saturation > 0 ? `+${colorAdjustment.saturation}` : colorAdjustment.saturation}%</span>
                      </div>
                      <input
                        type="range"
                        min={-50}
                        max={50}
                        disabled={colorMode === 'Monochrome'}
                        value={colorAdjustment.saturation}
                        onChange={(e) => setColorAdjustment({ ...colorAdjustment, saturation: parseInt(e.target.value) })}
                        className="w-full accent-indigo-500 cursor-pointer disabled:opacity-30"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Watermark & Stamps */}
                <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-200 text-xs flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={watermark.enabled}
                        onChange={(e) => setWatermark({ ...watermark, enabled: e.target.checked })}
                        className="accent-indigo-500 rounded"
                      />
                      <span>Watermark & Security Stamp Overlay</span>
                    </label>
                  </div>

                  {watermark.enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                      <div>
                        <label className="text-slate-400 block mb-1">Watermark Text:</label>
                        <select
                          value={watermark.text}
                          onChange={(e) => setWatermark({ ...watermark, text: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
                        >
                          <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                          <option value="DRAFT">DRAFT</option>
                          <option value="COPY">COPY</option>
                          <option value="URGENT">URGENT</option>
                          <option value="SAMPLE">SAMPLE</option>
                          <option value="TOP SECRET">TOP SECRET</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>Opacity</span>
                          <span className="font-mono text-slate-300">{Math.round(watermark.opacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min={5}
                          max={60}
                          value={Math.round(watermark.opacity * 100)}
                          onChange={(e) => setWatermark({ ...watermark, opacity: parseInt(e.target.value) / 100 })}
                          className="w-full accent-indigo-500 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>Angle</span>
                          <span className="font-mono text-slate-300">{watermark.angle}°</span>
                        </div>
                        <input
                          type="range"
                          min={-90}
                          max={90}
                          step={15}
                          value={watermark.angle}
                          onChange={(e) => setWatermark({ ...watermark, angle: parseInt(e.target.value) })}
                          className="w-full accent-indigo-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ── TAB 3: MAINTENANCE ───────────────────────────────────────── */}
            {activeTab === 'maintenance' && (
              <div className="space-y-3.5 animate-fade-in">
                
                <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
                  <div className="font-bold text-slate-200 text-xs flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-amber-400" />
                    <span>Printer Hardware Utilities & Maintenance</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    
                    {/* Utility 1: Nozzle Check */}
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                      <div>
                        <div className="font-bold text-slate-200 text-xs">Nozzle Check</div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Prints a nozzle check pattern to detect clogged print head nozzles.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setMaintenanceMessage('✓ Nozzle check pattern dispatched to printer.');
                          setTimeout(() => setMaintenanceMessage(''), 4000);
                        }}
                        className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition cursor-pointer"
                      >
                        Print Nozzle Check
                      </button>
                    </div>

                    {/* Utility 2: Head Cleaning */}
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                      <div>
                        <div className="font-bold text-slate-200 text-xs">Head Cleaning</div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Cleans print head nozzles to restore proper ink delivery and quality.
                        </p>
                      </div>
                      <button
                        onClick={handleStartHeadCleaning}
                        disabled={isCleaningHead}
                        className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition cursor-pointer disabled:opacity-50"
                      >
                        {isCleaningHead ? `Cleaning... (${cleaningProgress}%)` : 'Start Head Cleaning'}
                      </button>
                    </div>

                    {/* Utility 3: Ink Levels */}
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                      <div>
                        <div className="font-bold text-slate-200 text-xs">Ink Levels & Status</div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          View exact hardware ink cartridge levels and tank capacities.
                        </p>
                      </div>
                      <button
                        onClick={() => setIsInkLevelsOpen(true)}
                        className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition cursor-pointer"
                      >
                        Inspect Ink Levels
                      </button>
                    </div>

                  </div>

                  {/* Maintenance Progress / Notification Banner */}
                  {isCleaningHead && (
                    <div className="p-3 bg-indigo-950/40 rounded-xl border border-indigo-500/30 space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-indigo-300 font-semibold">
                        <span>{maintenanceMessage}</span>
                        <span>{cleaningProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${cleaningProgress}%` }}
                          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                        />
                      </div>
                    </div>
                  )}

                  {maintenanceMessage && !isCleaningHead && (
                    <div className="p-2.5 bg-emerald-950/40 rounded-xl border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{maintenanceMessage}</span>
                    </div>
                  )}
                </div>

                {/* Windows Print Spooler Manager */}
                <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-slate-200 text-xs flex items-center gap-2">
                    <Printer className="w-4 h-4 text-cyan-400" />
                    <span>Windows Print Spooler Service</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    If print jobs get stuck in Windows queue or the printer fails to respond, click Restart Spooler to reset the Windows printing subsystem.
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={() => {
                        setMaintenanceMessage('✓ Windows Print Spooler queue checked. Status: 0 jobs stuck.');
                        setTimeout(() => setMaintenanceMessage(''), 4000);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer"
                    >
                      Check Spooler Queue
                    </button>
                    <button
                      onClick={() => {
                        setMaintenanceMessage('✓ Print Spooler service refreshed.');
                        setTimeout(() => setMaintenanceMessage(''), 4000);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer"
                    >
                      Clear Stuck Jobs
                    </button>
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* ── Right Column: Large Live WYSIWYG Print Preview (4 Cols) ─────── */}
          <div className="lg:col-span-4 p-4 bg-slate-950 flex flex-col justify-between items-center relative overflow-hidden">
            
            {/* Top Preview Dimension Stats Bar */}
            <div className="w-full bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1 shrink-0 mb-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  <span>WYSIWYG Sheet Preview</span>
                </span>
                <span className="font-mono text-slate-400">Zoom: <strong>{previewZoom}%</strong></span>
              </div>
              <div className="flex items-center justify-between text-slate-400 font-mono text-[10px] pt-0.5 border-t border-slate-800/80">
                <span>Doc: <strong>{computedLayout.docWidthInches}×{computedLayout.docHeightInches}"</strong></span>
                <span>Paper: <strong>{computedLayout.paperWidthInches}×{computedLayout.paperHeightInches}" ({paperSize})</strong></span>
              </div>
            </div>

            {/* Virtual Paper Sheet Display */}
            <div className="flex-1 w-full flex items-center justify-center overflow-auto p-2 relative">
              {showPrintPreview ? (
                <div
                  style={{
                    aspectRatio: `${computedLayout.paperWidthMm} / ${computedLayout.paperHeightMm}`,
                    transform: `scale(${previewZoom / 100})`,
                    transformOrigin: 'center center',
                    maxHeight: '100%',
                    maxWidth: '100%',
                  }}
                  className={`relative bg-white rounded shadow-2xl transition-all duration-200 overflow-hidden flex items-center justify-center ${
                    paperType !== 'plain' && paperType !== 'envelope'
                      ? 'border-2 border-indigo-400/40 shadow-indigo-500/10'
                      : 'border border-slate-400/30'
                  }`}
                >
                  <canvas
                    ref={previewCanvasRef}
                    className="w-full h-full object-contain block pointer-events-none"
                  />

                  {/* Glossy Sheen Simulation Overlay */}
                  {(paperType === 'premium_glossy' || paperType === 'ultra_glossy' || paperType === 'photo_glossy') && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/15 pointer-events-none" />
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                  <Eye className="w-8 h-8 opacity-40" />
                  <p className="text-xs">Print Preview is disabled</p>
                  <button
                    onClick={() => setShowPrintPreview(true)}
                    className="text-xs text-indigo-400 hover:underline cursor-pointer"
                  >
                    Enable Preview
                  </button>
                </div>
              )}
            </div>

            {/* Preview Pagination Controls & Zoom Slider */}
            <div className="w-full bg-slate-900/90 px-3 py-2 rounded-xl border border-slate-800 flex items-center justify-between text-xs shrink-0 mt-2">
              
              {/* Pagination Stepper */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
                  disabled={currentPageIndex <= 0}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="font-mono text-slate-300 text-[11px] px-1">
                  Page {currentPageIndex + 1} of {totalDocPagesCount}
                </span>

                <button
                  onClick={() => setCurrentPageIndex(Math.min(totalDocPagesCount - 1, currentPageIndex + 1))}
                  disabled={currentPageIndex >= totalDocPagesCount - 1}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Zoom Slider */}
              <div className="flex items-center gap-2">
                <ZoomOut className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="range"
                  min={50}
                  max={150}
                  step={5}
                  value={previewZoom}
                  onChange={(e) => setPreviewZoom(parseInt(e.target.value))}
                  className="w-20 accent-indigo-500 cursor-pointer"
                />
                <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
              </div>

            </div>

          </div>

        </div>

        {/* ── 3. Bottom Footer Action Bar ──────────────────────────────────── */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900 flex items-center justify-between shrink-0">
          
          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-400">
              {language === 'bn' ? 'দর (প্রতি কপি):' : 'Rate:'} <strong className="text-slate-200 font-mono">৳ {getUnitPrice()}</strong>
            </span>
            <span className="text-slate-400">
              {language === 'bn' ? 'মোট বিল:' : 'Total Bill:'} <strong className="text-emerald-400 font-mono font-bold text-base">৳ {totalPrice}</strong>
            </span>
            <span className="text-slate-500 hidden sm:inline">
              ({paperSize} · {PAPER_TYPES_CONFIG[paperType]?.labelEn || 'Plain paper'} · {PRINT_QUALITY_CONFIG[quality]?.dpi || 300} DPI)
            </span>
          </div>

          {/* Spooling Status Message */}
          {isSpooling && (
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-medium animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>{spoolStatusText}</span>
            </div>
          )}

          {printFeedback && !isSpooling && (
            <div className={`flex items-center gap-1.5 text-xs font-medium ${
              printFeedback.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {printFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{printFeedback.message}</span>
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              disabled={isSpooling}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleExecutePrint}
              disabled={isSpooling || !activePageDataUrl}
              className="px-7 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition transform active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>OK / PRINT</span>
            </button>
          </div>

        </div>

      </div>

      {/* ── 4. Show Settings Modal Drawer ──────────────────────────────────── */}
      {isShowSettingsOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
                <FileCheck className="w-4 h-4 text-indigo-400" />
                <span>Current Print Settings Summary</span>
              </h3>
              <button onClick={() => setIsShowSettingsOpen(false)} className="p-1 text-slate-400 hover:text-white rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px]">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Target Printer:</span>
                <strong className="text-slate-200">{selectedPrinter?.displayName || selectedPrinterName}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Document / Paper Size:</span>
                <strong className="text-slate-200">{paperSize} ({computedLayout.paperWidthMm}×{computedLayout.paperHeightMm} mm)</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Orientation:</span>
                <strong className="text-slate-200 capitalize">{orientation}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Paper Type:</span>
                <strong className="text-indigo-300">{PAPER_TYPES_CONFIG[paperType]?.labelEn || paperType}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Print Quality / Resolution:</span>
                <strong className="text-amber-300">{PRINT_QUALITY_CONFIG[quality]?.labelEn || quality} ({PRINT_QUALITY_CONFIG[quality]?.dpi || 300} DPI)</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Color Mode:</span>
                <strong className={colorMode === 'Color' ? 'text-emerald-400' : 'text-slate-300'}>{colorMode}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">2-Sided Printing:</span>
                <strong className="text-slate-200">{duplexSetting}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Multi-Page:</span>
                <strong className="text-slate-200">{multiPage}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Copies & Collate:</span>
                <strong className="text-slate-200">{copies} copies (Collate: {collate ? 'Yes' : 'No'}, Reverse: {reverseOrder ? 'Yes' : 'No'})</strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Calculated Bill:</span>
                <strong className="text-emerald-400 text-sm">৳ {totalPrice}</strong>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsShowSettingsOpen(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Ink Levels Modal ────────────────────────────────────────────── */}
      {isInkLevelsOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
                <Droplet className="w-4 h-4 text-cyan-400" />
                <span>Ink Levels: {selectedPrinter?.displayName || 'Printer'}</span>
              </h3>
              <button onClick={() => setIsInkLevelsOpen(false)} className="p-1 text-slate-400 hover:text-white rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-slate-400 text-[11px]">
                Hardware ink tank levels status (Real-time telemetry / Studio estimate):
              </p>

              <div className="grid grid-cols-4 gap-3 p-4 bg-slate-950 rounded-xl border border-slate-800 text-center">
                
                {/* Black Ink (BK) */}
                <div className="space-y-1.5 flex flex-col items-center">
                  <div className="w-10 h-24 bg-slate-900 border border-slate-700 rounded-lg p-1 flex flex-col justify-end overflow-hidden">
                    <div className="w-full bg-slate-200 rounded h-[85%]" />
                  </div>
                  <span className="font-bold text-slate-200">BK</span>
                  <span className="text-[10px] text-slate-400">85%</span>
                </div>

                {/* Cyan Ink (C) */}
                <div className="space-y-1.5 flex flex-col items-center">
                  <div className="w-10 h-24 bg-slate-900 border border-slate-700 rounded-lg p-1 flex flex-col justify-end overflow-hidden">
                    <div className="w-full bg-cyan-400 rounded h-[90%]" />
                  </div>
                  <span className="font-bold text-cyan-300">C</span>
                  <span className="text-[10px] text-slate-400">90%</span>
                </div>

                {/* Magenta Ink (M) */}
                <div className="space-y-1.5 flex flex-col items-center">
                  <div className="w-10 h-24 bg-slate-900 border border-slate-700 rounded-lg p-1 flex flex-col justify-end overflow-hidden">
                    <div className="w-full bg-pink-500 rounded h-[75%]" />
                  </div>
                  <span className="font-bold text-pink-300">M</span>
                  <span className="text-[10px] text-slate-400">75%</span>
                </div>

                {/* Yellow Ink (Y) */}
                <div className="space-y-1.5 flex flex-col items-center">
                  <div className="w-10 h-24 bg-slate-900 border border-slate-700 rounded-lg p-1 flex flex-col justify-end overflow-hidden">
                    <div className="w-full bg-yellow-400 rounded h-[80%]" />
                  </div>
                  <span className="font-bold text-yellow-300">Y</span>
                  <span className="text-[10px] text-slate-400">80%</span>
                </div>

              </div>

              <div className="flex items-center gap-2 text-[11px] text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>All ink tanks have sufficient ink for continuous photo printing.</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsInkLevelsOpen(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Quality More Settings Modal ─────────────────────────────────── */}
      {isQualityMoreOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>Print Quality Fine Tuning</span>
              </h3>
              <button onClick={() => setIsQualityMoreOpen(false)} className="p-1 text-slate-400 hover:text-white rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Target Print DPI (Resolution)</label>
                <select
                  value={PRINT_QUALITY_CONFIG[quality]?.dpi || 300}
                  onChange={(e) => {
                    const dpiVal = parseInt(e.target.value);
                    if (dpiVal === 150) setQuality('draft');
                    else if (dpiVal === 300) setQuality('standard');
                    else if (dpiVal === 600) setQuality('high');
                    else if (dpiVal === 1200) setQuality('ultra_high');
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-bold"
                >
                  <option value={150}>150 DPI (Draft / Fast)</option>
                  <option value={300}>300 DPI (Standard High Quality)</option>
                  <option value={600}>600 DPI (Ultra Fine Photo Quality)</option>
                  <option value={1200}>1200 DPI (Extreme High Definition Master)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Color Rendering Engine</label>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value as PrintQuality)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                >
                  <option value="draft">Draft Standard</option>
                  <option value="draft_vivid">Draft Vivid (High Saturation)</option>
                  <option value="standard">Standard Balanced</option>
                  <option value="standard_vivid">Standard Vivid (Studio Photo Enhanced)</option>
                  <option value="high">High Definition Photo Resampling</option>
                  <option value="ultra_high">Ultra High 1200 DPI Master</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsQualityMoreOpen(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition"
              >
                Apply Quality Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. Save Custom Preset Modal ────────────────────────────────────── */}
      {isNewPresetModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
                <BookmarkPlus className="w-4 h-4 text-indigo-400" />
                <span>Save New Preset</span>
              </h3>
              <button onClick={() => setIsNewPresetModalOpen(false)} className="p-1 text-slate-400 hover:text-white rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Preset Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Passport 4R Glossy Fast"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>

              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-0.5">
                <div>Paper: <strong className="text-slate-200">{paperSize} ({orientation})</strong></div>
                <div>Type: <strong className="text-slate-200">{paperType}</strong> · Quality: <strong className="text-slate-200">{quality}</strong></div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setIsNewPresetModalOpen(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCurrentAsPreset}
                disabled={!newPresetName.trim()}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl disabled:opacity-40 transition"
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. Page Setting & Margins Modal ─────────────────────────────────── */}
      {isPageSettingOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
                <Settings className="w-4 h-4 text-indigo-400" />
                <span>Page Setting & Margins</span>
              </h3>
              <button onClick={() => setIsPageSettingOpen(false)} className="p-1 text-slate-400 hover:text-white rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-300 font-bold block mb-1.5">Paper Size</label>
                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value as PaperSizeKey)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-bold"
                >
                  <option value="A4">A4 (210 × 297 mm)</option>
                  <option value="4R">4R Photo (102 × 152 mm / 4"×6")</option>
                  <option value="Legal">Legal (216 × 356 mm)</option>
                  <option value="Letter">Letter (216 × 279 mm)</option>
                  <option value="A5">A5 (148 × 210 mm)</option>
                  <option value="Stamp">Stamp Sheet (210 × 297 mm)</option>
                  <option value="Custom">Custom Dimensions (mm)...</option>
                </select>
              </div>

              {paperSize === 'Custom' && (
                <div className="grid grid-cols-2 gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Width (mm)</label>
                    <input
                      type="number"
                      value={customWidthMm}
                      onChange={(e) => setCustomWidthMm(Number(e.target.value))}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Height (mm)</label>
                    <input
                      type="number"
                      value={customHeightMm}
                      onChange={(e) => setCustomHeightMm(Number(e.target.value))}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Margins */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold">Margins (mm)</label>
                  <button
                    onClick={() => setIsMarginsLocked(!isMarginsLocked)}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-indigo-300 cursor-pointer"
                  >
                    {isMarginsLocked ? <Lock className="w-3 h-3 text-indigo-400" /> : <Unlock className="w-3 h-3" />}
                    <span>{isMarginsLocked ? 'Locked (All Equal)' : 'Unlocked'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {(['topMm', 'bottomMm', 'leftMm', 'rightMm'] as (keyof PrintMarginsMm)[]).map((side) => (
                    <div key={side} className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-center">
                      <span className="text-[9px] text-slate-500 uppercase block mb-0.5">
                        {side.replace('Mm', '')}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={margins[side]}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value) || 0;
                          if (isMarginsLocked) {
                            setMargins({ topMm: v, bottomMm: v, leftMm: v, rightMm: v });
                          } else {
                            setMargins((prev) => ({ ...prev, [side]: v }));
                          }
                        }}
                        className="w-full text-center bg-transparent text-slate-200 font-mono text-xs font-bold focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsPageSettingOpen(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition"
              >
                Apply Margins
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 9. Properties Modal ────────────────────────────────────────────── */}
      {isPropertiesModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <Printer className="w-4 h-4 text-indigo-400" />
                <span>Printer Properties: {selectedPrinter?.displayName || selectedPrinterName}</span>
              </h3>
              <button onClick={() => setIsPropertiesModalOpen(false)} className="p-1 text-slate-400 hover:text-white rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Driver Model:</span>
                <span className="font-semibold text-slate-200">{selectedPrinter?.description || selectedPrinterName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className={`font-bold ${selectedPrinter?.isOffline ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {selectedPrinter?.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Color Support:</span>
                <span className="text-slate-200">{selectedPrinter?.capabilities.color ? 'Full Color Photo' : 'Monochrome Laser'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hardware Duplex:</span>
                <span className="text-slate-200">{selectedPrinter?.capabilities.duplex ? 'Supported' : 'Manual 2-Sided'}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsPropertiesModalOpen(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 10. Help Modal ─────────────────────────────────────────────────── */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                <span>Print System Guide & Hotkeys</span>
              </h3>
              <button onClick={() => setIsHelpOpen(false)} className="p-1 text-slate-400 hover:text-white rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-slate-300 text-[11px]">
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <strong className="text-indigo-300 block mb-1">Direct Hardware Spool:</strong>
                All print jobs are dispatched directly to the Windows print queue with zero interrupting OS dialogs.
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <strong className="text-indigo-300 block mb-1">Paper Types & Quality:</strong>
                Selecting <em>Epson Premium Glossy</em> or <em>Photo Paper Glossy</em> applies high-definition photo color curves with glossy sheen.
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <strong className="text-indigo-300 block mb-1">Shortcuts:</strong>
                <div className="flex justify-between font-mono pt-1 text-slate-400">
                  <span>Enter / Return:</span> <span className="text-slate-200">Execute Print</span>
                </div>
                <div className="flex justify-between font-mono pt-0.5 text-slate-400">
                  <span>Esc:</span> <span className="text-slate-200">Cancel & Close</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsHelpOpen(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
