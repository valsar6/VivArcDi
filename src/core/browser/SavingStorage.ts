import type { KeyValueStorage } from './PersistentStorage.js';

/**
 * Where a storage keeps what it is given: `persistent` survives a restart of Vivaldi, `memory`
 * lasts until it. Fixed when the storage opens.
 */
export type StorageMode = 'persistent' | 'memory';

/**
 * What happened to one write: `saved` reached the medium, `failed` did not although the medium
 * exists, `memory` stayed in memory because the storage has no medium.
 */
export type SaveOutcome = 'saved' | 'failed' | 'memory';

/** A key-value storage that also tells what became of a write. */
export interface SavingStorage extends KeyValueStorage {
  readonly mode: StorageMode;

  /**
   * Saves a text: in memory at once, in the medium right after.
   *
   * @param key A key.
   * @param value The text.
   * @returns The outcome of the write; never rejects.
   */
  save(key: string, value: string): Promise<SaveOutcome>;
}
