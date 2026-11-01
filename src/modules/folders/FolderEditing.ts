import { FolderCommands } from '../../core/FolderCommands.js';
import type { ModuleContext } from '../../core/Module.js';
import { Toast } from '../../core/Toast.js';
import { CreatedLinks } from './CreatedLinks.js';
import { FavoriteShortcut } from './FavoriteShortcut.js';
import { FolderDragDrop } from './FolderDragDrop.js';
import type { FolderSectionView } from './FolderSectionView.js';
import type { TabLinks } from './TabLinks.js';
import { WorkspaceFavorites } from './WorkspaceFavorites.js';

export interface EditingSources {
  /** The path of the root folder of the active workspace; empty when it has none. */
  root: () => string[];
  /** The ids of the children of the root, in order. */
  childIds: () => readonly string[];
  /** Draws the section again from the bookmarks. */
  redraw: () => void;
  /** Writes the link between a tab and a bookmark. */
  tabLinks: TabLinks;
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
   * for a folder, Cmd/Ctrl+D, and a tab released over the section or the header. Each of them
   * writes to the bookmarks through `WorkspaceFavorites` and the section follows the bookmark
   * events. Without a way to write bookmarks it does nothing.
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
    this.#stops.push(FolderCommands.of(this.#context.document).onNewFolder(() => void this.#newFolder()), this.#startShortcut(), this.#startDrops());
  }

  /**
   * Stops listening.
   */
  public stop(): void {
    this.#stops.reverse().forEach((stop) => stop());
    this.#stops = [];
  }

  /**
   * Renames a bookmark folder. A failure is logged and the section is drawn again with the old name.
   *
   * @param folderId The folder.
   * @param name Its new name.
   */
  public async rename(folderId: string, name: string): Promise<void> {
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

  #startShortcut(): () => void {
    const { document, selectors, tabs, logger } = this.#context;
    const toast = new Toast({ document, parent: document.querySelector(selectors.get('browser')) ?? document.body, durationMs: TOAST_MS });
    const shortcut = new FavoriteShortcut({
      document,
      activeTab: async (): Promise<chrome.tabs.Tab | undefined> => (await tabs.query({ active: true, currentWindow: true }))[0],
      favorites: this.#favorites,
      notify: (text): void => toast.show(text),
      logger,
    });
    shortcut.attach();
    return () => {
      shortcut.detach();
      toast.remove();
    };
  }

  #startDrops(): () => void {
    const { document, selectors, tabs, logger } = this.#context;
    const drops = new FolderDragDrop({
      document,
      wrapperSelector: selectors.get('tabWrapper'),
      section: (): HTMLElement => this.#view.element,
      header: (): HTMLElement | null => document.querySelector<HTMLElement>(HEADER_SELECTOR),
      tabs,
      favorites: this.#favorites,
      indexBefore: (bookmarkId): number | undefined => this.#indexBefore(bookmarkId),
      logger,
    });
    drops.start();
    return () => drops.stop();
  }

  #indexBefore(bookmarkId: string | null): number | undefined {
    const index = bookmarkId === null ? -1 : this.#sources.childIds().indexOf(bookmarkId);
    return index < 0 ? undefined : index;
  }
}
