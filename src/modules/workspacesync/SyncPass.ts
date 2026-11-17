import type { Logger } from '../../core/support/Logger.js';
import type { WorkspaceNames } from '../../core/workspaces/WorkspaceNames.js';
import { LocalPinned } from './LocalPinned.js';
import type { PinnedGroups } from './LocalPinned.js';
import type { PinnedApplier } from './PinnedApplier.js';
import { PinnedMerge } from './PinnedMerge.js';
import type { SyncBase } from './SyncBase.js';
import type { SpaceSync } from './SpaceSync.js';
import { SyncNames } from './SyncNames.js';
import type { PinnedEntry, StoredSpace, SyncStore } from './SyncStore.js';
import type { WindowOwner } from './WindowOwner.js';

export interface SyncPassParts {
  owner: Pick<WindowOwner, 'ownId'>;
  names: Pick<WorkspaceNames, 'names'>;
  store: Pick<SyncStore, 'spaces' | 'writePinned'>;
  base: Pick<SyncBase, 'get' | 'set'>;
  local: Pick<LocalPinned, 'read'>;
  applier: Pick<PinnedApplier, 'apply'>;
  spaces: Pick<SpaceSync, 'run'>;
  logger: Logger;
}

export class SyncPass {
  #parts: SyncPassParts;
  #warned = false;
  #warnedReserved = new Set<string>();
  #warnedRebuild = false;

  /**
   * One run of the sync: in the owner window, first merges the list of workspaces (creating the
   * ones this computer lacks), then merges the pinned tabs of every workspace with the
   * sync store, writes what changed here to the store, applies what changed elsewhere to the tabs
   * and remembers the result as the new base. Applying a result makes the tabs, the store and the
   * base equal, so the next run finds nothing to do and a change is never copied back. When the
   * store cannot be used, one warning is logged and the tabs stay as they are. A workspace whose
   * name the store uses for itself is left out, and a store folder that went missing is written
   * again from the tabs here instead of closing them.
   */
  constructor(parts: SyncPassParts) {
    this.#parts = parts;
  }

  /**
   * Runs the sync once. It never throws.
   */
  public async run(): Promise<void> {
    try {
      const windowId = await this.#parts.owner.ownId();
      if (windowId !== null) {
        await this.#sync(windowId);
      }
    } catch (error) {
      if (!this.#warned) {
        this.#warned = true;
        this.#parts.logger.warn('the sync store cannot be used: pinned tabs stay as they are', error);
      }
    }
  }

  async #sync(windowId: number): Promise<void> {
    const { names, store, local, spaces: list } = this.#parts;
    await list.run();
    const spaces = await store.spaces();
    const groups = await local.read(windowId);
    const workspaces = [...new Set(names.names)].filter((name) => !this.#reserved(name));
    const rebuilt: string[] = [];
    for (const name of [null, ...workspaces]) {
      if (await this.#syncWorkspace(windowId, name, spaces.get(SyncNames.folderOf(name)), groups)) {
        rebuilt.push(SyncNames.folderOf(name));
      }
    }
    this.#warnRebuilt(rebuilt);
  }

  async #syncWorkspace(windowId: number, name: string | null, space: StoredSpace | undefined, groups: PinnedGroups): Promise<boolean> {
    const { store, base, applier } = this.#parts;
    const current = groups.get(name) ?? [];
    const here = LocalPinned.distinct(current).map(({ entry }) => entry);
    const { stored, known, lost } = this.#storeOf(name, space);
    const keys = PinnedMerge.merge({ local: here.map(({ key }) => key), store: stored.map(({ key }) => key), base: known });
    const merged = SyncPass.#entries(keys, here, stored);
    if (lost || !SyncPass.#same(keys, stored)) {
      await store.writePinned(name, merged);
    }
    if (!SyncPass.#same(keys, here)) {
      await applier.apply(windowId, name, merged, current);
    }
    base.set(name, keys);
    return lost;
  }

  #storeOf(name: string | null, space: StoredSpace | undefined): { stored: PinnedEntry[]; known: string[] | null; lost: boolean } {
    const known = this.#parts.base.get(name);
    const stored = space?.pinned ?? null;
    const lost = stored === null && known !== null && known.length > 0;
    return { stored: stored ?? [], known: lost ? null : known, lost };
  }

  #reserved(name: string): boolean {
    if (!SyncNames.reserved(name)) {
      return false;
    }
    if (!this.#warnedReserved.has(name)) {
      this.#warnedReserved.add(name);
      this.#parts.logger.warn(`the workspace "${name}" has a name the sync store uses for itself: its pinned tabs and settings are not synced until it is renamed`);
    }
    return true;
  }

  #warnRebuilt(names: string[]): void {
    if (names.length > 0 && !this.#warnedRebuild) {
      this.#warnedRebuild = true;
      this.#parts.logger.warn(`the sync store of ${names.map((name) => `"${name}"`).join(', ')} was missing: rebuilt from this computer, no tab was closed`);
    }
  }

  static #entries(keys: string[], here: PinnedEntry[], stored: PinnedEntry[]): PinnedEntry[] {
    return keys.flatMap((key) => {
      const entry = here.find((candidate) => candidate.key === key) ?? stored.find((candidate) => candidate.key === key);
      return entry === undefined ? [] : [entry];
    });
  }

  static #same(keys: string[], entries: Array<Pick<PinnedEntry, 'key'>>): boolean {
    return keys.length === entries.length && keys.every((key, position) => key === entries[position]?.key);
  }
}
