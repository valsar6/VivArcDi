import { REMOVE_PIN_LABEL, TILE_TAB_LABEL } from "../../core/CommandLabels.js";
import { LinkId } from "../../core/LinkId.js";
import { LINK_ATTRIBUTE } from "./DropTargets.js";
class RowMenu {
  #deps;
  #onContext = (event) => this.#context(event);
  /**
   * The menu of a link row of the folders section, opened with a right click: Remove pin puts the
   * page back among today's tabs, and Tile tab makes it a tile of the Favorites grid. Vivaldi's own
   * menu is cancelled for the link rows of bookmarks only.
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
    const id = event.target?.closest?.(`[${LINK_ATTRIBUTE}]`)?.getAttribute(LINK_ATTRIBUTE) ?? null;
    if (id === null || LinkId.isVirtual(id)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const { menu, removal } = this.#deps;
    const items = [
      { label: REMOVE_PIN_LABEL, run: () => void removal.removePin(id) },
      { label: TILE_TAB_LABEL, run: () => void removal.tile(id) }
    ];
    menu.open(items, event.clientX, event.clientY);
  }
}
export {
  RowMenu
};
