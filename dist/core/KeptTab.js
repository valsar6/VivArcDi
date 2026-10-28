import { TabData } from "./TabData.js";
class KeptTab {
  /**
   * Tells whether a tab is kept apart from today's tabs: pinned, a Favorite, or the tab of a
   * bookmark link. Such tabs are never archived and get Peek's policy for pinned tabs.
   *
   * @param tab A tab.
   * @returns Whether the tab is pinned or linked to a Favorite or to a bookmark.
   */
  static is(tab) {
    const { favoriteId, bookmarkId } = TabData.ownOf(tab);
    return tab.pinned === true || favoriteId !== void 0 || bookmarkId !== void 0;
  }
}
export {
  KeptTab
};
