// ── useExport Hook ────────────────────────────────────────────────────────
// Generates the final print-ready crop and triggers export operations.

import { useCallback, useState } from 'react';
import { PassportTemplate, LayoutConfig } from '../types/passport-types';
import { exportSinglePhoto, exportPDF, printPassportSheet } from '../services/export.service';
import { resizeImageToPrintSize } from '../services/image-processing.service';
import { mmToPx, PRINT_DPI } from '../utils/mm-to-px';

interface UseExportReturn {
  isExporting: boolean;
  exportError: string | null;
  downloadPNG: (imageUrl: string, template: PassportTemplate) => Promise<void>;
  downloadJPEG: (imageUrl: string, template: PassportTemplate) => Promise<void>;
  downloadPDF: (imageUrl: string, template: PassportTemplate, layoutConfig: LayoutConfig, bgColor: string) => Promise<void>;
  printSheet: (imageUrl: string, template: PassportTemplate, layoutConfig: LayoutConfig, bgColor: string) => Promise<void>;
}

export function useExport(): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const withExport = useCallback(async (fn: () => Promise<void>) => {
    setIsExporting(true);
    setExportError(null);
    try {
      await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      setExportError(msg);
      console.error('[Export]', err);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const downloadPNG = useCallback(async (imageUrl: string, template: PassportTemplate) => {
    await withExport(async () => {
      // Use 1200 DPI Ultra HD resolution for single photo download so it looks ultra sharp on screen and print
      const w = Math.round(mmToPx(template.widthMm, 1200));
      const h = Math.round(mmToPx(template.heightMm, 1200));
      const printReady = await resizeImageToPrintSize(imageUrl, w, h);
      await exportSinglePhoto(printReady, template, 'png', 1.0, 1200);
    });
  }, [withExport]);

  const downloadJPEG = useCallback(async (imageUrl: string, template: PassportTemplate) => {
    await withExport(async () => {
      const w = Math.round(mmToPx(template.widthMm, 1200));
      const h = Math.round(mmToPx(template.heightMm, 1200));
      const printReady = await resizeImageToPrintSize(imageUrl, w, h);
      await exportSinglePhoto(printReady, template, 'jpeg', 0.98, 1200);
    });
  }, [withExport]);

  const downloadPDF = useCallback(async (
    imageUrl: string,
    template: PassportTemplate,
    layoutConfig: LayoutConfig,
    bgColor: string
  ) => {
    await withExport(async () => {
      const w = Math.round(mmToPx(template.widthMm, PRINT_DPI));
      const h = Math.round(mmToPx(template.heightMm, PRINT_DPI));
      const printReady = await resizeImageToPrintSize(imageUrl, w, h, bgColor);
      await exportPDF(printReady, template, layoutConfig, bgColor);
    });
  }, [withExport]);

  const printSheet = useCallback(async (
    imageUrl: string,
    template: PassportTemplate,
    layoutConfig: LayoutConfig,
    bgColor: string
  ) => {
    await withExport(async () => {
      const w = Math.round(mmToPx(template.widthMm, PRINT_DPI));
      const h = Math.round(mmToPx(template.heightMm, PRINT_DPI));
      const printReady = await resizeImageToPrintSize(imageUrl, w, h, bgColor);
      await printPassportSheet(printReady, template, layoutConfig, bgColor);
    });
  }, [withExport]);

  return { isExporting, exportError, downloadPNG, downloadJPEG, downloadPDF, printSheet };
}
