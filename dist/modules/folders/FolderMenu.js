import { LIVE_FOLDER_ATTRIBUTE } from "./FolderRowElement.js";
const FOLDER_ATTRIBUTE = "data-vivarcdi-folder-id";
class FolderMenu {
  #deps;
  #onContext = (event) => this.#context(event);
  /**
   * The menu of a folder row of the folders section, opened with a right click in place of
   * Vivaldi's own. The rows of a live folder keep the menu of their module.
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
    const folderId = FolderMenu.#folderIdOf(event.target);
    if (folderId === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.#deps.menu.open(this.#deps.items.for(folderId), event.clientX, event.clientY);
  }
  static #folderIdOf(target) {
    const row = target?.closest?.(`[${FOLDER_ATTRIBUTE}]`) ?? null;
    return row === null || row.hasAttribute(LIVE_FOLDER_ATTRIBUTE) ? null : row.getAttribute(FOLDER_ATTRIBUTE);
  }
}
export {
  FolderMenu
};
