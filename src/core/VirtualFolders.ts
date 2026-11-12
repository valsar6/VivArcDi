import type { TreeEntry } from './FolderEntries.js';

export type VirtualFoldersListener = () => void;
export type RevealListener = (id: string) => void;

export interface VirtualFolderHandlers {
  /** A live folder was given a new name. */
  rename: (id: string, name: string) => void;
  /** A live folder was opened. */
  open: (id: string) => void;
  /** The user asked for the menu of a live folder, at a point of the window. */
  menu: (id: string, x: number, y: number) => void;
}

const NO_WORKSPACE = '';

export class VirtualFolders {
  static #instances = new WeakMap<object, VirtualFolders>();

  #entries = new Map<string, TreeEntry[]>();
  #signatures = new Map<string, string>();
  #handlers: VirtualFolderHandlers | null = null;
  #ready = false;
  #listeners = new Set<VirtualFoldersListener>();
  #reveals = new Set<RevealListener>();

  /**
   * The folders that a source fills, such as the live folders, and what the user does to them. The
   * source is the only writer; the folders section reads the entries and reports the clicks, so
   * that no module calls another.
   *
   * @param scope Usually the browser window document; the same scope gives the same state.
   * @returns The state shared by every module of that scope.
   */
  public static of(scope: object): VirtualFolders {
    const existing = VirtualFolders.#instances.get(scope);
    if (existing !== undefined) {
      return existing;
    }
    const created = new VirtualFolders();
    VirtualFolders.#instances.set(scope, created);
    return created;
  }

  /**
   * @returns Whether the source has put its entries in place; before that, the tabs of its rows
   *   must not be taken for orphans.
   */
  public get ready(): boolean {
    return this.#ready;
  }

  /**
   * @param workspace A workspace id, or null outside any workspace.
   * @returns The extra top-level entries of that workspace, in order.
   */
  public entriesFor(workspace: string | null): TreeEntry[] {
    return this.#entries.get(workspace ?? NO_WORKSPACE) ?? [];
  }

  /**
   * @param id The id of a virtual folder or row.
   * @returns Whether any workspace has an entry with that id.
   */
  public has(id: string): boolean {
    return [...this.#entries.values()].some((entries) => VirtualFolders.#contains(entries, id));
  }

  /**
   * Replaces the entries of a workspace. Listeners are called only when they changed.
   *
   * @param workspace A workspace id, or null outside any workspace.
   * @param entries The extra top-level entries; an empty list removes them.
   */
  public set(workspace: string | null, entries: TreeEntry[]): void {
    const key = workspace ?? NO_WORKSPACE;
    const signature = JSON.stringify(entries);
    if (signature === (this.#signatures.get(key) ?? '[]')) {
      return;
    }
    this.#signatures.set(key, signature);
    this.#entries.set(key, entries);
    this.#notify();
  }

  /**
   * Says that the source has put its entries in place.
   */
  public markReady(): void {
    if (!this.#ready) {
      this.#ready = true;
      this.#notify();
    }
  }

  /**
   * Registers what the source does with the clicks on its folders. The last source wins.
   *
   * @param handlers The reactions.
   * @returns A function that removes them.
   */
  public handle(handlers: VirtualFolderHandlers): () => void {
    this.#handlers = handlers;
    return () => {
      if (this.#handlers === handlers) {
        this.#handlers = null;
      }
    };
  }

  /**
   * @param id A virtual folder.
   * @param name Its new name.
   */
  public rename(id: string, name: string): void {
    this.#handlers?.rename(id, name);
  }

  /**
   * @param id A virtual folder the user opened.
   */
  public open(id: string): void {
    this.#handlers?.open(id);
  }

  /**
   * @param id A virtual folder.
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  public openMenu(id: string, x: number, y: number): void {
    this.#handlers?.menu(id, x, y);
  }

  /**
   * Asks the section to show a folder open, as when it was just created.
   *
   * @param id A virtual folder.
   */
  public reveal(id: string): void {
    [...this.#reveals].forEach((listener) => listener(id));
  }

  /**
   * @param listener Called when the entries change or the source becomes ready.
   * @returns A function that removes the listener.
   */
  public onChange(listener: VirtualFoldersListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /**
   * @param listener Called with the id of a folder to show open.
   * @returns A function that removes the listener.
   */
  public onReveal(listener: RevealListener): () => void {
    this.#reveals.add(listener);
    return () => this.#reveals.delete(listener);
  }

  static #contains(entries: TreeEntry[], id: string): boolean {
    return entries.some((entry) => entry.id === id || (entry.kind === 'folder' && VirtualFolders.#contains(entry.children, id)));
  }

  #notify(): void {
    [...this.#listeners].forEach((listener) => listener());
  }
}
