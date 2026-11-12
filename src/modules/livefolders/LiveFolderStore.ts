import type { Logger } from '../../core/support/Logger.js';
import type { KeyValueStorage } from '../../core/browser/PersistentStorage.js';
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
  #storage: KeyValueStorage;
  #logger: Logger;
  #folders = new Map<string, LiveFolder[]>();
  #nextId: () => string;

  /**
   * The live folders of every workspace, their filters and their last rows, kept in the
   * interface's storage under `liveFolders` as `{ [workspace]: LiveFolder[] }`. They are read
   * once, here, and every change is written at once. The GitHub connection is not part of them.
   *
   * @param storage Persistent storage.
   * @param logger Logger for storage failures.
   * @param nextId Makes the id of a new folder; replaceable in tests.
   */
  constructor(storage: KeyValueStorage, logger: Logger, nextId: () => string = LiveFolderStore.#randomId) {
    this.#storage = storage;
    this.#logger = logger;
    this.#nextId = nextId;
    this.#read();
  }

  /**
   * @returns The workspaces that have live folders; null stands for the area outside any workspace.
   */
  public get workspaces(): Array<string | null> {
    return [...this.#folders.keys()].map((key) => (key === NO_WORKSPACE ? null : key));
  }

  /**
   * @param workspace A workspace id, or null outside any workspace.
   * @returns Its live folders, in order.
   */
  public folders(workspace: string | null): readonly LiveFolder[] {
    return this.#folders.get(workspace ?? NO_WORKSPACE) ?? [];
  }

  /**
   * @returns Every live folder of every workspace.
   */
  public all(): LiveFolder[] {
    return [...this.#folders.values()].flat();
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
    const key = workspace ?? NO_WORKSPACE;
    this.#folders.set(key, [...(this.#folders.get(key) ?? []), folder]);
    this.#write();
    return folder;
  }

  /**
   * @param id A folder id.
   * @param changes The fields to change.
   * @returns Whether the folder exists.
   */
  public update(id: string, changes: LiveFolderChanges): boolean {
    const found = this.find(id);
    if (found === undefined) {
      return false;
    }
    Object.assign(found, changes);
    this.#write();
    return true;
  }

  /**
   * Removes a folder with its filters and its rows.
   *
   * @param id A folder id.
   */
  public remove(id: string): void {
    for (const [key, folders] of this.#folders) {
      const kept = folders.filter((folder) => folder.id !== id);
      if (kept.length === 0) {
        this.#folders.delete(key);
      } else {
        this.#folders.set(key, kept);
      }
    }
    this.#write();
  }

  static #randomId(): string {
    return Math.random().toString(ID_RADIX).slice(ID_START, ID_LENGTH);
  }

  #read(): void {
    try {
      const stored: unknown = JSON.parse(this.#storage.getItem(LIVE_FOLDERS_STORAGE_KEY) ?? '{}');
      const record = typeof stored === 'object' && stored !== null ? (stored as Record<string, unknown>) : {};
      for (const [key, value] of Object.entries(record)) {
        const folders = Array.isArray(value) ? value.flatMap((item) => LiveFolderStore.#folderFrom(item)) : [];
        if (folders.length > 0) {
          this.#folders.set(key, folders);
        }
      }
    } catch (error) {
      this.#logger.warn('the live folders could not be read', error);
    }
  }

  #write(): void {
    try {
      this.#storage.setItem(LIVE_FOLDERS_STORAGE_KEY, JSON.stringify(Object.fromEntries(this.#folders)));
    } catch (error) {
      this.#logger.warn('the live folders are kept for this session only', error);
    }
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
