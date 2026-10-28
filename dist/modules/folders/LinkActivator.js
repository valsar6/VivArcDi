import { TabData } from "../../core/TabData.js";
import { WorkspaceTabs } from "../../core/WorkspaceTabs.js";
import { UnloadedTabs } from "../favorites/UnloadedTabs.js";
class LinkActivator {
  #tabs;
  #workspaceTabs;
  #openLinks;
  #logger;
  /**
   * What a click on a link does: bring its tab forward, or open one.
   *
   * @param tabs Tabs API.
   * @param openLinks Which addresses are open.
   * @param logger Logger for failures.
   */
  constructor(tabs, openLinks, logger) {
    this.#tabs = tabs;
    this.#workspaceTabs = new WorkspaceTabs(tabs, logger);
    this.#openLinks = openLinks;
    this.#logger = logger;
  }
  /**
   * Activates the open tab of the link and loads it again if it was unloaded. With no open tab,
   * opens the address in a new tab of the workspace the user is in, linked to the bookmark.
   *
   * @param link The clicked link.
   * @param link.id Its bookmark id.
   * @param link.url Its address.
   * @param link.key Its address key.
   */
  async activate({ id, url, key }) {
    try {
      const open = this.#openLinks.tabFor({ id, key });
      if (open === void 0) {
        await this.#open(id, url);
        return;
      }
      const tab = await this.#tabs.activate(open.tabId);
      if (UnloadedTabs.isUnloaded(tab)) {
        await this.#tabs.reload(open.tabId);
      }
    } catch (error) {
      this.#logger.warn("could not open the link", error);
    }
  }
  /**
   * Closes the tab of a link, which sends the link back inside its closed folder.
   *
   * @param tabId The tab to close.
   */
  async close(tabId) {
    try {
      await this.#tabs.remove(tabId);
    } catch (error) {
      this.#logger.warn("could not close the tab of the link", error);
    }
  }
  async #open(bookmarkId, url) {
    const [active] = await this.#tabs.query({ active: true, currentWindow: true });
    await this.#workspaceTabs.open(url, active === void 0 ? null : TabData.of(active), { bookmarkId });
  }
}
export {
  LinkActivator
};
