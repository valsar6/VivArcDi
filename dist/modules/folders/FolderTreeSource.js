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
  #warnedMissing = false;
  #unsubscribe = null;
  /**
   * Keeps the tree of the root folder up to date: it is read at the start and again, once per
   * frame, after any change among the bookmarks.
   *
   * @param bookmarks Bookmarks API.
   * @param settings The root folder, the depth, and what to call and log.
   */
  constructor(bookmarks, { path, maxDepth, onChange, logger, timing = {} }) {
    this.#bookmarks = bookmarks;
    this.#path = path;
    this.#maxDepth = maxDepth;
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
   * Reads the tree and starts following the bookmarks. Throws when a bookmark event is missing.
   */
  async start() {
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
   * Reads the tree again.
   */
  async rebuild() {
    const generation = ++this.#generation;
    try {
      const root = BookmarkFolderFinder.find(await this.#bookmarks.getTree(), this.#path);
      if (generation !== this.#generation) {
        return;
      }
      if (root === null) {
        this.#warnMissing();
      }
      this.#entries = root === null ? [] : FolderTree.build(root.children ?? [], this.#maxDepth);
      this.#onChange();
    } catch (error) {
      this.#logger.warn("could not read the bookmarks", error);
    }
  }
  #warnMissing() {
    if (!this.#warnedMissing) {
      this.#warnedMissing = true;
      this.#logger.warn(`no bookmark folder matches "${this.#path.join("/")}": the section stays empty`);
    }
  }
}
export {
  FolderTreeSource
};
