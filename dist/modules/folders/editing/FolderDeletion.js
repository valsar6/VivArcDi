import { TabData } from "../../../core/TabData.js";
class FolderDeletion {
  #deps;
  /**
   * Deletes a bookmark folder the way Arc does, but recoverably: the folder moves into Vivaldi's
   * bookmark Trash with everything in it, and only then the tabs of its links close. If the Trash
   * is missing or the move fails, nothing is closed, the user is told, and the folder is never
   * erased instead.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * @param folderId The bookmark id of the folder to delete.
   */
  async delete(folderId) {
    const { closing, notify } = this.#deps;
    let name = folderId;
    let linkIds = [];
    try {
      const folder = await this.#deps.writer.subTree(folderId);
      name = folder.title;
      linkIds = FolderDeletion.#linkIds(folder);
      const tabIds = await this.#tabsOf(linkIds);
      closing.add(linkIds);
      await this.#moveToTrash(folderId);
      this.#deps.openFolders.forget(folderId);
      await this.#close(tabIds);
      notify(`Folder "${name}" moved to Trash`);
    } catch (error) {
      this.#deps.logger.warn("could not delete the folder", error);
      this.#deps.redraw();
      notify(`Could not delete "${name}"`, "error");
    } finally {
      closing.clear(linkIds);
    }
  }
  async #moveToTrash(folderId) {
    const trashId = await this.#deps.trash.id();
    if (trashId === null) {
      throw new Error("the bookmark Trash was not found");
    }
    await this.#deps.writer.move(folderId, { parentId: trashId });
  }
  async #tabsOf(linkIds) {
    const wanted = new Set(linkIds);
    return (await this.#deps.tabs.query({})).flatMap((tab) => {
      const { bookmarkId } = TabData.ownOf(tab);
      return tab.id !== void 0 && bookmarkId !== void 0 && wanted.has(bookmarkId) ? [tab.id] : [];
    });
  }
  async #close(tabIds) {
    for (const tabId of tabIds) {
      try {
        await this.#deps.tabs.remove(tabId);
      } catch (error) {
        this.#deps.logger.warn("could not close a tab of the deleted folder", error);
      }
    }
  }
  static #linkIds(node) {
    const own = node.url !== void 0 ? [node.id] : [];
    return [...own, ...(node.children ?? []).flatMap((child) => FolderDeletion.#linkIds(child))];
  }
}
export {
  FolderDeletion
};
