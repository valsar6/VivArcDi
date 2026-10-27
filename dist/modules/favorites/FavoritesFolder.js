import { BookmarkFolderFinder } from "../../core/bookmarks/BookmarkFolderFinder.js";
const WEB_URL = /^https?:\/\//i;
class FavoritesFolder {
  #bookmarks;
  #path;
  #listener;
  #unsubscribe = null;
  /**
   * Follows the bookmark folder that holds the Favorites and reports its links
   * every time the bookmarks change.
   *
   * @param bookmarks Read-only bookmarks API.
   * @param path Path of the folder, titles separated by `/`.
   * @param listener Called with the Favorites, or with null while the folder is missing.
   */
  constructor(bookmarks, path, listener) {
    this.#bookmarks = bookmarks;
    this.#path = path;
    this.#listener = listener;
  }
  /**
   * Keeps the web links of a folder, in order. Subfolders, separators and links that are
   * not web pages are skipped.
   *
   * @param folder A bookmark folder.
   * @returns Its Favorites.
   */
  static linksOf(folder) {
    return (folder.children ?? []).filter((node) => node.url !== void 0 && WEB_URL.test(node.url)).map(({ id, title, url }) => ({ id, title, url }));
  }
  /**
   * Reads the folder once and starts following the bookmarks.
   */
  async start() {
    this.#unsubscribe = this.#bookmarks.onChange(() => void this.#read());
    await this.#read();
  }
  /**
   * Stops following the bookmarks.
   */
  stop() {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }
  async #read() {
    const folder = BookmarkFolderFinder.find(await this.#bookmarks.getTree(), BookmarkFolderFinder.parsePath(this.#path));
    this.#listener(folder === null ? null : FavoritesFolder.linksOf(folder));
  }
}
export {
  FavoritesFolder
};
