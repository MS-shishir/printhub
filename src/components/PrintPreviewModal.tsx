/**
 * PrintPreviewModal.tsx
 * Bridge adapter that mounts the new Enterprise Custom Professional Print System (CustomPrintModal).
 * Preserves 100% backward compatibility for all existing invocations.
 */

import React from 'react';
import CustomPrintModal, { CustomPrintModalProps } from './ui/CustomPrintModal';

export interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  sourceImageOrCanvas?: HTMLCanvasElement | HTMLImageElement | string | null;
  initialPaperSize?: any;
  initialOrientation?: any;
  initialCopies?: number;
  initialColorMode?: any;
  onConfirmPrint?: (details: {
    paperSize: string;
    colorMode: string;
    copies: number;
    totalPrice: number;
    printerName?: string;
    orientation?: string;
  }) => void;
  language?: 'en' | 'bn';
}

export default function PrintPreviewModal({
  isOpen,
  onClose,
  title = 'Studio_Document_Print.pdf',
  sourceImageOrCanvas,
  initialPaperSize,
  initialOrientation,
  initialCopies,
  initialColorMode,
  onConfirmPrint,
  language = 'bn',
}: PrintPreviewModalProps) {
  return (
    <CustomPrintModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      sourceImageOrCanvas={sourceImageOrCanvas}
      initialPaperSize={initialPaperSize}
      initialOrientation={initialOrientation}
      initialCopies={initialCopies}
      initialColorMode={initialColorMode}
      onConfirmPrint={(details) => {
        if (onConfirmPrint) {
          onConfirmPrint(details);
        }
      }}
      language={language}
    />
  );
}
