import type { SaveOutcome, SavingStorage, StorageMode } from '../browser/SavingStorage.js';
import type { NoticeBoard } from '../dom/Notices.js';

const STORAGE_MEMORY_KEY = 'storage-memory';
const STORAGE_FAILED_KEY = 'storage-failed';
const MEMORY_TEXT = 'VivArcDi cannot save its data: changes last until Vivaldi restarts';
const FAILED_TEXT = 'VivArcDi could not save its data: changes may be lost when Vivaldi restarts';

export class NoticedStorage implements SavingStorage {
  #inner: SavingStorage;
  #notices: NoticeBoard;

  /**
   * A storage that tells the user, once per session, when it cannot save.
   *
   * @param inner The storage that does the work.
   * @param notices Where the notices are shown.
   */
  constructor(inner: SavingStorage, notices: NoticeBoard) {
    this.#inner = inner;
    this.#notices = notices;
  }

  /** @returns The mode of the inner storage. */
  public get mode(): StorageMode {
    return this.#inner.mode;
  }

  /**
   * Shows the start notice when the storage works in memory only.
   */
  public announce(): void {
    if (this.mode === 'memory') {
      this.#notices.once(STORAGE_MEMORY_KEY, MEMORY_TEXT, 'error');
    }
  }

  /**
   * @param key A key.
   * @returns The saved text, or null.
   */
  public getItem(key: string): string | null {
    return this.#inner.getItem(key);
  }

  /**
   * Saves a text and ignores the outcome; a failure still shows the notice.
   *
   * @param key A key.
   * @param value The text.
   */
  public setItem(key: string, value: string): void {
    void this.save(key, value);
  }

  /**
   * Saves a text and shows the failure notice the first time a write fails.
   *
   * @param key A key.
   * @param value The text.
   * @returns The outcome of the write.
   */
  public async save(key: string, value: string): Promise<SaveOutcome> {
    const outcome = await this.#inner.save(key, value);
    if (outcome === 'failed') {
      this.#notices.once(STORAGE_FAILED_KEY, FAILED_TEXT, 'error');
    }
    return outcome;
  }
}
