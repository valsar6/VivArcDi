import { TabData } from "../../../core/tabs/TabData.js";
class LinkedTab {
  #tabs;
  /**
   * Finds the open tab of a saved link: the one the link opened, linked to its bookmark.
   *
   * @param tabs The tabs API.
   */
  constructor(tabs) {
    this.#tabs = tabs;
  }
  /**
   * @param linkId The bookmark id of the link.
   * @returns Its tab in the current window that shares the workspace of the active tab, the most
   * recently accessed first; undefined when the link has none.
   */
  async of(linkId) {
    const tabs = await this.#tabs.query({ currentWindow: true });
    const active = tabs.find((tab) => tab.active);
    const candidates = tabs.filter((tab) => TabData.ownOf(tab).bookmarkId === linkId && (active === void 0 || TabData.shares(tab, active)));
    return candidates.sort((first, second) => (second.lastAccessed ?? 0) - (first.lastAccessed ?? 0))[0];
  }
}
export {
  LinkedTab
};
