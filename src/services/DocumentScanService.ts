/**
 * DocumentScanService.ts
 * Enterprise-Grade Document Processing Service & Reactive Architecture.
 * 
 * Implements:
 * 1. Component-Based State Manager with Fine-Grained Reactive Subscriptions (Signals-like pattern)
 * 2. Asynchronous Multi-Threaded/Worker-Ready Image Pipeline
 * 3. Two-Way Data Binding Synchronizer
 * 4. Dependency Injection (DI) Service Contract
 * 5. High-Resolution 300 DPI Multi-Page PDF Generation via pdf-lib
 */

import { DocumentQuad, Point2D, PerspectiveWarpEngine } from '../engines/PerspectiveWarpEngine';
import { DocumentEnhanceEngine, DocumentFilterMode, DocumentEnhanceOptions } from '../engines/DocumentEnhanceEngine';
import { ImageEngine } from '../engines/ImageEngine';
import { PdfEngine } from '../engines/PdfEngine';
import { PDFDocument } from 'pdf-lib';

export interface DocPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  icon: string;
  dpi: number;
  desc: string;
}

export const DOC_PRESETS: DocPreset[] = [
  {
    id: 'birth_cert_a4',
    name: 'জন্ম নিবন্ধন / A4 (210 × 297mm)',
    widthMm: 210,
    heightMm: 297,
    icon: '📄',
    dpi: 300,
    desc: 'ডিজিটাল জন্ম ও মৃত্যু সনদ এবং A4 ডকুমেন্ট (২১০ × ২৯৭ মিমি)'
  },
  {
    id: 'smart_nid',
    name: 'স্মার্ট এনআইডি (85.6 × 54mm)',
    widthMm: 85.6,
    heightMm: 53.98,
    icon: '💳',
    dpi: 300,
    desc: 'জাতীয় পরিচয়পত্র ID-1 স্ট্যান্ডার্ড (৮৫.৬ × ৫৪ মিমি)'
  },
  {
    id: 'old_nid',
    name: 'পুরাতন এনআইডি (105 × 75mm)',
    widthMm: 105,
    heightMm: 75,
    icon: '🪪',
    dpi: 300,
    desc: 'পুরাতন লেমিনেটিং ভোটার আইডি কার্ড (১০৫ × ৭৫ মিমি)'
  },
  {
    id: 'certificate_a4',
    name: 'সার্টিফিকেট / মার্কশিট (A4)',
    widthMm: 210,
    heightMm: 297,
    icon: '🎓',
    dpi: 300,
    desc: 'শিক্ষা সনদ ও মার্কশিট (২১০ × ২৯৭ মিমি)'
  },
  {
    id: 'legal_doc',
    name: 'দলিল / স্ট্যাম্প (Legal: 216 × 356mm)',
    widthMm: 216,
    heightMm: 356,
    icon: '⚖️',
    dpi: 300,
    desc: 'স্ট্যাম্প ও চুক্তিপত্র (২১৬ × ৩৫৬ মিমি)'
  },
  {
    id: 'driving_license',
    name: 'ড্রাইভিং লাইসেন্স (85.6 × 54mm)',
    widthMm: 85.6,
    heightMm: 53.98,
    icon: '🚗',
    dpi: 300,
    desc: 'BRTA স্মার্ট ড্রাইভিং লাইসেন্স (৮৫.৬ × ৫৪ মিমি)'
  },
  {
    id: 'passport_photo',
    name: 'পাসপোর্ট ছবি (35 × 45mm)',
    widthMm: 35,
    heightMm: 45,
    icon: '👤',
    dpi: 300,
    desc: 'পাসপোর্ট / ভিসা সাইজ ছবি (৩৫ × ৪৫ মিমি)'
  },
  {
    id: 'memo_a5',
    name: 'ক্যাশ মেমো / রশিদ (A5: 148 × 210mm)',
    widthMm: 148,
    heightMm: 210,
    icon: '🧾',
    dpi: 300,
    desc: 'অফিস মেমো ও চালান রশিদ (১৪৮ × ২১০ মিমি)'
  },
  {
    id: 'freeform',
    name: 'ফ্রি / কাস্টম সাইজ (Freeform)',
    widthMm: 0,
    heightMm: 0,
    icon: '📐',
    dpi: 300,
    desc: 'কোনো বিকৃতি ছাড়া অরিজিনাল কোণার মাপ অনুযায়ী ক্রপ'
  },
];

