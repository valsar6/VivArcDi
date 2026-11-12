import { LinkId } from "../../core/LinkId.js";
import { PullRequestFilters } from "./PullRequestFilters.js";
const FILTER_LABELS = [
  ["createdByMe", "Created By Me"],
  ["reviewRequests", "Review Requests"],
  ["drafts", "Drafts"]
];
const PULL_REQUESTS_LABEL = "Pull Requests";
const REPOSITORIES_LABEL = "Repositories\u2026";
const REFRESH_LABEL = "Refresh";
const DELETE_LABEL = "Delete Live Folder";
class LiveFolderMenu {
  #deps;
  /**
   * The menu of a live folder: `Pull Requests` with the three filters as check items and
   * `Repositories…`, then `Refresh` and `Delete Live Folder`. A filter change is stored and the
   * folder refreshes at once.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * Opens the menu of a live folder.
   *
   * @param linkId The id of the folder row.
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  open(linkId, x, y) {
    const folderId = LinkId.folderOf(linkId);
    const folder = folderId === null ? void 0 : this.#deps.store.find(folderId);
    if (folderId === null || folder === void 0) {
      return;
    }
    const filters = FILTER_LABELS.map(([name, label]) => ({ label, checked: folder.filters[name], run: () => this.#toggle(folderId, name) }));
    const repositories = { label: REPOSITORIES_LABEL, run: () => this.#editRepositories(folderId, linkId, { x, y }) };
    const items = [
      { label: PULL_REQUESTS_LABEL, items: [...filters, repositories] },
      { label: REFRESH_LABEL, run: () => this.#deps.refresh(folderId) },
      { label: DELETE_LABEL, run: () => this.#deps.remove(folderId) }
    ];
    this.#deps.menu.open(items, x, y);
  }
  #toggle(folderId, name) {
    const folder = this.#deps.store.find(folderId);
    if (folder !== void 0) {
      this.#deps.store.update(folderId, { filters: PullRequestFilters.toggled(folder.filters, name) });
      this.#deps.refresh(folderId);
    }
  }
  #editRepositories(folderId, linkId, pointer) {
    const folder = this.#deps.store.find(folderId);
    if (folder === void 0) {
      return;
    }
    const { x, y } = this.#deps.anchor(linkId) ?? pointer;
    this.#deps.editor.open(x, y, folder.filters.repositories, (repositories) => this.#saveRepositories(folderId, repositories));
  }
  #saveRepositories(folderId, repositories) {
    const folder = this.#deps.store.find(folderId);
    if (folder !== void 0) {
      this.#deps.store.update(folderId, { filters: { ...folder.filters, repositories } });
      this.#deps.refresh(folderId);
    }
  }
}
export {
  LiveFolderMenu
};
