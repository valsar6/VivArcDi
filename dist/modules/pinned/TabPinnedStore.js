import { TabData } from "../../core/tabs/TabData.js";
import { TabDataWriter } from "../../core/tabs/TabDataWriter.js";
class TabPinnedStore {
  #tabs;
  #writer;
  /**
   * The `Edit Pinned Page` store of a pinned row: the page a pinned tab opens first is kept in its
   * `vivExtData`, under VivArcDi's key, so it follows the tab across restarts.
   *
   * @param tabs Tabs API.
   */
  constructor(tabs) {
    this.#tabs = tabs;
    this.#writer = TabDataWriter.of(tabs);
  }
  /**
   * @param id The tab id, as text.
   * @returns The page the tab opens first, if it has one.
   */
  async read(id) {
    return TabData.ownOf(await this.#tabs.get(Number(id))).pinnedUrl;
  }
  /**
   * @param id The tab id, as text.
   * @param url The page the tab opens first.
   */
  async write(id, url) {
    const tabId = Number(id);
    await this.#writer.write(tabId, (tab) => TabData.withOwn(tab, { pinnedUrl: url }));
  }
  /**
   * @param id The tab id, as text.
   * @returns The open tab, if it is still there.
   */
  async tab(id) {
    return this.#tabs.get(Number(id));
  }
}
export {
  TabPinnedStore
};
