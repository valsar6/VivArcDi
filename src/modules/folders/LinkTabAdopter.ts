import { AddressKey } from '../../core/AddressKey.js';
import type { BrowserTabs } from '../../core/BrowserTabs.js';
import { KeptTab } from '../../core/KeptTab.js';
import type { Logger } from '../../core/Logger.js';
import { TabData } from '../../core/TabData.js';
import type { LinkEntry } from './FolderTree.js';
import type { TabLinks } from './TabLinks.js';

export type AdopterTabs = Pick<BrowserTabs, 'query' | 'get' | 'onCreated' | 'onUpdated' | 'onRemoved'>;

export class LinkTabAdopter {
  #tabs: AdopterTabs;
  #links: () => LinkEntry[];
  #tabLinks: Pick<TabLinks, 'link'>;
  #logger: Logger;
  #fresh = new Set<number>();
  #queue: Promise<void> = Promise.resolve();
  #unsubscribe: Array<() => void> = [];

  /**
   * Makes a tab the tab of a link when it shows the link's address and the link has no tab in the
   * tab's workspace. It looks at the tabs open at start-up and at every new tab on its first
   * navigation to a web address; a tab that already showed a web page is never adopted, so
   * following a link inside a today's tab does not pull it into a folder.
   *
   * @param tabs Tabs API.
   * @param links The links of the section now.
   * @param tabLinks Writes the link into a tab.
   * @param logger Logger for failures.
   */
  constructor(tabs: AdopterTabs, links: () => LinkEntry[], tabLinks: Pick<TabLinks, 'link'>, logger: Logger) {
    this.#tabs = tabs;
    this.#links = links;
    this.#tabLinks = tabLinks;
    this.#logger = logger;
  }

  /**
   * Starts watching new tabs. Throws when a tab event is missing.
   */
  public start(): void {
    this.#unsubscribe = [
      this.#tabs.onCreated((tab) => this.#watch(tab)),
      this.#tabs.onUpdated((tabId, change) => this.#navigated(tabId, change)),
      this.#tabs.onRemoved((tabId) => void this.#fresh.delete(tabId)),
    ];
  }

  /**
   * Stops watching tabs.
   */
  public stop(): void {
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
    this.#fresh.clear();
  }

  /**
   * Adopts the tabs of the current window that already show the address of a link with no tab.
   */
  public async adoptOpenTabs(): Promise<void> {
    try {
      const tabs = await this.#tabs.query({ currentWindow: true });
      const claims = LinkTabAdopter.#claimsOf(tabs);
      for (const tab of tabs) {
        await this.#adopt(tab, AddressKey.from(tab.url ?? tab.pendingUrl), claims);
      }
    } catch (error) {
      this.#logger.warn('could not link the open tabs to the folders', error);
    }
  }

  static #claim(tab: chrome.tabs.Tab, bookmarkId: string): string {
    return `${TabData.of(tab) ?? ''}|${bookmarkId}`;
  }

  static #claimsOf(tabs: chrome.tabs.Tab[]): Set<string> {
    return new Set(tabs.flatMap((tab) => {
      const { bookmarkId } = TabData.ownOf(tab);
      return bookmarkId === undefined ? [] : [LinkTabAdopter.#claim(tab, bookmarkId)];
    }));
  }

  #watch(tab: chrome.tabs.Tab): void {
    if (tab.id !== undefined && AddressKey.from(tab.url) === null) {
      this.#fresh.add(tab.id);
    }
  }

  #navigated(tabId: number, change: chrome.tabs.OnUpdatedInfo): void {
    const key = AddressKey.from(change.url);
    if (!this.#fresh.has(tabId) || key === null) {
      return;
    }
    this.#fresh.delete(tabId);
    this.#queue = this.#queue.then(() => this.#adoptNew(tabId, key)).catch((error: unknown) => this.#logger.warn('could not link the new tab to a folder', error));
  }

  async #adoptNew(tabId: number, key: string): Promise<void> {
    const tab = await this.#tabs.get(tabId);
    const sameWindow = await this.#tabs.query({ windowId: tab.windowId });
    await this.#adopt(tab, key, LinkTabAdopter.#claimsOf(sameWindow));
  }

  async #adopt(tab: chrome.tabs.Tab, key: string | null, claims: Set<string>): Promise<void> {
    if (tab.id === undefined || key === null || KeptTab.is(tab)) {
      return;
    }
    const link = this.#links().find((candidate) => candidate.key === key && !claims.has(LinkTabAdopter.#claim(tab, candidate.id)));
    if (link !== undefined) {
      claims.add(LinkTabAdopter.#claim(tab, link.id));
      await this.#tabLinks.link(tab.id, link.id);
    }
  }
}
