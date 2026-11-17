import { SpaceMerge } from "./SpaceMerge.js";
import { SyncNames } from "./SyncNames.js";
class SpaceSync {
  #parts;
  #warnedRename = false;
  #warnedRebuild = false;
  /**
   * Keeps the list of workspaces the same on every computer: merges the workspaces here with the
   * list in the sync store, writes what changed here to the store, creates the workspaces this
   * computer lacks and follows renames made elsewhere. A workspace deleted elsewhere is never
   * deleted here. When Vivaldi's menu cannot be driven, the missing workspaces are only named. A
   * list that went missing from the store is written again from the workspaces here, forgetting
   * none, and a rename from or to a name the store uses for itself moves no store folder.
   *
   * @param parts Everything the sync collaborates with.
   */
  constructor(parts) {
    this.#parts = parts;
  }
  /**
   * Runs the list sync once. Errors reach the caller.
   */
  async run() {
    const { ids, list, base } = this.#parts;
    const known = base.get();
    const here = this.#here();
    if (here.length === 0 && known !== null && known.length > 0) {
      return;
    }
    const taking = here.filter(({ vivaldiId, name }) => !ids.isDetached(vivaldiId, name));
    const plan = SpaceMerge.merge({ local: taking, ...await this.#stored(known), newId: () => ids.fresh() });
    plan.links.forEach(({ vivaldiId, syncId }) => ids.link(vivaldiId, syncId));
    plan.forget.forEach(({ vivaldiId, name }) => ids.detach(vivaldiId, name));
    await list.write(plan.list);
    for (const { from, to } of plan.renameStore) {
      await this.#moveStore(from, to);
    }
    await this.#renameHere(plan.renameHere);
    await this.#create(plan);
    base.set(this.#agreed(plan.list));
  }
  async #stored(known) {
    const stored = await this.#parts.list.read();
    if (stored === null && known !== null && known.length > 0) {
      this.#warnRebuilt();
      return { store: [], base: null };
    }
    return { store: stored ?? [], base: known };
  }
  #here() {
    return this.#parts.names.entries.map(({ id, name, icon, iconId }) => ({ vivaldiId: id, syncId: this.#parts.ids.syncIdOf(id), name, icon, iconId }));
  }
  #agreed(list) {
    const here = this.#here();
    return list.flatMap(({ syncId }) => {
      const space = here.find((candidate) => candidate.syncId === syncId);
      return space === void 0 ? [] : [{ syncId, name: space.name, icon: space.icon, iconId: space.iconId }];
    });
  }
  async #renameHere(renames) {
    for (const { from, to } of renames) {
      if (await this.#parts.renamer.rename(from, to)) {
        await this.#moveStore(from, to);
      } else {
        this.#warnRename(from, to);
      }
    }
  }
  async #create({ create }) {
    const { creator, missing, ids } = this.#parts;
    for (const [position, { syncId, name }] of create.entries()) {
      const result = await creator.create(name);
      if (result === "done") {
        const created = [...this.#parts.names.entries].reverse().find((entry) => entry.name === name);
        if (created !== void 0) {
          ids.link(created.id, syncId);
        }
      } else if (result === "deferred") {
        this.#parts.retry();
        return;
      } else {
        missing.announce(create.slice(position).map((entry) => entry.name));
        return;
      }
    }
  }
  async #moveStore(from, to) {
    if (!SyncNames.reserved(from) && !SyncNames.reserved(to)) {
      await this.#parts.store.renameSpace(from, to);
      this.#parts.pinnedBase.rename(from, to);
    }
  }
  #warnRebuilt() {
    if (!this.#warnedRebuild) {
      this.#warnedRebuild = true;
      this.#parts.logger.warn("the workspace list of the sync store was missing: rebuilt from this computer");
    }
  }
  #warnRename(from, to) {
    if (!this.#warnedRename) {
      this.#warnedRename = true;
      this.#parts.logger.warn(`the workspace "${from}" was renamed "${to}" on another computer but could not be renamed here: it keeps its name`);
    }
  }
}
export {
  SpaceSync
};
