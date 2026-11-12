import { PinnedMerge } from "./PinnedMerge.js";
class SpaceMerge {
  /**
   * Merges the list of workspaces with a three-way comparison on sync ids. A workspace added on
   * one side is added to the other, a workspace deleted here is dropped from the store, and a
   * workspace the store dropped is kept here and forgotten. A name changed in the store since the
   * base renames the workspace here; a name changed here renames the store entry. A workspace
   * without a sync id takes the id of the stored one with the same name, or a new id; so the first
   * run, with no base, is a union by name.
   *
   * @param lists The three lists and the id maker.
   * @returns What to write, link, create and rename.
   */
  static merge({ local, store, base, newId }) {
    const { linked, links } = SpaceMerge.#link(local, store, base, newId);
    const ids = PinnedMerge.merge({ local: linked.map(({ syncId }) => syncId), store: store.map(({ syncId }) => syncId), base: base?.map(({ syncId }) => syncId) ?? null });
    const plan = { list: [], links, forget: [], create: [], renameHere: [], renameStore: [] };
    for (const syncId of ids) {
      SpaceMerge.#settle(plan, linked.find((space) => space.syncId === syncId), store.find((entry) => entry.syncId === syncId), base?.find((entry) => entry.syncId === syncId));
    }
    plan.forget = linked.filter(({ syncId }) => !ids.includes(syncId));
    return plan;
  }
  static #settle(plan, here, stored, base) {
    if (here === void 0 && stored !== void 0) {
      plan.create.push(stored);
      plan.list.push(stored);
    } else if (here !== void 0 && stored === void 0) {
      plan.list.push({ syncId: here.syncId, name: here.name, icon: here.icon, iconId: here.iconId });
    } else if (here !== void 0 && stored !== void 0) {
      plan.list.push(SpaceMerge.#both(plan, here, stored, base));
    }
  }
  static #both(plan, here, stored, base) {
    const name = SpaceMerge.#name(plan, here, stored, base?.name ?? stored.name);
    return SpaceMerge.#iconChanged(here, base) ? { syncId: here.syncId, name, icon: here.icon, iconId: here.iconId } : { ...stored, name };
  }
  static #name(plan, here, stored, baseName) {
    const { syncId } = here;
    if (stored.name !== baseName && stored.name !== here.name) {
      plan.renameHere.push({ syncId, from: here.name, to: stored.name });
      return stored.name;
    }
    if (here.name !== baseName && here.name !== stored.name) {
      plan.renameStore.push({ syncId, from: stored.name, to: here.name });
      return here.name;
    }
    return stored.name;
  }
  static #iconChanged(here, base) {
    return base !== void 0 && (here.icon !== base.icon || here.iconId !== base.iconId);
  }
  static #link(local, store, base, newId) {
    const taken = new Set(local.flatMap(({ syncId }) => syncId ?? []));
    const free = store.filter(({ syncId }) => !taken.has(syncId) && base?.some((entry) => entry.syncId === syncId) !== true);
    const links = [];
    const linked = local.map((space) => {
      if (space.syncId !== null) {
        return { ...space, syncId: space.syncId };
      }
      const index = free.findIndex(({ name }) => name === space.name);
      const syncId = index < 0 ? newId() : free.splice(index, 1)[0].syncId;
      links.push({ vivaldiId: space.vivaldiId, syncId });
      return { ...space, syncId };
    });
    return { linked, links };
  }
}
export {
  SpaceMerge
};
