import { PIN_TAB_LABEL, UNTILE_TAB_LABEL } from "../../shared/tabs/CommandLabels.js";
import { TILE_ATTRIBUTE } from "./FavoritesView.js";
class TileMenu {
  #deps;
  #onContext = (event) => this.#context(event);
  /**
   * The menu of a tile of the Favorites grid, opened with a right click: Untile tab puts the page
   * back among today's tabs, Pin tab makes it a link of the workspace favorites, and a web panel
   * command follows when the page can be one. Vivaldi's own
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
    this.#open(this.#commands(id), id, event);
  }
  #commands(id) {
    const { removal } = this.#deps;
    return [
      { label: UNTILE_TAB_LABEL, run: () => void removal.untile(id) },
      { label: PIN_TAB_LABEL, run: () => void removal.pin(id) }
    ];
  }
  #open(items, id, { clientX, clientY }) {
    const { panels, menu } = this.#deps;
    if (panels === void 0) {
      menu.open(items, clientX, clientY);
      return;
    }
    void panels.item(id).catch(() => null).then((panel) => menu.open(panel === null ? items : [...items, panel], clientX, clientY));
  }
}
export {
  TileMenu
};
