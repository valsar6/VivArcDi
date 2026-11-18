import { StoredFormat, type ReadingStorage, type Readout } from '../../core/browser/StoredFormat.js';

const KEY = 'vivarcdi.little-arc.windows';
const KEPT = 20;

const FORMAT = new StoredFormat<number[]>({
  empty: [],
  read: (data): Readout<number[]> | null => {
    if (!Array.isArray(data)) {
      return null;
    }
    const ids = data.filter((id): id is number => Number.isInteger(id));
    return { value: ids, skipped: ids.length < data.length };
  },
});

export class LittleArcRegistry {
  #storage: ReadingStorage;

  /**
   * Remembers which windows are Little Arc windows, so that a window opened by a website is never
   * mistaken for one. The list is shared by all windows through the persistent storage.
   *
   * @param storage Strings shared by all windows.
   */
  constructor(storage: ReadingStorage) {
    this.#storage = storage;
  }

  /**
   * @param windowId A window id.
   */
  public mark(windowId: number): void {
    const ids = this.#read().filter((id) => id !== windowId);
    ids.push(windowId);
    this.#storage.setItem(KEY, FORMAT.encode(ids.slice(-KEPT)));
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
    this.#storage.setItem(KEY, FORMAT.encode(this.#read().filter((id) => id !== windowId)));
  }

  #read(): number[] {
    return this.#storage.read(KEY, FORMAT).value;
  }
}
