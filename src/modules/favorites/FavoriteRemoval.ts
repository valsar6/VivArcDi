import type { BookmarkWriter } from '../../core/bookmarks/BookmarkWriter.js';
import type { BrowserTabs } from '../../core/BrowserTabs.js';
import type { LinkDropTarget, LinkDropZone } from '../../core/LinkDropZone.js';
import type { Logger } from '../../core/Logger.js';
import { TabData } from '../../core/TabData.js';
import { TabDataWriter } from '../../core/TabDataWriter.js';
import type { LinkedTabs } from './LinkedTabs.js';
import type { TodayList, TodayTarget } from './TodayList.js';

export type RemovalTabs = Pick<BrowserTabs, 'get' | 'query' | 'update' | 'move' | 'create' | 'remove'>;

export interface FavoriteRemovalDependencies {
  tabs: RemovalTabs;
  writer: Pick<BookmarkWriter, 'get' | 'remove'>;
  links: Pick<LinkedTabs, 'snapshot'>;
  zone: Pick<LinkDropZone, 'at' | 'mark' | 'clear' | 'drop'>;
  today: Pick<TodayList, 'at' | 'mark' | 'clear'>;
  logger: Logger;
}

type Place = { kind: 'link'; target: LinkDropTarget } | { kind: 'today'; target: TodayTarget };

export class FavoriteRemoval {
  #deps: FavoriteRemovalDependencies;
  #writer: TabDataWriter;

  /**
   * Takes a Favorite out of the grid and keeps its page, as Arc does. Released over the folders or
   * the space header, the page becomes a link of the workspace; released over the tab list, it
   * becomes a Today tab at the row under the pointer. The tab of the Favorite in the active
   * workspace is the page; without one the page is opened or linked from its address. Its tabs in
   * other workspaces are closed so the tile is gone everywhere. The bookmark is removed last, so
   * a failure leaves the Favorite where it was.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: FavoriteRemovalDependencies) {
    this.#deps = dependencies;
    this.#writer = TabDataWriter.of(dependencies.tabs);
  }

  /**
   * Marks the place under the pointer while a tile is dragged.
   *
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  public over(x: number, y: number): void {
    const { zone, today } = this.#deps;
    const place = this.#placeAt(x, y);
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
   * @param favoriteId The Favorite whose tile was released.
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  public async release(favoriteId: string, x: number, y: number): Promise<void> {
    const place = this.#placeAt(x, y);
    if (place === null) {
      return;
    }
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

  #placeAt(x: number, y: number): Place | null {
    const target = this.#deps.zone.at(x, y);
    if (target !== null) {
      return { kind: 'link', target };
    }
    const today = this.#deps.today.at(x, y);
    return today === null ? null : { kind: 'today', target: today };
  }

  async #otherTabs(favoriteId: string, own: number | undefined): Promise<number[]> {
    const tabs = await this.#deps.tabs.query({});
    return tabs.flatMap((tab) => (tab.id !== undefined && tab.id !== own && TabData.ownOf(tab).favoriteId === favoriteId ? [tab.id] : []));
  }

  async #keepPage(place: Place, own: number | undefined, page: { title: string; url: string }): Promise<boolean> {
    if (own !== undefined) {
      await this.#release(own);
    }
    if (place.kind === 'link') {
      return this.#deps.zone.drop(place.target, own === undefined ? page : { tab: await this.#deps.tabs.get(own) });
    }
    if (own === undefined) {
      return (await this.#deps.tabs.create({ url: page.url, active: false })).id !== undefined;
    }
    await this.#moveToRow(own, place.target.rowTabId);
    return true;
  }

  async #release(tabId: number): Promise<void> {
    await this.#writer.write(tabId, (tab) => TabData.withOwn(tab, { favoriteId: undefined, pinnedUrl: undefined }));
    await this.#deps.tabs.update(tabId, { pinned: false });
  }

  async #moveToRow(tabId: number, rowTabId: number | null): Promise<void> {
    if (rowTabId === null) {
      return;
    }
    try {
      const row = await this.#deps.tabs.get(rowTabId);
      if (row.pinned !== true && row.index !== undefined) {
        await this.#deps.tabs.move(tabId, { index: row.index });
      }
    } catch (error) {
      this.#deps.logger.warn('could not move the tab to the place of the drop', error);
    }
  }
}
