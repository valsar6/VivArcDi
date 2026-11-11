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
    return this.#attempt(async () => {
      const tab = await this.#deps.tabs.get(tabId);
      const url = FavoriteDrop.#newPage(tab);
      const bookmark = url === null ? null : await this.#create({ title: FavoriteDrop.#titleOf(tab.title, url), url }, beforeId);
      if (bookmark === null) {
        return "ignored";
      }
      await this.#pin(tabId, bookmark);
      return "added";
    });
  }
  /**
   * Adds a Favorite for a page that no tab stands for, so it is a tile that opens the page when
   * clicked.
   *
   * @param page The title and the address.
   * @param beforeId The Favorite whose tile is under the pointer, so the new one goes before it; null for the end.
   * @returns What happened; `ignored` for an address that is not `http` or `https` or is already a Favorite.
   */
  async addPage({ title, url }, beforeId) {
    if (AddressKey.from(url) === null) {
      return "ignored";
    }
    return this.#attempt(async () => await this.#create({ title: FavoriteDrop.#titleOf(title, url), url }, beforeId) === null ? "ignored" : "added");
  }
  static #newPage(tab) {
    const { url } = tab;
    return url !== void 0 && AddressKey.from(url) !== null && TabData.ownOf(tab).favoriteId === void 0 ? url : null;
  }
  static #titleOf(title, url) {
    return title !== void 0 && title !== "" ? title : url;
  }
  async #attempt(run) {
    try {
      return await run();
    } catch (error) {
      this.#deps.logger.warn("could not add the page to the Favorites", error);
      return "failed";
    }
  }
  async #create(page, beforeId) {
    const folderId = await this.#deps.writer.ensurePath(this.#path);
    const children = await this.#deps.writer.children(folderId);
    if (children.some((child) => child.url === page.url)) {
      return null;
    }
    const index = beforeId === null ? -1 : children.findIndex((child) => child.id === beforeId);
    const bookmark = await this.#deps.writer.create({ parentId: folderId, index: index < 0 ? void 0 : index, ...page });
    return { id: bookmark.id, ...page };
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
