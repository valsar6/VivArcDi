import { AddressKey } from "../../core/AddressKey.js";
import { OwnPage } from "../../core/OwnPage.js";
import { TabData } from "../../core/TabData.js";
class PinnedTabFinder {
  #tabs;
  /**
   * Finds the Favorite or pinned tab that a new tab duplicates.
   *
   * @param tabs Tabs API.
   */
  constructor(tabs) {
    this.#tabs = tabs;
  }
  /**
   * @param newTab The tab the user just opened.
   * @param url The address it navigates to.
   * @returns The pinned tab of the same window and workspace whose own page or current page has
   *   the same address key, the most recently opened one when several match, or null.
   */
  async find(newTab, url) {
    const key = AddressKey.from(url);
    if (key === null) {
      return null;
    }
    const pinned = await this.#tabs.query({ pinned: true, windowId: newTab.windowId });
    const matches = pinned.filter(
      (tab) => tab.id !== newTab.id && TabData.shares(tab, newTab) && PinnedTabFinder.#keysOf(tab).includes(key)
    );
    return matches.sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0] ?? null;
  }
  static #keysOf(tab) {
    return [OwnPage.keyOf(tab), AddressKey.from(tab.url ?? tab.pendingUrl)];
  }
}
export {
  PinnedTabFinder
};
