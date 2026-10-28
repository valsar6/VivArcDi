import type { BrowserPrefs } from './BrowserPrefs.js';
import type { Logger } from './Logger.js';

export type WorkspacePrefs = Pick<BrowserPrefs, 'available' | 'canFollow' | 'get' | 'onChange'>;

const LIST_KEY = 'vivaldi.workspaces.list';

export class WorkspaceNames {
  #prefs: WorkspacePrefs;
  #onChange: () => void;
  #logger: Logger;
  #names = new Map<string, string>();
  #warned = false;
  #unsubscribe: (() => void) | null = null;

  /**
   * Knows the name of each workspace from Vivaldi's list of workspaces and follows renames and new
   * workspaces. When the list cannot be read, no workspace has a name and the problem is logged once.
   *
   * @param prefs Vivaldi's preferences.
   * @param onChange Called when the names change.
   * @param logger Logger for failures.
   */
  constructor(prefs: WorkspacePrefs, onChange: () => void, logger: Logger) {
    this.#prefs = prefs;
    this.#onChange = onChange;
    this.#logger = logger;
  }

  /**
   * @returns Whether a change of the list is announced; when false, call `refresh` on each workspace switch.
   */
  public get following(): boolean {
    return this.#unsubscribe !== null;
  }

  /**
   * Reads the list and starts following it when Vivaldi announces its changes.
   */
  public async start(): Promise<void> {
    if (this.#prefs.available && this.#prefs.canFollow) {
      this.#unsubscribe = this.#prefs.onChange(LIST_KEY, () => void this.refresh());
    }
    await this.refresh();
  }

  /**
   * Stops following the list.
   */
  public stop(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }

  /**
   * Reads the list again and reports a change of names.
   */
  public async refresh(): Promise<void> {
    const names = await this.#read();
    if (!WorkspaceNames.#same(names, this.#names)) {
      this.#names = names;
      this.#onChange();
    }
  }

  /**
   * @param workspaceId The id of a workspace, as `TabData.of` returns it, or null.
   * @returns Its name, or null for no workspace or an unknown one.
   */
  public nameOf(workspaceId: string | null): string | null {
    return workspaceId === null ? null : (this.#names.get(workspaceId) ?? null);
  }

  static #same(left: Map<string, string>, right: Map<string, string>): boolean {
    return left.size === right.size && [...left].every(([id, name]) => right.get(id) === name);
  }

  static #parse(value: unknown): Map<string, string> {
    const names = new Map<string, string>();
    for (const item of Array.isArray(value) ? (value as unknown[]) : []) {
      const entry = WorkspaceNames.#entry(item);
      if (entry !== null && !names.has(entry.id)) {
        names.set(entry.id, entry.name);
      }
    }
    return names;
  }

  static #entry(item: unknown): { id: string; name: string } | null {
    const { id, name } = (typeof item === 'object' && item !== null ? item : {}) as Record<string, unknown>;
    return (typeof id === 'number' || typeof id === 'string') && typeof name === 'string' ? { id: String(id), name } : null;
  }

  async #read(): Promise<Map<string, string>> {
    if (!this.#prefs.available) {
      this.#warn('vivaldi.prefs is missing: every workspace uses the default root');
      return new Map();
    }
    try {
      return WorkspaceNames.#parse(await this.#prefs.get(LIST_KEY));
    } catch (error) {
      this.#warn('could not read the workspaces: every workspace uses the default root', error);
      return new Map();
    }
  }

  #warn(...message: unknown[]): void {
    if (!this.#warned) {
      this.#warned = true;
      this.#logger.warn(...message);
    }
  }
}
