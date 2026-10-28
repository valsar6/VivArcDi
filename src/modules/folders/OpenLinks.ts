import type { BrowserTabs } from '../../core/BrowserTabs.js';
import type { Logger } from '../../core/Logger.js';
import { AddressKey } from '../../core/AddressKey.js';
import { FrameTask } from '../../core/FrameTask.js';
import type { FrameTiming } from '../../core/FrameTask.js';
import { TabData } from '../../core/TabData.js';
import { UnloadedTabs } from '../favorites/UnloadedTabs.js';

export type OpenLinksTabs = Pick<BrowserTabs, 'query' | 'onCreated' | 'onUpdated' | 'onActivated' | 'onRemoved'>;

export interface OpenTab {
  tabId: number;
  title: string | undefined;
  /** Address key of the page the tab shows, or null when it is not a web page. */
  key: string | null;
  favIconUrl: string | undefined;
  active: boolean;
  unloaded: boolean;
}

export interface LinkRef {
  /** Id of the bookmark. */
  id: string;
  /** Address key of the bookmark. */
  key: string;
}

const WATCHED_CHANGES = ['url', 'pendingUrl', 'discarded', 'status', 'favIconUrl', 'title', 'vivExtData'] as const;

export class OpenLinks {
  #tabs: OpenLinksTabs;
  #onChange: () => void;
  #logger: Logger;
  #task: FrameTask;
  #linkedTabIds: number[] = [];
  #linked = new Map<string, OpenTab>();
  #unlinked = new Map<string, OpenTab>();
  #signature = '';
  #unsubscribe: Array<() => void> = [];

  /**
   * Knows which tab stands for each link in the current window and workspace, so that a link can
   * show its tab and a click can switch to it. A tab belongs to the link whose bookmark id it
   * carries, whatever page it shows. A tab with no bookmark id at all belongs to the link that has
   * its address, until the tab is linked. When several tabs qualify, the most recently used one
   * counts.
   *
   * @param tabs Tabs API.
   * @param onChange Called when the tabs of the links change.
   * @param logger Logger for failures.
   * @param timing Frame scheduling, replaceable in tests.
   */
  constructor(tabs: OpenLinksTabs, onChange: () => void, logger: Logger, timing: FrameTiming = {}) {
    this.#tabs = tabs;
    this.#onChange = onChange;
    this.#logger = logger;
    this.#task = new FrameTask(() => void this.refresh(), timing);
  }

  /**
   * Reads the tabs and starts following them. Throws when a tab event is missing.
   */
  public async start(): Promise<void> {
    const request = (): void => this.#task.request();
    this.#unsubscribe = [
      this.#tabs.onCreated(request),
      this.#tabs.onUpdated((_id, change) => {
        if (WATCHED_CHANGES.some((name) => name in change)) {
          request();
        }
      }),
      this.#tabs.onActivated(request),
      this.#tabs.onRemoved(request),
    ];
    await this.refresh();
  }

  /**
   * Stops following the tabs.
   */
  public stop(): void {
    this.#task.cancel();
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
  }

  /**
   * @returns The ids of the tabs of the window that carry a bookmark id, in any workspace.
   */
  public get linkedTabIds(): number[] {
    return this.#linkedTabIds;
  }

  /**
   * @param link A link of the section.
   * @returns The tab linked to it, else the unlinked tab that shows its address, or undefined.
   */
  public tabFor(link: LinkRef): OpenTab | undefined {
    return this.#linked.get(link.id) ?? this.#unlinked.get(link.key);
  }

  /**
   * Reads the tabs again and reports a change.
   */
  public async refresh(): Promise<void> {
    try {
      this.#update(await this.#tabs.query({ currentWindow: true }));
    } catch (error) {
      this.#logger.warn('could not read the open tabs', error);
    }
  }

  static #bookmarkIdOf(tab: chrome.tabs.Tab): string | undefined {
    return TabData.ownOf(tab).bookmarkId;
  }

  static #openTab(tab: chrome.tabs.Tab): OpenTab {
    return {
      tabId: tab.id ?? -1,
      title: tab.title,
      key: AddressKey.from(tab.url ?? tab.pendingUrl),
      favIconUrl: tab.favIconUrl,
      active: tab.active,
      unloaded: UnloadedTabs.isUnloaded(tab),
    };
  }

  static #moreRecent(current: chrome.tabs.Tab | undefined, candidate: chrome.tabs.Tab): chrome.tabs.Tab {
    return current !== undefined && (current.lastAccessed ?? 0) >= (candidate.lastAccessed ?? 0) ? current : candidate;
  }

  static #byGroup(tabs: chrome.tabs.Tab[], groupOf: (tab: chrome.tabs.Tab) => string | null | undefined): Map<string, OpenTab> {
    const chosen = new Map<string, chrome.tabs.Tab>();
    for (const tab of tabs) {
      const group = groupOf(tab);
      if (group !== null && group !== undefined) {
        chosen.set(group, OpenLinks.#moreRecent(chosen.get(group), tab));
      }
    }
    return new Map([...chosen].map(([group, tab]) => [group, OpenLinks.#openTab(tab)]));
  }

  #update(tabs: chrome.tabs.Tab[]): void {
    const linkedTabIds = tabs.filter((tab) => OpenLinks.#bookmarkIdOf(tab) !== undefined).flatMap((tab) => (tab.id === undefined ? [] : [tab.id]));
    const active = tabs.find((tab) => tab.active);
    const visible = tabs.filter((tab) => tab.id !== undefined && (active === undefined || TabData.shares(tab, active)));
    const linked = OpenLinks.#byGroup(visible, OpenLinks.#bookmarkIdOf);
    const unlinked = OpenLinks.#byGroup(
      visible.filter((tab) => OpenLinks.#bookmarkIdOf(tab) === undefined),
      (tab) => AddressKey.from(tab.url ?? tab.pendingUrl),
    );
    const signature = JSON.stringify([linkedTabIds, [...linked], [...unlinked]]);
    if (signature !== this.#signature) {
      this.#signature = signature;
      this.#linkedTabIds = linkedTabIds;
      this.#linked = linked;
      this.#unlinked = unlinked;
      this.#onChange();
    }
  }
}
