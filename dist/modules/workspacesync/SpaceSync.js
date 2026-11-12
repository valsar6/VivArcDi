import { SpaceMerge } from "./SpaceMerge.js";
class SpaceSync {
  #parts;
  #warnedRename = false;
  /**
   * Keeps the list of workspaces the same on every computer: merges the workspaces here with the
   * list in the sync store, writes what changed here to the store, creates the workspaces this
   * computer lacks and follows renames made elsewhere. A workspace deleted elsewhere is never
   * deleted here. When Vivaldi's menu cannot be driven, the missing workspaces are only named.
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
    const { ids, list, base, store, pinnedBase } = this.#parts;
    const known = base.get();
    const here = this.#here();
    if (here.length === 0 && known !== null && known.length > 0) {
      return;
    }
    const taking = here.filter(({ vivaldiId, name }) => !ids.isDetached(vivaldiId, name));
    const plan = SpaceMerge.merge({ local: taking, store: await list.read(), base: known, newId: () => ids.fresh() });
    plan.links.forEach(({ vivaldiId, syncId }) => ids.link(vivaldiId, syncId));
    plan.forget.forEach(({ vivaldiId, name }) => ids.detach(vivaldiId, name));
    await list.write(plan.list);
    for (const { from, to } of plan.renameStore) {
      await store.renameSpace(from, to);
      pinnedBase.rename(from, to);
    }
    await this.#renameHere(plan.renameHere);
    await this.#create(plan);
    base.set(this.#agreed(plan.list));
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
    const { renamer, store, pinnedBase } = this.#parts;
    for (const { from, to } of renames) {
      if (await renamer.rename(from, to)) {
        await store.renameSpace(from, to);
        pinnedBase.rename(from, to);
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
