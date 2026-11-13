export type HiddenTabsListener = () => void;

export class HiddenTabs {
  static #instances = new WeakMap<object, HiddenTabs>();

  #owners = new Map<string, Set<number>>();
  #listeners = new Set<HiddenTabsListener>();

  /**
   * The ids of the tabs that Vivaldi's tab list must not show because a tile or a row drawn
   * elsewhere stands for them. Each module sets the ids it hides under its own name, so that
   * one module never undoes the hiding of another; the tabs hidden are the union of all owners.
   *
   * @param scope Usually the browser window document; the same scope gives the same set.
   * @returns The set shared by every module of that scope.
   */
  public static of(scope: object): HiddenTabs {
    const existing = HiddenTabs.#instances.get(scope);
    if (existing !== undefined) {
      return existing;
    }
    const created = new HiddenTabs();
    HiddenTabs.#instances.set(scope, created);
    return created;
  }

  /**
   * @param tabId A tab id.
   * @returns Whether any owner hides the tab.
   */
  public has(tabId: number): boolean {
    return [...this.#owners.values()].some((ids) => ids.has(tabId));
  }

  /**
   * Replaces the ids an owner hides. Listeners are called only when the ids changed.
   *
   * @param owner The module that hides the tabs.
   * @param tabIds The tabs it hides now.
   */
  public set(owner: string, tabIds: Iterable<number>): void {
    const next = new Set(tabIds);
    const current = this.#owners.get(owner) ?? new Set<number>();
    if (next.size === current.size && [...next].every((id) => current.has(id))) {
      return;
    }
    this.#owners.set(owner, next);
    this.#notify();
  }

  /**
   * Stops hiding the tabs of an owner.
   *
   * @param owner The module that hid the tabs.
   */
  public clear(owner: string): void {
    if (this.#owners.delete(owner)) {
      this.#notify();
    }
  }

  /**
   * @param listener Called when the set of hidden tabs changes.
   * @returns A function that removes the listener.
   */
  public onChange(listener: HiddenTabsListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #notify(): void {
    [...this.#listeners].forEach((listener) => listener());
  }
}
