import { AddressKey } from '../../core/AddressKey.js';
import { BookmarkCopier } from '../../core/bookmarks/BookmarkCopier.js';
import type { BookmarkNode } from '../../core/bookmarks/BookmarkNode.js';
import type { BookmarkWriter } from '../../core/bookmarks/BookmarkWriter.js';
import { KeptTab } from '../../core/KeptTab.js';
import type { Logger } from '../../core/Logger.js';
import { TabData } from '../../core/TabData.js';
import type { CreatedLinks } from './CreatedLinks.js';
import type { TabLinks } from './TabLinks.js';

export type FavoritesWriter = Pick<BookmarkWriter, 'create' | 'remove' | 'ensurePath' | 'get' | 'subTree' | 'removeTree'>;
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

/** What `copy` did: `copied`, `ignored` when nothing was copied, `failed` after a logged error and the removal of the partial copy. */
export type CopyResult = 'copied' | 'ignored' | 'failed';

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
  #copier: BookmarkCopier;

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
    this.#copier = new BookmarkCopier(dependencies.writer);
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
   * Adds a link of the root of the active workspace that no tab stands for: a bookmark with a
   * title and an address, for a page that is not open. The base and workspace folders are created
   * when they do not exist. An address that is not `http` or `https` is ignored.
   *
   * @param page The title and the address.
   * @param place A folder and a position; by default the end of the root.
   * @returns What happened.
   */
  public async addLink({ title, url }: { title: string; url: string }, { parentId, index }: AddPlace = {}): Promise<AddResult> {
    if (AddressKey.from(url) === null) {
      return 'ignored';
    }
    try {
      const folderId = parentId ?? (await this.#rootId());
      if (folderId === null) {
        return 'ignored';
      }
      await this.#deps.writer.create({ parentId: folderId, index, title: title === '' ? url : title, url });
      return 'added';
    } catch (error) {
      this.#deps.logger.warn('could not add the link to the workspace favorites', error);
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
   * Copies bookmarks or bookmark folders, with all their levels, into a folder of the workspace
   * favorites or into the root of the active workspace, created if needed. The originals stay
   * where they are and the copies are bookmarks that VivArcDi made, so they are removed when their
   * link is taken out, and are not links of any tab. A folder dropped
   * into itself is ignored, and a write that fails removes what was copied and is logged.
   *
   * @param ids The bookmarks or folders to copy, in order.
   * @param place A folder and a position; by default the end of the root.
   * @returns What happened.
   */
  public async copy(ids: string[], { parentId, index }: AddPlace = {}): Promise<CopyResult> {
    try {
      const folderId = parentId ?? (await this.#rootId());
      if (folderId === null || ids.length === 0) {
        return 'ignored';
      }
      const copies = await this.#copier.copy(ids, folderId, index);
      await this.#remember(copies);
      return copies.length > 0 ? 'copied' : 'ignored';
    } catch (error) {
      this.#deps.logger.warn('could not copy the bookmarks to the workspace favorites', error);
      return 'failed';
    }
  }

  /**
   * Takes a link back out of the workspace favorites. The bookmark is removed only when VivArcDi
   * created it; any other bookmark stays and keeps its link and its tab. Given a tab, it is
   * unlinked together with the removal of the bookmark.
   *
   * @param target The tab that may be the tab of a link, or the id of a link that has no tab to unlink.
   * @returns What happened.
   */
  public async take(target: chrome.tabs.Tab | string): Promise<TakeResult> {
    return typeof target === 'string' ? this.#takeLink(target, null) : this.#takeTab(target);
  }

  async #takeTab(tab: chrome.tabs.Tab): Promise<TakeResult> {
    const { bookmarkId } = TabData.ownOf(tab);
    return tab.id === undefined || bookmarkId === undefined ? 'none' : this.#takeLink(bookmarkId, tab.id);
  }

  async #takeLink(bookmarkId: string, tabId: number | null): Promise<TakeResult> {
    if (!this.#deps.created.has(bookmarkId)) {
      return 'kept';
    }
    try {
      if (tabId !== null) {
        await this.#deps.links.unlink(tabId);
      }
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

  async #remember(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.#rememberLinks(await this.#deps.writer.subTree(id));
    }
  }

  #rememberLinks(node: BookmarkNode): void {
    if (node.url !== undefined) {
      this.#deps.created.add(node.id);
    }
    node.children?.forEach((child) => this.#rememberLinks(child));
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
