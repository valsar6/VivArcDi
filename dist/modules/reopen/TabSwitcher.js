import { UnloadedTabs } from "../favorites/UnloadedTabs.js";
class TabSwitcher {
  #tabs;
  #logger;
  /**
   * Replaces a duplicate new tab with the pinned tab it duplicates.
   *
   * @param tabs Tabs API.
   * @param logger Logger for failures.
   */
  constructor(tabs, logger) {
    this.#tabs = tabs;
    this.#logger = logger;
  }
  /**
   * Activates the pinned tab, loads it again if it is still unloaded, then closes the new tab.
   * When the pinned tab cannot be activated, the new tab stays open as in plain Vivaldi.
   *
   * @param pinnedTabId The tab to bring forward.
   * @param newTabId The duplicate tab to close.
   * @returns Whether the switch happened.
   */
  async switch(pinnedTabId, newTabId) {
    let activated;
    try {
      activated = await this.#tabs.activate(pinnedTabId);
    } catch (error) {
      this.#logger.warn("could not switch to the pinned tab; the new tab stays open", error);
      return false;
    }
    if (UnloadedTabs.isUnloaded(activated)) {
      await this.#attempt("reload the pinned tab", () => this.#tabs.reload(pinnedTabId));
    }
    await this.#attempt("close the new tab", () => this.#tabs.remove(newTabId));
    return true;
  }
  async #attempt(action, run) {
    try {
      await run();
    } catch (error) {
      this.#logger.warn(`could not ${action}`, error);
    }
  }
}
export {
  TabSwitcher
};
