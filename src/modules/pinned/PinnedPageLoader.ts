import type { BrowserTabs } from '../../core/browser/BrowserTabs.js';
import type { Logger } from '../../core/support/Logger.js';
import { OwnPage } from '../../shared/tabs/OwnPage.js';
import { UnloadedTabs } from '../../shared/tabs/UnloadedTabs.js';

export type PinnedPageTabs = Pick<
  BrowserTabs,
  'get' | 'query' | 'update' | 'onActivated' | 'onUpdated' | 'onRemoved'
>;

export class PinnedPageLoader {
  #tabs: PinnedPageTabs;
  #logger: Logger;
  #pending = new Set<number>();
  #unsubscribe: Array<() => void> = [];

  /**
   * Loads the pinned page of a pinned tab when it is opened after an unload or a restart, so
   * the page the tab showed last never replaces it. A tab without a pinned page is left alone.
   *
   * @param tabs Tabs API.
   * @param logger Reports a page that could not be loaded.
   */
  constructor(tabs: PinnedPageTabs, logger: Logger) {
    this.#tabs = tabs;
    this.#logger = logger;
  }

  /**
   * Starts following activations and updates, and reopens the active tab of the window.
   */
  public async start(): Promise<void> {
    this.#unsubscribe.push(this.#tabs.onActivated(({ tabId }) => void this.#load(tabId)));
    this.#unsubscribe.push(this.#tabs.onUpdated((tabId, change, tab) => void this.#follow(tabId, change, tab)));
    this.#unsubscribe.push(this.#tabs.onRemoved((tabId) => this.#pending.delete(tabId)));
    const [active] = await this.#tabs.query({ active: true, currentWindow: true });
    if (active?.id !== undefined) {
      await this.#load(active.id);
    }
  }

  /**
   * Stops following the tabs.
   */
  public stop(): void {
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
    this.#pending.clear();
  }

  async #load(tabId: number): Promise<void> {
    try {
      const tab = await this.#tabs.get(tabId);
      const page = OwnPage.of(tab);
      if (!tab.pinned || page === null || !UnloadedTabs.isUnloaded(tab)) {
        return;
      }
      this.#pending.add(tabId);
      await this.#tabs.update(tabId, { url: page });
    } catch (error) {
      this.#warn(tabId, error);
    }
  }

  async #follow(tabId: number, change: chrome.tabs.OnUpdatedInfo, tab: chrome.tabs.Tab): Promise<void> {
    if (!this.#pending.has(tabId) || change.status !== 'complete') {
      return;
    }
    this.#pending.delete(tabId);
    const page = OwnPage.of(tab);
    if (!tab.pinned || page === null || !OwnPage.isAway(tab)) {
      return;
    }
    try {
      await this.#tabs.update(tabId, { url: page });
    } catch (error) {
      this.#warn(tabId, error);
    }
  }

  #warn(tabId: number, error: unknown): void {
    this.#logger.warn(`Could not load the pinned page of tab ${tabId}`, error);
  }
}
