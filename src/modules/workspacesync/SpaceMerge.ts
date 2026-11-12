import { PinnedMerge } from './PinnedMerge.js';
import type { SpaceEntry } from './SpaceEntry.js';

export interface LocalSpace extends Omit<SpaceEntry, 'syncId'> {
  /** The id Vivaldi gave the workspace on this computer. */
  vivaldiId: string;
  /** Its sync id, or null when it is not linked yet. */
  syncId: string | null;
}

export interface SpaceLists {
  /** The workspaces here that take part in the sync. */
  local: LocalSpace[];
  /** The workspaces in the sync store, in its order. */
  store: SpaceEntry[];
  /** The workspaces last agreed with the store, or null when it never synced. */
  base: SpaceEntry[] | null;
  /** Makes a new sync id. */
  newId: () => string;
}

export interface SpaceLink {
  vivaldiId: string;
  syncId: string;
}

export interface SpaceRename {
  syncId: string;
  from: string;
  to: string;
}

export interface SpacePlan {
  /** What the store lists afterwards, in order. */
  list: SpaceEntry[];
  /** Links to record between workspaces here and sync ids. */
  links: SpaceLink[];
  /** Workspaces here that the store dropped; they stay here, unlinked. */
  forget: LocalSpace[];
  /** Workspaces of the store that this computer lacks. */
  create: SpaceEntry[];
  /** Workspaces here that were renamed in the store. */
  renameHere: SpaceRename[];
  /** Workspaces renamed here, whose entry and store folder follow. */
  renameStore: SpaceRename[];
}

type Linked = LocalSpace & { syncId: string };

export class SpaceMerge {
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
  public static merge({ local, store, base, newId }: SpaceLists): SpacePlan {
    const { linked, links } = SpaceMerge.#link(local, store, base, newId);
    const ids = PinnedMerge.merge({ local: linked.map(({ syncId }) => syncId), store: store.map(({ syncId }) => syncId), base: base?.map(({ syncId }) => syncId) ?? null });
    const plan: SpacePlan = { list: [], links, forget: [], create: [], renameHere: [], renameStore: [] };
    for (const syncId of ids) {
      SpaceMerge.#settle(plan, linked.find((space) => space.syncId === syncId), store.find((entry) => entry.syncId === syncId), base?.find((entry) => entry.syncId === syncId));
    }
    plan.forget = linked.filter(({ syncId }) => !ids.includes(syncId));
    return plan;
  }

  static #settle(plan: SpacePlan, here: Linked | undefined, stored: SpaceEntry | undefined, base: SpaceEntry | undefined): void {
    if (here === undefined && stored !== undefined) {
      plan.create.push(stored);
      plan.list.push(stored);
    } else if (here !== undefined && stored === undefined) {
      plan.list.push({ syncId: here.syncId, name: here.name, icon: here.icon, iconId: here.iconId });
    } else if (here !== undefined && stored !== undefined) {
      plan.list.push(SpaceMerge.#both(plan, here, stored, base));
    }
  }

  static #both(plan: SpacePlan, here: Linked, stored: SpaceEntry, base: SpaceEntry | undefined): SpaceEntry {
    const name = SpaceMerge.#name(plan, here, stored, base?.name ?? stored.name);
    return SpaceMerge.#iconChanged(here, base) ? { syncId: here.syncId, name, icon: here.icon, iconId: here.iconId } : { ...stored, name };
  }

  static #name(plan: SpacePlan, here: Linked, stored: SpaceEntry, baseName: string): string {
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

  static #iconChanged(here: Linked, base: SpaceEntry | undefined): boolean {
    return base !== undefined && (here.icon !== base.icon || here.iconId !== base.iconId);
  }

  static #link(local: LocalSpace[], store: SpaceEntry[], base: SpaceEntry[] | null, newId: () => string): { linked: Linked[]; links: SpaceLink[] } {
    const taken = new Set(local.flatMap(({ syncId }) => syncId ?? []));
    const free = store.filter(({ syncId }) => !taken.has(syncId) && base?.some((entry) => entry.syncId === syncId) !== true);
    const links: SpaceLink[] = [];
    const linked = local.map((space) => {
      if (space.syncId !== null) {
        return { ...space, syncId: space.syncId };
      }
      const index = free.findIndex(({ name }) => name === space.name);
      const syncId = index < 0 ? newId() : (free.splice(index, 1)[0] as SpaceEntry).syncId;
      links.push({ vivaldiId: space.vivaldiId, syncId });
      return { ...space, syncId };
    });
    return { linked, links };
  }
}
