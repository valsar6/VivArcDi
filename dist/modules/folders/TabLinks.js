import { TabData } from "../../core/TabData.js";
class TabLinks {
  #tabs;
  /**
   * Writes the link between a tab and a bookmark into the tab's `vivExtData`, where it survives a
   * restart. Everything else Vivaldi stored there is kept.
   *
   * @param tabs Tabs API.
   */
  constructor(tabs) {
    this.#tabs = tabs;
  }
  /**
   * Makes a tab the tab of a bookmark.
   *
   * @param tabId The tab.
   * @param bookmarkId The bookmark.
   */
  async link(tabId, bookmarkId) {
    await this.#write(tabId, bookmarkId);
  }
  /**
   * Unlinks every tab whose bookmark is no longer among the given ones, so that it comes back to
   * the tab list.
   *
   * @param bookmarkIds The bookmarks that still exist as links.
   */
  async unlinkExcept(bookmarkIds) {
    for (const tab of await this.#tabs.query({})) {
      const { bookmarkId } = TabData.ownOf(tab);
      if (tab.id !== void 0 && bookmarkId !== void 0 && !bookmarkIds.has(bookmarkId)) {
        await this.#write(tab.id, void 0);
      }
    }
  }
  async #write(tabId, bookmarkId) {
    const fresh = await this.#tabs.get(tabId);
    await this.#tabs.update(tabId, { vivExtData: TabData.withOwn(fresh, { bookmarkId }) });
  }
}
export {
  TabLinks
};
