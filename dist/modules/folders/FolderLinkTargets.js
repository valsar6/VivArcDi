class FolderLinkTargets {
  #deps;
  /**
   * The folders, the gaps between their rows and the space header, offered to the other modules
   * as the places where a dragged page becomes a link of the workspace.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   * @returns The place under the point, or null.
   */
  at(x, y) {
    return this.#deps.targets.at(x, y);
  }
  /**
   * @param target The place to mark, or null to unmark.
   */
  mark(target) {
    this.#deps.targets.mark(target);
  }
  /**
   * Removes the mark.
   */
  clear() {
    this.#deps.targets.clear();
  }
  /**
   * @returns The end of the root of the workspace, which is the place of the space header.
   */
  end() {
    return { kind: "header" };
  }
  /**
   * @param target A place given by `at`.
   * @param page The tab or the title and address to add.
   * @returns Whether a link was added.
   */
  async drop(target, page) {
    const place = this.#deps.place.of(target);
    try {
      const result = "tab" in page ? await this.#deps.favorites.add(page.tab, place) : await this.#deps.favorites.addLink(page, place);
      return result === "added";
    } catch (error) {
      this.#deps.logger.warn("could not add the dragged page", error);
      return false;
    }
  }
}
export {
  FolderLinkTargets
};
