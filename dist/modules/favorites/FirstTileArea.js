import { TabBarAnchor } from "../../core/dom/TabBarAnchor.js";
import { GRID_ORDER } from "./BookmarkFavorites.js";
const FIRST_TILE_ATTRIBUTE = "data-vivarcdi-first-tile";
const OPEN_ATTRIBUTE = "data-vivarcdi-open";
class FirstTileArea {
  #element;
  #anchor;
  #detach = null;
  /**
   * The place of the first tile: while no tile is shown, a thin invisible strip sits where the grid
   * will appear, above the space header, and a dragged page released on it becomes the first tile.
   * It opens to one tile height while a page is dragged over it.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor({ document, hostSelector, anchor }) {
    this.#element = document.createElement("div");
    this.#element.setAttribute(FIRST_TILE_ATTRIBUTE, "");
    this.#anchor = anchor ?? TabBarAnchor.of(document, hostSelector);
  }
  /**
   * @returns The area when it is in the window, otherwise null.
   */
  get element() {
    return this.#element.parentElement === null ? null : this.#element;
  }
  /**
   * Shows or removes the area.
   *
   * @param visible Whether the tab bar is shown and has no tiles.
   */
  place(visible) {
    if (!visible) {
      this.#element.removeAttribute(OPEN_ATTRIBUTE);
      this.#detach?.();
      this.#detach = null;
      return;
    }
    try {
      this.#detach ??= this.#anchor.add(this.#element, GRID_ORDER);
    } catch {
      this.#detach = null;
    }
  }
  /**
   * Removes the area for good.
   */
  destroy() {
    this.place(false);
  }
}
export {
  FIRST_TILE_ATTRIBUTE,
  FirstTileArea,
  OPEN_ATTRIBUTE
};
