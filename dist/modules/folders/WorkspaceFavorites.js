import { AddressKey } from "../../core/AddressKey.js";
import { KeptTab } from "../../core/KeptTab.js";
import { TabData } from "../../core/TabData.js";
const NEW_FOLDER_TITLE = "Untitled";
class WorkspaceFavorites {
  #deps;
  /**
   * Everything that writes to the workspace favorites, the folders section of the tab bar: it adds a
   * tab as a link of the workspace's root, takes it back, and makes a new folder. A write that fails
   * is logged and leaves the bookmarks and the tab as they were; the section only follows the
   * bookmark events that the writes cause.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * Makes a tab a link of the root of the active workspace: a bookmark with the title and the
   * address of the tab, and the tab becomes the tab of that bookmark. The base and workspace
   * folders are created when they do not exist. A web page that is pinned, a Favorite, already a
   * link, or not `http` or `https` is ignored.
   *
   * @param tab The tab.
   * @param place A folder and a position; by default the end of the root.
   * @returns What happened.
   */
  async add(tab, { parentId, index } = {}) {
    const { id, url } = tab;
    if (id === void 0 || url === void 0 || !WorkspaceFavorites.#canBecomeLink(tab)) {
      return "ignored";
    }
    try {
      const folderId = parentId ?? await this.#rootId();
      if (folderId === null) {
        return "ignored";
      }
      const bookmark = await this.#deps.writer.create({ parentId: folderId, index, title: WorkspaceFavorites.#titleOf(tab), url });
      await this.#link(id, bookmark.id);
      return "added";
    } catch (error) {
      this.#deps.logger.warn("could not add the tab to the workspace favorites", error);
      return "failed";
    }
  }
  /**
   * Creates a folder named `Untitled` at the end of the root of the active workspace, creating the
   * base and workspace folders first when they do not exist.
   *
   * @returns The id of the new folder, or null when nothing was created.
   */
  async addFolder() {
    try {
      const parentId = await this.#rootId();
      return parentId === null ? null : (await this.#deps.writer.create({ parentId, title: NEW_FOLDER_TITLE })).id;
    } catch (error) {
      this.#deps.logger.warn("could not create the folder", error);
      return null;
    }
  }
  /**
   * Takes a tab back to the list of open tabs. The bookmark is removed only when VivArcDi created
   * it; any other bookmark keeps its link and its tab.
   *
   * @param tab The tab that may be the tab of a link.
   * @returns What happened.
   */
  async take(tab) {
    const { bookmarkId } = TabData.ownOf(tab);
    if (tab.id === void 0 || bookmarkId === void 0) {
      return "none";
    }
    if (!this.#deps.created.has(bookmarkId)) {
      return "kept";
    }
    try {
      await this.#deps.links.unlink(tab.id);
      await this.#deps.writer.remove(bookmarkId);
      this.#deps.created.remove(bookmarkId);
      return "taken";
    } catch (error) {
      this.#deps.logger.warn("could not take the tab back from the workspace favorites", error);
      return "failed";
    }
  }
  async #rootId() {
    const path = this.#deps.root();
    return path.length === 0 ? null : this.#deps.writer.ensurePath(path);
  }
  async #link(tabId, bookmarkId) {
    this.#deps.created.add(bookmarkId);
    try {
      await this.#deps.links.link(tabId, bookmarkId);
    } catch (error) {
      this.#deps.created.remove(bookmarkId);
      await this.#deps.writer.remove(bookmarkId).catch(() => void 0);
      throw error;
    }
  }
  static #canBecomeLink(tab) {
    return AddressKey.from(tab.url) !== null && !KeptTab.is(tab);
  }
  static #titleOf(tab) {
    return tab.title !== void 0 && tab.title !== "" ? tab.title : tab.url ?? "";
  }
}
export {
  NEW_FOLDER_TITLE,
  WorkspaceFavorites
};
