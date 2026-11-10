import type { Logger } from '../../core/Logger.js';
import type { WorkspaceNames } from '../../core/WorkspaceNames.js';
import { LocalPinned } from './LocalPinned.js';
import type { PinnedGroups } from './LocalPinned.js';
import type { MissingSpaces } from './MissingSpaces.js';
import type { PinnedApplier } from './PinnedApplier.js';
import { PinnedMerge } from './PinnedMerge.js';
import type { SyncBase } from './SyncBase.js';
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
  missing: Pick<MissingSpaces, 'announce'>;
  logger: Logger;
}

export class SyncPass {
  #parts: SyncPassParts;
  #warned = false;

  /**
   * One run of the sync: in the owner window, merges the pinned tabs of every workspace with the
   * sync store, writes what changed here to the store, applies what changed elsewhere to the tabs
   * and remembers the result as the new base. Applying a result makes the tabs, the store and the
   * base equal, so the next run finds nothing to do and a change is never copied back. When the
   * store cannot be used, one warning is logged and the tabs stay as they are.
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
    const { names, store, local, missing } = this.#parts;
    const spaces = await store.spaces();
    const groups = await local.read(windowId);
    const workspaces = [...new Set(names.names)];
    const known = SyncNames.known(workspaces);
    missing.announce([...spaces.keys()].filter((folder) => !known.has(folder)));
    for (const name of [null, ...workspaces]) {
      await this.#syncWorkspace(windowId, name, spaces.get(SyncNames.folderOf(name)), groups);
    }
  }

  async #syncWorkspace(windowId: number, name: string | null, space: StoredSpace | undefined, groups: PinnedGroups): Promise<void> {
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
