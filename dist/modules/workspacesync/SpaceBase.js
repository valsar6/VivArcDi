const KEY = "vivarcdi.sync.base.spaces";
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
    try {
      const parsed = JSON.parse(this.#storage.getItem(KEY) ?? "null");
      return Array.isArray(parsed) && parsed.every(SpaceBase.#valid) ? parsed : null;
    } catch {
      return null;
    }
  }
  /**
   * @param entries The workspaces this computer and the store now agree on.
   */
  set(entries) {
    const text = JSON.stringify(entries);
    if (this.#storage.getItem(KEY) !== text) {
      this.#storage.setItem(KEY, text);
    }
  }
  static #valid(value) {
    const { syncId, name } = typeof value === "object" && value !== null ? value : {};
    return typeof syncId === "string" && typeof name === "string";
  }
}
export {
  SpaceBase
};
