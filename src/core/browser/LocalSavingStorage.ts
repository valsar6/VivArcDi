import type { Logger } from '../support/Logger.js';
import type { SaveOutcome, SavingStorage, StorageMode } from './SavingStorage.js';

export class LocalSavingStorage implements SavingStorage {
  public readonly mode: StorageMode = 'persistent';
  #storage: Storage;
  #logger: Logger;
  #warned = false;

  /**
   * Adapts a working `localStorage` to `SavingStorage`.
   *
   * @param storage A `Storage` that accepted a probe write.
   * @param logger Logger for write failures.
   */
  constructor(storage: Storage, logger: Logger) {
    this.#storage = storage;
    this.#logger = logger;
  }

  /**
   * @param key A key.
   * @returns The saved text, or null.
   */
  public getItem(key: string): string | null {
    return this.#storage.getItem(key);
  }

  /**
   * Saves a text, ignoring the outcome.
   *
   * @param key A key.
   * @param value The text.
   */
  public setItem(key: string, value: string): void {
    void this.save(key, value);
  }

  /**
   * @param key A key.
   * @param value The text.
   * @returns `saved`, or `failed` when the write throws (for example a full quota).
   */
  public save(key: string, value: string): Promise<SaveOutcome> {
    try {
      this.#storage.setItem(key, value);
      return Promise.resolve('saved');
    } catch (error) {
      if (!this.#warned) {
        this.#warned = true;
        this.#logger.warn('could not save to localStorage: values last until Vivaldi restarts', error);
      }
      return Promise.resolve('failed');
    }
  }
}
