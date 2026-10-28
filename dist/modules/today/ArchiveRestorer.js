class ArchiveRestorer {
  #workspaceTabs;
  #store;
  #logger;
  /**
   * Reopens archived tabs.
   *
   * @param workspaceTabs Opens a tab in a workspace.
   * @param store The archive.
   * @param logger Logger for failures.
   */
  constructor(workspaceTabs, store, logger) {
    this.#workspaceTabs = workspaceTabs;
    this.#store = store;
    this.#logger = logger;
  }
  /**
   * Opens the entry's address in a new active tab of its workspace, then removes the entry from
   * the archive. When the tab cannot be opened, the entry stays.
   *
   * @param entry An archive entry.
   */
  async restore(entry) {
    try {
      await this.#workspaceTabs.open(entry.url, entry.workspace);
    } catch (error) {
      this.#logger.warn("could not reopen the archived tab", error);
      return;
    }
    this.#store.remove(entry);
  }
}
export {
  ArchiveRestorer
};
