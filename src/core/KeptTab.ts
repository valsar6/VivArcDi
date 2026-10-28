import { TabData } from './TabData.js';

export class KeptTab {
  /**
   * Tells whether a tab is kept apart from today's tabs: pinned, a Favorite, or the tab of a
   * bookmark link. Such tabs are never archived and get Peek's policy for pinned tabs.
   *
   * @param tab A tab.
   * @returns Whether the tab is pinned or linked to a Favorite or to a bookmark.
   */
  public static is(tab: chrome.tabs.Tab): boolean {
    const { favoriteId, bookmarkId } = TabData.ownOf(tab);
    return tab.pinned === true || favoriteId !== undefined || bookmarkId !== undefined;
  }
}
