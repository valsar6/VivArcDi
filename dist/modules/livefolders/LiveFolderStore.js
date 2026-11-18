import { PullRequestFilters } from "./PullRequestFilters.js";
const LIVE_FOLDERS_STORAGE_KEY = "vivarcdi.liveFolders";
const NO_WORKSPACE = "";
const DEFAULT_NAME = "Pull Requests";
const ID_RADIX = 36;
const ID_START = 2;
const ID_LENGTH = 10;
class LiveFolderStore {
  #storage;
  #logger;
  #nextId;
  #warned = false;
  /**
   * The live folders of every workspace, their filters and their last rows, kept in the
   * interface's storage under `liveFolders` as `{ [workspace]: LiveFolder[] }`. Nothing is kept in
   * memory: every call reads the saved value, so a change made in another window shows at once,
   * and every change reads it, alters only what it names and writes it at once. The GitHub
   * connection is not part of them.
   *
   * @param storage Persistent storage.
   * @param logger Logger for storage failures.
   * @param nextId Makes the id of a new folder; replaceable in tests.
   */
  constructor(storage, logger, nextId = LiveFolderStore.#randomId) {
    this.#storage = storage;
    this.#logger = logger;
    this.#nextId = nextId;
  }
  /**
   * @returns The workspaces that have live folders; null stands for the area outside any workspace.
   */
  get workspaces() {
    return [...this.#read().keys()].map((key) => key === NO_WORKSPACE ? null : key);
  }
  /**
   * @param workspace A workspace id, or null outside any workspace.
   * @returns Its live folders, in order.
   */
  folders(workspace) {
    return this.#read().get(workspace ?? NO_WORKSPACE) ?? [];
  }
  /**
   * @returns Every live folder of every workspace.
   */
  all() {
    return [...this.#read().values()].flat();
  }
  /**
   * @param id A folder id.
   * @returns The folder, or undefined.
   */
  find(id) {
    return this.all().find((folder) => folder.id === id);
  }
  /**
   * Adds a live folder named `Pull Requests` with the default filters at the end of a workspace.
   *
   * @param workspace A workspace id, or null outside any workspace.
   * @returns The new folder.
   */
  add(workspace) {
    const folder = {
      id: this.#nextId(),
      name: DEFAULT_NAME,
      filters: PullRequestFilters.defaults(),
      rows: [],
      warning: null,
      needsReconnect: false,
      archived: {},
      refreshedAt: null
    };
    const saved = this.#read();
    const key = workspace ?? NO_WORKSPACE;
    saved.set(key, [...saved.get(key) ?? [], folder]);
    this.#write(saved);
    return folder;
  }
  /**
   * Changes the named fields of a saved folder and leaves everything else as saved.
   *
   * @param id A folder id.
   * @param changes The fields to change.
   * @returns Whether the folder exists; if not, nothing is written.
   */
  update(id, changes) {
    const saved = this.#read();
    for (const [key, folders] of saved) {
      const found = folders.find((folder) => folder.id === id);
      if (found !== void 0) {
        saved.set(
          key,
          folders.map((folder) => folder === found ? { ...found, ...changes } : folder)
        );
        this.#write(saved);
        return true;
      }
    }
    return false;
  }
  /**
   * Removes a folder with its filters and its rows; nothing is written when it is not saved.
   *
   * @param id A folder id.
   */
  remove(id) {
    const saved = this.#read();
    let removed = false;
    for (const [key, folders] of saved) {
      const kept = folders.filter((folder) => folder.id !== id);
      if (kept.length === folders.length) {
        continue;
      }
      removed = true;
      if (kept.length === 0) {
        saved.delete(key);
      } else {
        saved.set(key, kept);
      }
    }
    if (removed) {
      this.#write(saved);
    }
  }
  static #randomId() {
    return Math.random().toString(ID_RADIX).slice(ID_START, ID_LENGTH);
  }
  #read() {
    try {
      return LiveFolderStore.#parse(this.#storage.getItem(LIVE_FOLDERS_STORAGE_KEY) ?? "{}");
    } catch (error) {
      if (!this.#warned) {
        this.#warned = true;
        this.#logger.warn("the live folders could not be read", error);
      }
      return /* @__PURE__ */ new Map();
    }
  }
  static #parse(text) {
    const saved = /* @__PURE__ */ new Map();
    const stored = JSON.parse(text);
    const record = typeof stored === "object" && stored !== null ? stored : {};
    for (const [key, value] of Object.entries(record)) {
      const folders = Array.isArray(value) ? value.flatMap((item) => LiveFolderStore.#folderFrom(item)) : [];
      if (folders.length > 0) {
        saved.set(key, folders);
      }
    }
    return saved;
  }
  #write(folders) {
    try {
      this.#storage.setItem(LIVE_FOLDERS_STORAGE_KEY, JSON.stringify(Object.fromEntries(folders)));
    } catch (error) {
      this.#logger.warn("the live folders are kept for this session only", error);
    }
  }
  static #folderFrom(value) {
    if (typeof value !== "object" || value === null) {
      return [];
    }
    const item = value;
    if (typeof item["id"] !== "string" || typeof item["name"] !== "string") {
      return [];
    }
    return [
      {
        id: item["id"],
        name: item["name"],
        filters: PullRequestFilters.from(item["filters"]),
        rows: Array.isArray(item["rows"]) ? item["rows"].filter(LiveFolderStore.#isRow) : [],
        warning: typeof item["warning"] === "string" ? item["warning"] : null,
        needsReconnect: item["needsReconnect"] === true,
        archived: LiveFolderStore.#archivedFrom(item["archived"]),
        refreshedAt: typeof item["refreshedAt"] === "number" ? item["refreshedAt"] : null
      }
    ];
  }
  static #archivedFrom(value) {
    const record = typeof value === "object" && value !== null ? Object.entries(value) : [];
    return Object.fromEntries(record.filter((entry) => typeof entry[1] === "string"));
  }
  static #isRow(value) {
    const row = value;
    return typeof row === "object" && row !== null && ["id", "title", "url", "subtitle", "updatedAt"].every((field) => typeof row[field] === "string");
  }
}
export {
  LIVE_FOLDERS_STORAGE_KEY,
  LiveFolderStore
};
