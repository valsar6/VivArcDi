import { LinkId } from "../../core/LinkId.js";
import { CONNECT_ROW_ID } from "./LiveEntries.js";
class LiveFolderHandlers {
  #deps;
  /**
   * What the live folders do with the clicks the folders section reports: a new name is stored, an
   * opened folder refreshes, a right click opens the menu of the folder or of the pull request, and
   * a click on the `Connect GitHub` row opens the panel below its folder instead of a tab.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * @param id The id of a live folder.
   * @param name Its new name.
   */
  rename(id, name) {
    const folderId = LinkId.folderOf(id);
    if (folderId !== null && this.#deps.store.update(folderId, { name })) {
      this.#deps.publisher.publish();
    }
  }
  /**
   * @param id The id of a live folder the user opened.
   */
  open(id) {
    const folderId = LinkId.folderOf(id);
    if (folderId !== null) {
      this.#deps.refresher.refresh(folderId);
    }
  }
  /**
   * @param id The id of a live folder or of one of its rows.
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  menu(id, x, y) {
    const row = LinkId.rowOf(id);
    if (row === null) {
      this.#deps.folderMenu.open(id, x, y);
    } else if (row !== CONNECT_ROW_ID) {
      this.#deps.rowMenu.open(id, x, y);
    }
  }
  /**
   * @param id The id of a row the user clicked.
   * @returns Whether it was the `Connect GitHub` row, which opens the panel and no tab.
   */
  activate(id) {
    const folderId = LinkId.folderOf(id);
    if (LinkId.rowOf(id) !== CONNECT_ROW_ID || folderId === null) {
      return false;
    }
    const point = LiveFolderHandlers.below(this.#deps.document, LinkId.folder(folderId));
    this.#deps.connect.open(point?.x ?? 0, point?.y ?? 0);
    return true;
  }
  /**
   * @param document The browser window document.
   * @param linkId The id of a live folder row.
   * @returns The point just below the row of that folder, or null when it is not drawn.
   */
  static below(document, linkId) {
    const row = document.querySelector(`[data-vivarcdi-folder-id="${linkId}"]`);
    const rect = row?.getBoundingClientRect();
    return rect === void 0 ? null : { x: rect.left, y: rect.bottom };
  }
}
export {
  LiveFolderHandlers
};
