import { TabDataWriter } from "../../core/TabDataWriter.js";
import { TabData } from "../../core/TabData.js";
class TabLinks {
  #tabs;
  #writer;
  /**
   * Writes the link between a tab and a bookmark into the tab's `vivExtData`, where it survives a
   * restart. Everything else Vivaldi stored there is kept.
   *
   * @param tabs Tabs API.
   */
  constructor(tabs) {
    this.#tabs = tabs;
    this.#writer = TabDataWriter.of(tabs);
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
   * Makes a tab an ordinary tab again, so that it shows in the tab list.
   *
   * @param tabId The tab.
   */
  async unlink(tabId) {
    await this.#write(tabId, void 0);
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
    await this.#writer.write(tabId, (tab) => TabData.withOwn(tab, { bookmarkId }));
  }
}
export {
  TabLinks
};
