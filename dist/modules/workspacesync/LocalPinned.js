import { OwnPage } from "../../core/OwnPage.js";
import { TabData } from "../../core/TabData.js";
class LocalPinned {
  #tabs;
  #names;
  #logger;
  #warned = false;
  /**
   * Reads the pinned tabs of a window as entries of the sync store, grouped by workspace name.
   * Tabs that stand for a Favorite are left out, because the Favorites folder syncs them, and so
   * are tabs without a web address or in a workspace this computer cannot name.
   *
   * @param tabs Tabs API.
   * @param names The names of the workspaces.
   * @param logger Logger for tabs that cannot be synced.
   */
  constructor(tabs, names, logger) {
    this.#tabs = tabs;
    this.#names = names;
    this.#logger = logger;
  }
  /**
   * @param tabs The tabs of one workspace.
   * @returns The first tab of each own page, in the same order.
   */
  static distinct(tabs) {
    const seen = /* @__PURE__ */ new Set();
    return tabs.filter(({ entry }) => !seen.has(entry.key) && seen.add(entry.key));
  }
  /**
   * @param windowId The window to read.
   * @returns Its pinned tabs by workspace name, with null for the area outside any workspace, each list in tab order.
   */
  async read(windowId) {
    const pinned = await this.#tabs.query({ pinned: true, windowId });
    const groups = /* @__PURE__ */ new Map();
    for (const tab of [...pinned].sort((left, right) => left.index - right.index)) {
      const workspaceId = TabData.of(tab);
      const name = this.#names.nameOf(workspaceId);
      const local = workspaceId !== null && name === null ? null : this.#local(tab);
      if (local !== null) {
        groups.set(name, [...groups.get(name) ?? [], local]);
      }
    }
    return groups;
  }
  #local(tab) {
    const url = OwnPage.of(tab) ?? tab.url ?? tab.pendingUrl;
    const key = OwnPage.keyOf(tab);
    if (tab.id === void 0 || TabData.ownOf(tab).favoriteId !== void 0) {
      return null;
    }
    if (key === null || url === void 0) {
      this.#warnOnce();
      return null;
    }
    return { tabId: tab.id, index: tab.index, active: tab.active, away: OwnPage.isAway(tab), entry: { key, title: tab.title ?? url, url } };
  }
  #warnOnce() {
    if (!this.#warned) {
      this.#warned = true;
      this.#logger.warn("a pinned tab without a web address is not synced");
    }
  }
}
export {
  LocalPinned
};
