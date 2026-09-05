/**
 * ClipboardEngine.ts - Production Object Clipboard Engine
 * Copy, cut, paste & duplicate buffer manager for canvas objects.
 */

import * as fabric from 'fabric';

export class ClipboardEngine {
  private clipboardData: any = null;
  private canvas: fabric.Canvas;

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
  }

  /**
   * Copy active selected canvas objects to internal clipboard
   */
  public copy(): boolean {
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject) return false;

    activeObject.clone().then((cloned: any) => {
      this.clipboardData = cloned;
    });

    return true;
  }

  /**
   * Cut active selected canvas objects
   */
  public cut(): boolean {
    const success = this.copy();
    if (success) {
      const activeObjects = this.canvas.getActiveObjects();
      activeObjects.forEach(obj => this.canvas.remove(obj));
      this.canvas.discardActiveObject();
      this.canvas.renderAll();
    }
    return success;
  }

  /**
   * Paste copied objects from internal clipboard onto canvas with offset
   */
  public paste(): boolean {
    if (!this.clipboardData) return false;

    this.clipboardData.clone().then((clonedObj: any) => {
      this.canvas.discardActiveObject();

      clonedObj.set({
        left: (clonedObj.left || 0) + 15,
        top: (clonedObj.top || 0) + 15,
        evented: true,
      });

      if (clonedObj.type === 'activeSelection') {
        clonedObj.canvas = this.canvas;
        clonedObj.forEachObject((obj: any) => {
          this.canvas.add(obj);
        });
        clonedObj.setCoordinates();
      } else {
        this.canvas.add(clonedObj);
      }

      this.clipboardData.top += 15;
      this.clipboardData.left += 15;

      this.canvas.setActiveObject(clonedObj);
      this.canvas.renderAll();
    });

    return true;
  }

  /**
   * Duplicate active object instantly
   */
  public duplicate(): boolean {
    if (this.copy()) {
      return this.paste();
    }
    return false;
  }
}
