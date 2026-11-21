class LinkDuplication {
  #deps;
  /**
   * Duplicates a saved link right below itself, with the same title and address. The copy has no
   * tab. When the copy fails, the original stays as it was and the user is told.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * @param linkId The bookmark id of the link to duplicate.
   */
  async duplicate(linkId) {
    let title = linkId;
    try {
      const link = await this.#deps.writer.get(linkId);
      title = link.title;
      if (link.parentId === void 0) {
        throw new Error("the link has no parent");
      }
      const [copyId] = await this.#deps.copier.copy([linkId], link.parentId, link.index === void 0 ? void 0 : link.index + 1);
      if (copyId === void 0) {
        throw new Error("nothing was copied");
      }
      await this.#deps.extras.copy(linkId, copyId);
    } catch (error) {
      this.#deps.logger.warn("could not duplicate the link", error);
      this.#deps.notify(`Could not duplicate "${title}"`, "error");
    }
  }
}
export {
  LinkDuplication
};
