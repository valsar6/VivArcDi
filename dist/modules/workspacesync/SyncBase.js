import { SyncNames } from "./SyncNames.js";
const KEY_PREFIX = "vivarcdi.sync.base.";
class SyncBase {
  #storage;
  /**
   * Remembers, for each workspace, the list of pinned tabs this computer last agreed with the sync
   * store. The merge needs it to tell a tab added elsewhere from a tab removed here.
   *
   * @param storage Where the lists are kept.
   */
  constructor(storage) {
    this.#storage = storage;
  }
  /**
   * @param workspaceName A workspace name, or null for the area outside any workspace.
   * @returns The address keys last agreed on, or null when the workspace never synced here.
   */
  get(workspaceName) {
    try {
      const parsed = JSON.parse(this.#storage.getItem(SyncBase.#key(workspaceName)) ?? "null");
      return Array.isArray(parsed) && parsed.every((key) => typeof key === "string") ? parsed : null;
    } catch {
      return null;
    }
  }
  /**
   * @param workspaceName A workspace name, or null for the area outside any workspace.
   * @param keys The address keys the computer and the store now agree on.
   */
  set(workspaceName, keys) {
    const text = JSON.stringify(keys);
    if (this.#storage.getItem(SyncBase.#key(workspaceName)) !== text) {
      this.#storage.setItem(SyncBase.#key(workspaceName), text);
    }
  }
  /**
   * Moves the list of a workspace to its new name.
   *
   * @param from The old name.
   * @param to The new name.
   */
  rename(from, to) {
    const keys = this.get(from);
    if (keys !== null && this.get(to) === null) {
      this.set(to, keys);
    }
  }
  static #key(workspaceName) {
    return `${KEY_PREFIX}${SyncNames.folderOf(workspaceName)}`;
  }
}
export {
  SyncBase
};
