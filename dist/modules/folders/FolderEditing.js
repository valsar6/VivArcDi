import { FolderCommands } from "../../core/FolderCommands.js";
import { Toast } from "../../core/Toast.js";
import { CreatedLinks } from "./CreatedLinks.js";
import { FavoriteShortcut } from "./FavoriteShortcut.js";
import { FolderDragDrop } from "./FolderDragDrop.js";
import { WorkspaceFavorites } from "./WorkspaceFavorites.js";
const TOAST_MS = 2e3;
const HEADER_SELECTOR = "[data-vivarcdi-space-header]";
class FolderEditing {
  #context;
  #view;
  #sources;
  #favorites;
  #stops = [];
  /**
   * Everything the user can change from the tab bar: a new folder from the space header, a new name
   * for a folder, Cmd/Ctrl+D, and a tab released over the section or the header, and a link row dragged out of the section. Each of them
   * writes to the bookmarks through `WorkspaceFavorites` and the section follows the bookmark
   * events. Without a way to write bookmarks it does nothing.
   *
   * @param context What the module may use.
   * @param view The section, which edits names.
   * @param sources What it reads from the section.
   */
  constructor(context, view, sources) {
    this.#context = context;
    this.#view = view;
    this.#sources = sources;
    this.#favorites = new WorkspaceFavorites({
      writer: context.bookmarkWriter,
      links: sources.tabLinks,
      created: new CreatedLinks(context.storage),
      root: sources.root,
      logger: context.logger
    });
  }
  /**
   * Starts listening to the space header, the keyboard and the mouse.
   */
  start() {
    if (!this.#context.bookmarkWriter.available) {
      this.#context.logger.warn("chrome.bookmarks cannot write: the folders cannot be edited from the tab bar");
      return;
    }
    const toast = this.#createToast();
    this.#stops.push(
      () => toast.remove(),
      FolderCommands.of(this.#context.document).onNewFolder(() => void this.#newFolder()),
      this.#startShortcut((text) => toast.show(text)),
      this.#startDrops((text) => toast.show(text))
    );
  }
  /**
   * Stops listening.
   */
  stop() {
    this.#stops.reverse().forEach((stop) => stop());
    this.#stops = [];
  }
  /**
   * Renames a bookmark folder. A failure is logged and the section is drawn again with the old name.
   *
   * @param folderId The folder.
   * @param name Its new name.
   */
  async rename(folderId, name) {
    try {
      await this.#context.bookmarkWriter.update(folderId, name);
    } catch (error) {
      this.#context.logger.warn("could not rename the folder", error);
      this.#sources.redraw();
    }
  }
  async #newFolder() {
    const id = await this.#favorites.addFolder();
    if (id !== null) {
      this.#view.edit(id);
    }
  }
  #createToast() {
    const { document, selectors } = this.#context;
    return new Toast({ document, parent: document.querySelector(selectors.get("browser")) ?? document.body, durationMs: TOAST_MS });
  }
  #startShortcut(notify) {
    const { document, tabs, logger } = this.#context;
    const shortcut = new FavoriteShortcut({
      document,
      activeTab: async () => (await tabs.query({ active: true, currentWindow: true }))[0],
      favorites: this.#favorites,
      notify,
      logger
    });
    shortcut.attach();
    return () => shortcut.detach();
  }
  #startDrops(notify) {
    const { document, selectors, tabs, bookmarkWriter, logger } = this.#context;
    const drops = new FolderDragDrop({
      document,
      wrapperSelector: selectors.get("tabWrapper"),
      stripSelector: selectors.get("tabStrip"),
      section: () => this.#view.element,
      header: () => document.querySelector(HEADER_SELECTOR),
      tabs,
      writer: bookmarkWriter,
      tabLinks: this.#sources.tabLinks,
      favorites: this.#favorites,
      notify,
      indexBefore: (bookmarkId) => this.#indexBefore(bookmarkId),
      logger
    });
    drops.start();
    return () => drops.stop();
  }
  #indexBefore(bookmarkId) {
    const index = bookmarkId === null ? -1 : this.#sources.childIds().indexOf(bookmarkId);
    return index < 0 ? void 0 : index;
  }
}
export {
  FolderEditing
};
