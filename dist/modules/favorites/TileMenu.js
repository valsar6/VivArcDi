import { PIN_TAB_LABEL, UNTILE_TAB_LABEL } from "../../shared/tabs/CommandLabels.js";
import { TILE_ATTRIBUTE } from "./FavoritesView.js";
const SEPARATOR = { separator: true };
class TileMenu {
  #deps;
  #onContext = (event) => this.#context(event);
  /**
   * The menu of a tile of the Favorites grid, opened with a right click: Untile tab puts the page
   * back among today's tabs, Pin tab makes it a link of the workspace favorites, and a web panel
   * command follows when the page can be one. The link commands, when there are any, come first,
   * followed by a separator. Vivaldi's own menu is cancelled for tiles only.
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
    void this.#open(id, event);
  }
  #commands(id) {
    const { removal } = this.#deps;
    return [
      { label: UNTILE_TAB_LABEL, run: () => void removal.untile(id) },
      { label: PIN_TAB_LABEL, run: () => void removal.pin(id) }
    ];
  }
  async #open(id, { clientX, clientY }) {
    const { panels, links, menu } = this.#deps;
    if (panels === void 0 && links === void 0) {
      menu.open(this.#commands(id), clientX, clientY);
      return;
    }
    const linked = links === void 0 ? [] : await links.items(id).catch(() => []);
    const panel = panels === void 0 ? null : await panels.item(id).catch(() => null);
    const items = linked.length === 0 ? [] : [...linked, SEPARATOR];
    menu.open([...items, ...this.#commands(id), ...panel === null ? [] : [panel]], clientX, clientY);
  }
}
export {
  TileMenu
};
