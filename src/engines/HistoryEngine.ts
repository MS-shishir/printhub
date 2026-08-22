/**
 * HistoryEngine.ts & UndoRedoEngine.ts - Production State History & Transaction Stack Engine
 * Manages non-destructive state snapshot stack with time-travel undo/redo capabilities.
 */

export class HistoryEngine<T = any> {
  private undoStack: T[] = [];
  private redoStack: T[] = [];
  private maxHistory: number;

  constructor(maxHistory: number = 50) {
    this.maxHistory = maxHistory;
  }

  /**
   * Push a new state snapshot onto the history stack
   */
  public pushState(state: T): void {
    // Deep clone state snapshot to prevent mutability leaks
    const clone = JSON.parse(JSON.stringify(state));
    this.undoStack.push(clone);

    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift(); // Evict oldest
    }

    // Clear redo stack on new action
    this.redoStack = [];
  }

  /**
   * Perform Undo and return the previous state
   */
  public undo(currentState?: T): T | null {
    if (!this.canUndo()) return null;

    if (currentState) {
      this.redoStack.push(JSON.parse(JSON.stringify(currentState)));
    }

    const previousState = this.undoStack.pop() || null;
    return previousState;
  }

  /**
   * Perform Redo and return the next state
   */
  public redo(currentState?: T): T | null {
    if (!this.canRedo()) return null;

    if (currentState) {
      this.undoStack.push(JSON.parse(JSON.stringify(currentState)));
    }

    const nextState = this.redoStack.pop() || null;
    return nextState;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  public getUndoCount(): number {
    return this.undoStack.length;
  }

  public getRedoCount(): number {
    return this.redoStack.length;
  }
}

export const UndoRedoEngine = HistoryEngine;
