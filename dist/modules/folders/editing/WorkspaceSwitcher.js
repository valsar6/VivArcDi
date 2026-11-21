class WorkspaceSwitcher {
  #tabs;
  #logger;
  /**
   * Switches to a workspace the way Vivaldi does when a tab of it is activated: the workspace of
   * that tab becomes the current one.
   *
   * @param tabs The tabs API.
   * @param logger Logger for a tab that cannot be activated.
   */
  constructor(tabs, logger) {
    this.#tabs = tabs;
    this.#logger = logger;
  }
  /**
   * @param tabId A tab of the workspace to go to.
   */
  async to(tabId) {
    try {
      await this.#tabs.activate(tabId);
    } catch (error) {
      this.#logger.warn("could not switch to the workspace of the moved tab", error);
    }
  }
}
export {
  WorkspaceSwitcher
};
