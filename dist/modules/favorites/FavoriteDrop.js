import { AddressKey } from "../../core/AddressKey.js";
import { BookmarkFolderFinder } from "../../core/bookmarks/BookmarkFolderFinder.js";
import { TabData } from "../../core/TabData.js";
class FavoriteDrop {
  #deps;
  #path;
  /**
   * Makes a tab of the list a Favorite: a bookmark in the Favorites folder with the tab's title and
   * address, and the tab becomes the pinned tab of that Favorite. The folder is created when it
   * is missing. A page that is already in the folder is left as it is.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
    this.#path = BookmarkFolderFinder.parsePath(dependencies.folder);
  }
  /**
   * @param tabId The tab that was released over the grid.
   * @param beforeId The Favorite whose tile is under the pointer, so the new one goes before it; null for the end.
   * @returns What happened.
   */
  async add(tabId, beforeId) {
    try {
      const tab = await this.#deps.tabs.get(tabId);
      const url = FavoriteDrop.#newPage(tab);
      if (url === null) {
        return "ignored";
      }
      const folderId = await this.#deps.writer.ensurePath(this.#path);
      const children = await this.#deps.writer.children(folderId);
      if (children.some((child) => child.url === url)) {
        return "ignored";
      }
      const index = beforeId === null ? -1 : children.findIndex((child) => child.id === beforeId);
      const title = FavoriteDrop.#titleOf(tab, url);
      const bookmark = await this.#deps.writer.create({ parentId: folderId, index: index < 0 ? void 0 : index, title, url });
      await this.#pin(tabId, { id: bookmark.id, title, url });
      return "added";
    } catch (error) {
      this.#deps.logger.warn("could not add the tab to the Favorites", error);
      return "failed";
    }
  }
  static #newPage(tab) {
    const { url } = tab;
    return url !== void 0 && AddressKey.from(url) !== null && TabData.ownOf(tab).favoriteId === void 0 ? url : null;
  }
  static #titleOf(tab, url) {
    return tab.title !== void 0 && tab.title !== "" ? tab.title : url;
  }
  async #pin(tabId, favorite) {
    try {
      await this.#deps.links.link(tabId, favorite, void 0);
      await this.#deps.tabs.update(tabId, { pinned: true });
    } catch (error) {
      await this.#deps.writer.remove(favorite.id).catch(() => void 0);
      throw error;
    }
  }
}
export {
  FavoriteDrop
};
