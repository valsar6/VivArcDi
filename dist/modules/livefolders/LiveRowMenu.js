import { LinkId } from "../../core/LinkId.js";
const COPY_LINK_LABEL = "Copy Link";
const ARCHIVE_LABEL = "Archive Pull Request";
const COPIED_TEXT = "Copied";
const COPY_FAILED_TEXT = "Copy failed";
class LiveRowMenu {
  #deps;
  /**
   * The menu of a pull-request row of a live folder: `Copy Link` copies the address of the pull
   * request and confirms it with a toast, and `Archive Pull Request` hides it from the folder until
   * it is updated on GitHub. Nothing here touches a bookmark.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * Opens the menu of a pull-request row.
   *
   * @param linkId The id of the row.
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  open(linkId, x, y) {
    const folderId = LinkId.folderOf(linkId);
    const rowId = LinkId.rowOf(linkId);
    const row = folderId === null ? void 0 : this.#deps.store.find(folderId)?.rows.find((candidate) => candidate.id === rowId);
    if (folderId === null || row === void 0) {
      return;
    }
    this.#deps.menu.open(
      [
        { label: COPY_LINK_LABEL, run: () => this.#copy(row.url) },
        { label: ARCHIVE_LABEL, run: () => this.#archive(folderId, row.id) }
      ],
      x,
      y
    );
  }
  #copy(url) {
    this.#deps.copier.write(url).then(
      () => this.#deps.toast(COPIED_TEXT),
      () => this.#deps.toast(COPY_FAILED_TEXT)
    );
  }
  #archive(folderId, rowId) {
    const folder = this.#deps.store.find(folderId);
    const row = folder?.rows.find((candidate) => candidate.id === rowId);
    if (folder === void 0 || row === void 0) {
      return;
    }
    this.#deps.store.update(folderId, { rows: folder.rows.filter((candidate) => candidate.id !== rowId), archived: { ...folder.archived, [rowId]: row.updatedAt } });
    this.#deps.changed();
  }
}
export {
  ARCHIVE_LABEL,
  COPIED_TEXT,
  COPY_FAILED_TEXT,
  COPY_LINK_LABEL,
  LiveRowMenu
};
