import type { Logger } from '../../core/Logger.js';
import type { KeyValueStorage } from '../../core/PersistentStorage.js';

export const ARCHIVE_STORAGE_KEY = 'vivarcdi.archive';

export interface ArchiveEntry {
  /** The address of the closed tab. */
  url: string;
  /** Its title. */
  title: string;
  /** Its favicon, or null when it had none. */
  favIconUrl: string | null;
  /** The workspace it was in, or null when it was in none. */
  workspace: string | null;
  /** When it was archived, in milliseconds since the epoch. */
  archivedAt: number;
}

const isText = (value: unknown): boolean => typeof value === 'string';
const isTextOrNull = (value: unknown): boolean => value === null || isText(value);

const FIELD_CHECKS: Readonly<Record<keyof ArchiveEntry, (value: unknown) => boolean>> = {
  url: isText,
  title: isText,
  favIconUrl: isTextOrNull,
  workspace: isTextOrNull,
  archivedAt: (value) => typeof value === 'number' && Number.isFinite(value),
};

export class ArchiveStore {
  #storage: KeyValueStorage;
  #limit: number;
  #logger: Logger;
  #warned = false;

  /**
   * The archive of closed Today tabs, newest first, kept in VivArcDi's shared storage so that it
   * survives a restart of Vivaldi.
   *
   * @param storage Persistent storage.
   * @param limit The most entries kept; older ones are dropped.
   * @param logger Logger for entries that cannot be read.
   */
  constructor(storage: KeyValueStorage, limit: number, logger: Logger) {
    this.#storage = storage;
    this.#limit = limit;
    this.#logger = logger;
  }

  /**
   * @returns The entries, newest first, as saved now: a change made by another window shows.
   */
  public get entries(): readonly ArchiveEntry[] {
    return this.#current();
  }

  /**
   * Reads the saved entries. Malformed ones are skipped, with one warning.
   */
  public load(): void {
    this.#current();
  }

  /**
   * Adds entries to what is saved now and saves the archive, dropping the oldest past the limit.
   *
   * @param entries The entries to add.
   * @throws {Error} When the archive cannot be saved; nothing is added then.
   */
  public add(entries: ArchiveEntry[]): void {
    this.#save(ArchiveStore.#newestFirst([...entries, ...this.#current()]).slice(0, this.#limit));
  }

  /**
   * Removes one entry from what is saved now and saves the archive. The entry is matched by its
   * address, its time and its workspace.
   *
   * @param entry An entry as read from `entries`.
   */
  public remove(entry: ArchiveEntry): void {
    this.#save(this.#current().filter((candidate) => !ArchiveStore.#same(candidate, entry)));
  }

  #save(entries: ArchiveEntry[]): void {
    this.#storage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(entries));
  }

  #current(): ArchiveEntry[] {
    const saved = this.#read();
    const valid = saved.filter((entry): entry is ArchiveEntry => ArchiveStore.#isEntry(entry));
    if (valid.length < saved.length && !this.#warned) {
      this.#warned = true;
      this.#logger.warn(`skipped ${saved.length - valid.length} malformed archive entries`);
    }
    return ArchiveStore.#newestFirst(valid).slice(0, this.#limit);
  }

  #read(): unknown[] {
    try {
      const parsed: unknown = JSON.parse(this.#storage.getItem(ARCHIVE_STORAGE_KEY) ?? '[]');
      return Array.isArray(parsed) ? (parsed as unknown[]) : [parsed];
    } catch (error) {
      this.#logger.warn('the saved archive cannot be read', error);
      return [];
    }
  }

  static #same(a: ArchiveEntry, b: ArchiveEntry): boolean {
    return a.url === b.url && a.archivedAt === b.archivedAt && a.workspace === b.workspace;
  }

  static #newestFirst(entries: ArchiveEntry[]): ArchiveEntry[] {
    return [...entries].sort((a, b) => b.archivedAt - a.archivedAt);
  }

  static #isEntry(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const fields = value as Record<string, unknown>;
    return Object.entries(FIELD_CHECKS).every(([name, check]) => check(fields[name]));
  }
}
