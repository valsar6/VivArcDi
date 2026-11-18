import type { Logger } from '../../core/support/Logger.js';
import { StoredFormat } from '../../core/browser/StoredFormat.js';
import type { ReadingStorage } from '../../core/browser/StoredFormat.js';
import type { Readout } from '../../core/browser/StoredFormat.js';
import type { PullRequestRow } from './GithubPullRequests.js';
import { PullRequestFilters } from './PullRequestFilters.js';
import type { PullRequestFilterValues } from './PullRequestFilters.js';

export interface LiveFolder {
  /** Unique among all live folders. */
  id: string;
  name: string;
  filters: PullRequestFilterValues;
  /** The rows of the last successful refresh, shown at once after a restart. */
  rows: PullRequestRow[];
  /** Why the last refresh failed, or null. */
  warning: string | null;
  /** Whether GitHub refused the connection at the last refresh, so that the folder offers `Reconnect GitHub`. */
  needsReconnect: boolean;
  /** The pull requests the user archived, by id, with the `updatedAt` they had; one that changed since comes back. */
  archived: Record<string, string>;
  /** When the last refresh succeeded, in milliseconds since the epoch, or null. */
  refreshedAt: number | null;
}

export type LiveFolderChanges = Partial<Omit<LiveFolder, 'id'>>;

export const LIVE_FOLDERS_STORAGE_KEY = 'vivarcdi.liveFolders';

const NO_WORKSPACE = '';
const DEFAULT_NAME = 'Pull Requests';
const ID_RADIX = 36;
const ID_START = 2;
const ID_LENGTH = 10;

