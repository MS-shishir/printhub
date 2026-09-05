/**
 * Shared module-level ref so PrintPreview can expose
 * its canvas to ExportPanel for WYSIWYG printing.
 */
export const sharedPrintCanvasRef: { current: HTMLCanvasElement | null } = {
  current: null,
};
