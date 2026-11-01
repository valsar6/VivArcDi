class FolderCommands {
  static #instances = /* @__PURE__ */ new WeakMap();
  #newFolderListeners = /* @__PURE__ */ new Set();
  /**
   * The commands the space header gives to the folders section, so that no module calls another.
   * The header asks, the section listens and does the work.
   *
   * @param scope Usually the browser window document; the same scope gives the same commands.
   * @returns The commands shared by every module of that scope.
   */
  static of(scope) {
    const existing = FolderCommands.#instances.get(scope);
    if (existing !== void 0) {
      return existing;
    }
    const created = new FolderCommands();
    FolderCommands.#instances.set(scope, created);
    return created;
  }
  /**
   * Asks the folders section to create a folder in the active workspace and name it.
   */
  requestNewFolder() {
    [...this.#newFolderListeners].forEach((listener) => listener());
  }
  /**
   * @param listener Called when a new folder is requested.
   * @returns A function that removes the listener.
   */
  onNewFolder(listener) {
    this.#newFolderListeners.add(listener);
    return () => this.#newFolderListeners.delete(listener);
  }
}
export {
  FolderCommands
};
