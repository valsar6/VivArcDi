import { StoredFormat } from "../../../core/browser/StoredFormat.js";
const OPEN_FOLDERS_STORAGE_KEY = "vivarcdi.openFolders";
const FORMAT = new StoredFormat({
  empty: [],
  read: (data) => {
    if (!Array.isArray(data)) {
      return null;
    }
    const ids = data.filter((id) => typeof id === "string");
    return { value: ids, skipped: ids.length < data.length };
  }
});
class OpenFolders {
  #storage;
  #logger;
  #key = OPEN_FOLDERS_STORAGE_KEY;
  #ids = /* @__PURE__ */ new Set();
  /**
   * The folders the user left open, kept in the interface's storage so they stay open after a
   * restart. Without storage they are kept for the session only.
   *
   * @param storage Persistent storage, or null.
   * @param logger Logger for storage failures.
   */
  constructor(storage, logger) {
    this.#storage = storage;
    this.#logger = logger;
  }
  /**
   * Switches to the folders of a workspace, each with its own saved ids, and reads them.
   *
   * @param workspaceId The workspace id, or null for the area outside any workspace.
   */
  useWorkspace(workspaceId) {
    this.#key = OpenFolders.#keyFor(workspaceId);
    this.load();
  }
  /**
   * Reads the saved ids of the current workspace.
   */
  load() {
    this.#ids = new Set(this.#storage?.read(this.#key, FORMAT).value);
  }
  /**
   * @param id A folder id.
   * @returns Whether that folder is open.
   */
  has(id) {
    return this.#ids.has(id);
  }
  /**
   * Opens a closed folder and closes an open one, and saves the result.
   *
   * @param id A folder id.
   */
  toggle(id) {
    if (!this.#ids.delete(id)) {
      this.#ids.add(id);
    }
    this.#save();
  }
  /**
   * Drops a folder that no longer exists, so that it comes back closed if it is restored.
   *
   * @param id A folder id.
   * @param workspaceId The workspace whose key holds the folder, loaded or not.
   */
  forget(id, workspaceId) {
    const key = OpenFolders.#keyFor(workspaceId);
    const loaded = key === this.#key;
    const ids = loaded ? this.#ids : new Set(this.#storage?.read(key, FORMAT).value);
    if (!ids.delete(id)) {
      return;
    }
    if (loaded) {
      this.#ids = ids;
    }
    this.#save(key, ids);
  }
  static #keyFor(workspaceId) {
    return workspaceId === null ? OPEN_FOLDERS_STORAGE_KEY : `${OPEN_FOLDERS_STORAGE_KEY}.${workspaceId}`;
  }
  #save(key = this.#key, ids = this.#ids) {
    try {
      this.#storage?.setItem(key, FORMAT.encode([...ids]));
    } catch (error) {
      this.#logger.warn("open folders are kept for this session only", error);
    }
  }
}
export {
  OPEN_FOLDERS_STORAGE_KEY,
  OpenFolders
};
