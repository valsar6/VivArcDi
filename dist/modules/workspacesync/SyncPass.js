import { LocalPinned } from "./LocalPinned.js";
import { PinnedMerge } from "./PinnedMerge.js";
import { SyncNames } from "./SyncNames.js";
class SyncPass {
  #parts;
  #warned = false;
  /**
   * One run of the sync: in the owner window, first merges the list of workspaces (creating the
   * ones this computer lacks), then merges the pinned tabs of every workspace with the
   * sync store, writes what changed here to the store, applies what changed elsewhere to the tabs
   * and remembers the result as the new base. Applying a result makes the tabs, the store and the
   * base equal, so the next run finds nothing to do and a change is never copied back. When the
   * store cannot be used, one warning is logged and the tabs stay as they are.
   */
  constructor(parts) {
    this.#parts = parts;
  }
  /**
   * Runs the sync once. It never throws.
   */
  async run() {
    try {
      const windowId = await this.#parts.owner.ownId();
      if (windowId !== null) {
        await this.#sync(windowId);
      }
    } catch (error) {
      if (!this.#warned) {
        this.#warned = true;
        this.#parts.logger.warn("the sync store cannot be used: pinned tabs stay as they are", error);
      }
    }
  }
  async #sync(windowId) {
    const { names, store, local, spaces: list } = this.#parts;
    await list.run();
    const spaces = await store.spaces();
    const groups = await local.read(windowId);
    const workspaces = [...new Set(names.names)];
    for (const name of [null, ...workspaces]) {
      await this.#syncWorkspace(windowId, name, spaces.get(SyncNames.folderOf(name)), groups);
    }
  }
  async #syncWorkspace(windowId, name, space, groups) {
    const { store, base, applier } = this.#parts;
    const current = groups.get(name) ?? [];
    const here = LocalPinned.distinct(current).map(({ entry }) => entry);
    const stored = space?.pinned ?? [];
    const keys = PinnedMerge.merge({ local: here.map(({ key }) => key), store: stored.map(({ key }) => key), base: base.get(name) });
    const merged = SyncPass.#entries(keys, here, stored);
    if (!SyncPass.#same(keys, stored)) {
      await store.writePinned(name, merged);
    }
    if (!SyncPass.#same(keys, here)) {
      await applier.apply(windowId, name, merged, current);
    }
    base.set(name, keys);
  }
  static #entries(keys, here, stored) {
    return keys.flatMap((key) => {
      const entry = here.find((candidate) => candidate.key === key) ?? stored.find((candidate) => candidate.key === key);
      return entry === void 0 ? [] : [entry];
    });
  }
  static #same(keys, entries) {
    return keys.length === entries.length && keys.every((key, position) => key === entries[position]?.key);
  }
}
export {
  SyncPass
};
