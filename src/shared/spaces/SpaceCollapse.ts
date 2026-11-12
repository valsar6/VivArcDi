export type SpaceCollapseListener = (collapsed: boolean) => void;

export class SpaceCollapse {
  static #instances = new WeakMap<object, SpaceCollapse>();

  #collapsed = false;
  #listeners = new Set<SpaceCollapseListener>();

  /**
   * Whether the active workspace is collapsed: the tab bar then shows only what is open. The space
   * header is the only writer; the folders section and the pinned tabs read it, so that no module
   * calls another.
   *
   * @param scope Usually the browser window document; the same scope gives the same state.
   * @returns The state shared by every module of that scope.
   */
  public static of(scope: object): SpaceCollapse {
    const existing = SpaceCollapse.#instances.get(scope);
    if (existing !== undefined) {
      return existing;
    }
    const created = new SpaceCollapse();
    SpaceCollapse.#instances.set(scope, created);
    return created;
  }

  /**
   * @returns Whether the active workspace is collapsed.
   */
  public get collapsed(): boolean {
    return this.#collapsed;
  }

  /**
   * Changes the state. Listeners are called only when it changed.
   *
   * @param value Whether the active workspace is collapsed.
   */
  public set(value: boolean): void {
    if (value === this.#collapsed) {
      return;
    }
    this.#collapsed = value;
    [...this.#listeners].forEach((listener) => listener(value));
  }

  /**
   * @param listener Called with the new state when it changes.
   * @returns A function that removes the listener.
   */
  public onChange(listener: SpaceCollapseListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
}
