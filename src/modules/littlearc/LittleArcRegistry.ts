import type { KeyValueStorage } from '../../core/browser/PersistentStorage.js';

const KEY = 'vivarcdi.little-arc.windows';
const KEPT = 20;

export class LittleArcRegistry {
  #storage: KeyValueStorage;

  /**
   * Remembers which windows are Little Arc windows, so that a window opened by a website is never
   * mistaken for one. The list is shared by all windows through the persistent storage.
   *
   * @param storage Strings shared by all windows.
   */
  constructor(storage: KeyValueStorage) {
    this.#storage = storage;
  }

  /**
   * @param windowId A window id.
   */
  public mark(windowId: number): void {
    const ids = this.#read().filter((id) => id !== windowId);
    ids.push(windowId);
    this.#storage.setItem(KEY, JSON.stringify(ids.slice(-KEPT)));
  }

  /**
   * @param windowId A window id.
   * @returns Whether the window was marked as a Little Arc window.
   */
  public has(windowId: number): boolean {
    return this.#read().includes(windowId);
  }

  /**
   * @param windowId A window id.
   */
  public unmark(windowId: number): void {
    this.#storage.setItem(KEY, JSON.stringify(this.#read().filter((id) => id !== windowId)));
  }

  #read(): number[] {
    try {
      const value: unknown = JSON.parse(this.#storage.getItem(KEY) ?? '[]');
      return Array.isArray(value) ? value.filter((id): id is number => Number.isInteger(id)) : [];
    } catch {
      return [];
    }
  }
}
