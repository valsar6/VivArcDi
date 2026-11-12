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
  #folders = /* @__PURE__ */ new Map();
  #nextId;
  /**
   * The live folders of every workspace, their filters and their last rows, kept in the
   * interface's storage under `liveFolders` as `{ [workspace]: LiveFolder[] }`. They are read
   * once, here, and every change is written at once. The token is never part of them.
   *
   * @param storage Persistent storage.
   * @param logger Logger for storage failures.
   * @param nextId Makes the id of a new folder; replaceable in tests.
   */
  constructor(storage, logger, nextId = LiveFolderStore.#randomId) {
    this.#storage = storage;
    this.#logger = logger;
    this.#nextId = nextId;
    this.#read();
  }
  /**
   * @returns The workspaces that have live folders; null stands for the area outside any workspace.
   */
  get workspaces() {
    return [...this.#folders.keys()].map((key) => key === NO_WORKSPACE ? null : key);
  }
  /**
   * @param workspace A workspace id, or null outside any workspace.
   * @returns Its live folders, in order.
   */
  folders(workspace) {
    return this.#folders.get(workspace ?? NO_WORKSPACE) ?? [];
  }
  /**
   * @returns Every live folder of every workspace.
   */
  all() {
    return [...this.#folders.values()].flat();
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
      needsToken: false,
      refreshedAt: null
    };
    const key = workspace ?? NO_WORKSPACE;
    this.#folders.set(key, [...this.#folders.get(key) ?? [], folder]);
    this.#write();
    return folder;
  }
  /**
   * @param id A folder id.
   * @param changes The fields to change.
   * @returns Whether the folder exists.
   */
  update(id, changes) {
    const found = this.find(id);
    if (found === void 0) {
      return false;
    }
    Object.assign(found, changes);
    this.#write();
    return true;
  }
  /**
   * Removes a folder with its filters and its rows.
   *
   * @param id A folder id.
   */
  remove(id) {
    for (const [key, folders] of this.#folders) {
      const kept = folders.filter((folder) => folder.id !== id);
      if (kept.length === 0) {
        this.#folders.delete(key);
      } else {
        this.#folders.set(key, kept);
      }
    }
    this.#write();
  }
  static #randomId() {
    return Math.random().toString(ID_RADIX).slice(ID_START, ID_LENGTH);
  }
  #read() {
    try {
      const stored = JSON.parse(this.#storage.getItem(LIVE_FOLDERS_STORAGE_KEY) ?? "{}");
      const record = typeof stored === "object" && stored !== null ? stored : {};
      for (const [key, value] of Object.entries(record)) {
        const folders = Array.isArray(value) ? value.flatMap((item) => LiveFolderStore.#folderFrom(item)) : [];
        if (folders.length > 0) {
          this.#folders.set(key, folders);
        }
      }
    } catch (error) {
      this.#logger.warn("the live folders could not be read", error);
    }
  }
  #write() {
    try {
      this.#storage.setItem(LIVE_FOLDERS_STORAGE_KEY, JSON.stringify(Object.fromEntries(this.#folders)));
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
        needsToken: item["needsToken"] === true,
        refreshedAt: typeof item["refreshedAt"] === "number" ? item["refreshedAt"] : null
      }
    ];
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