export interface DocumentPageItem {
  id: string;
  name: string;
  sourceCanvas: HTMLCanvasElement;
  warpedCanvas: HTMLCanvasElement | null;
  processedCanvas: HTMLCanvasElement | null;
  previewCanvas?: HTMLCanvasElement | null;
  previewSourceCanvas?: HTMLCanvasElement | null;
  quad: DocumentQuad;
  isWarpMode: boolean;
  hasAppliedWarp?: boolean;
  filterMode: DocumentFilterMode;
  colorBoost: number;           // 100 to 200 (Default: 100)
  textDarken: number;           // 100 to 200 (Default: 100)
  shadowStrength: number;
  brightness: number;
  contrast: number;
  sharpen: number;
  binarizeSensitivity: number;
  deskewAngle: number;
  selectedPreset: DocPreset;
}

export type DocumentStateListener = (pages: DocumentPageItem[], activeIndex: number) => void;

export class DocumentScanService {
  private static instance: DocumentScanService | null = null;
  private pages: DocumentPageItem[] = [];
  private activePageIndex: number = 0;
  private listeners: Set<DocumentStateListener> = new Set();
  private isProcessing: boolean = false;
  private fullResDebounceTimer: number | null = null;

  private constructor() {}

  public static getInstance(): DocumentScanService {
    if (!DocumentScanService.instance) {
      DocumentScanService.instance = new DocumentScanService();
    }
    return DocumentScanService.instance;
  }

  // ── Fast High-DPI Preview Buffer Helper ──
  private createPreviewBuffer(src: HTMLCanvasElement): HTMLCanvasElement {
    return src;
  }

  private rotateCanvas(src: HTMLCanvasElement, angleDeg: number): HTMLCanvasElement {
    const rad = (angleDeg * Math.PI) / 180;
    const rotCanvas = document.createElement('canvas');
    rotCanvas.width = src.width;
    rotCanvas.height = src.height;
    const rCtx = rotCanvas.getContext('2d');
    if (rCtx) {
      rCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
      rCtx.rotate(rad);
      rCtx.drawImage(src, -src.width / 2, -src.height / 2);
    }
    return rotCanvas;
  }

  // ── Reactive Subscription System (Signals/Observer Pattern) ──
  public subscribe(listener: DocumentStateListener): () => void {
    this.listeners.add(listener);
    listener([...this.pages], this.activePageIndex);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const clonedPages = [...this.pages];
    for (const listener of this.listeners) {
      listener(clonedPages, this.activePageIndex);
    }
  }

  // ── State Getters ──
  public getPages(): DocumentPageItem[] {
    return [...this.pages];
  }

  public getActivePage(): DocumentPageItem | null {
    return this.pages[this.activePageIndex] || null;
  }

  public getActivePageIndex(): number {
    return this.activePageIndex;
  }

  public setActivePageIndex(index: number): void {
    if (index >= 0 && index < this.pages.length) {
      this.activePageIndex = index;
      this.notify();
    }
  }

