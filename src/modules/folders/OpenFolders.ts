import type { Logger } from '../../core/Logger.js';
import type { KeyValueStorage } from '../../core/PersistentStorage.js';

export const OPEN_FOLDERS_STORAGE_KEY = 'vivarcdi.openFolders';

export class OpenFolders {
  #storage: KeyValueStorage | null;
  #logger: Logger;
  #ids = new Set<string>();

  /**
   * The folders the user left open, kept in the interface's storage so they stay open after a
   * restart. Without storage they are kept for the session only.
   *
   * @param storage Persistent storage, or null.
   * @param logger Logger for storage failures.
   */
  constructor(storage: KeyValueStorage | null, logger: Logger) {
    this.#storage = storage;
    this.#logger = logger;
  }

  /**
   * Reads the saved ids.
   */
  public load(): void {
    try {
      const saved: unknown = JSON.parse(this.#storage?.getItem(OPEN_FOLDERS_STORAGE_KEY) ?? '[]');
      this.#ids = new Set(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : []);
    } catch (error) {
      this.#logger.warn('open folders are kept for this session only', error);
    }
  }

  /**
   * @param id A folder id.
   * @returns Whether that folder is open.
   */
  public has(id: string): boolean {
    return this.#ids.has(id);
  }

  /**
   * Opens a closed folder and closes an open one, and saves the result.
   *
   * @param id A folder id.
   */
  public toggle(id: string): void {
    if (!this.#ids.delete(id)) {
      this.#ids.add(id);
    }
    try {
      this.#storage?.setItem(OPEN_FOLDERS_STORAGE_KEY, JSON.stringify([...this.#ids]));
    } catch (error) {
      this.#logger.warn('open folders are kept for this session only', error);
    }
  }
}
