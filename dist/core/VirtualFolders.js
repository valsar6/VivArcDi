const NO_WORKSPACE = "";
class VirtualFolders {
  static #instances = /* @__PURE__ */ new WeakMap();
  #entries = /* @__PURE__ */ new Map();
  #signatures = /* @__PURE__ */ new Map();
  #handlers = null;
  #ready = false;
  #listeners = /* @__PURE__ */ new Set();
  #reveals = /* @__PURE__ */ new Set();
  /**
   * The folders that a source fills, such as the live folders, and what the user does to them. The
   * source is the only writer; the folders section reads the entries and reports the clicks, so
   * that no module calls another.
   *
   * @param scope Usually the browser window document; the same scope gives the same state.
   * @returns The state shared by every module of that scope.
   */
  static of(scope) {
    const existing = VirtualFolders.#instances.get(scope);
    if (existing !== void 0) {
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
  get ready() {
    return this.#ready;
  }
  /**
   * @param workspace A workspace id, or null outside any workspace.
   * @returns The extra top-level entries of that workspace, in order.
   */
  entriesFor(workspace) {
    return this.#entries.get(workspace ?? NO_WORKSPACE) ?? [];
  }
  /**
   * @param id The id of a virtual folder or row.
   * @returns Whether any workspace has an entry with that id.
   */
  has(id) {
    return [...this.#entries.values()].some((entries) => VirtualFolders.#contains(entries, id));
  }
  /**
   * Replaces the entries of a workspace. Listeners are called only when they changed.
   *
   * @param workspace A workspace id, or null outside any workspace.
   * @param entries The extra top-level entries; an empty list removes them.
   */
  set(workspace, entries) {
    const key = workspace ?? NO_WORKSPACE;
    const signature = JSON.stringify(entries);
    if (signature === (this.#signatures.get(key) ?? "[]")) {
      return;
    }
    this.#signatures.set(key, signature);
    this.#entries.set(key, entries);
    this.#notify();
  }
  /**
   * Says that the source has put its entries in place.
   */
  markReady() {
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
  handle(handlers) {
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
  rename(id, name) {
    this.#handlers?.rename(id, name);
  }
  /**
   * @param id A virtual folder the user opened.
   */
  open(id) {
    this.#handlers?.open(id);
  }
  /**
   * @param id A virtual folder.
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  openMenu(id, x, y) {
    this.#handlers?.menu(id, x, y);
  }
  /**
   * Asks the section to show a folder open, as when it was just created.
   *
   * @param id A virtual folder.
   */
  reveal(id) {
    [...this.#reveals].forEach((listener) => listener(id));
  }
  /**
   * @param listener Called when the entries change or the source becomes ready.
   * @returns A function that removes the listener.
   */
  onChange(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
  /**
   * @param listener Called with the id of a folder to show open.
   * @returns A function that removes the listener.
   */
  onReveal(listener) {
    this.#reveals.add(listener);
    return () => this.#reveals.delete(listener);
  }
  static #contains(entries, id) {
    return entries.some((entry) => entry.id === id || entry.kind === "folder" && VirtualFolders.#contains(entry.children, id));
  }
  #notify() {
    [...this.#listeners].forEach((listener) => listener());
  }
}
export {
  VirtualFolders
};
