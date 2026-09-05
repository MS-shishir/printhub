/**
 * LayerEngine.ts - Production Canvas Layer Engine
 * Layer hierarchy management, Z-Index reordering, opacity, visibility & locking.
 */

import * as fabric from 'fabric';

export interface LayerItem {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  fabricObject: fabric.Object;
}

export class LayerEngine {
  private canvas: fabric.Canvas;

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
  }

  /**
   * Get formatted list of layer items from active canvas objects
   */
  public getLayers(): LayerItem[] {
    const objects = this.canvas.getObjects();
    return objects.map((obj, idx) => ({
      id: (obj as any).id || `layer_${idx}`,
      name: (obj as any).name || `${obj.type || 'Object'} ${idx + 1}`,
      type: obj.type || 'unknown',
      visible: obj.visible !== false,
      locked: !obj.selectable,
      opacity: obj.opacity !== undefined ? obj.opacity : 1,
      fabricObject: obj,
    })).reverse(); // Top layer first
  }

  public bringForward(obj: fabric.Object): void {
    this.canvas.bringObjectForward(obj);
    this.canvas.renderAll();
  }

  public sendBackward(obj: fabric.Object): void {
    this.canvas.sendObjectBackwards(obj);
    this.canvas.renderAll();
  }

  public bringToFront(obj: fabric.Object): void {
    this.canvas.bringObjectToFront(obj);
    this.canvas.renderAll();
  }

  public sendToBack(obj: fabric.Object): void {
    this.canvas.sendObjectToBack(obj);
    this.canvas.renderAll();
  }

  public toggleVisibility(obj: fabric.Object): boolean {
    obj.set('visible', !obj.visible);
    this.canvas.renderAll();
    return !!obj.visible;
  }

  public toggleLock(obj: fabric.Object): boolean {
    const isLocked = !obj.selectable;
    obj.set({
      selectable: isLocked,
      evented: isLocked,
    });
    this.canvas.renderAll();
    return !obj.selectable;
  }

  public setOpacity(obj: fabric.Object, opacity: number): void {
    obj.set('opacity', Math.max(0, Math.min(1, opacity)));
    this.canvas.renderAll();
  }
}
