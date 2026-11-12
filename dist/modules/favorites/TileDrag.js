import { TILE_ATTRIBUTE } from "./FavoritesView.js";
const MOVING_ATTRIBUTE = "data-vivarcdi-moving";
class TileDrag {
  #deps;
  /**
   * Where a dragged tile goes. Over the grid its own place closes and a gap opens where it will
   * land, and the release changes the order of the Favorites; elsewhere the tile shows again and
   * `FavoriteRemoval` takes it out of the grid, as before.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * @param favoriteId The Favorite whose tile is dragged.
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  over(favoriteId, x, y) {
    const { zone, removal } = this.#deps;
    const target = zone.at(x, y);
    this.#tile(favoriteId)?.toggleAttribute(MOVING_ATTRIBUTE, target !== null);
    if (target === null) {
      zone.clear();
      removal.over(x, y);
      return;
    }
    removal.clear();
    zone.mark(target);
  }
  /**
   * @param favoriteId The Favorite whose tile was released.
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  async release(favoriteId, x, y) {
    const target = this.#deps.zone.at(x, y);
    if (target === null) {
      await this.#deps.removal.release(favoriteId, x, y);
    } else {
      await this.#deps.reorder.move(favoriteId, target.beforeId);
    }
  }
  /**
   * Removes the gap, the marks and the hiding of the dragged tile.
   */
  clear() {
    this.#deps.zone.clear();
    this.#deps.removal.clear();
    Array.from(this.#deps.grid()?.children ?? []).forEach((tile) => tile.removeAttribute(MOVING_ATTRIBUTE));
  }
  #tile(favoriteId) {
    const tiles = Array.from(this.#deps.grid()?.children ?? []);
    return tiles.find((tile) => tile.getAttribute(TILE_ATTRIBUTE) === favoriteId) ?? null;
  }
}
export {
  MOVING_ATTRIBUTE,
  TileDrag
};
