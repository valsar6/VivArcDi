import { StoredFormat } from "../../core/browser/StoredFormat.js";
const KEY = "vivarcdi.sync.base.spaces";
const isValid = (value) => {
  const { syncId, name } = typeof value === "object" && value !== null ? value : {};
  return typeof syncId === "string" && typeof name === "string";
};
const FORMAT = new StoredFormat({
  empty: null,
  read: (data) => Array.isArray(data) && data.every(isValid) ? { value: data, skipped: false } : null
});
class SpaceBase {
  #storage;
  /**
   * Remembers the list of workspaces this computer last agreed with the sync store, with the name
   * and icon each workspace has here. The merge needs it to tell a workspace added elsewhere from
   * one deleted here, and a rename made here from one made elsewhere.
   *
   * @param storage Where the list is kept.
   */
  constructor(storage) {
    this.#storage = storage;
  }
  /**
   * @returns The workspaces last agreed on, or null when the list never synced here.
   */
  get() {
    return this.#storage.read(KEY, FORMAT).value;
  }
  /**
   * @param entries The workspaces this computer and the store now agree on.
   */
  set(entries) {
    const text = FORMAT.encode(entries);
    if (this.#storage.getItem(KEY) !== text) {
      this.#storage.setItem(KEY, text);
    }
  }
}
export {
  SpaceBase
};
