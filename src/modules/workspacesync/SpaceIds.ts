import type { KeyValueStorage } from '../../core/PersistentStorage.js';

const KEY = 'vivarcdi.sync.spaceIds';

interface Detached {
  detached: string;
}

type Link = string | Detached;

export class SpaceIds {
  #storage: KeyValueStorage;
  #generate: () => string;

  /**
   * Links the id Vivaldi gave a workspace on this computer to its sync id, the random id that names
   * the workspace in the sync store on every computer. A workspace that another computer removed
   * from the store is detached: it stays here, unlinked, until the user renames it.
   *
   * @param storage Where the links are kept.
   * @param generate Makes a new sync id, replaceable in tests.
   */
  constructor(storage: KeyValueStorage, generate: () => string = () => crypto.randomUUID()) {
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
    try {
      const parsed: unknown = JSON.parse(this.#storage.getItem(KEY) ?? '{}');
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, Link>) : {};
    } catch {
      return {};
    }
  }

  #save(links: Record<string, Link>): void {
    const text = JSON.stringify(links);
    if (this.#storage.getItem(KEY) !== text) {
      this.#storage.setItem(KEY, text);
    }
  }
}
