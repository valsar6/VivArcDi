class FavoriteReorder {
  #deps;
  /**
   * Changes the order of the tiles by moving their bookmarks inside the Favorites folder, which is
   * the order of the grid in every workspace and on every device that syncs. A tile released at
   * its own place writes nothing.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * @param favoriteId The Favorite whose tile was released over the grid.
   * @param beforeId The Favorite it goes before, or null for the end of the grid.
   */
  async move(favoriteId, beforeId) {
    try {
      const { parentId } = await this.#deps.writer.get(favoriteId);
      if (parentId === void 0) {
        return;
      }
      const ids = (await this.#deps.writer.children(parentId)).map((child) => child.id);
      const index = beforeId === null ? ids.length : ids.indexOf(beforeId);
      const own = ids.indexOf(favoriteId);
      if (index < 0 || index === own || index === own + 1) {
        return;
      }
      await this.#deps.writer.move(favoriteId, { parentId, index });
    } catch (error) {
      this.#deps.logger.warn("could not move the Favorite in the grid", error);
    }
  }
}
export {
  FavoriteReorder
};
