export class FolderCommands {
  static #instances = new WeakMap<object, FolderCommands>();

  #newFolderListeners = new Set<() => void>();

  /**
   * The commands the space header gives to the folders section, so that no module calls another.
   * The header asks, the section listens and does the work.
   *
   * @param scope Usually the browser window document; the same scope gives the same commands.
   * @returns The commands shared by every module of that scope.
   */
  public static of(scope: object): FolderCommands {
    const existing = FolderCommands.#instances.get(scope);
    if (existing !== undefined) {
      return existing;
    }
    const created = new FolderCommands();
    FolderCommands.#instances.set(scope, created);
    return created;
  }

  /**
   * Asks the folders section to create a folder in the active workspace and name it.
   */
  public requestNewFolder(): void {
    [...this.#newFolderListeners].forEach((listener) => listener());
  }

  /**
   * @param listener Called when a new folder is requested.
   * @returns A function that removes the listener.
   */
  public onNewFolder(listener: () => void): () => void {
    this.#newFolderListeners.add(listener);
    return () => this.#newFolderListeners.delete(listener);
  }
}
