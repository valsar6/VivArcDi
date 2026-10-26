import type { BrowserTabs } from '../../core/BrowserTabs.js';
import type { Logger } from '../../core/Logger.js';
import { UnloadedTabs } from '../favorites/UnloadedTabs.js';

export type SwitcherTabsApi = Pick<BrowserTabs, 'activate' | 'reload' | 'remove'>;

export class TabSwitcher {
  #tabs: SwitcherTabsApi;
  #logger: Logger;

  /**
   * Replaces a duplicate new tab with the pinned tab it duplicates.
   *
   * @param tabs Tabs API.
   * @param logger Logger for failures.
   */
  constructor(tabs: SwitcherTabsApi, logger: Logger) {
    this.#tabs = tabs;
    this.#logger = logger;
  }

  /**
   * Activates the pinned tab, loads it again if it is still unloaded, then closes the new tab.
   * When the pinned tab cannot be activated, the new tab stays open as in plain Vivaldi.
   *
   * @param pinnedTabId The tab to bring forward.
   * @param newTabId The duplicate tab to close.
   * @returns Whether the switch happened.
   */
  public async switch(pinnedTabId: number, newTabId: number): Promise<boolean> {
    let activated: chrome.tabs.Tab;
    try {
      activated = await this.#tabs.activate(pinnedTabId);
    } catch (error) {
      this.#logger.warn('could not switch to the pinned tab; the new tab stays open', error);
      return false;
    }
    if (UnloadedTabs.isUnloaded(activated)) {
      await this.#attempt('reload the pinned tab', () => this.#tabs.reload(pinnedTabId));
    }
    await this.#attempt('close the new tab', () => this.#tabs.remove(newTabId));
    return true;
  }

  async #attempt(action: string, run: () => Promise<void>): Promise<void> {
    try {
      await run();
    } catch (error) {
      this.#logger.warn(`could not ${action}`, error);
    }
  }
}
