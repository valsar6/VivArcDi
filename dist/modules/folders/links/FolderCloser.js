class FolderCloser {
  #tabs;
  #logger;
  /**
   * Closes the tabs of folder and link rows, without touching the bookmark tree.
   *
   * @param tabs The tabs API.
   * @param logger Where a failed close is reported.
   */
  constructor(tabs, logger) {
    this.#tabs = tabs;
    this.#logger = logger;
  }
  /**
   * @param tabIds The tabs to close.
   * @returns False when a tab could not be closed.
   */
  async close(tabIds) {
    for (const tabId of tabIds) {
      try {
        await this.#tabs.remove(tabId);
      } catch (error) {
        this.#logger.error(`Could not close tab ${tabId}`, error);
        return false;
      }
    }
    return true;
  }
}
export {
  FolderCloser
};
