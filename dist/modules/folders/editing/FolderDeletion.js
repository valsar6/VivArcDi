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
      linkIds = this.#deps.linkTabs.linkIds(folder);
      const tabIds = await this.#deps.linkTabs.tabsOf(linkIds);
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
  async #close(tabIds) {
    for (const tabId of tabIds) {
      try {
        await this.#deps.tabs.remove(tabId);
      } catch (error) {
        this.#deps.logger.warn("could not close a tab of the deleted folder", error);
      }
    }
  }
}
export {
  FolderDeletion
};