  // ── Page Creation Factory ──
  public createPageFromImage(image: HTMLImageElement | HTMLCanvasElement, name: string): DocumentPageItem {
    const c = document.createElement('canvas');
    c.width = (image as HTMLImageElement).naturalWidth || image.width || 1200;
    c.height = (image as HTMLImageElement).naturalHeight || image.height || 1600;
    const ctx = c.getContext('2d');
    if (ctx) ctx.drawImage(image, 0, 0);

    const detectedQuad = PerspectiveWarpEngine.autoDetectDocumentCorners(c);
    const initialQuad: DocumentQuad = {
      tl: { x: Math.round(c.width * 0.04), y: Math.round(c.height * 0.04) },
      tr: { x: Math.round(c.width * 0.96), y: Math.round(c.height * 0.04) },
      br: { x: Math.round(c.width * 0.96), y: Math.round(c.height * 0.96) },
      bl: { x: Math.round(c.width * 0.04), y: Math.round(c.height * 0.96) },
    };

    const effectiveQuad = detectedQuad || initialQuad;

    // Smart Preset Auto-Detection based on Aspect Ratio and file name
    const lowerName = (name || '').toLowerCase();
    const a4Preset = DOC_PRESETS.find(p => p.id === 'birth_cert_a4') || DOC_PRESETS[0];
    let initialPreset = a4Preset;

    const topW = Math.hypot(effectiveQuad.tr.x - effectiveQuad.tl.x, effectiveQuad.tr.y - effectiveQuad.tl.y);
    const botW = Math.hypot(effectiveQuad.br.x - effectiveQuad.bl.x, effectiveQuad.br.y - effectiveQuad.bl.y);
    const leftH = Math.hypot(effectiveQuad.bl.x - effectiveQuad.tl.x, effectiveQuad.bl.y - effectiveQuad.tl.y);
    const rightH = Math.hypot(effectiveQuad.br.x - effectiveQuad.tr.x, effectiveQuad.br.y - effectiveQuad.tr.y);

    const quadAvgW = (topW + botW) / 2;
    const quadAvgH = (leftH + rightH) / 2;
    const isLandscape = quadAvgW >= quadAvgH;
    const aspect = isLandscape ? (quadAvgW / quadAvgH) : (quadAvgH / quadAvgW);

    if (lowerName.includes('smart') || lowerName.includes('nid') || lowerName.includes('card') || lowerName.includes('voter')) {
      initialPreset = DOC_PRESETS.find(p => p.id === 'smart_nid') || a4Preset;
    } else if (lowerName.includes('passport') || lowerName.includes('visa') || lowerName.includes('photo')) {
      initialPreset = DOC_PRESETS.find(p => p.id === 'passport_photo') || a4Preset;
    } else if (lowerName.includes('legal') || lowerName.includes('stamp') || lowerName.includes('dolil')) {
      initialPreset = DOC_PRESETS.find(p => p.id === 'legal_doc') || a4Preset;
    } else if (lowerName.includes('memo') || lowerName.includes('chalan') || lowerName.includes('receipt')) {
      initialPreset = DOC_PRESETS.find(p => p.id === 'memo_a5') || a4Preset;
    } else if (isLandscape && aspect >= 1.50 && aspect <= 1.66 && Math.max(c.width, c.height) < 2200) {
      // Landscape Smart NID standard ratio ~1.586
      initialPreset = DOC_PRESETS.find(p => p.id === 'smart_nid') || a4Preset;
    } else if (isLandscape && aspect >= 1.33 && aspect <= 1.48 && Math.max(c.width, c.height) < 2200) {
      // Old NID ratio ~1.40
      initialPreset = DOC_PRESETS.find(p => p.id === 'old_nid') || a4Preset;
    } else if (!isLandscape && aspect >= 1.55 && aspect <= 1.75) {
      // Legal portrait ratio ~1.648
      initialPreset = DOC_PRESETS.find(p => p.id === 'legal_doc') || a4Preset;
    } else if (!isLandscape && aspect >= 1.20 && aspect <= 1.32 && Math.max(c.width, c.height) < 1800) {
      // 35x45mm passport ratio ~1.285
      initialPreset = DOC_PRESETS.find(p => p.id === 'passport_photo') || a4Preset;
    } else {
      initialPreset = a4Preset;
    }

    const previewSrc = this.createPreviewBuffer(c);

    return {
      id: `page-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      sourceCanvas: c,
      warpedCanvas: c,
      processedCanvas: c,
      previewCanvas: previewSrc,
      previewSourceCanvas: previewSrc,
      quad: effectiveQuad,
      isWarpMode: false,
      filterMode: 'original',
      colorBoost: 100,
      textDarken: 100,
      shadowStrength: 0,
      brightness: 0,
      contrast: 0,
      sharpen: 0,
      binarizeSensitivity: 50,
      deskewAngle: 0,
      selectedPreset: initialPreset,
    };
  }

  /**
   * Load any document files (PDFs, multi-page PDFs, JPG, PNG, WEBP, BMP, etc.)
   * and convert them into DocumentPageItem instances.
   */
  public async loadFiles(files: FileList | File[]): Promise<DocumentPageItem[]> {
    if (!files || files.length === 0) return [];
    const fileList = Array.from(files);
    const loadedPages: DocumentPageItem[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      try {
        if (PdfEngine.isPdf(file)) {
          // Render all pages in the PDF at 300 DPI
          const pdfPages = await PdfEngine.renderPdfToCanvases(file, 300);
          for (const pdfPage of pdfPages) {
            const pageTitle = pdfPages.length > 1
              ? `${file.name} (Page ${pdfPage.pageNumber})`
              : file.name;
            const newPage = this.createPageFromImage(pdfPage.canvas, pageTitle);
            loadedPages.push(newPage);
          }
        } else {
          // Normal Image File
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (evt) => {
              const image = new Image();
              image.onload = () => resolve(image);
              image.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
              image.src = evt.target?.result as string;
            };
            reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
            reader.readAsDataURL(file);
          });

          const newPage = this.createPageFromImage(img, file.name || `Document_${i + 1}.jpg`);
          loadedPages.push(newPage);
        }
      } catch (err) {
        console.error(`[DocumentScanService] Failed to load file ${file.name}:`, err);
      }
    }

    if (loadedPages.length > 0) {
      this.addPages(loadedPages);
    }
    return loadedPages;
  }

  // ── Batch Page Management Operations ──
  public addPages(newPages: DocumentPageItem[]): void {
    const wasEmpty = this.pages.length === 0;
    this.pages.push(...newPages);
    if (wasEmpty && this.pages.length > 0) {
      this.activePageIndex = 0;
    }
    this.notify();
  }

  public removePage(index: number): void {
    if (index >= 0 && index < this.pages.length) {
      this.pages.splice(index, 1);
      if (this.activePageIndex >= this.pages.length) {
        this.activePageIndex = Math.max(0, this.pages.length - 1);
      }
      this.notify();
    }
  }

  public duplicatePage(index: number): void {
    const page = this.pages[index];
    if (!page) return;

    const dupCanvas = (src: HTMLCanvasElement): HTMLCanvasElement => {
      const c = document.createElement('canvas');
      c.width = src.width;
      c.height = src.height;
      const ctx = c.getContext('2d');
      if (ctx) ctx.drawImage(src, 0, 0);
      return c;
    };

    const duplicated: DocumentPageItem = {
      ...page,
      id: `page-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${page.name} (Copy)`,
      sourceCanvas: dupCanvas(page.sourceCanvas),
      warpedCanvas: page.warpedCanvas ? dupCanvas(page.warpedCanvas) : null,
      processedCanvas: page.processedCanvas ? dupCanvas(page.processedCanvas) : null,
      previewCanvas: page.previewCanvas ? dupCanvas(page.previewCanvas) : null,
      previewSourceCanvas: page.previewSourceCanvas ? dupCanvas(page.previewSourceCanvas) : null,
      quad: { ...page.quad },
    };

    this.pages.splice(index + 1, 0, duplicated);
    this.activePageIndex = index + 1;
    this.notify();
  }

  public reorderPages(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.pages.length || toIndex < 0 || toIndex >= this.pages.length) return;
    const [moved] = this.pages.splice(fromIndex, 1);
    this.pages.splice(toIndex, 0, moved);
    this.activePageIndex = toIndex;
    this.notify();
  }

  public clearAllPages(): void {
    this.pages = [];
    this.activePageIndex = 0;
    this.notify();
  }

  // ── Two-Way Data Binding & Reactive Property Update ──
  public updateActivePage(updates: Partial<DocumentPageItem>, fullResImmediate: boolean = false): void {
    if (!this.pages[this.activePageIndex]) return;

    const prevPage = this.pages[this.activePageIndex];
    this.pages[this.activePageIndex] = {
      ...prevPage,
      ...updates,
    };

    // Only re-process heavy image enhancement pipeline if filter or enhancement parameters changed
    const filterPropsChanged =
      (updates.filterMode !== undefined && updates.filterMode !== prevPage.filterMode) ||
      (updates.colorBoost !== undefined && updates.colorBoost !== prevPage.colorBoost) ||
      (updates.textDarken !== undefined && updates.textDarken !== prevPage.textDarken) ||
      (updates.shadowStrength !== undefined && updates.shadowStrength !== prevPage.shadowStrength) ||
      (updates.brightness !== undefined && updates.brightness !== prevPage.brightness) ||
      (updates.contrast !== undefined && updates.contrast !== prevPage.contrast) ||
      (updates.sharpen !== undefined && updates.sharpen !== prevPage.sharpen) ||
      (updates.binarizeSensitivity !== undefined && updates.binarizeSensitivity !== prevPage.binarizeSensitivity) ||
      (updates.deskewAngle !== undefined && updates.deskewAngle !== prevPage.deskewAngle);

    if (filterPropsChanged) {
      this.reprocessActivePagePipeline(fullResImmediate);
    }

    this.notify();
  }

  // ── Lightning-Fast Real-Time Full-Resolution Reactive Pipeline ──
  public reprocessActivePagePipeline(fullResImmediate: boolean = true): void {
    const page = this.pages[this.activePageIndex];
    if (!page) return;

    const baseCanvas = page.isWarpMode
      ? page.sourceCanvas
      : (page.warpedCanvas || page.sourceCanvas);

    const options: DocumentEnhanceOptions = {
      mode: page.isWarpMode ? 'original' : page.filterMode,
      colorBoost: page.colorBoost,
      textDarken: page.textDarken,
      shadowRemovalStrength: page.shadowStrength,
      brightness: page.brightness,
      contrast: page.contrast,
      sharpen: page.sharpen,
      binarizeSensitivity: page.binarizeSensitivity,
    };

    const target = page.deskewAngle !== 0
      ? this.rotateCanvas(baseCanvas, page.deskewAngle)
      : baseCanvas;

    const processed = DocumentEnhanceEngine.processDocument(target, options);
    page.processedCanvas = processed;
    page.previewCanvas = processed;
    page.previewSourceCanvas = target;
  }

  // ── Auto-Orientation 4-Corner Warp (Preserving Native Max Resolution) ──
  public applyWarpToActivePage(overridePreset?: DocPreset): void {
    const page = this.pages[this.activePageIndex];
    if (!page) return;

    const p = overridePreset || page.selectedPreset;
    const q = page.quad;
    const topW = Math.hypot(q.tr.x - q.tl.x, q.tr.y - q.tl.y);
    const botW = Math.hypot(q.br.x - q.bl.x, q.br.y - q.bl.y);
    const leftH = Math.hypot(q.bl.x - q.tl.x, q.bl.y - q.tl.y);
    const rightH = Math.hypot(q.br.x - q.tr.x, q.br.y - q.tr.y);

    const quadAvgW = (topW + botW) / 2;
    const quadAvgH = (leftH + rightH) / 2;
    const isQuadLandscape = quadAvgW >= quadAvgH;

    const rawMaxW = Math.max(topW, botW);
    const rawMaxH = Math.max(leftH, rightH);

    let targetW: number;
    let targetH: number;

    if (p.id === 'freeform' || p.widthMm === 0 || p.heightMm === 0) {
      // Natural geometric resolution without forced aspect distortion
      targetW = Math.max(100, Math.round(rawMaxW));
      targetH = Math.max(100, Math.round(rawMaxH));
    } else {
      const minDimMm = Math.min(p.widthMm, p.heightMm);
      const maxDimMm = Math.max(p.widthMm, p.heightMm);

      const targetWMm = isQuadLandscape ? maxDimMm : minDimMm;
      const targetHMm = isQuadLandscape ? minDimMm : maxDimMm;
      const ratio = targetWMm / targetHMm;

      // 300 DPI baseline
      const base300DpiW = Math.round((targetWMm / 25.4) * (p.dpi || 300));
      const base300DpiH = Math.round((targetHMm / 25.4) * (p.dpi || 300));

      // Preserve native resolution: scale to the larger of 300 DPI or native source quad dimension
      let bestW = Math.max(base300DpiW, Math.round(rawMaxW));
      let bestH = Math.round(bestW / ratio);

      if (bestH < Math.max(base300DpiH, Math.round(rawMaxH))) {
        bestH = Math.max(base300DpiH, Math.round(rawMaxH));
        bestW = Math.round(bestH * ratio);
      }

      targetW = Math.round(bestW);
      targetH = Math.round(bestH);
    }

    const warped = PerspectiveWarpEngine.warpPerspective(
      page.sourceCanvas,
      page.quad,
      targetW,
      targetH
    );

    page.warpedCanvas = warped;
    page.previewSourceCanvas = warped;
    page.isWarpMode = false;
    page.selectedPreset = p;
    page.hasAppliedWarp = true;
    this.reprocessActivePagePipeline(true);
    this.notify();
  }

  /**
   * Fit an entire image cleanly into a target preset frame (edge-to-edge aspect ratio & physical format)
   * filling the complete frame without white side margins.
   */
  public fitImageIntoPresetFrame(
    src: HTMLCanvasElement,
    preset: DocPreset
  ): HTMLCanvasElement {
    if (preset.id === 'freeform' || preset.widthMm === 0 || preset.heightMm === 0) {
      return src;
    }

    const ratio = preset.widthMm / preset.heightMm;
    const isPresetLandscape = preset.widthMm >= preset.heightMm;

    // Determine target pixel resolution (guaranteeing >= 300 DPI and native clarity)
    const base300DpiW = Math.round((preset.widthMm / 25.4) * 300);
    const base300DpiH = Math.round((preset.heightMm / 25.4) * 300);

    const maxSrcDim = Math.max(src.width, src.height);
    let targetW = Math.max(base300DpiW, Math.round(isPresetLandscape ? maxSrcDim : maxSrcDim * ratio));
    let targetH = Math.round(targetW / ratio);

    if (targetH < base300DpiH) {
      targetH = base300DpiH;
      targetW = Math.round(targetH * ratio);
    }

    const out = document.createElement('canvas');
    out.width = targetW;
    out.height = targetH;
    const ctx = out.getContext('2d');
    if (!ctx) return src;

    // Draw the full document filling 100% edge-to-edge of the target frame
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, targetW, targetH);

    return out;
  }

  // ── Preset Dimension & Aspect Ratio Selector ──
  public changeActivePagePreset(preset: DocPreset): void {
    const page = this.pages[this.activePageIndex];
    if (!page) return;

    page.selectedPreset = preset;

    if (page.isWarpMode) {
      // Adjust the active crop quad to match the new preset's aspect ratio
      if (preset.id !== 'freeform' && preset.widthMm > 0 && preset.heightMm > 0) {
        const w = page.sourceCanvas.width;
        const h = page.sourceCanvas.height;
        const ratio = preset.widthMm / preset.heightMm;

        let targetW = w * 0.85;
        let targetH = targetW / ratio;

        if (targetH > h * 0.85) {
          targetH = h * 0.85;
          targetW = targetH * ratio;
        }

        const cx = w / 2;
        const cy = h / 2;

        page.quad = {
          tl: { x: Math.round(cx - targetW / 2), y: Math.round(cy - targetH / 2) },
          tr: { x: Math.round(cx + targetW / 2), y: Math.round(cy - targetH / 2) },
          br: { x: Math.round(cx + targetW / 2), y: Math.round(cy + targetH / 2) },
          bl: { x: Math.round(cx - targetW / 2), y: Math.round(cy + targetH / 2) },
        };
      }
      this.notify();
    } else {
      // If user has already applied a 4-corner crop, re-warp the cropped card from sourceCanvas with the new preset dimensions!
      if (page.hasAppliedWarp) {
        this.applyWarpToActivePage(preset);
      } else {
        // Normal mode: fit the active document into the selected preset frame
        const base = page.warpedCanvas || page.sourceCanvas;
        const framed = this.fitImageIntoPresetFrame(base, preset);
        page.warpedCanvas = framed;
        page.previewSourceCanvas = framed;
        this.reprocessActivePagePipeline(true);
        this.notify();
      }
    }
  }

  // ── 90° Rotations with Quad Coordinate Transforms ──
  public rotateActivePage(cw = true): void {
    const page = this.pages[this.activePageIndex];
    if (!page) return;

    if (page.isWarpMode) {
      // In crop mode: rotate source canvas and transform quad corners
      const oldCanvas = page.sourceCanvas;
      const rot = ImageEngine.rotateCanvas(oldCanvas, cw ? 90 : -90);
      const W = oldCanvas.width;
      const H = oldCanvas.height;

      const rotatePoint = (p: Point2D): Point2D => {
        return cw ? { x: H - p.y, y: p.x } : { x: p.y, y: W - p.x };
      };

      const q = page.quad;
      const nextQuad: DocumentQuad = cw
        ? {
            tl: rotatePoint(q.bl),
            tr: rotatePoint(q.tl),
            br: rotatePoint(q.tr),
            bl: rotatePoint(q.br),
          }
        : {
            tl: rotatePoint(q.tr),
            tr: rotatePoint(q.br),
            br: rotatePoint(q.bl),
            bl: rotatePoint(q.tl),
          };

      page.sourceCanvas = rot;
      page.previewSourceCanvas = this.createPreviewBuffer(rot);
      page.quad = nextQuad;
    } else {
      // Normal mode: rotate active warped canvas
      const active = page.warpedCanvas || page.sourceCanvas;
      const rot = ImageEngine.rotateCanvas(active, cw ? 90 : -90);
      page.warpedCanvas = rot;
      page.previewSourceCanvas = this.createPreviewBuffer(rot);
      this.reprocessActivePagePipeline(true);
    }

    this.notify();
  }

  // ── 300 DPI PDF Generation Service (Supports Single Page & Multi-Page Selection) ──
  public async generatePdf(
    pageIndices?: number[],
    pageSize: 'A4' | 'Legal' | 'Original' = 'A4'
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const targetPages = (pageIndices && pageIndices.length > 0)
      ? pageIndices.map(idx => this.pages[idx]).filter(Boolean)
      : this.pages;

    for (const page of targetPages) {
      const activeCanvas = page.processedCanvas || page.warpedCanvas || page.sourceCanvas;
      if (!activeCanvas) continue;

      const imgDataUrl = activeCanvas.toDataURL('image/jpeg', 0.95);
      const jpgImage = await pdfDoc.embedJpg(imgDataUrl);

      let pWidth = 595.28; // A4 pt (210mm)
      let pHeight = 841.89; // A4 pt (297mm)

      if (pageSize === 'Legal') {
        pWidth = 612.0;
        pHeight = 1008.0;
      } else if (pageSize === 'Original') {
        pWidth = (activeCanvas.width / 300) * 72;
        pHeight = (activeCanvas.height / 300) * 72;
      }

      // Check aspect ratio for auto landscape / portrait orientation
      const imgAspect = activeCanvas.width / activeCanvas.height;
      if (imgAspect > 1 && pHeight > pWidth) {
        // Swap to landscape
        const tmp = pWidth;
        pWidth = pHeight;
        pHeight = tmp;
      }

      const pdfPage = pdfDoc.addPage([pWidth, pHeight]);

      // Calculate fitted dimensions maintaining aspect ratio
      const pageAspect = pWidth / pHeight;
      let drawW = pWidth;
      let drawH = pHeight;
      let drawX = 0;
      let drawY = 0;

      if (imgAspect > pageAspect) {
        drawW = pWidth;
        drawH = pWidth / imgAspect;
        drawY = (pHeight - drawH) / 2;
      } else {
        drawH = pHeight;
        drawW = pHeight * imgAspect;
        drawX = (pWidth - drawW) / 2;
      }

      pdfPage.drawImage(jpgImage, {
        x: drawX,
        y: drawY,
        width: drawW,
        height: drawH,
      });
    }

    return await pdfDoc.save();
  }

  // Alias for backward compatibility
  public async generateMultiPagePdf(pageSize: 'A4' | 'Legal' | 'Original' = 'A4'): Promise<Uint8Array> {
    return this.generatePdf(undefined, pageSize);
  }
}

export const documentScanService = DocumentScanService.getInstance();
