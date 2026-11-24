import { TILE_ATTRIBUTE } from "./FavoritesView.js";
const TILE_MINUS_ATTRIBUTE = "data-vivarcdi-tile-minus";
const UNLOAD_LABEL = "Unload tab";
const TILE_MINUS_SELECTOR = `[${TILE_MINUS_ATTRIBUTE}]`;
const TILE_SELECTOR = `[${TILE_ATTRIBUTE}]`;
class PinnedTileMinus {
  #deps;
  #buttons = /* @__PURE__ */ new Map();
  #onPress = (event) => this.#handle(event);
  /**
   * The minus at the right end of every pinned tile: it unloads the tab the tile stands for,
   * like the minus of a pinned row, and stays off the tiles of the bookmark grid.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * Takes the presses on the minuses and puts one on every pinned tile.
   */
  start() {
    this.#deps.document.addEventListener("pointerdown", this.#onPress, true);
    this.#deps.document.addEventListener("mousedown", this.#onPress, true);
    this.#deps.document.addEventListener("click", this.#onPress, true);
    this.sync();
  }
  /**
   * Gives every pinned tile a minus, adding the ones the last redraw dropped.
   */
  sync() {
    const grid = this.#deps.grid();
    const tiles = PinnedTileMinus.#tilesOf(grid);
    const present = new Set(tiles);
    this.#buttons.forEach((button, tile) => {
      if (!present.has(tile) || !PinnedTileMinus.#inside(button, tile)) {
        button.remove();
        this.#buttons.delete(tile);
      }
    });
    tiles.forEach((tile) => this.#place(tile));
  }
  /**
   * Removes the minuses and every listener.
   */
  stop() {
    this.#deps.document.removeEventListener("pointerdown", this.#onPress, true);
    this.#deps.document.removeEventListener("mousedown", this.#onPress, true);
    this.#deps.document.removeEventListener("click", this.#onPress, true);
    this.#buttons.forEach((button) => button.remove());
    this.#buttons.clear();
  }
  #place(tile) {
    const button = this.#buttons.get(tile) ?? this.#create();
    if (!PinnedTileMinus.#inside(button, tile)) {
      tile.append(button);
    }
    this.#buttons.set(tile, button);
  }
  #create() {
    const button = this.#deps.document.createElement("button");
    button.setAttribute("type", "button");
    button.setAttribute(TILE_MINUS_ATTRIBUTE, "");
    button.setAttribute("aria-label", UNLOAD_LABEL);
    return button;
  }
  #handle(event) {
    const button = event.target?.closest?.(TILE_MINUS_SELECTOR) ?? null;
    if (button === null || !this.#owns(button)) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.type === "click") {
      this.#unload(button);
    }
  }
  #unload(button) {
    const tabId = button.closest(TILE_SELECTOR)?.getAttribute(TILE_ATTRIBUTE);
    if (tabId !== null && tabId !== void 0) {
      this.#deps.unload(Number(tabId));
    }
  }
  #owns(button) {
    const grid = this.#deps.grid();
    let node = button;
    while (node !== null) {
      if (node === grid) {
        return true;
      }
      node = node.parentElement;
    }
    return false;
  }
  static #tilesOf(grid) {
    return Array.from(grid.children).filter((child) => child.hasAttribute(TILE_ATTRIBUTE));
  }
  static #inside(element, ancestor) {
    let node = element;
    while (node !== null) {
      if (node === ancestor) {
        return true;
      }
      node = node.parentElement;
    }
    return false;
  }
}
export {
  PinnedTileMinus,
  TILE_MINUS_ATTRIBUTE
};
