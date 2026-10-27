import { AddressKey } from "../AddressKey.js";
import { BookmarkFolderFinder } from "./BookmarkFolderFinder.js";
class LinkKeyIndex {
  static #instances = /* @__PURE__ */ new WeakMap();
  #bookmarks;
  #path;
  #logger;
  #keys = /* @__PURE__ */ new Set();
  #users = 0;
  #unsubscribe = null;
  #generation = 0;
  /**
   * The address keys of the links under one bookmark folder. Use `acquire`, so that the modules
   * which ask for the same folder share one index.
   *
   * @param bookmarks Bookmarks API.
   * @param path Titles of the root folder.
   * @param logger Logger for failures.
   */
  constructor(bookmarks, path, logger) {
    this.#bookmarks = bookmarks;
    this.#path = path;
    this.#logger = logger;
  }
  /**
   * Gets the index of a root folder, creating and starting it for the first user.
   * Every call must be paired with `release`.
   *
   * @param bookmarks Bookmarks API.
   * @param path Titles of the root folder.
   * @param logger Logger for failures.
   * @returns The shared index.
   */
  static acquire(bookmarks, path, logger) {
    const byPath = LinkKeyIndex.#instances.get(bookmarks) ?? /* @__PURE__ */ new Map();
    LinkKeyIndex.#instances.set(bookmarks, byPath);
    const name = path.join("/");
    const index = byPath.get(name) ?? new LinkKeyIndex(bookmarks, path, logger);
    byPath.set(name, index);
    index.#users += 1;
    if (index.#users === 1) {
      index.#start();
    }
    return index;
  }
  /**
   * Gives the index back; the last user stops it.
   */
  release() {
    this.#users -= 1;
    if (this.#users === 0) {
      this.#unsubscribe?.();
      this.#unsubscribe = null;
      this.#generation += 1;
      LinkKeyIndex.#instances.get(this.#bookmarks)?.delete(this.#path.join("/"));
    }
  }
  /**
   * @param key An address key.
   * @returns Whether a link under the root has that key.
   */
  has(key) {
    return this.#keys.has(key);
  }
  #start() {
    try {
      this.#unsubscribe = this.#bookmarks.onChange(() => void this.#load());
    } catch (error) {
      this.#logger.warn("bookmark events are missing: links are read once", error);
    }
    void this.#load();
  }
  async #load() {
    const generation = ++this.#generation;
    try {
      const tree = await this.#bookmarks.getTree();
      if (generation === this.#generation) {
        const root = BookmarkFolderFinder.find(tree, this.#path);
        this.#keys = new Set(root === null ? [] : LinkKeyIndex.#keysOf(root));
      }
    } catch (error) {
      this.#logger.warn("could not read the bookmarks", error);
    }
  }
  static #keysOf(node) {
    const own = node.url === void 0 ? null : AddressKey.from(node.url);
    return [...own === null ? [] : [own], ...(node.children ?? []).flatMap((child) => LinkKeyIndex.#keysOf(child))];
  }
}
export {
  LinkKeyIndex
};
