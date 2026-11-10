import type { BrowserTabs } from '../../core/BrowserTabs.js';
import type { Logger } from '../../core/Logger.js';
import { OwnPage } from '../../core/OwnPage.js';
import { TabData } from '../../core/TabData.js';
import type { WorkspaceNames } from '../../core/WorkspaceNames.js';
import type { PinnedEntry } from './SyncStore.js';

export interface LocalPinnedTab {
  tabId: number;
  /** Position of the tab in its window. */
  index: number;
  /** Whether the user is looking at the tab. */
  active: boolean;
  /** Whether the tab shows another page than its own page. */
  away: boolean;
  entry: PinnedEntry;
}

export type PinnedGroups = Map<string | null, LocalPinnedTab[]>;

export class LocalPinned {
  #tabs: Pick<BrowserTabs, 'query'>;
  #names: Pick<WorkspaceNames, 'nameOf'>;
  #logger: Logger;
  #warned = false;

  /**
   * Reads the pinned tabs of a window as entries of the sync store, grouped by workspace name.
   * Tabs that stand for a Favorite are left out, because the Favorites folder syncs them, and so
   * are tabs without a web address or in a workspace this computer cannot name.
   *
   * @param tabs Tabs API.
   * @param names The names of the workspaces.
   * @param logger Logger for tabs that cannot be synced.
   */
  constructor(tabs: Pick<BrowserTabs, 'query'>, names: Pick<WorkspaceNames, 'nameOf'>, logger: Logger) {
    this.#tabs = tabs;
    this.#names = names;
    this.#logger = logger;
  }

  /**
   * @param tabs The tabs of one workspace.
   * @returns The first tab of each own page, in the same order.
   */
  public static distinct(tabs: LocalPinnedTab[]): LocalPinnedTab[] {
    const seen = new Set<string>();
    return tabs.filter(({ entry }) => !seen.has(entry.key) && seen.add(entry.key));
  }

  /**
   * @param windowId The window to read.
   * @returns Its pinned tabs by workspace name, with null for the area outside any workspace, each list in tab order.
   */
  public async read(windowId: number): Promise<PinnedGroups> {
    const pinned = await this.#tabs.query({ pinned: true, windowId });
    const groups: PinnedGroups = new Map();
    for (const tab of [...pinned].sort((left, right) => left.index - right.index)) {
      const workspaceId = TabData.of(tab);
      const name = this.#names.nameOf(workspaceId);
      const local = workspaceId !== null && name === null ? null : this.#local(tab);
      if (local !== null) {
        groups.set(name, [...(groups.get(name) ?? []), local]);
      }
    }
    return groups;
  }

  #local(tab: chrome.tabs.Tab): LocalPinnedTab | null {
    const url = OwnPage.of(tab) ?? tab.url ?? tab.pendingUrl;
    const key = OwnPage.keyOf(tab);
    if (tab.id === undefined || TabData.ownOf(tab).favoriteId !== undefined) {
      return null;
    }
    if (key === null || url === undefined) {
      this.#warnOnce();
      return null;
    }
    return { tabId: tab.id, index: tab.index, active: tab.active, away: OwnPage.isAway(tab), entry: { key, title: tab.title ?? url, url } };
  }

  #warnOnce(): void {
    if (!this.#warned) {
      this.#warned = true;
      this.#logger.warn('a pinned tab without a web address is not synced');
    }
  }
}
