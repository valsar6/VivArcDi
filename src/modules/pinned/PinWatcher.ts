import type { BrowserTabs } from '../../core/BrowserTabs.js';
import type { Logger } from '../../core/Logger.js';
import { SavedAddresses } from './SavedAddresses.js';

export type PinWatcherTabs = Pick<BrowserTabs, 'query' | 'onUpdated'>;

export class PinWatcher {
  #tabs: PinWatcherTabs;
  #addresses: Pick<SavedAddresses, 'save' | 'forget'>;
  #logger: Logger;
  #unsubscribe: (() => void) | null = null;

  /**
   * Gives pinned tabs their own page: the page they show when they are pinned, or when the
   * module first sees them pinned. Unpinning forgets it.
   *
   * @param tabs Tabs API.
   * @param addresses Where own pages are kept.
   * @param logger Reports failures.
   */
  constructor(tabs: PinWatcherTabs, addresses: Pick<SavedAddresses, 'save' | 'forget'>, logger: Logger) {
    this.#tabs = tabs;
    this.#addresses = addresses;
    this.#logger = logger;
  }

  /**
   * Saves the own page of pinned tabs that have none and starts following pins.
   */
  public async start(): Promise<void> {
    this.#unsubscribe = this.#tabs.onUpdated((tabId, change, tab) => void this.#follow(tabId, change, tab));
    const pinned = await this.#tabs.query({ pinned: true });
    await Promise.all(pinned.filter((tab) => SavedAddresses.needsAddress(tab)).map((tab) => this.#save(tab)));
  }

  /**
   * Stops following pins.
   */
  public stop(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }

  async #follow(tabId: number, change: chrome.tabs.OnUpdatedInfo, tab: chrome.tabs.Tab): Promise<void> {
    try {
      if (change.pinned === true && SavedAddresses.needsAddress(tab)) {
        await this.#save(tab);
      } else if (change.pinned === false) {
        await this.#addresses.forget(tabId);
      }
    } catch (error) {
      this.#logger.error(`Could not update the own page of tab ${tabId}`, error);
    }
  }

  async #save(tab: chrome.tabs.Tab): Promise<void> {
    if (tab.id !== undefined && tab.url !== undefined) {
      await this.#addresses.save(tab.id, tab.url);
    }
  }
}
