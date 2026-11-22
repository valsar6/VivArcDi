import { TILE_ATTRIBUTE } from "./FavoritesView.js";
const HOVER_NAME_MS = 3e3;
const NAME_ATTRIBUTE = "data-vivarcdi-tile-name";
const EDGE_PX = 8;
const CANCELLING_EVENTS = ["mousedown", "contextmenu", "dragstart", "wheel"];
class TileHoverName {
  #deps;
  #timer = null;
  #tile = null;
  #label = null;
  /**
   * The name of a tile of the Favorites grid, shown below it once the pointer has rested on it
   * for three seconds. The native title of a tile is not used, so only this name shows.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * Listens on a grid.
   *
   * @param grid The element that holds the tiles.
   * @param textOf Gives the text to show for a tile element.
   * @returns The function that stops listening and removes the name.
   */
  attach(grid, textOf) {
    const onOver = (event) => this.#over(event, textOf);
    const onOut = (event) => this.#out(event);
    const onCancel = () => this.#cancel();
    grid.addEventListener("mouseover", onOver);
    grid.addEventListener("mouseout", onOut);
    CANCELLING_EVENTS.forEach((type) => grid.addEventListener(type, onCancel));
    return () => {
      grid.removeEventListener("mouseover", onOver);
      grid.removeEventListener("mouseout", onOut);
      CANCELLING_EVENTS.forEach((type) => grid.removeEventListener(type, onCancel));
      this.#cancel();
    };
  }
  #tileOf(target) {
    return target?.closest?.(`[${TILE_ATTRIBUTE}]`) ?? null;
  }
  #over(event, textOf) {
    const tile = this.#tileOf(event.target);
    if (tile === null || tile === this.#tile) {
      return;
    }
    this.#cancel();
    this.#tile = tile;
    this.#timer = this.#deps.timers.set(() => this.#show(tile, textOf), HOVER_NAME_MS);
  }
  #out(event) {
    if (this.#tile !== null && this.#tileOf(event.relatedTarget) !== this.#tile) {
      this.#cancel();
    }
  }
  #cancel() {
    if (this.#timer !== null) {
      this.#deps.timers.clear(this.#timer);
    }
    this.#timer = null;
    this.#tile = null;
    this.#label?.remove();
    this.#label = null;
  }
  #show(tile, textOf) {
    this.#timer = null;
    const label = this.#deps.document.createElement("div");
    label.setAttribute(NAME_ATTRIBUTE, "");
    label.textContent = textOf(tile);
    this.#deps.parent().append(label);
    this.#label = label;
    this.#place(label, tile);
  }
  #place(label, tile) {
    const { innerWidth = 0, innerHeight = 0 } = this.#deps.document.defaultView ?? {};
    const anchor = tile.getBoundingClientRect();
    const size = label.getBoundingClientRect();
    const width = size.right - size.left;
    const below = anchor.bottom + EDGE_PX;
    const fitsBelow = below + size.height <= innerHeight - EDGE_PX;
    const left = Math.max(EDGE_PX, Math.min(anchor.left, innerWidth - width - EDGE_PX));
    label.style.setProperty("left", `${left}px`);
    label.style.setProperty("top", `${fitsBelow ? below : anchor.top - size.height - EDGE_PX}px`);
  }
}
export {
  HOVER_NAME_MS,
  NAME_ATTRIBUTE,
  TileHoverName
};
