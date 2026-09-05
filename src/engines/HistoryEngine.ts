/**
 * HistoryEngine.ts & UndoRedoEngine.ts - Production State History & Transaction Stack Engine
 * Manages non-destructive state snapshot stack with time-travel undo/redo capabilities.
 */

function cloneState<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  
  if (Array.isArray(obj)) {
    return obj.map(item => cloneState(item)) as any;
  }

  const copy: any = {};
  for (const key of Object.keys(obj)) {
    // Preserve direct DOM/Canvas element references without cloning heavy buffers
    if (key === '_rawSourceElement' || key === 'imageElement' || key === 'element' || key === 'canvasRef') {
      copy[key] = (obj as any)[key];
    } else {
      copy[key] = cloneState((obj as any)[key]);
    }
  }
  return copy;
}

export class HistoryEngine<T = any> {
  private history: T[] = [];
  private currentIndex: number = -1;
  private maxHistory: number;

  constructor(maxHistory: number = 50) {
    this.maxHistory = maxHistory;
  }

  /**
   * Push a new state snapshot onto the history timeline
   */
  public pushState(state: T): void {
    const clone = cloneState(state);

    // Truncate any future redo branch if user performs new action after undo
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    this.history.push(clone);

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
  }

  /**
   * Perform Undo and return the previous state snapshot
   */
  public undo(currentState?: T): T | null {
    if (!this.canUndo()) return null;
    this.currentIndex--;
    return cloneState(this.history[this.currentIndex]);
  }

  /**
   * Perform Redo and return the next state snapshot
   */
  public redo(currentState?: T): T | null {
    if (!this.canRedo()) return null;
    this.currentIndex++;
    return cloneState(this.history[this.currentIndex]);
  }

  public canUndo(): boolean {
    return this.currentIndex > 0;
  }

  public canRedo(): boolean {
    return this.currentIndex >= 0 && this.currentIndex < this.history.length - 1;
  }

  public clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }

  public getCurrentState(): T | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return cloneState(this.history[this.currentIndex]);
    }
    return null;
  }

  public getUndoCount(): number {
    return Math.max(0, this.currentIndex);
  }

  public getRedoCount(): number {
    return Math.max(0, this.history.length - 1 - this.currentIndex);
  }
}

export const UndoRedoEngine = HistoryEngine;
