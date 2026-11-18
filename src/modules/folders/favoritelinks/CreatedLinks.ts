import { StoredFormat, type Readout, type ReadingStorage } from '../../../core/browser/StoredFormat.js';

const KEY = 'vivarcdi.createdLinks';

const FORMAT = new StoredFormat<string[]>({
  empty: [],
  read: (data): Readout<string[]> | null => {
    if (!Array.isArray(data)) {
      return null;
    }
    const ids = data.filter((id): id is string => typeof id === 'string');
    return { value: ids, skipped: ids.length < data.length };
  },
});

export class CreatedLinks {
  #storage: ReadingStorage;

  /**
   * The ids of the bookmarks VivArcDi made when a tab was added to the workspace favorites, kept
   * after a restart. Only those are removed when the tab is taken back, so a bookmark the user made
   * is never deleted.
   *
   * @param storage Strings that survive a restart.
   */
  constructor(storage: ReadingStorage) {
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
    return new Set(this.#storage.read(KEY, FORMAT).value);
  }

  #write(ids: Set<string>): void {
    this.#storage.setItem(KEY, FORMAT.encode([...ids]));
  }
}
