class TileTab {
  #links;
  /**
   * Finds the open tab of a tile: the tab linked to its bookmark in the active workspace.
   *
   * @param links Knows which tabs are linked to which Favorite.
   */
  constructor(links) {
    this.#links = links;
  }
  /**
   * @param linkId The bookmark id of the tile.
   * @returns Its tab in the active workspace, or undefined when it has none.
   */
  async of(linkId) {
    return (await this.#links.snapshot()).linked.get(linkId);
  }
}
export {
  TileTab
};
