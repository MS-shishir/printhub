export type OverlayToolType =
  | 'text'
  | 'image'
  | 'signature'
  | 'stamp'
  | 'date'
  | 'qrcode'
  | 'barcode'
  | 'highlight'
  | 'arrow'
  | 'rectangle'
  | 'circle'
  | 'whiteRectangle'
  | 'freeDraw'
  | 'group';

export type OverlayObjectType = 'text' | 'image' | 'path' | 'rect' | 'circle' | 'line' | 'group';

export type LayerVisibility = 'visible' | 'hidden' | 'locked';

export interface OverlayBase {
  id: string;
  type: OverlayObjectType;
  toolType: OverlayToolType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  pageIndex: number;
  layerId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface OverlayText extends OverlayBase {
  type: 'text';
  toolType: 'text' | 'stamp' | 'date' | 'signature';
  content: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  textAlign: 'left' | 'center' | 'right';
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  fontStyle: 'normal' | 'italic' | 'bold' | 'bold italic';
}

export interface OverlayImage extends OverlayBase {
  type: 'image';
  toolType: 'image';
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  scaleX: number;
  scaleY: number;
}

export interface OverlayPath extends OverlayBase {
  type: 'path';
  toolType: 'highlight' | 'arrow' | 'freeDraw' | 'signature';
  svgPath: string;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  pathType: 'freehand' | 'arrow' | 'highlight' | 'signature';
  arrowheadSize?: number;
}

export interface OverlayRect extends OverlayBase {
  type: 'rect';
  toolType: 'rectangle' | 'whiteRectangle' | 'highlight';
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  borderRadius: number;
}

export interface OverlayCircle extends OverlayBase {
  type: 'circle';
  toolType: 'circle';
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  radius: number;
}

export interface OverlayLine extends OverlayBase {
  type: 'line';
  toolType: 'arrow';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeColor: string;
  strokeWidth: number;
  arrowheadSize: number;
}

export interface OverlayGroup extends OverlayBase {
  type: 'group';
  toolType: 'group';
  children: string[];
}

export type OverlayObject = OverlayText | OverlayImage | OverlayPath | OverlayRect | OverlayCircle | OverlayLine | OverlayGroup;

export interface OverlayLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  objectIds: string[];
}

export interface OverlayState {
  objects: Map<string, OverlayObject>;
  layers: OverlayLayer[];
  selectedIds: string[];
  activeLayerId: string | null;
  activeTool: OverlayToolType;
  undoStack: OverlayHistoryEntry[];
  redoStack: OverlayHistoryEntry[];
  properties: Record<string, any>;
}

export interface OverlayProperties {
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  backgroundColor?: string;
  content?: string;
  src?: string;
  pathType?: string;
  arrowheadSize?: number;
  radius?: number;
}

export interface OverlayExportOptions {
  fileName: string;
  includeOriginal: boolean;
  compressImages: boolean;
  imageQuality: number;
  embedFonts: boolean;
  flattenAnnotations: boolean;
}

export interface OverlayHistoryEntry {
  type: 'add' | 'delete' | 'modify' | 'move' | 'resize' | 'reorder';
  objectId: string;
  previousState?: OverlayObject;
  newState?: OverlayObject;
  timestamp: number;
}

export interface PdfPageOverlay {
  pageIndex: number;
  pageWidth: number;
  pageHeight: number;
  objects: OverlayObject[];
}

export interface OverlayToolConfig {
  id: OverlayToolType;
  label: string;
  icon: string;
  category: 'annotate' | 'draw' | 'add' | 'measure';
  cursor: string;
  defaultProperties: Partial<OverlayProperties>;
}