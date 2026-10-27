import { OwnPage } from "../../core/OwnPage.js";
import { TabData } from "../../core/TabData.js";
const WEB_URL = /^https?:\/\//i;
class SavedAddresses {
  #tabs;
  /**
   * Keeps the own page of pinned tabs in their `vivExtData`, under VivArcDi's key, so it
   * follows the tab across restarts. Every write reads the tab again and leaves the other keys.
   *
   * @param tabs Tabs API.
   */
  constructor(tabs) {
    this.#tabs = tabs;
  }
  /**
   * @param tab A tab.
   * @returns Whether the tab is pinned, shows a web page and has no own page yet.
   */
  static needsAddress(tab) {
    return tab.pinned && OwnPage.of(tab) === null && WEB_URL.test(tab.url ?? "");
  }
  /**
   * Saves the page a tab shows as its own page.
   *
   * @param tabId The tab.
   * @param url The address to save.
   */
  async save(tabId, url) {
    await this.#rewrite(tabId, { pinnedUrl: url });
  }
  /**
   * Forgets the own page of a tab and its link to a Favorite, so it is an ordinary tab again.
   *
   * @param tabId The tab.
   */
  async forget(tabId) {
    const tab = await this.#tabs.get(tabId);
    const { favoriteId, pinnedUrl } = TabData.ownOf(tab);
    if (favoriteId !== void 0 || pinnedUrl !== void 0) {
      await this.#tabs.update(tabId, { vivExtData: TabData.withOwn(tab, { favoriteId: void 0, pinnedUrl: void 0 }) });
    }
  }
  /**
   * Brings a tab back to its own page when it shows another one.
   *
   * @param tabId The tab.
   */
  async load(tabId) {
    const target = OwnPage.resetTarget(await this.#tabs.get(tabId));
    if (target !== null) {
      await this.#tabs.update(tabId, { url: target });
    }
  }
  async #rewrite(tabId, changes) {
    const tab = await this.#tabs.get(tabId);
    await this.#tabs.update(tabId, { vivExtData: TabData.withOwn(tab, changes) });
  }
}
export {
  SavedAddresses
};
