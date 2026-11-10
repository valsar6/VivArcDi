import { TILE_ATTRIBUTE } from "./FavoritesView.js";
const DRAGGING_ATTRIBUTE = "data-vivarcdi-dragging";
const DRAG_DISTANCE_PX = 6;
const PRIMARY_BUTTON = 0;
class TileDrag {
  #deps;
  #press = null;
  #onDown = (event) => this.#down(event);
  #onMove = (event) => this.#move(event);
  #onUp = (event) => this.#up(event);
  #onClick = (event) => this.#swallow(event);
  /**
   * Follows a tile of the Favorites grid being moved with the mouse: the button goes down on the
   * tile, the pointer moves more than a few pixels, and the button goes up somewhere. The tile is
   * dimmed while it is dragged, and the click that follows the release is swallowed so the tile
   * does not open.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * Starts listening, in the capture phase.
   */
  attach() {
    const { document } = this.#deps;
    document.addEventListener("mousedown", this.#onDown, true);
    document.addEventListener("mousemove", this.#onMove, true);
    document.addEventListener("mouseup", this.#onUp, true);
  }
  /**
   * Stops listening and forgets a drag in progress.
   */
  detach() {
    const { document } = this.#deps;
    document.removeEventListener("mousedown", this.#onDown, true);
    document.removeEventListener("mousemove", this.#onMove, true);
    document.removeEventListener("mouseup", this.#onUp, true);
    document.removeEventListener("click", this.#onClick, true);
    this.#end();
  }
  #down(event) {
    this.#deps.document.removeEventListener("click", this.#onClick, true);
    this.#press = null;
    const tile = event.button === PRIMARY_BUTTON ? this.#tileOf(event.target) : null;
    const favoriteId = tile?.getAttribute(TILE_ATTRIBUTE) ?? null;
    if (tile !== null && favoriteId !== null) {
      this.#press = { tile, favoriteId, x: event.clientX, y: event.clientY, dragging: false };
    }
  }
  #move(event) {
    const press = this.#press;
    if (press === null) {
      return;
    }
    if (event.buttons === 0) {
      this.#end();
      return;
    }
    if (!press.dragging && Math.hypot(event.clientX - press.x, event.clientY - press.y) > DRAG_DISTANCE_PX) {
      press.dragging = true;
      press.tile.setAttribute(DRAGGING_ATTRIBUTE, "");
    }
    if (press.dragging) {
      this.#deps.onMove(press.favoriteId, event.clientX, event.clientY);
    }
  }
  #up(event) {
    const press = this.#press;
    if (press?.dragging === true) {
      this.#deps.document.addEventListener("click", this.#onClick, true);
      this.#deps.onDrop(press.favoriteId, event.clientX, event.clientY);
    }
    this.#end();
  }
  #end() {
    const press = this.#press;
    this.#press = null;
    press?.tile.removeAttribute(DRAGGING_ATTRIBUTE);
    if (press?.dragging === true) {
      this.#deps.onEnd();
    }
  }
  #swallow(event) {
    this.#deps.document.removeEventListener("click", this.#onClick, true);
    event.preventDefault();
    event.stopPropagation();
  }
  #tileOf(target) {
    const tile = target?.closest?.(`[${TILE_ATTRIBUTE}]`);
    const grid = this.#deps.grid();
    return tile != null && grid !== null && tile.parentElement === grid ? tile : null;
  }
}
export {
  DRAGGING_ATTRIBUTE,
  TileDrag
};
