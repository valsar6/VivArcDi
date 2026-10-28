class SpaceCollapse {
  static #instances = /* @__PURE__ */ new WeakMap();
  #collapsed = false;
  #listeners = /* @__PURE__ */ new Set();
  /**
   * Whether the active workspace is collapsed: the tab bar then shows only what is open. The space
   * header is the only writer; the folders section and the pinned tabs read it, so that no module
   * calls another.
   *
   * @param scope Usually the browser window document; the same scope gives the same state.
   * @returns The state shared by every module of that scope.
   */
  static of(scope) {
    const existing = SpaceCollapse.#instances.get(scope);
    if (existing !== void 0) {
      return existing;
    }
    const created = new SpaceCollapse();
    SpaceCollapse.#instances.set(scope, created);
    return created;
  }
  /**
   * @returns Whether the active workspace is collapsed.
   */
  get collapsed() {
    return this.#collapsed;
  }
  /**
   * Changes the state. Listeners are called only when it changed.
   *
   * @param value Whether the active workspace is collapsed.
   */
  set(value) {
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
  onChange(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
}
export {
  SpaceCollapse
};
