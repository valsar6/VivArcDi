class HiddenTabs {
  static #instances = /* @__PURE__ */ new WeakMap();
  #owners = /* @__PURE__ */ new Map();
  #listeners = /* @__PURE__ */ new Set();
  /**
   * The ids of the tabs that Vivaldi's tab list must not show because a tile or a row drawn
   * elsewhere stands for them. Each module sets the ids it hides under its own name, so that
   * one module never undoes the hiding of another; the tabs hidden are the union of all owners.
   *
   * @param scope Usually the browser window document; the same scope gives the same set.
   * @returns The set shared by every module of that scope.
   */
  static of(scope) {
    const existing = HiddenTabs.#instances.get(scope);
    if (existing !== void 0) {
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
  has(tabId) {
    return [...this.#owners.values()].some((ids) => ids.has(tabId));
  }
  /**
   * Replaces the ids an owner hides. Listeners are called only when the ids changed.
   *
   * @param owner The module that hides the tabs.
   * @param tabIds The tabs it hides now.
   */
  set(owner, tabIds) {
    const next = new Set(tabIds);
    const current = this.#owners.get(owner) ?? /* @__PURE__ */ new Set();
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
  clear(owner) {
    if (this.#owners.delete(owner)) {
      this.#notify();
    }
  }
  /**
   * @param listener Called when the set of hidden tabs changes.
   * @returns A function that removes the listener.
   */
  onChange(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
  #notify() {
    [...this.#listeners].forEach((listener) => listener());
  }
}
export {
  HiddenTabs
};
