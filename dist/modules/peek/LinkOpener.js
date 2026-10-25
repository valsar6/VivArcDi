class LinkOpener {
  #tabs;
  #runtime;
  /**
   * Opens links as real tabs or windows.
   *
   * @param tabs The tabs API.
   * @param runtime Opens windows.
   */
  constructor(tabs, runtime) {
    this.#tabs = tabs;
    this.#runtime = runtime;
  }
  /**
   * Opens a URL in a new active tab right after another tab.
   *
   * @param tabId The tab to follow.
   * @param url Address to open.
   * @returns The id of the new tab.
   */
  async openAfter(tabId, url) {
    const source = await this.#tabs.get(tabId);
    const created = await this.#tabs.create({
      url,
      index: source.index + 1,
      windowId: source.windowId,
      openerTabId: tabId,
      active: true
    });
    if (created.id === void 0) {
      throw new Error("The new tab has no id");
    }
    return created.id;
  }
  /**
   * Opens a link the way Vivaldi would have opened it without VivArcDi.
   *
   * @param request The link and what Vivaldi would have done.
   * @returns Resolves once the link was opened.
   */
  async openAsVivaldi({ url, tabId, disposition }) {
    if (disposition === "new-window") {
      await this.#runtime.openWindow(url);
    } else if (disposition === "new-tab") {
      await this.openAfter(tabId, url);
    } else {
      await this.#tabs.update(tabId, { url });
    }
  }
}
export {
  LinkOpener
};
