import type { Logger } from '../../../core/support/Logger.js';
import { TabUnloader } from '../../../core/tabs/TabUnloader.js';
import type { UnloaderTabs } from '../../../core/tabs/TabUnloader.js';

export class FolderUnloader {
  #unloader: TabUnloader;
  #logger: Pick<Logger, 'error'>;

  /**
   * Unloads the tabs of the folder and link rows without closing them.
   *
   * @param tabs The tabs API.
   * @param logger Where a failed unload is reported.
   */
  constructor(tabs: UnloaderTabs, logger: Pick<Logger, 'error'>) {
    this.#unloader = new TabUnloader(tabs);
    this.#logger = logger;
  }

  /**
   * @param tabIds The tabs to unload.
   */
  public unload(tabIds: number[]): void {
    tabIds.forEach((tabId) => {
      void this.#unloader.unload(tabId).catch((error: unknown) => this.#logger.error(`Could not unload tab ${tabId}`, error));
    });
  }
}
