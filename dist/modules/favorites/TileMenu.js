import { PIN_TAB_LABEL, UNTILE_TAB_LABEL } from "../../core/CommandLabels.js";
import { TILE_ATTRIBUTE } from "./FavoritesView.js";
class TileMenu {
  #deps;
  #onContext = (event) => this.#context(event);
  /**
   * The menu of a tile of the Favorites grid, opened with a right click: Untile tab puts the page
   * back among today's tabs, and Pin tab makes it a link of the workspace favorites. Vivaldi's own
   * menu is cancelled for tiles only.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * Starts listening to `contextmenu`, in the capture phase.
   */
  attach() {
    this.#deps.document.addEventListener("contextmenu", this.#onContext, true);
  }
  /**
   * Stops listening and closes the menu.
   */
  detach() {
    this.#deps.document.removeEventListener("contextmenu", this.#onContext, true);
    this.#deps.menu.close();
  }
  #context(event) {
    const tile = event.target?.closest?.(`[${TILE_ATTRIBUTE}]`);
    const id = tile?.getAttribute(TILE_ATTRIBUTE) ?? null;
    if (id === null || tile?.parentElement !== this.#deps.grid()) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const { menu, removal } = this.#deps;
    const items = [
      { label: UNTILE_TAB_LABEL, run: () => void removal.untile(id) },
      { label: PIN_TAB_LABEL, run: () => void removal.pin(id) }
    ];
    menu.open(items, event.clientX, event.clientY);
  }
}
export {
  TileMenu
};
