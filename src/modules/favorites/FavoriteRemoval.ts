import type { BookmarkWriter } from '../../core/bookmarks/BookmarkWriter.js';
import type { BrowserTabs } from '../../core/BrowserTabs.js';
import type { LinkDropTarget, LinkDropZone } from '../../core/LinkDropZone.js';
import type { Logger } from '../../core/Logger.js';
import { TabData } from '../../core/TabData.js';
import { TabDataWriter } from '../../core/TabDataWriter.js';
import { TabRowMove } from '../../core/TabRowMove.js';
import type { LinkedTabs } from './LinkedTabs.js';
import type { TodayList, TodayTarget } from '../../core/TodayList.js';

export type RemovalTabs = Pick<BrowserTabs, 'get' | 'query' | 'update' | 'move' | 'create' | 'remove'>;

export interface FavoriteRemovalDependencies {
  tabs: RemovalTabs;
  writer: Pick<BookmarkWriter, 'get' | 'remove'>;
  links: Pick<LinkedTabs, 'snapshot'>;
  zone: Pick<LinkDropZone, 'at' | 'mark' | 'clear' | 'drop' | 'end'>;
  today: Pick<TodayList, 'at' | 'mark' | 'clear' | 'first'>;
  logger: Logger;
}

/** Where a Favorite goes: the folders section, or the tab list under the separator. */
export type FavoriteRemovalPlace = { kind: 'link'; target: LinkDropTarget } | { kind: 'today'; target: TodayTarget };

export class FavoriteRemoval {
  #deps: FavoriteRemovalDependencies;
  #writer: TabDataWriter;
  #rows: TabRowMove;

  /**
   * Takes a Favorite out of the grid and keeps its page, as Arc does. Released over the folders or
   * the space header, the page becomes a link of the workspace; released over the tab list, it
   * becomes a Today tab at the row under the pointer. The tab of the Favorite in the active
   * workspace is the page; without one the page is opened or linked from its address. Its tabs in
   * other workspaces are closed so the tile is gone everywhere. The bookmark is removed last, so
   * a failure leaves the Favorite where it was. The menu commands use the same move with a fixed
   * place: the top of today's tabs, or the end of the workspace favorites.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: FavoriteRemovalDependencies) {
    this.#deps = dependencies;
    this.#writer = TabDataWriter.of(dependencies.tabs);
    this.#rows = new TabRowMove({ tabs: dependencies.tabs, logger: dependencies.logger });
  }

  /**
   * Marks the place under the pointer while a tile is dragged.
   *
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  public over(x: number, y: number): void {
    const { zone, today } = this.#deps;
    const place = this.placeAt(x, y);
    zone.mark(place?.kind === 'link' ? place.target : null);
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
    this.#deps.zone.clear();
    this.#deps.today.clear();
  }

  /**
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   * @returns The place under the point, or null when it is neither the folders nor the tab list.
   */
  public placeAt(x: number, y: number): FavoriteRemovalPlace | null {
    const target = this.#deps.zone.at(x, y);
    if (target !== null) {
      return { kind: 'link', target };
    }
    const today = this.#deps.today.at(x, y);
    return today === null ? null : { kind: 'today', target: today };
  }

  /**
   * @param favoriteId The Favorite whose tile was released.
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  public async release(favoriteId: string, x: number, y: number): Promise<void> {
    const place = this.placeAt(x, y);
    if (place !== null) {
      await this.moveTo(favoriteId, place);
    }
  }

  /**
   * Untile tab: the page of the Favorite becomes the first tab of today.
   *
   * @param favoriteId The Favorite.
   */
  public async untile(favoriteId: string): Promise<void> {
    await this.moveTo(favoriteId, { kind: 'today', target: this.#deps.today.first() });
  }

  /**
   * Pin tab: the page of the Favorite becomes a link at the end of the workspace favorites.
   *
   * @param favoriteId The Favorite.
   */
  public async pin(favoriteId: string): Promise<void> {
    const target = this.#deps.zone.end();
    if (target !== null) {
      await this.moveTo(favoriteId, { kind: 'link', target });
    }
  }

  /**
   * Keeps the page of a Favorite at a place and takes the Favorite out of the grid.
   *
   * @param favoriteId The Favorite.
   * @param place Where the page goes.
   */
  public async moveTo(favoriteId: string, place: FavoriteRemovalPlace): Promise<void> {
    try {
      const { title, url } = await this.#deps.writer.get(favoriteId);
      if (url === undefined) {
        return;
      }
      const own = (await this.#deps.links.snapshot()).linked.get(favoriteId)?.id;
      const others = await this.#otherTabs(favoriteId, own);
      if (!(await this.#keepPage(place, own, { title, url }))) {
        this.#deps.logger.warn(`could not keep the page of the Favorite "${title}": the Favorite stays`);
        return;
      }
      await Promise.all(others.map((tabId) => this.#deps.tabs.remove(tabId)));
      await this.#deps.writer.remove(favoriteId);
    } catch (error) {
      this.#deps.logger.warn('could not take the Favorite out of the grid', error);
    }
  }

  async #otherTabs(favoriteId: string, own: number | undefined): Promise<number[]> {
    const tabs = await this.#deps.tabs.query({});
    return tabs.flatMap((tab) => (tab.id !== undefined && tab.id !== own && TabData.ownOf(tab).favoriteId === favoriteId ? [tab.id] : []));
  }

  async #keepPage(place: FavoriteRemovalPlace, own: number | undefined, page: { title: string; url: string }): Promise<boolean> {
    if (own !== undefined) {
      await this.#release(own);
    }
    if (place.kind === 'link') {
      return this.#deps.zone.drop(place.target, own === undefined ? page : { tab: await this.#deps.tabs.get(own) });
    }
    if (own === undefined) {
      return (await this.#deps.tabs.create({ url: page.url, active: false })).id !== undefined;
    }
    await this.#rows.to(own, place.target.rowTabId);
    return true;
  }

  async #release(tabId: number): Promise<void> {
    await this.#writer.write(tabId, (tab) => TabData.withOwn(tab, { favoriteId: undefined, pinnedUrl: undefined }));
    await this.#deps.tabs.update(tabId, { pinned: false });
  }
}
