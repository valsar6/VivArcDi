import type { BrowserTabs } from '../../../core/browser/BrowserTabs.js';
import type { Logger } from '../../../core/support/Logger.js';

export class WorkspaceSwitcher {
  #tabs: Pick<BrowserTabs, 'activate'>;
  #logger: Logger;

  /**
   * Switches to a workspace the way Vivaldi does when a tab of it is activated: the workspace of
   * that tab becomes the current one.
   *
   * @param tabs The tabs API.
   * @param logger Logger for a tab that cannot be activated.
   */
  constructor(tabs: Pick<BrowserTabs, 'activate'>, logger: Logger) {
    this.#tabs = tabs;
    this.#logger = logger;
  }

  /**
   * @param tabId A tab of the workspace to go to.
   */
  public async to(tabId: number): Promise<void> {
    try {
      await this.#tabs.activate(tabId);
    } catch (error) {
      this.#logger.warn('could not switch to the workspace of the moved tab', error);
    }
  }
}
