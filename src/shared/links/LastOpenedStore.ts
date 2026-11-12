import type { Logger } from '../../core/Logger.js';
import type { KeyValueStorage } from '../../core/PersistentStorage.js';

export type { KeyValueStorage };

export const LAST_OPENED_STORAGE_KEY = 'vivarcdi.lastOpened';

const ONE_YEAR_MS = 31_536_000_000;

export class LastOpenedStore {
  #storage: KeyValueStorage | null;
  #logger: Logger;
  #dates = new Map<string, number>();
  #warned = false;

  /**
   * Keeps the date each Favorite and pinned tab was last opened, by address key,
   * so the dates survive a restart of Vivaldi even though tab ids change.
   *
   * @param storage Persistent storage, or null to keep dates for the session only.
   * @param logger Logger for storage failures.
   */
  constructor(storage: KeyValueStorage | null, logger: Logger) {
    this.#storage = storage;
    this.#logger = logger;
  }

  /**
   * Reads the saved dates, dropping those older than one year.
   *
   * @param now The current date.
   */
  public load(now: Date): void {
    const saved = this.#read();
    this.#dates = new Map(
      Object.entries(saved).filter(
        (entry): entry is [string, number] => typeof entry[1] === 'number' && now.getTime() - entry[1] < ONE_YEAR_MS,
      ),
    );
  }

  /**
   * @param key An address key.
   * @returns When that address was last opened, or null when it never was.
   */
  public get(key: string): Date | null {
    const time = this.#dates.get(key);
    return time === undefined ? null : new Date(time);
  }

  /**
   * Records that an address was opened, and saves every date.
   *
   * @param key An address key.
   * @param date When it was opened.
   */
  public record(key: string, date: Date): void {
    this.#dates.set(key, date.getTime());
    this.#write();
  }

  #read(): Record<string, unknown> {
    try {
      const parsed: unknown = JSON.parse(this.#storage?.getItem(LAST_OPENED_STORAGE_KEY) ?? '{}');
      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
    } catch (error) {
      this.#warnOnce(error);
      return {};
    }
  }

  #write(): void {
    try {
      this.#storage?.setItem(LAST_OPENED_STORAGE_KEY, JSON.stringify(Object.fromEntries(this.#dates)));
    } catch (error) {
      this.#warnOnce(error);
    }
  }

  #warnOnce(error: unknown): void {
    if (!this.#warned) {
      this.#warned = true;
      this.#logger.warn('last-opened dates are kept for this session only', error);
    }
  }
}
