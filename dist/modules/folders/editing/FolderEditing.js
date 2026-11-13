import { ContextMenu } from "../../../core/dom/ContextMenu.js";
import { DragPill } from "../../../shared/dragdrop/DragPill.js";
import { FavoriteDropZone } from "../../../shared/dragdrop/FavoriteDropZone.js";
import { FolderCommands } from "../../../shared/links/FolderCommands.js";
import { LinkId } from "../../../shared/links/LinkId.js";
import { TabDataWriter } from "../../../core/tabs/TabDataWriter.js";
import { TabMenuItems } from "../favoritelinks/TabMenuItems.js";
import { BookmarkCopier } from "./BookmarkCopier.js";
import { BookmarkTrash } from "./BookmarkTrash.js";
import { Toast } from "../../../core/dom/Toast.js";
import { TodayList } from "../../../shared/tabs/TodayList.js";
import { VirtualFolders } from "../../../shared/links/VirtualFolders.js";
import { CreatedLinks } from "../favoritelinks/CreatedLinks.js";
import { FavoriteShortcut } from "../favoritelinks/FavoriteShortcut.js";
import { FolderDeletion } from "./FolderDeletion.js";
import { FolderDragDrop } from "../dragdrop/FolderDragDrop.js";
import { FolderDuplication } from "./FolderDuplication.js";
import { FolderLinkTabs } from "./FolderLinkTabs.js";
import { FolderRelocation } from "./FolderRelocation.js";
import { TabCommands } from "../favoritelinks/TabCommands.js";
import { WorkspaceFavorites } from "../favoritelinks/WorkspaceFavorites.js";
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
   * for a folder, Cmd/Ctrl+D, a tab released over the section or the header, a link row dragged out
   * of the section, and Pin tab and Tile tab in Vivaldi's menu of a tab. Each of them writes to the
   * bookmarks through `WorkspaceFavorites` and the section follows the bookmark events. Without a
   * way to write bookmarks it does nothing.
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
      base: sources.base,
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
      this.#startDrops((text, kind) => toast.show(text, kind)),
      this.#startTabMenu((text) => toast.show(text))
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
   * Renames a bookmark folder, or hands the new name of a live folder to the source that fills it.
   * A failure is logged and the section is drawn again with the old name.
   *
   * @param folderId The folder.
   * @param name Its new name.
   */
  async rename(folderId, name) {
    if (LinkId.isVirtual(folderId)) {
      VirtualFolders.of(this.#context.document).rename(folderId, name);
      return;
    }
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
  #folderActions(notify) {
    const { tabs, bookmarkWriter, logger } = this.#context;
    const linkTabs = new FolderLinkTabs({ tabs });
    const duplication = new FolderDuplication({ writer: bookmarkWriter, copier: new BookmarkCopier(bookmarkWriter), notify, logger });
    const relocation = new FolderRelocation({
      writer: bookmarkWriter,
      linkTabs,
      tabData: TabDataWriter.of(tabs),
      names: this.#sources.names,
      active: this.#sources.active,
      roots: this.#sources.roots,
      openFolders: this.#sources.openFolders,
      closing: this.#sources.closing,
      notify,
      logger
    });
    const deletion = new FolderDeletion({
      writer: bookmarkWriter,
      linkTabs,
      trash: new BookmarkTrash({ tree: () => bookmarkWriter.tree() }),
      tabs,
      openFolders: this.#sources.openFolders,
      closing: this.#sources.closing,
      redraw: this.#sources.redraw,
      notify,
      logger
    });
    return {
      rename: (folderId) => this.#view.edit(folderId),
      duplicate: (folderId) => void duplication.duplicate(folderId),
      moveTo: (folderId) => relocation.submenu(folderId),
      remove: (folderId) => void deletion.delete(folderId)
    };
  }
  #startDrops(notify) {
    const { document, selectors, tabs, bookmarkWriter, logger } = this.#context;
    const drops = new FolderDragDrop({
      document,
      wrapperSelector: selectors.get("tabWrapper"),
      stripSelector: selectors.get("tabStrip"),
      skipSelector: TodayList.skippedBy(selectors),
      pill: DragPill.of(document, selectors),
      menu: new ContextMenu({ document, parent: () => document.querySelector(selectors.get("browser")) ?? document.body }),
      section: () => this.#view.element,
      header: () => document.querySelector(HEADER_SELECTOR),
      folderActions: this.#folderActions(notify),
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
  #startTabMenu(notify) {
    const { document, selectors, tabs, logger } = this.#context;
    const commands = new TabCommands({ favorites: this.#favorites, grid: FavoriteDropZone.of(document), notify });
    const menu = new TabMenuItems({
      document,
      contextMenu: globalThis.vivaldi?.contextMenu,
      wrapperSelector: selectors.get("tabWrapper"),
      tabs,
      commands: commands.commands,
      appliesTo: (tab) => TabCommands.appliesTo(tab),
      logger
    });
    menu.start();
    return () => menu.stop();
  }
  #indexBefore(bookmarkId) {
    const index = bookmarkId === null ? -1 : this.#sources.childIds().indexOf(bookmarkId);
    return index < 0 ? void 0 : index;
  }
}
export {
  FolderEditing
};
