import type { BrowserTabs } from '../../core/browser/BrowserTabs.js';
import type { Logger } from '../../core/support/Logger.js';

export interface TabRowMoveDependencies {
  tabs: Pick<BrowserTabs, 'get' | 'move'>;
  logger: Logger;
}

export class TabRowMove {
  #deps: TabRowMoveDependencies;

  /**
   * Moves a tab of today's list to the place of another tab, the row under the pointer when a
   * page is released over the list. A failure is logged and leaves the tab where it is.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: TabRowMoveDependencies) {
    this.#deps = dependencies;
  }

  /**
   * @param tabId The tab to move.
   * @param rowTabId The tab whose row is under the pointer; null when the pointer is on no row, so the tab stays.
   */
  public async to(tabId: number, rowTabId: number | null): Promise<void> {
    if (rowTabId === null) {
      return;
    }
    try {
      const row = await this.#deps.tabs.get(rowTabId);
      if (row.pinned !== true && row.index !== undefined) {
        await this.#deps.tabs.move(tabId, { index: row.index });
      }
    } catch (error) {
      this.#deps.logger.warn('could not move the tab to the place of the drop', error);
    }
  }
}
