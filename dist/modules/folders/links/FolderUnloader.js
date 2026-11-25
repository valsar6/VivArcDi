import { TabUnloader } from "../../../core/tabs/TabUnloader.js";
class FolderUnloader {
  #unloader;
  #logger;
  /**
   * Unloads the tabs of the folder and link rows without closing them.
   *
   * @param tabs The tabs API.
   * @param logger Where a failed unload is reported.
   */
  constructor(tabs, logger) {
    this.#unloader = new TabUnloader(tabs);
    this.#logger = logger;
  }
  /**
   * @param tabIds The tabs to unload.
   */
  unload(tabIds) {
    tabIds.forEach((tabId) => {
      void this.#unloader.unload(tabId).catch((error) => this.#logger.error(`Could not unload tab ${tabId}`, error));
    });
  }
}
export {
  FolderUnloader
};