export class LiveFolderStore {
  static readonly #FORMAT = new StoredFormat<Record<string, LiveFolder[]>>({
    empty: {},
    read: (data): Readout<Record<string, LiveFolder[]>> | null => LiveFolderStore.#readFolders(data),
  });

  #storage: ReadingStorage;
  #logger: Logger;
  #nextId: () => string;

  /**
   * The live folders of every workspace, their filters and their last rows, kept in the
   * interface's storage under `liveFolders` as `{ [workspace]: LiveFolder[] }`. Nothing is kept in
   * memory: every call reads the saved value, so a change made in another window shows at once,
   * and every change reads it, alters only what it names and writes it at once. The GitHub
   * connection is not part of them.
   *
   * @param storage Persistent storage.
   * @param logger Logger for storage failures.
   * @param nextId Makes the id of a new folder; replaceable in tests.
   */
  constructor(storage: ReadingStorage, logger: Logger, nextId: () => string = LiveFolderStore.#randomId) {
    this.#storage = storage;
    this.#logger = logger;
    this.#nextId = nextId;
  }

  /**
   * @returns The workspaces that have live folders; null stands for the area outside any workspace.
   */
  public get workspaces(): Array<string | null> {
    return [...this.#read().keys()].map((key) => (key === NO_WORKSPACE ? null : key));
  }

  /**
   * @param workspace A workspace id, or null outside any workspace.
   * @returns Its live folders, in order.
   */
  public folders(workspace: string | null): readonly LiveFolder[] {
    return this.#read().get(workspace ?? NO_WORKSPACE) ?? [];
  }

  /**
   * @returns Every live folder of every workspace.
   */
  public all(): LiveFolder[] {
    return [...this.#read().values()].flat();
  }

  /**
   * @param id A folder id.
   * @returns The folder, or undefined.
   */
  public find(id: string): LiveFolder | undefined {
    return this.all().find((folder) => folder.id === id);
  }

  /**
   * Adds a live folder named `Pull Requests` with the default filters at the end of a workspace.
   *
   * @param workspace A workspace id, or null outside any workspace.
   * @returns The new folder.
   */
  public add(workspace: string | null): LiveFolder {
    const folder: LiveFolder = {
      id: this.#nextId(),
      name: DEFAULT_NAME,
      filters: PullRequestFilters.defaults(),
      rows: [],
      warning: null,
      needsReconnect: false,
      archived: {},
      refreshedAt: null,
    };
    const saved = this.#read();
    const key = workspace ?? NO_WORKSPACE;
    saved.set(key, [...(saved.get(key) ?? []), folder]);
    this.#write(saved);
    return folder;
  }

  /**
   * Changes the named fields of a saved folder and leaves everything else as saved.
   *
   * @param id A folder id.
   * @param changes The fields to change.
   * @returns Whether the folder exists; if not, nothing is written.
   */
  public update(id: string, changes: LiveFolderChanges): boolean {
    const saved = this.#read();
    for (const [key, folders] of saved) {
      const found = folders.find((folder) => folder.id === id);
      if (found !== undefined) {
        saved.set(
          key,
          folders.map((folder) => (folder === found ? { ...found, ...changes } : folder)),
        );
        this.#write(saved);
        return true;
      }
    }
    return false;
  }

  /**
   * Removes a folder with its filters and its rows; nothing is written when it is not saved.
   *
   * @param id A folder id.
   */
  public remove(id: string): void {
    const saved = this.#read();
    let removed = false;
    for (const [key, folders] of saved) {
      const kept = folders.filter((folder) => folder.id !== id);
      if (kept.length === folders.length) {
        continue;
      }
      removed = true;
      if (kept.length === 0) {
        saved.delete(key);
      } else {
        saved.set(key, kept);
      }
    }
    if (removed) {
      this.#write(saved);
    }
  }

  static #randomId(): string {
    return Math.random().toString(ID_RADIX).slice(ID_START, ID_LENGTH);
  }

  #read(): Map<string, LiveFolder[]> {
    return new Map(Object.entries(this.#storage.read(LIVE_FOLDERS_STORAGE_KEY, LiveFolderStore.#FORMAT).value));
  }

  #write(folders: Map<string, LiveFolder[]>): void {
    try {
      this.#storage.setItem(LIVE_FOLDERS_STORAGE_KEY, LiveFolderStore.#FORMAT.encode(Object.fromEntries(folders)));
    } catch (error) {
      this.#logger.warn('the live folders are kept for this session only', error);
    }
  }

  static #readFolders(data: unknown): Readout<Record<string, LiveFolder[]>> | null {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return null;
    }
    const value: Record<string, LiveFolder[]> = {};
    let skipped = false;
    for (const [key, entry] of Object.entries(data)) {
      if (!Array.isArray(entry)) {
        skipped = true;
        continue;
      }
      const folders = entry.flatMap((item) => LiveFolderStore.#folderFrom(item));
      skipped ||= folders.length < entry.length;
      if (folders.length > 0) {
        value[key] = folders;
      }
    }
    return { value, skipped };
  }

  static #folderFrom(value: unknown): LiveFolder[] {
    if (typeof value !== 'object' || value === null) {
      return [];
    }
    const item = value as Record<string, unknown>;
    if (typeof item['id'] !== 'string' || typeof item['name'] !== 'string') {
      return [];
    }
    return [
      {
        id: item['id'],
        name: item['name'],
        filters: PullRequestFilters.from(item['filters']),
        rows: Array.isArray(item['rows']) ? item['rows'].filter(LiveFolderStore.#isRow) : [],
        warning: typeof item['warning'] === 'string' ? item['warning'] : null,
        needsReconnect: item['needsReconnect'] === true,
        archived: LiveFolderStore.#archivedFrom(item['archived']),
        refreshedAt: typeof item['refreshedAt'] === 'number' ? item['refreshedAt'] : null,
      },
    ];
  }

  static #archivedFrom(value: unknown): Record<string, string> {
    const record = typeof value === 'object' && value !== null ? Object.entries(value) : [];
    return Object.fromEntries(record.filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
  }

  static #isRow(value: unknown): value is PullRequestRow {
    const row = value as Record<string, unknown> | null;
    return typeof row === 'object' && row !== null && ['id', 'title', 'url', 'subtitle', 'updatedAt'].every((field) => typeof row[field] === 'string');
  }
}
