/**
 * SelectionEngine.ts - Production Selection & Alignment Engine
 * Multi-object bounding box alignment & distribution space calculator.
 */

import * as fabric from 'fabric';

export type AlignmentType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
export type DistributionType = 'horizontal' | 'vertical';

export class SelectionEngine {
  private canvas: fabric.Canvas;

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
  }

  /**
   * Align active selected objects or active group
   */
  public alignObjects(type: AlignmentType): void {
    const activeObjects = this.canvas.getActiveObjects();
    if (!activeObjects || activeObjects.length === 0) return;

    if (activeObjects.length === 1) {
      // Align single object relative to Canvas bounds
      const obj = activeObjects[0];
      const canvasWidth = this.canvas.getWidth();
      const canvasHeight = this.canvas.getHeight();

      switch (type) {
        case 'left':
          obj.set({ left: 0 });
          break;
        case 'center':
          obj.set({ left: (canvasWidth - obj.getBoundingRect().width) / 2 });
          break;
        case 'right':
          obj.set({ left: canvasWidth - obj.getBoundingRect().width });
          break;
        case 'top':
          obj.set({ top: 0 });
          break;
        case 'middle':
          obj.set({ top: (canvasHeight - obj.getBoundingRect().height) / 2 });
          break;
        case 'bottom':
          obj.set({ top: canvasHeight - obj.getBoundingRect().height });
          break;
      }
    } else {
      // Align multi-selection relative to outer bounding box
      let minLeft = Infinity;
      let maxRight = -Infinity;
      let minTop = Infinity;
      let maxBottom = -Infinity;

      activeObjects.forEach((obj) => {
        const bound = obj.getBoundingRect();
        if (bound.left < minLeft) minLeft = bound.left;
        if (bound.left + bound.width > maxRight) maxRight = bound.left + bound.width;
        if (bound.top < minTop) minTop = bound.top;
        if (bound.top + bound.height > maxBottom) maxBottom = bound.top + bound.height;
      });

      const groupWidth = maxRight - minLeft;
      const groupHeight = maxBottom - minTop;

      activeObjects.forEach((obj) => {
        const bound = obj.getBoundingRect();
        switch (type) {
          case 'left':
            obj.set({ left: minLeft });
            break;
          case 'center':
            obj.set({ left: minLeft + (groupWidth - bound.width) / 2 });
            break;
          case 'right':
            obj.set({ left: maxRight - bound.width });
            break;
          case 'top':
            obj.set({ top: minTop });
            break;
          case 'middle':
            obj.set({ top: minTop + (groupHeight - bound.height) / 2 });
            break;
          case 'bottom':
            obj.set({ top: maxBottom - bound.height });
            break;
        }
      });
    }

    this.canvas.renderAll();
  }

  /**
   * Distribute space between 3 or more selected objects equally
   */
  public distributeObjects(type: DistributionType): void {
    const activeObjects = this.canvas.getActiveObjects();
    if (!activeObjects || activeObjects.length < 3) return;

    if (type === 'horizontal') {
      const sorted = [...activeObjects].sort((a, b) => (a.left || 0) - (b.left || 0));
      const first = sorted[0].left || 0;
      const last = sorted[sorted.length - 1].left || 0;
      const step = (last - first) / (sorted.length - 1);

      sorted.forEach((obj, idx) => {
        obj.set({ left: first + idx * step });
      });
    } else {
      const sorted = [...activeObjects].sort((a, b) => (a.top || 0) - (b.top || 0));
      const first = sorted[0].top || 0;
      const last = sorted[sorted.length - 1].top || 0;
      const step = (last - first) / (sorted.length - 1);

      sorted.forEach((obj, idx) => {
        obj.set({ top: first + idx * step });
      });
    }

    this.canvas.renderAll();
  }
}
