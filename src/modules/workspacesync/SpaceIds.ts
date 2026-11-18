import { StoredFormat, type Readout, type ReadingStorage } from '../../core/browser/StoredFormat.js';

const KEY = 'vivarcdi.sync.spaceIds';

interface Detached {
  detached: string;
}

type Link = string | Detached;

const isLink = (value: unknown): value is Link =>
  typeof value === 'string' ||
  (typeof value === 'object' && value !== null && typeof (value as Record<string, unknown>).detached === 'string');

const FORMAT = new StoredFormat<Record<string, Link>>({
  empty: {},
  read: (data): Readout<Record<string, Link>> | null => {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return null;
    }
    const entries = Object.entries(data);
    const kept = entries.filter(([, link]) => isLink(link));
    return { value: Object.fromEntries(kept), skipped: kept.length < entries.length };
  },
});

export class SpaceIds {
  #storage: ReadingStorage;
  #generate: () => string;

  /**
   * Links the id Vivaldi gave a workspace on this computer to its sync id, the random id that names
   * the workspace in the sync store on every computer. A workspace that another computer removed
   * from the store is detached: it stays here, unlinked, until the user renames it.
   *
   * @param storage Where the links are kept.
   * @param generate Makes a new sync id, replaceable in tests.
   */
  constructor(storage: ReadingStorage, generate: () => string = () => crypto.randomUUID()) {
    this.#storage = storage;
    this.#generate = generate;
  }

  /**
   * @returns A new random sync id.
   */
  public fresh(): string {
    return this.#generate();
  }

  /**
   * @param vivaldiId The id of a workspace here.
   * @returns Its sync id, or null when it is not linked.
   */
  public syncIdOf(vivaldiId: string): string | null {
    const link = this.#all()[vivaldiId];
    return typeof link === 'string' ? link : null;
  }

  /**
   * @param vivaldiId The id of a workspace here.
   * @param name Its name now.
   * @returns Whether it was detached and still has the name it had then.
   */
  public isDetached(vivaldiId: string, name: string): boolean {
    const link = this.#all()[vivaldiId];
    return typeof link === 'object' && link.detached === name;
  }

  /**
   * @param vivaldiId The id of a workspace here.
   * @param syncId The sync id it now has.
   */
  public link(vivaldiId: string, syncId: string): void {
    this.#save({ ...this.#all(), [vivaldiId]: syncId });
  }

  /**
   * Forgets the link of a workspace that the store no longer lists, so the workspace stays here and
   * is not added to the store again unless its name changes.
   *
   * @param vivaldiId The id of a workspace here.
   * @param name Its name now.
   */
  public detach(vivaldiId: string, name: string): void {
    this.#save({ ...this.#all(), [vivaldiId]: { detached: name } });
  }

  #all(): Record<string, Link> {
    return this.#storage.read(KEY, FORMAT).value;
  }

  #save(links: Record<string, Link>): void {
    const text = FORMAT.encode(links);
    if (this.#storage.getItem(KEY) !== text) {
      this.#storage.setItem(KEY, text);
    }
  }
}
