class TabUnloader {
  #tabs;
  /**
   * Unloads a tab instead of closing it: the tab stays in the tab bar, and a click loads it again.
   *
   * @param tabs Tabs API.
   */
  constructor(tabs) {
    this.#tabs = tabs;
  }
  /**
   * Chooses the tab to show when the active tab is unloaded: the most recently used
   * other tab, preferring loaded ones, then the nearest by position.
   *
   * @param windowTabs Every tab of the window.
   * @param leaving The tab being unloaded.
   * @returns The tab to activate, or null when there is no other tab.
   */
  static successorOf(windowTabs, leaving) {
    const ranked = windowTabs.filter(({ id }) => id !== leaving.id).sort(
      (a, b) => Number(a.discarded === true) - Number(b.discarded === true) || (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0) || Math.abs(a.index - leaving.index) - Math.abs(b.index - leaving.index)
    );
    return ranked[0] ?? null;
  }
  /**
   * Unloads a tab. An active tab first hands focus to its successor,
   * because Chromium cannot unload the tab on screen.
   *
   * @param tabId The tab to unload.
   * @returns False when the tab is the only one in its window.
   */
  async unload(tabId) {
    const tab = await this.#tabs.get(tabId);
    if (tab.active) {
      const successor = TabUnloader.successorOf(await this.#tabs.query({ windowId: tab.windowId }), tab);
      if (successor?.id === void 0) {
        return false;
      }
      await this.#tabs.activate(successor.id);
    }
    if (!tab.discarded) {
      await this.#tabs.discard(tabId);
    }
    return true;
  }
}
export {
  TabUnloader
};
