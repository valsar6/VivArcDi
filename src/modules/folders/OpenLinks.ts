import type { BrowserTabs } from '../../core/BrowserTabs.js';
import type { Logger } from '../../core/Logger.js';
import { AddressKey } from '../../core/AddressKey.js';
import { FrameTask } from '../../core/FrameTask.js';
import type { FrameTiming } from '../../core/FrameTask.js';
import { TabData } from '../../core/TabData.js';

export type OpenLinksTabs = Pick<BrowserTabs, 'query' | 'onCreated' | 'onUpdated' | 'onActivated' | 'onRemoved'>;

export interface OpenTab {
  tabId: number;
  favIconUrl: string | undefined;
}

const WATCHED_CHANGES = ['url', 'pendingUrl', 'discarded', 'status', 'favIconUrl'] as const;

export class OpenLinks {
  #tabs: OpenLinksTabs;
  #onChange: () => void;
  #logger: Logger;
  #task: FrameTask;
  #open = new Map<string, OpenTab>();
  #signature = '';
  #unsubscribe: Array<() => void> = [];

  /**
   * Knows which address is open in a tab of the current window and workspace, so that a link can
   * show a dot and a click can switch to the tab. When several tabs show the same address, the
   * most recently used one counts.
   *
   * @param tabs Tabs API.
   * @param onChange Called when the set of open addresses changes.
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
   * @param key An address key.
   * @returns The tab that shows that address, or undefined.
   */
  public tabFor(key: string): OpenTab | undefined {
    return this.#open.get(key);
  }

  /**
   * Reads the tabs again and reports a change.
   */
  public async refresh(): Promise<void> {
    try {
      this.#update(OpenLinks.#visibleByKey(await this.#tabs.query({ currentWindow: true })));
    } catch (error) {
      this.#logger.warn('could not read the open tabs', error);
    }
  }

  static #visibleByKey(tabs: chrome.tabs.Tab[]): Map<string, chrome.tabs.Tab> {
    const active = tabs.find((tab) => tab.active);
    const open = new Map<string, chrome.tabs.Tab>();
    for (const tab of tabs) {
      const key = AddressKey.from(tab.url ?? tab.pendingUrl);
      if (key !== null && tab.id !== undefined && (active === undefined || TabData.shares(tab, active))) {
        open.set(key, OpenLinks.#moreRecent(open.get(key), tab));
      }
    }
    return open;
  }

  static #moreRecent(current: chrome.tabs.Tab | undefined, candidate: chrome.tabs.Tab): chrome.tabs.Tab {
    return current !== undefined && (current.lastAccessed ?? 0) >= (candidate.lastAccessed ?? 0) ? current : candidate;
  }

  #update(open: Map<string, chrome.tabs.Tab>): void {
    const next = new Map<string, OpenTab>();
    open.forEach((tab, key) => next.set(key, { tabId: tab.id ?? -1, favIconUrl: tab.favIconUrl }));
    const signature = JSON.stringify([...next]);
    if (signature !== this.#signature) {
      this.#signature = signature;
      this.#open = next;
      this.#onChange();
    }
  }
}
