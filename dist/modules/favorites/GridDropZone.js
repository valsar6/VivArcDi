import { TILE_ATTRIBUTE } from "./FavoritesView.js";
const GAP_ATTRIBUTE = "data-vivarcdi-drop-gap";
const TAB_ENTRIES_TYPE = "vivaldi/x-tab-entries";
class GridDropZone {
  #deps;
  #gap = null;
  #onDragOver = (event) => this.#over(event);
  #onDrop = (event) => this.#drop(event);
  #onLeave = () => this.clearGap();
  #dropped = null;
  /**
   * The grid of the Favorites as a place to drop a tab: it tells what is under a point, shows the
   * gap where the new tile will go, and takes the HTML5 `dragover` and `drop` that carry
   * `vivaldi/x-tab-entries` for the cases when Vivaldi does send them.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   * @returns The place under the point, or null when the point is outside the grid.
   */
  at(x, y) {
    if (GridDropZone.#inside(this.#deps.below(), x, y)) {
      return { beforeId: null };
    }
    const grid = this.#deps.grid();
    if (grid === null || !GridDropZone.#inside(grid, x, y)) {
      return null;
    }
    const tile = GridDropZone.#tiles(grid).find((candidate) => GridDropZone.#reaches(candidate, x, y));
    return { beforeId: tile?.getAttribute(TILE_ATTRIBUTE) ?? null };
  }
  /**
   * Shows the gap where a tab will land, or removes it.
   *
   * @param target The place, or null to remove the gap.
   */
  showGap(target) {
    const grid = this.#deps.grid();
    if (target === null || grid === null) {
      this.clearGap();
      return;
    }
    const before = GridDropZone.#tiles(grid).find((tile) => target.beforeId !== null && tile.getAttribute(TILE_ATTRIBUTE) === target.beforeId) ?? null;
    this.#place(this.#gap ?? this.#createGap(), grid, before);
  }
  /**
   * Removes the gap.
   */
  clearGap() {
    this.#gap?.remove();
  }
  /**
   * Starts taking the HTML5 drags of tabs over the grid.
   *
   * @param dropped Called when a tab is dropped over the grid, with the place.
   */
  listen(dropped) {
    this.#dropped = dropped;
    const { document } = this.#deps;
    document.addEventListener("dragover", this.#onDragOver, true);
    document.addEventListener("drop", this.#onDrop, true);
    document.addEventListener("dragleave", this.#onLeave, true);
    document.addEventListener("dragend", this.#onLeave, true);
  }
  /**
   * Stops taking drags and removes the gap.
   */
  unlisten() {
    const { document } = this.#deps;
    document.removeEventListener("dragover", this.#onDragOver, true);
    document.removeEventListener("drop", this.#onDrop, true);
    document.removeEventListener("dragleave", this.#onLeave, true);
    document.removeEventListener("dragend", this.#onLeave, true);
    this.#dropped = null;
    this.clearGap();
  }
  #over(event) {
    const target = GridDropZone.#carriesTab(event) ? this.at(event.clientX, event.clientY) : null;
    if (target === null) {
      this.clearGap();
      return;
    }
    event.preventDefault();
    this.showGap(target);
  }
  #drop(event) {
    const target = GridDropZone.#carriesTab(event) ? this.at(event.clientX, event.clientY) : null;
    this.clearGap();
    if (target !== null) {
      event.preventDefault();
      this.#dropped?.(target);
    }
  }
  #place(gap, grid, before) {
    if (gap.parentElement === grid && gap.nextElementSibling === before) {
      return;
    }
    if (before === null) {
      grid.append(gap);
    } else {
      before.before(gap);
    }
  }
  #createGap() {
    const gap = this.#deps.document.createElement("div");
    gap.setAttribute(GAP_ATTRIBUTE, "");
    this.#gap = gap;
    return gap;
  }
  static #carriesTab(event) {
    return Array.from(event.dataTransfer?.types ?? []).includes(TAB_ENTRIES_TYPE);
  }
  static #tiles(grid) {
    return Array.from(grid.children).filter((child) => child.hasAttribute(TILE_ATTRIBUTE));
  }
  static #reaches(tile, x, y) {
    const { right, top, bottom } = tile.getBoundingClientRect();
    const inRow = y >= top && y < bottom;
    return inRow && x < right || y < top;
  }
  static #inside(element, x, y) {
    if (element === null) {
      return false;
    }
    const { left, right, top, bottom } = element.getBoundingClientRect();
    return x >= left && x < right && y >= top && y < bottom;
  }
}
export {
  GAP_ATTRIBUTE,
  GridDropZone,
  TAB_ENTRIES_TYPE
};
