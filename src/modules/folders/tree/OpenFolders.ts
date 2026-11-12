import type { Logger } from '../../core/Logger.js';
import type { KeyValueStorage } from '../../core/PersistentStorage.js';

export const OPEN_FOLDERS_STORAGE_KEY = 'vivarcdi.openFolders';

export class OpenFolders {
  #storage: KeyValueStorage | null;
  #logger: Logger;
  #key = OPEN_FOLDERS_STORAGE_KEY;
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
   * Switches to the folders of a workspace, each with its own saved ids, and reads them.
   *
   * @param workspaceId The workspace id, or null for the area outside any workspace.
   */
  public useWorkspace(workspaceId: string | null): void {
    this.#key = workspaceId === null ? OPEN_FOLDERS_STORAGE_KEY : `${OPEN_FOLDERS_STORAGE_KEY}.${workspaceId}`;
    this.load();
  }

  /**
   * Reads the saved ids of the current workspace.
   */
  public load(): void {
    this.#ids = new Set();
    try {
      const saved: unknown = JSON.parse(this.#storage?.getItem(this.#key) ?? '[]');
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
      this.#storage?.setItem(this.#key, JSON.stringify([...this.#ids]));
    } catch (error) {
      this.#logger.warn('open folders are kept for this session only', error);
    }
  }
}
