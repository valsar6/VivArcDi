import type { BrowserTabs } from '../../core/BrowserTabs.js';
import type { Logger } from '../../core/Logger.js';
import { AddressKey } from './AddressKey.js';
import type { LastOpenedStore } from './LastOpenedStore.js';

export type ActivationTabsApi = Pick<BrowserTabs, 'get' | 'onActivated'>;

export class ActivationRecorder {
  #tabs: ActivationTabsApi;
  #store: Pick<LastOpenedStore, 'record'>;
  #logger: Logger;
  #now: () => Date;
  #unsubscribe: (() => void) | null = null;

  /**
   * Records the date each time a Favorite or pinned tab becomes active, by any route.
   *
   * @param tabs Tabs API.
   * @param store Where dates are kept.
   * @param logger Logger for failures.
   * @param now Clock.
   */
  constructor(tabs: ActivationTabsApi, store: Pick<LastOpenedStore, 'record'>, logger: Logger, now: () => Date = () => new Date()) {
    this.#tabs = tabs;
    this.#store = store;
    this.#logger = logger;
    this.#now = now;
  }

  /**
   * Starts listening. Throws when `chrome.tabs.onActivated` is missing.
   */
  public start(): void {
    this.#unsubscribe = this.#tabs.onActivated(({ tabId }) => void this.#record(tabId));
  }

  /**
   * Stops listening.
   */
  public stop(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }

  async #record(tabId: number): Promise<void> {
    try {
      const tab = await this.#tabs.get(tabId);
      const key = AddressKey.from(tab.url ?? tab.pendingUrl);
      if (tab.pinned && key !== null) {
        this.#store.record(key, this.#now());
      }
    } catch (error) {
      this.#logger.warn('could not record the last-opened date', error);
    }
  }
}
