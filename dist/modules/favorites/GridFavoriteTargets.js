class GridFavoriteTargets {
  #deps;
  /**
   * The Favorites grid, offered to the other modules as the place where a dragged page becomes a
   * Favorite, before the tile under the pointer or at the end.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   * @returns The place under the point, or null when it is outside the grid.
   */
  at(x, y) {
    return this.#deps.zone.at(x, y);
  }
  /**
   * @param target The place to mark, or null to unmark.
   */
  mark(target) {
    this.#deps.zone.mark(target);
  }
  /**
   * Removes the mark.
   */
  clear() {
    this.#deps.zone.clear();
  }
  /**
   * @param target A place given by `at`.
   * @param page The tab or the title and address to add.
   * @returns Whether a Favorite was added.
   */
  async drop(target, page) {
    const { beforeId } = target;
    const result = "tab" in page ? await this.#addTab(page.tab, beforeId) : await this.#deps.drop.addPage(page, beforeId);
    return result === "added";
  }
  async #addTab(tab, beforeId) {
    return tab.id === void 0 ? "ignored" : this.#deps.drop.add(tab.id, beforeId);
  }
}
export {
  GridFavoriteTargets
};
