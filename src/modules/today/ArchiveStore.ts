import type { SaveOutcome, SavingStorage } from '../../core/browser/SavingStorage.js';
import { StoredFormat } from '../../core/browser/StoredFormat.js';
import type { Readout, StoredReader } from '../../core/browser/StoredFormat.js';

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

const isEntry = (value: unknown): boolean => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const fields = value as Record<string, unknown>;
  return Object.entries(FIELD_CHECKS).every(([name, check]) => check(fields[name]));
};

const FORMAT = new StoredFormat<ArchiveEntry[]>({
  empty: [],
  read: (data): Readout<ArchiveEntry[]> | null => {
    if (!Array.isArray(data)) {
      return null;
    }
    const valid = (data as unknown[]).filter((entry): entry is ArchiveEntry => isEntry(entry));
    return { value: valid, skipped: valid.length < data.length };
  },
});

export class ArchiveStore {
  #storage: SavingStorage & StoredReader;
  #limit: number;

  /**
   * The archive of closed Today tabs, newest first, kept in VivArcDi's shared storage so that it
   * survives a restart of Vivaldi.
   *
   * @param storage Persistent storage.
   * @param limit The most entries kept; older ones are dropped.
   */
  constructor(storage: SavingStorage & StoredReader, limit: number) {
    this.#storage = storage;
    this.#limit = limit;
  }

  /**
   * @returns The entries, newest first, as saved now: a change made by another window shows.
   */
  public get entries(): readonly ArchiveEntry[] {
    return this.#current();
  }

  /**
   * Reads the saved entries. Malformed ones are skipped.
   */
  public load(): void {
    this.#current();
  }

  /**
   * Adds entries to what is saved now and saves the archive, dropping the oldest past the limit.
   * When the outcome is not `saved`, the entries are taken back out of the archive again.
   *
   * @param entries The entries to add.
   * @returns How the write ended; it never rejects.
   */
  public async add(entries: ArchiveEntry[]): Promise<SaveOutcome> {
    const added = ArchiveStore.#newestFirst([...entries, ...this.#current()]).slice(0, this.#limit);
    const outcome = await this.#storage.save(ARCHIVE_STORAGE_KEY, FORMAT.encode(added));
    if (outcome !== 'saved') {
      this.#save(this.#current().filter((candidate) => !entries.some((entry) => ArchiveStore.#same(candidate, entry))));
    }
    return outcome;
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
    this.#storage.setItem(ARCHIVE_STORAGE_KEY, FORMAT.encode(entries));
  }

  #current(): ArchiveEntry[] {
    return ArchiveStore.#newestFirst(this.#storage.read(ARCHIVE_STORAGE_KEY, FORMAT).value).slice(0, this.#limit);
  }

  static #same(a: ArchiveEntry, b: ArchiveEntry): boolean {
    return a.url === b.url && a.archivedAt === b.archivedAt && a.workspace === b.workspace;
  }

  static #newestFirst(entries: ArchiveEntry[]): ArchiveEntry[] {
    return [...entries].sort((a, b) => b.archivedAt - a.archivedAt);
  }
}
