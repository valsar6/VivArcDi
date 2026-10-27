import { TabData } from "../../core/TabData.js";
class LinkedTabs {
  #tabs;
  /**
   * Knows which tabs are linked to which Favorite. The link is the bookmark id that
   * VivArcDi writes into the tab's `vivExtData`, so it survives restarts.
   *
   * @param tabs Tabs API.
   */
  constructor(tabs) {
    this.#tabs = tabs;
  }
  /**
   * @returns The links of the current window, as seen from its active tab's workspace.
   */
  async snapshot() {
    const tabs = await this.#tabs.query({ currentWindow: true });
    const activeTab = tabs.find((tab) => tab.active) ?? null;
    const workspace = activeTab === null ? null : TabData.of(activeTab);
    const linked = /* @__PURE__ */ new Map();
    const linkedTabIds = /* @__PURE__ */ new Set();
    for (const tab of tabs) {
      const favoriteId = LinkedTabs.#favoriteIdOf(tab);
      if (favoriteId === void 0) {
        continue;
      }
      linkedTabIds.add(tab.id);
      if (TabData.of(tab) === workspace && LinkedTabs.#preferred(tab, linked.get(favoriteId))) {
        linked.set(favoriteId, tab);
      }
    }
    return { activeTab, workspaceId: LinkedTabs.#rawWorkspaceOf(activeTab), linked, linkedTabIds };
  }
  static #favoriteIdOf(tab) {
    return tab.id === void 0 ? void 0 : TabData.ownOf(tab).favoriteId;
  }
  static #rawWorkspaceOf(tab) {
    return tab === null ? void 0 : TabData.extDataOf(tab)["workspaceId"];
  }
  /**
   * Links a tab to a Favorite and gives it the Favorite's address as its own page.
   *
   * @param tabId The tab.
   * @param favorite The Favorite.
   * @param workspaceId Raw workspace id to give the tab, or undefined to leave it.
   */
  async link(tabId, favorite, workspaceId) {
    const tab = await this.#tabs.get(tabId);
    const extra = workspaceId === void 0 ? {} : { workspaceId };
    await this.#tabs.update(tabId, {
      vivExtData: TabData.withOwn(tab, { favoriteId: favorite.id, pinnedUrl: favorite.url }, extra)
    });
  }
  /**
   * Follows a change of the Favorites folder: tabs of removed Favorites are unlinked and show
   * again as pinned tabs, and tabs of a Favorite whose address changed take the new address
   * as their own page.
   *
   * @param favorites The Favorites now in the folder.
   */
  async sync(favorites) {
    const byId = new Map(favorites.map((favorite) => [favorite.id, favorite]));
    const tabs = await this.#tabs.query({});
    for (const tab of tabs) {
      const { favoriteId, pinnedUrl } = TabData.ownOf(tab);
      if (favoriteId === void 0 || tab.id === void 0) {
        continue;
      }
      const favorite = byId.get(favoriteId);
      if (favorite === void 0) {
        await this.#rewrite(tab.id, { favoriteId: void 0 });
      } else if (favorite.url !== pinnedUrl) {
        await this.#rewrite(tab.id, { pinnedUrl: favorite.url });
      }
    }
  }
  async #rewrite(tabId, changes) {
    const fresh = await this.#tabs.get(tabId);
    await this.#tabs.update(tabId, { vivExtData: TabData.withOwn(fresh, changes) });
  }
  static #preferred(candidate, current) {
    return current === void 0 || candidate.active || (candidate.lastAccessed ?? 0) > (current.lastAccessed ?? 0);
  }
}
export {
  LinkedTabs
};
