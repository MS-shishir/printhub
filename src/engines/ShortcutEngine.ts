/**
 * ShortcutEngine.ts - Production Keyboard Hotkey Dispatcher Engine
 * Registers global keyboard hotkey bindings for fast workstation operations.
 */

export type HotkeyCallback = (e: KeyboardEvent) => void;

export class ShortcutEngine {
  private hotkeyMap: Map<string, HotkeyCallback> = new Map();
  private isListening: boolean = false;

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  public register(combination: string, callback: HotkeyCallback): void {
    this.hotkeyMap.set(combination.toLowerCase(), callback);
  }

  public unregister(combination: string): void {
    this.hotkeyMap.delete(combination.toLowerCase());
  }

  public startListening(): void {
    if (this.isListening) return;
    window.addEventListener('keydown', this.handleKeyDown);
    this.isListening = true;
  }

  public stopListening(): void {
    if (!this.isListening) return;
    window.removeEventListener('keydown', this.handleKeyDown);
    this.isListening = false;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Ignore input text fields
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }

    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push('ctrl');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');

    const key = e.key.toLowerCase();
    if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
      parts.push(key);
    }

    const combination = parts.join('+');
    const callback = this.hotkeyMap.get(combination);

    if (callback) {
      e.preventDefault();
      callback(e);
    }
  }
}
