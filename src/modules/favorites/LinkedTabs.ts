import type { BrowserTabs } from '../../core/BrowserTabs.js';
import { TabData } from '../../core/TabData.js';
import type { OwnTabChanges } from '../../core/TabData.js';
import type { Favorite } from './FavoritesFolder.js';

export interface LinkSnapshot {
  /** The active tab of the window, if any. */
  activeTab: chrome.tabs.Tab | null;
  /** Raw `workspaceId` of the active tab, as Vivaldi stores it; undefined outside workspaces. */
  workspaceId: unknown;
  /** The tab linked to each Favorite in the current workspace, by bookmark id. */
  linked: Map<string, chrome.tabs.Tab>;
  /** Ids of every tab of the window linked to a Favorite, whatever its workspace. */
  linkedTabIds: Set<number>;
}

export type LinkedTabsApi = Pick<BrowserTabs, 'query' | 'get' | 'update'>;

export class LinkedTabs {
  #tabs: LinkedTabsApi;

  /**
   * Knows which tabs are linked to which Favorite. The link is the bookmark id that
   * VivArcDi writes into the tab's `vivExtData`, so it survives restarts.
   *
   * @param tabs Tabs API.
   */
  constructor(tabs: LinkedTabsApi) {
    this.#tabs = tabs;
  }

  /**
   * @returns The links of the current window, as seen from its active tab's workspace.
   */
  public async snapshot(): Promise<LinkSnapshot> {
    const tabs = await this.#tabs.query({ currentWindow: true });
    const activeTab = tabs.find((tab) => tab.active) ?? null;
    const workspace = activeTab === null ? null : TabData.of(activeTab);
    const linked = new Map<string, chrome.tabs.Tab>();
    const linkedTabIds = new Set<number>();
    for (const tab of tabs) {
      const favoriteId = LinkedTabs.#favoriteIdOf(tab);
      if (favoriteId === undefined) {
        continue;
      }
      linkedTabIds.add(tab.id as number);
      if (TabData.of(tab) === workspace && LinkedTabs.#preferred(tab, linked.get(favoriteId))) {
        linked.set(favoriteId, tab);
      }
    }
    return { activeTab, workspaceId: LinkedTabs.#rawWorkspaceOf(activeTab), linked, linkedTabIds };
  }

  static #favoriteIdOf(tab: chrome.tabs.Tab): string | undefined {
    return tab.id === undefined ? undefined : TabData.ownOf(tab).favoriteId;
  }

  static #rawWorkspaceOf(tab: chrome.tabs.Tab | null): unknown {
    return tab === null ? undefined : TabData.extDataOf(tab)['workspaceId'];
  }

  /**
   * Links a tab to a Favorite and gives it the Favorite's address as its own page.
   *
   * @param tabId The tab.
   * @param favorite The Favorite.
   * @param workspaceId Raw workspace id to give the tab, or undefined to leave it.
   */
  public async link(tabId: number, favorite: Favorite, workspaceId: unknown): Promise<void> {
    const tab = await this.#tabs.get(tabId);
    const extra = workspaceId === undefined ? {} : { workspaceId };
    await this.#tabs.update(tabId, {
      vivExtData: TabData.withOwn(tab, { favoriteId: favorite.id, pinnedUrl: favorite.url }, extra),
    });
  }

  /**
   * Follows a change of the Favorites folder: tabs of removed Favorites are unlinked and show
   * again as pinned tabs, and tabs of a Favorite whose address changed take the new address
   * as their own page.
   *
   * @param favorites The Favorites now in the folder.
   */
  public async sync(favorites: Favorite[]): Promise<void> {
    const byId = new Map(favorites.map((favorite) => [favorite.id, favorite]));
    const tabs = await this.#tabs.query({});
    for (const tab of tabs) {
      const { favoriteId, pinnedUrl } = TabData.ownOf(tab);
      if (favoriteId === undefined || tab.id === undefined) {
        continue;
      }
      const favorite = byId.get(favoriteId);
      if (favorite === undefined) {
        await this.#rewrite(tab.id, { favoriteId: undefined });
      } else if (favorite.url !== pinnedUrl) {
        await this.#rewrite(tab.id, { pinnedUrl: favorite.url });
      }
    }
  }

  async #rewrite(tabId: number, changes: OwnTabChanges): Promise<void> {
    const fresh = await this.#tabs.get(tabId);
    await this.#tabs.update(tabId, { vivExtData: TabData.withOwn(fresh, changes) });
  }

  static #preferred(candidate: chrome.tabs.Tab, current: chrome.tabs.Tab | undefined): boolean {
    return current === undefined || candidate.active || (candidate.lastAccessed ?? 0) > (current.lastAccessed ?? 0);
  }
}
