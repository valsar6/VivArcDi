import { ContextMenu } from '../../../core/ContextMenu.js';
import type { BookmarkNode } from '../../../core/bookmarks/BookmarkNode.js';
import { DragPill } from '../../../shared/dragdrop/DragPill.js';
import { FavoriteDropZone } from '../../../shared/dragdrop/FavoriteDropZone.js';
import { FolderCommands } from '../../../shared/links/FolderCommands.js';
import { LinkId } from '../../../shared/links/LinkId.js';
import type { ModuleContext } from '../../../core/Module.js';
import { TabMenuItems } from '../favoritelinks/TabMenuItems.js';
import type { ContextMenuApi } from '../favoritelinks/TabMenuItems.js';
import { BookmarkTrash } from './BookmarkTrash.js';
import { Toast } from '../../../core/Toast.js';
import type { ToastKind } from '../../../core/Toast.js';
import { TodayList } from '../../../shared/tabs/TodayList.js';
import { VirtualFolders } from '../../../shared/links/VirtualFolders.js';
import type { ClosingLinks } from './ClosingLinks.js';
import { CreatedLinks } from '../favoritelinks/CreatedLinks.js';
import { FavoriteShortcut } from '../favoritelinks/FavoriteShortcut.js';
import { FolderDeletion } from './FolderDeletion.js';
import { FolderDragDrop } from '../dragdrop/FolderDragDrop.js';
import type { FolderSectionView } from '../view/FolderSectionView.js';
import type { OpenFolders } from '../tree/OpenFolders.js';
import { TabCommands } from '../favoritelinks/TabCommands.js';
import type { TabLinks } from '../links/TabLinks.js';
import { WorkspaceFavorites } from '../favoritelinks/WorkspaceFavorites.js';

export interface EditingSources {
  /** The path of the root folder of the active workspace; empty when it has none. */
  root: () => string[];
  /** The path of VivArcDi's own folder of workspaces. */
  base: () => string[];
  /** The ids of the children of the root, in order. */
  childIds: () => readonly string[];
  /** Draws the section again from the bookmarks. */
  redraw: () => void;
  /** Writes the link between a tab and a bookmark. */
  tabLinks: TabLinks;
  /** The folders the user left open. */
  openFolders: OpenFolders;
  /** The links whose tabs are about to close. */
  closing: ClosingLinks;
}

const TOAST_MS = 2000;
const HEADER_SELECTOR = '[data-vivarcdi-space-header]';

export class FolderEditing {
  #context: ModuleContext;
  #view: FolderSectionView;
  #sources: EditingSources;
  #favorites: WorkspaceFavorites;
  #stops: Array<() => void> = [];

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
  constructor(context: ModuleContext, view: FolderSectionView, sources: EditingSources) {
    this.#context = context;
    this.#view = view;
    this.#sources = sources;
    this.#favorites = new WorkspaceFavorites({
      writer: context.bookmarkWriter,
      links: sources.tabLinks,
      created: new CreatedLinks(context.storage),
      root: sources.root,
      base: sources.base,
      logger: context.logger,
    });
  }

  /**
   * Starts listening to the space header, the keyboard and the mouse.
   */
  public start(): void {
    if (!this.#context.bookmarkWriter.available) {
      this.#context.logger.warn('chrome.bookmarks cannot write: the folders cannot be edited from the tab bar');
      return;
    }
    const toast = this.#createToast();
    this.#stops.push(
      () => toast.remove(),
      FolderCommands.of(this.#context.document).onNewFolder(() => void this.#newFolder()),
      this.#startShortcut((text) => toast.show(text)),
      this.#startDrops((text, kind) => toast.show(text, kind)),
      this.#startTabMenu((text) => toast.show(text)),
    );
  }

  /**
   * Stops listening.
   */
  public stop(): void {
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
  public async rename(folderId: string, name: string): Promise<void> {
    if (LinkId.isVirtual(folderId)) {
      VirtualFolders.of(this.#context.document).rename(folderId, name);
      return;
    }
    try {
      await this.#context.bookmarkWriter.update(folderId, name);
    } catch (error) {
      this.#context.logger.warn('could not rename the folder', error);
      this.#sources.redraw();
    }
  }

  async #newFolder(): Promise<void> {
    const id = await this.#favorites.addFolder();
    if (id !== null) {
      this.#view.edit(id);
    }
  }

  #createToast(): Toast {
    const { document, selectors } = this.#context;
    return new Toast({ document, parent: document.querySelector(selectors.get('browser')) ?? document.body, durationMs: TOAST_MS });
  }

  #startShortcut(notify: (text: string) => void): () => void {
    const { document, tabs, logger } = this.#context;
    const shortcut = new FavoriteShortcut({
      document,
      activeTab: async (): Promise<chrome.tabs.Tab | undefined> => (await tabs.query({ active: true, currentWindow: true }))[0],
      favorites: this.#favorites,
      notify,
      logger,
    });
    shortcut.attach();
    return () => shortcut.detach();
  }

  #startDrops(notify: (text: string, kind?: ToastKind) => void): () => void {
    const { document, selectors, tabs, bookmarkWriter, logger } = this.#context;
    const deletion = new FolderDeletion({
      writer: bookmarkWriter,
      trash: new BookmarkTrash({ tree: (): Promise<BookmarkNode[]> => bookmarkWriter.tree() }),
      tabs,
      openFolders: this.#sources.openFolders,
      closing: this.#sources.closing,
      redraw: this.#sources.redraw,
      notify,
      logger,
    });
    const drops = new FolderDragDrop({
      document,
      wrapperSelector: selectors.get('tabWrapper'),
      stripSelector: selectors.get('tabStrip'),
      skipSelector: TodayList.skippedBy(selectors),
      pill: DragPill.of(document, selectors),
      menu: new ContextMenu({ document, parent: (): Element => document.querySelector(selectors.get('browser')) ?? document.body }),
      section: (): HTMLElement => this.#view.element,
      header: (): HTMLElement | null => document.querySelector<HTMLElement>(HEADER_SELECTOR),
      folderActions: { rename: (folderId): void => this.#view.edit(folderId), remove: (folderId): void => void deletion.delete(folderId) },
      tabs,
      writer: bookmarkWriter,
      tabLinks: this.#sources.tabLinks,
      favorites: this.#favorites,
      notify,
      indexBefore: (bookmarkId): number | undefined => this.#indexBefore(bookmarkId),
      logger,
    });
    drops.start();
    return () => drops.stop();
  }

  #startTabMenu(notify: (text: string) => void): () => void {
    const { document, selectors, tabs, logger } = this.#context;
    const commands = new TabCommands({ favorites: this.#favorites, grid: FavoriteDropZone.of(document), notify });
    const menu = new TabMenuItems({
      document,
      contextMenu: (globalThis as { vivaldi?: { contextMenu?: ContextMenuApi } }).vivaldi?.contextMenu,
      wrapperSelector: selectors.get('tabWrapper'),
      tabs,
      commands: commands.commands,
      appliesTo: (tab): boolean => TabCommands.appliesTo(tab),
      logger,
    });
    menu.start();
    return () => menu.stop();
  }

  #indexBefore(bookmarkId: string | null): number | undefined {
    const index = bookmarkId === null ? -1 : this.#sources.childIds().indexOf(bookmarkId);
    return index < 0 ? undefined : index;
  }
}
