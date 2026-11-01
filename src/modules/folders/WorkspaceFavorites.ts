import { AddressKey } from '../../core/AddressKey.js';
import type { BookmarkWriter } from '../../core/bookmarks/BookmarkWriter.js';
import { KeptTab } from '../../core/KeptTab.js';
import type { Logger } from '../../core/Logger.js';
import { TabData } from '../../core/TabData.js';
import type { CreatedLinks } from './CreatedLinks.js';
import type { TabLinks } from './TabLinks.js';

export type FavoritesWriter = Pick<BookmarkWriter, 'create' | 'remove' | 'ensurePath'>;
export type FavoritesLinks = Pick<TabLinks, 'link' | 'unlink'>;

export interface FavoritesDependencies {
  /** Creates and removes the bookmarks. */
  writer: FavoritesWriter;
  /** Writes the link between a tab and a bookmark. */
  links: FavoritesLinks;
  /** The bookmarks VivArcDi created. */
  created: Pick<CreatedLinks, 'has' | 'add' | 'remove'>;
  /** The path of the root folder of the active workspace; empty when it has none. */
  root: () => string[];
  logger: Logger;
}

/** What `add` did: `added`, `ignored` for a tab that cannot become a link, `failed` after a logged error. */
export type AddResult = 'added' | 'ignored' | 'failed';

/** What `take` did: `taken`, `kept` when the bookmark is not VivArcDi's so nothing changed, `failed`, or `none` for a tab with no link. */
export type TakeResult = 'taken' | 'kept' | 'failed' | 'none';

/** Where `add` puts the bookmark: in a folder, or in the root; at an index among its children, or at the end. */
export interface AddPlace {
  /** A folder to add to; when missing, the root of the active workspace, created if needed. */
  parentId?: string | undefined;
  index?: number | undefined;
}

export const NEW_FOLDER_TITLE = 'Untitled';

export class WorkspaceFavorites {
  #deps: FavoritesDependencies;

  /**
   * Everything that writes to the workspace favorites, the folders section of the tab bar: it adds a
   * tab as a link of the workspace's root, takes it back, and makes a new folder. A write that fails
   * is logged and leaves the bookmarks and the tab as they were; the section only follows the
   * bookmark events that the writes cause.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: FavoritesDependencies) {
    this.#deps = dependencies;
  }

  /**
   * Makes a tab a link of the root of the active workspace: a bookmark with the title and the
   * address of the tab, and the tab becomes the tab of that bookmark. The base and workspace
   * folders are created when they do not exist. A web page that is pinned, a Favorite, already a
   * link, or not `http` or `https` is ignored.
   *
   * @param tab The tab.
   * @param place A folder and a position; by default the end of the root.
   * @returns What happened.
   */
  public async add(tab: chrome.tabs.Tab, { parentId, index }: AddPlace = {}): Promise<AddResult> {
    const { id, url } = tab;
    if (id === undefined || url === undefined || !WorkspaceFavorites.#canBecomeLink(tab)) {
      return 'ignored';
    }
    try {
      const folderId = parentId ?? (await this.#rootId());
      if (folderId === null) {
        return 'ignored';
      }
      const bookmark = await this.#deps.writer.create({ parentId: folderId, index, title: WorkspaceFavorites.#titleOf(tab), url });
      await this.#link(id, bookmark.id);
      return 'added';
    } catch (error) {
      this.#deps.logger.warn('could not add the tab to the workspace favorites', error);
      return 'failed';
    }
  }

  /**
   * Creates a folder named `Untitled` at the end of the root of the active workspace, creating the
   * base and workspace folders first when they do not exist.
   *
   * @returns The id of the new folder, or null when nothing was created.
   */
  public async addFolder(): Promise<string | null> {
    try {
      const parentId = await this.#rootId();
      return parentId === null ? null : (await this.#deps.writer.create({ parentId, title: NEW_FOLDER_TITLE })).id;
    } catch (error) {
      this.#deps.logger.warn('could not create the folder', error);
      return null;
    }
  }

  /**
   * Takes a tab back to the list of open tabs. The bookmark is removed only when VivArcDi created
   * it; any other bookmark keeps its link and its tab.
   *
   * @param tab The tab that may be the tab of a link.
   * @returns What happened.
   */
  public async take(tab: chrome.tabs.Tab): Promise<TakeResult> {
    const { bookmarkId } = TabData.ownOf(tab);
    if (tab.id === undefined || bookmarkId === undefined) {
      return 'none';
    }
    if (!this.#deps.created.has(bookmarkId)) {
      return 'kept';
    }
    try {
      await this.#deps.links.unlink(tab.id);
      await this.#deps.writer.remove(bookmarkId);
      this.#deps.created.remove(bookmarkId);
      return 'taken';
    } catch (error) {
      this.#deps.logger.warn('could not take the tab back from the workspace favorites', error);
      return 'failed';
    }
  }

  async #rootId(): Promise<string | null> {
    const path = this.#deps.root();
    return path.length === 0 ? null : this.#deps.writer.ensurePath(path);
  }

  async #link(tabId: number, bookmarkId: string): Promise<void> {
    this.#deps.created.add(bookmarkId);
    try {
      await this.#deps.links.link(tabId, bookmarkId);
    } catch (error) {
      this.#deps.created.remove(bookmarkId);
      await this.#deps.writer.remove(bookmarkId).catch(() => undefined);
      throw error;
    }
  }

  static #canBecomeLink(tab: chrome.tabs.Tab): boolean {
    return AddressKey.from(tab.url) !== null && !KeptTab.is(tab);
  }

  static #titleOf(tab: chrome.tabs.Tab): string {
    return tab.title !== undefined && tab.title !== '' ? tab.title : (tab.url ?? '');
  }
}
