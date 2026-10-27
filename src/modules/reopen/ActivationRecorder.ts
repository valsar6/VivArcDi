import type { BrowserTabs } from '../../core/BrowserTabs.js';
import type { Logger } from '../../core/Logger.js';
import { AddressKey } from '../../core/AddressKey.js';
import type { LastOpenedStore } from './LastOpenedStore.js';

export interface RecorderOptions {
  /** Clock. */
  now?: () => Date;
  /** Which tabs get a date; by default the pinned ones. */
  isTracked?: TrackedTab;
}

export type TrackedTab = (tab: chrome.tabs.Tab, key: string) => boolean;

const currentDate = (): Date => new Date();
const isPinned = (tab: chrome.tabs.Tab): boolean => tab.pinned;

export type ActivationTabsApi = Pick<BrowserTabs, 'get' | 'onActivated'>;

export class ActivationRecorder {
  #tabs: ActivationTabsApi;
  #store: Pick<LastOpenedStore, 'record'>;
  #logger: Logger;
  #now: () => Date;
  #isTracked: TrackedTab;
  #unsubscribe: (() => void) | null = null;

  /**
   * Records the date each time a tracked tab (a Favorite or pinned tab, or a bookmark link) becomes active, by any route.
   *
   * @param tabs Tabs API.
   * @param store Where dates are kept.
   * @param logger Logger for failures.
   * @param options Clock and the choice of tracked tabs.
   */
  constructor(tabs: ActivationTabsApi, store: Pick<LastOpenedStore, 'record'>, logger: Logger, { now = currentDate, isTracked = isPinned }: RecorderOptions = {}) {
    this.#tabs = tabs;
    this.#store = store;
    this.#logger = logger;
    this.#now = now;
    this.#isTracked = isTracked;
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
      if (key !== null && this.#isTracked(tab, key)) {
        this.#store.record(key, this.#now());
      }
    } catch (error) {
      this.#logger.warn('could not record the last-opened date', error);
    }
  }
}
