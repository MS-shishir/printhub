/**
 * CanvasEngine.ts - Production Canvas Engine
 * Fabric.js Canvas wrapper with high-DPI scaling, grid snapping & viewport control.
 */

import * as fabric from 'fabric';

export interface CanvasEngineOptions {
  width: number;
  height: number;
  gridSize?: number;
  snapToGrid?: boolean;
}

export class CanvasEngine {
  private fabricCanvas: fabric.Canvas;
  private gridSize: number;
  private snapToGrid: boolean;

  constructor(canvasElement: HTMLCanvasElement, options: CanvasEngineOptions) {
    this.gridSize = options.gridSize || 20;
    this.snapToGrid = options.snapToGrid || false;

    this.fabricCanvas = new fabric.Canvas(canvasElement, {
      width: options.width,
      height: options.height,
      preserveObjectStacking: true,
      selection: true,
    });

    this.initEvents();
  }

  private initEvents() {
    this.fabricCanvas.on('object:moving', (e) => {
      if (!this.snapToGrid || !e.target) return;
      
      const target = e.target;
      target.set({
        left: Math.round((target.left || 0) / this.gridSize) * this.gridSize,
        top: Math.round((target.top || 0) / this.gridSize) * this.gridSize,
      });
    });
  }

  public getFabricCanvas(): fabric.Canvas {
    return this.fabricCanvas;
  }

  public setSnapToGrid(snap: boolean) {
    this.snapToGrid = snap;
  }

  public setZoom(zoomPercent: number) {
    const zoom = zoomPercent / 100;
    this.fabricCanvas.setZoom(zoom);
    this.fabricCanvas.renderAll();
  }

  public resize(width: number, height: number) {
    this.fabricCanvas.setDimensions({ width, height });
    this.fabricCanvas.renderAll();
  }

  public clear() {
    this.fabricCanvas.clear();
    this.fabricCanvas.renderAll();
  }

  public dispose() {
    this.fabricCanvas.dispose();
  }
}
