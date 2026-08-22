/**
 * Shared layout state — PrintPreview syncs placed items here
 * so ExportPanel/print service can access them for high-DPI output.
 */

export interface SharedPlacedItem {
  id: string;
  url: string;        // original high-res data URL
  name: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  rotateDegrees: number;
}

export const sharedLayoutState: {
  items: SharedPlacedItem[];
  paperWMm: number;
  paperHMm: number;
} = {
  items: [],
  paperWMm: 210,
  paperHMm: 297,
};
