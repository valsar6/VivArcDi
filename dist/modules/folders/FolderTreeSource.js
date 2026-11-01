import { BookmarkFolderFinder } from "../../core/bookmarks/BookmarkFolderFinder.js";
import { FrameTask } from "../../core/FrameTask.js";
import { FolderTree } from "./FolderTree.js";
class FolderTreeSource {
  #bookmarks;
  #path;
  #maxDepth;
  #onChange;
  #logger;
  #task;
  #entries = [];
  #generation = 0;
  #found = false;
  #otherPaths;
  #optionalPaths;
  #childIds = [];
  #linkIds = null;
  #started = false;
  #warned = /* @__PURE__ */ new Set();
  #unsubscribe = null;
  /**
   * Keeps the tree of the root folder up to date: it is read at the start and again, once per
   * frame, after any change among the bookmarks.
   *
   * @param bookmarks Bookmarks API.
   * @param settings The root folder, the depth, and what to call and log.
   */
  constructor(bookmarks, { path, maxDepth, otherPaths = [], optionalPaths = () => [], onChange, logger, timing = {} }) {
    this.#bookmarks = bookmarks;
    this.#path = path;
    this.#maxDepth = maxDepth;
    this.#otherPaths = otherPaths;
    this.#optionalPaths = optionalPaths;
    this.#onChange = onChange;
    this.#logger = logger;
    this.#task = new FrameTask(() => void this.rebuild(), timing);
  }
  /**
   * @returns The folders and links to show; empty while the root is missing.
   */
  get entries() {
    return this.#entries;
  }
  /**
   * @returns Whether the root folder was found the last time the bookmarks were read.
   */
  get found() {
    return this.#found;
  }
  /**
   * @returns The ids of every child of the root folder, in Vivaldi's order, including those the
   *   section does not show; a bookmark is added at the index of one of them.
   */
  get childIds() {
    return this.#childIds;
  }
  /**
   * @returns The ids of the links under the current root and every other root, or null while any of
   *   those roots is missing or there is none; a tab linked to another id belongs to a removed bookmark.
   */
  get linkIds() {
    return this.#linkIds;
  }
  /**
   * Reads the tree and starts following the bookmarks. Throws when a bookmark event is missing.
   */
  async start() {
    this.#started = true;
    this.#unsubscribe = this.#bookmarks.onChange(() => this.#task.request());
    await this.rebuild();
  }
  /**
   * Stops following the bookmarks.
   */
  stop() {
    this.#task.cancel();
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#generation += 1;
  }
  /**
   * Switches to another root folder and reads the tree. Before `start` it only remembers the path.
   *
   * @param path Titles of the new root folder; empty for no folders.
   */
  async useRoot(path) {
    this.#path = path;
    if (this.#started) {
      await this.rebuild();
    }
  }
  /**
   * Reads the tree again.
   */
  async rebuild() {
    const generation = ++this.#generation;
    try {
      const tree = await this.#bookmarks.getTree();
      if (generation !== this.#generation) {
        return;
      }
      this.#read(BookmarkFolderFinder.find(tree, this.#path));
      this.#linkIds = this.#idsOfAllRoots(tree);
      this.#onChange();
    } catch (error) {
      this.#logger.warn("could not read the bookmarks", error);
    }
  }
  #read(root) {
    if (root === null) {
      this.#warnMissing();
    }
    this.#found = root !== null;
    this.#childIds = root?.children?.map((child) => child.id) ?? [];
    this.#entries = root === null ? [] : FolderTree.build(root.children ?? [], this.#maxDepth);
  }
  #idsOfAllRoots(tree) {
    const required = FolderTreeSource.#filled([this.#path, ...this.#otherPaths]);
    const roots = required.map((path) => BookmarkFolderFinder.find(tree, path));
    if (roots.length === 0 || roots.includes(null)) {
      return null;
    }
    const known = new Set(required.map((path) => path.join("/")));
    const optional = FolderTreeSource.#filled(this.#optionalPaths()).filter((path) => !known.has(path.join("/")));
    const found = [...roots, ...optional.map((path) => BookmarkFolderFinder.find(tree, path))];
    const links = found.flatMap((root) => root === null ? [] : FolderTree.links(FolderTree.build(root.children ?? [], this.#maxDepth)));
    return new Set(links.map((entry) => entry.id));
  }
  static #filled(paths) {
    return paths.filter((path) => path.length > 0);
  }
  #warnMissing() {
    const name = this.#path.join("/");
    if (this.#path.length > 0 && !this.#warned.has(name)) {
      this.#warned.add(name);
      this.#logger.warn(`no bookmark folder matches "${name}": the section stays empty`);
    }
  }
}
export {
  FolderTreeSource
};
