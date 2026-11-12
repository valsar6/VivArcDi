import type { BookmarkWriter } from '../../../core/bookmarks/BookmarkWriter.js';
import type { BrowserTabs } from '../../../core/BrowserTabs.js';
import type { FavoriteDropTarget, FavoriteDropZone } from '../../../shared/dragdrop/FavoriteDropZone.js';
import { LinkId } from '../../../shared/links/LinkId.js';
import type { Logger } from '../../../core/Logger.js';
import { TabData } from '../../../core/TabData.js';
import { TabRowMove } from '../../../shared/dragdrop/TabRowMove.js';
import type { TodayList, TodayTarget } from '../../../shared/tabs/TodayList.js';
import { FAILED_TEXT, KEPT_TEXT } from './FavoriteShortcut.js';
import type { TabLinks } from '../links/TabLinks.js';
import type { WorkspaceFavorites } from './WorkspaceFavorites.js';

export type LinkRemovalTabs = Pick<BrowserTabs, 'get' | 'query' | 'create' | 'move'>;

export interface LinkRemovalDependencies {
  tabs: LinkRemovalTabs;
  writer: Pick<BookmarkWriter, 'get'>;
  /** Writes the link between a tab and a bookmark. */
  links: Pick<TabLinks, 'link' | 'unlink'>;
  favorites: Pick<WorkspaceFavorites, 'take'>;
  /** The Favorites grid, offered by the Favorites. */
  grid: Pick<FavoriteDropZone, 'at' | 'mark' | 'clear' | 'drop' | 'end'>;
  today: Pick<TodayList, 'at' | 'mark' | 'clear' | 'first'>;
  /** Shows a short message to the user. */
  notify: (text: string) => void;
  logger: Logger;
}

/** Where a link goes: the Favorites grid, or the tab list under the separator. */
export type LinkRemovalPlace = { kind: 'grid'; target: FavoriteDropTarget } | { kind: 'today'; target: TodayTarget };

interface Page {
  title: string;
  url: string;
}

export class LinkRemoval {
  #deps: LinkRemovalDependencies;
  #rows: TabRowMove;

  /**
   * Takes a link out of the folders section and keeps its page, as Arc does. Released over the
   * tab list under the separator, the page becomes a tab of today at the row under the pointer;
   * released over the Favorites grid, it becomes a Favorite at the drop position. The tab of the
   * link in the active workspace is the page; without one the page is opened or added from its
   * address. The page is placed first, and only then is the link taken out by the rule of
   * Cmd/Ctrl+D: the bookmark is removed when VivArcDi created it, otherwise it stays and a toast
   * says so. A failure leaves the link where it was. Released anywhere else, nothing changes. The
   * menu commands use the same move with a fixed place: the top of today's tabs, or the end of the
   * grid.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: LinkRemovalDependencies) {
    this.#deps = dependencies;
    this.#rows = new TabRowMove({ tabs: dependencies.tabs, logger: dependencies.logger });
  }

  /**
   * Marks the place under the pointer while a link row is dragged.
   *
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  public over(x: number, y: number): void {
    const { grid, today } = this.#deps;
    const place = this.placeAt(x, y);
    grid.mark(place?.kind === 'grid' ? place.target : null);
    if (place?.kind === 'today') {
      today.mark(x, y);
    } else {
      today.clear();
    }
  }

  /**
   * Removes the marks.
   */
  public clear(): void {
    this.#deps.grid.clear();
    this.#deps.today.clear();
  }

  /**
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   * @returns The place under the point, or null when it is neither the grid nor the tab list.
   */
  public placeAt(x: number, y: number): LinkRemovalPlace | null {
    const target = this.#deps.grid.at(x, y);
    if (target !== null) {
      return { kind: 'grid', target };
    }
    const today = this.#deps.today.at(x, y);
    return today === null ? null : { kind: 'today', target: today };
  }

  /**
   * @param linkId The bookmark of the link row that was released.
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  public async release(linkId: string, x: number, y: number): Promise<void> {
    const place = this.placeAt(x, y);
    if (place !== null) {
      await this.moveTo(linkId, place);
    }
  }

  /**
   * Remove pin: the page of the link becomes the first tab of today.
   *
   * @param linkId The bookmark of the link.
   */
  public async removePin(linkId: string): Promise<void> {
    await this.moveTo(linkId, { kind: 'today', target: this.#deps.today.first() });
  }

  /**
   * Tile tab: the page of the link becomes a Favorite at the end of the grid.
   *
   * @param linkId The bookmark of the link.
   */
  public async tile(linkId: string): Promise<void> {
    const target = this.#deps.grid.end();
    if (target !== null) {
      await this.moveTo(linkId, { kind: 'grid', target });
    }
  }

  /**
   * Keeps the page of a link at a place and takes the link out. A row of a live folder is not a
   * bookmark and is left alone.
   *
   * @param linkId The bookmark of the link.
   * @param place Where the page goes.
   */
  public async moveTo(linkId: string, place: LinkRemovalPlace): Promise<void> {
    if (LinkId.isVirtual(linkId)) {
      return;
    }
    try {
      const { title, url } = await this.#deps.writer.get(linkId);
      if (url === undefined) {
        return;
      }
      if (!(await this.#keepPage(place, linkId, await this.#tabOf(linkId), { title, url }))) {
        this.#deps.logger.warn(`could not keep the page of the link "${title}": the link stays`);
        return;
      }
      await this.#takeOut(linkId);
    } catch (error) {
      this.#deps.logger.warn('could not take the link out of the folders', error);
      this.#deps.notify(FAILED_TEXT);
    }
  }

  async #tabOf(linkId: string): Promise<number | undefined> {
    const tabs = await this.#deps.tabs.query({ currentWindow: true });
    const active = tabs.find((tab) => tab.active);
    const candidates = tabs.filter((tab) => TabData.ownOf(tab).bookmarkId === linkId && (active === undefined || TabData.shares(tab, active)));
    return candidates.sort((first, second) => (second.lastAccessed ?? 0) - (first.lastAccessed ?? 0))[0]?.id;
  }

  async #keepPage(place: LinkRemovalPlace, linkId: string, tabId: number | undefined, page: Page): Promise<boolean> {
    if (place.kind === 'grid') {
      return this.#keepAsFavorite(place.target, linkId, tabId, page);
    }
    if (tabId === undefined) {
      const { id } = await this.#deps.tabs.create({ url: page.url, active: false });
      if (id === undefined) {
        return false;
      }
      await this.#rows.to(id, place.target.rowTabId);
      return true;
    }
    await this.#deps.links.unlink(tabId);
    await this.#rows.to(tabId, place.target.rowTabId);
    return true;
  }

  async #keepAsFavorite(target: FavoriteDropTarget, linkId: string, tabId: number | undefined, page: Page): Promise<boolean> {
    if (tabId === undefined) {
      return this.#deps.grid.drop(target, page);
    }
    await this.#deps.links.unlink(tabId);
    const added = await this.#deps.grid.drop(target, { tab: await this.#deps.tabs.get(tabId) }).catch(() => false);
    if (!added) {
      await this.#deps.links.link(tabId, linkId);
    }
    return added;
  }

  async #takeOut(linkId: string): Promise<void> {
    const result = await this.#deps.favorites.take(linkId);
    if (result === 'kept') {
      this.#deps.notify(KEPT_TEXT);
    } else if (result === 'failed') {
      this.#deps.notify(FAILED_TEXT);
    }
  }
}
