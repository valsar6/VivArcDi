import type { BrowserTabs } from '../../../core/browser/BrowserTabs.js';
import type { Logger } from '../../../core/support/Logger.js';

export type CloserTabs = Pick<BrowserTabs, 'remove'>;

export class FolderCloser {
  #tabs: CloserTabs;
  #logger: Pick<Logger, 'error'>;

  /**
   * Closes the tabs of folder and link rows, without touching the bookmark tree.
   *
   * @param tabs The tabs API.
   * @param logger Where a failed close is reported.
   */
  constructor(tabs: CloserTabs, logger: Pick<Logger, 'error'>) {
    this.#tabs = tabs;
    this.#logger = logger;
  }

  /**
   * @param tabIds The tabs to close.
   * @returns False when a tab could not be closed.
   */
  public async close(tabIds: number[]): Promise<boolean> {
    for (const tabId of tabIds) {
      try {
        await this.#tabs.remove(tabId);
      } catch (error) {
        this.#logger.error(`Could not close tab ${tabId}`, error);
        return false;
      }
    }
    return true;
  }
}
