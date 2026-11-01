import type { KeyValueStorage } from '../../core/PersistentStorage.js';

const KEY = 'vivarcdi.createdLinks';

export class CreatedLinks {
  #storage: KeyValueStorage;

  /**
   * The ids of the bookmarks VivArcDi made when a tab was added to the workspace favorites, kept
   * after a restart. Only those are removed when the tab is taken back, so a bookmark the user made
   * is never deleted.
   *
   * @param storage Strings that survive a restart.
   */
  constructor(storage: KeyValueStorage) {
    this.#storage = storage;
  }

  /**
   * @param bookmarkId A bookmark.
   * @returns Whether VivArcDi created it.
   */
  public has(bookmarkId: string): boolean {
    return this.#read().has(bookmarkId);
  }

  /**
   * @param bookmarkId A bookmark VivArcDi just created.
   */
  public add(bookmarkId: string): void {
    this.#write(this.#read().add(bookmarkId));
  }

  /**
   * @param bookmarkId A bookmark that no longer exists, or that is no longer VivArcDi's.
   */
  public remove(bookmarkId: string): void {
    const ids = this.#read();
    if (ids.delete(bookmarkId)) {
      this.#write(ids);
    }
  }

  #read(): Set<string> {
    try {
      const parsed: unknown = JSON.parse(this.#storage.getItem(KEY) ?? '[]');
      return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []);
    } catch {
      return new Set();
    }
  }

  #write(ids: Set<string>): void {
    this.#storage.setItem(KEY, JSON.stringify([...ids]));
  }
}
