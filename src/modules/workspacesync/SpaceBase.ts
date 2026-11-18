import { StoredFormat, type Readout, type ReadingStorage } from '../../core/browser/StoredFormat.js';
import type { SpaceEntry } from './SpaceEntry.js';

const KEY = 'vivarcdi.sync.base.spaces';

const isValid = (value: unknown): boolean => {
  const { syncId, name } = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  return typeof syncId === 'string' && typeof name === 'string';
};

const FORMAT = new StoredFormat<SpaceEntry[] | null>({
  empty: null,
  read: (data): Readout<SpaceEntry[] | null> | null => (Array.isArray(data) && data.every(isValid) ? { value: data as SpaceEntry[], skipped: false } : null),
});

export class SpaceBase {
  #storage: ReadingStorage;

  /**
   * Remembers the list of workspaces this computer last agreed with the sync store, with the name
   * and icon each workspace has here. The merge needs it to tell a workspace added elsewhere from
   * one deleted here, and a rename made here from one made elsewhere.
   *
   * @param storage Where the list is kept.
   */
  constructor(storage: ReadingStorage) {
    this.#storage = storage;
  }

  /**
   * @returns The workspaces last agreed on, or null when the list never synced here.
   */
  public get(): SpaceEntry[] | null {
    return this.#storage.read(KEY, FORMAT).value;
  }

  /**
   * @param entries The workspaces this computer and the store now agree on.
   */
  public set(entries: SpaceEntry[]): void {
    const text = FORMAT.encode(entries);
    if (this.#storage.getItem(KEY) !== text) {
      this.#storage.setItem(KEY, text);
    }
  }
}
