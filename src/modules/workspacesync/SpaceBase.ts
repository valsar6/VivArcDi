import type { KeyValueStorage } from '../../core/browser/PersistentStorage.js';
import type { SpaceEntry } from './SpaceEntry.js';

const KEY = 'vivarcdi.sync.base.spaces';

export class SpaceBase {
  #storage: KeyValueStorage;

  /**
   * Remembers the list of workspaces this computer last agreed with the sync store, with the name
   * and icon each workspace has here. The merge needs it to tell a workspace added elsewhere from
   * one deleted here, and a rename made here from one made elsewhere.
   *
   * @param storage Where the list is kept.
   */
  constructor(storage: KeyValueStorage) {
    this.#storage = storage;
  }

  /**
   * @returns The workspaces last agreed on, or null when the list never synced here.
   */
  public get(): SpaceEntry[] | null {
    try {
      const parsed: unknown = JSON.parse(this.#storage.getItem(KEY) ?? 'null');
      return Array.isArray(parsed) && parsed.every(SpaceBase.#valid) ? (parsed as SpaceEntry[]) : null;
    } catch {
      return null;
    }
  }

  /**
   * @param entries The workspaces this computer and the store now agree on.
   */
  public set(entries: SpaceEntry[]): void {
    const text = JSON.stringify(entries);
    if (this.#storage.getItem(KEY) !== text) {
      this.#storage.setItem(KEY, text);
    }
  }

  static #valid(value: unknown): boolean {
    const { syncId, name } = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
    return typeof syncId === 'string' && typeof name === 'string';
  }
}
