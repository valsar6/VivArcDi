import { TabData } from "../../../core/TabData.js";
class FolderLinkTabs {
  #tabs;
  /**
   * Finds the links of a folder and the tabs open on them, in every window.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor({ tabs }) {
    this.#tabs = tabs;
  }
  /**
   * @param folder A folder read with all its levels, or a link.
   * @returns The ids of its links, at any depth, in order.
   */
  linkIds(folder) {
    const own = folder.url !== void 0 ? [folder.id] : [];
    return [...own, ...(folder.children ?? []).flatMap((child) => this.linkIds(child))];
  }
  /**
   * @param linkIds Bookmark ids of links.
   * @returns The ids of the tabs linked to them.
   */
  async tabsOf(linkIds) {
    const wanted = new Set(linkIds);
    return (await this.#tabs.query({})).flatMap((tab) => {
      const { bookmarkId } = TabData.ownOf(tab);
      return tab.id !== void 0 && bookmarkId !== void 0 && wanted.has(bookmarkId) ? [tab.id] : [];
    });
  }
}
export {
  FolderLinkTabs
};
