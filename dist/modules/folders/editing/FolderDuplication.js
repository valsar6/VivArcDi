class FolderDuplication {
  #deps;
  /**
   * Duplicates a bookmark folder right below itself, with the same name and the same subfolders
   * and links. The copy is closed and has no tabs. When the copy fails, the original stays as it
   * was and the user is told.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * @param folderId The bookmark id of the folder to duplicate.
   */
  async duplicate(folderId) {
    let name = folderId;
    try {
      const folder = await this.#deps.writer.get(folderId);
      name = folder.title;
      if (folder.parentId === void 0) {
        throw new Error("the folder has no parent");
      }
      const copies = await this.#deps.copier.copy([folderId], folder.parentId, folder.index === void 0 ? void 0 : folder.index + 1);
      if (copies.length === 0) {
        throw new Error("nothing was copied");
      }
    } catch (error) {
      this.#deps.logger.warn("could not duplicate the folder", error);
      this.#deps.notify(`Could not duplicate "${name}"`, "error");
    }
  }
}
export {
  FolderDuplication
};
