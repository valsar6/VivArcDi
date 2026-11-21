import { LinkId } from "../../../shared/links/LinkId.js";
import { LINK_ATTRIBUTE } from "../dragdrop/DropTargets.js";
class RowMenu {
  #deps;
  #onContext = (event) => this.#context(event);
  /**
   * The menu of a link row of the folders section, opened with a right click, with the items of
   * `LinkMenuItems`. Vivaldi's own menu is cancelled for the link rows of bookmarks only.
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
    const { menu, items } = this.#deps;
    const { clientX, clientY } = event;
    void items.for(id).then((list) => menu.open(list, clientX, clientY));
  }
}
export {
  RowMenu
};
