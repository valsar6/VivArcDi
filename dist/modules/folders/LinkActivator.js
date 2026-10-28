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
   * opens the address in a new tab of the workspace the user is in.
   *
   * @param link The clicked link.
   * @param link.url Its address.
   * @param link.key Its address key.
   */
  async activate({ url, key }) {
    try {
      const open = this.#openLinks.tabFor(key);
      if (open === void 0) {
        await this.#open(url);
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
  async #open(url) {
    const [active] = await this.#tabs.query({ active: true, currentWindow: true });
    await this.#workspaceTabs.open(url, active === void 0 ? null : TabData.of(active));
  }
}
export {
  LinkActivator
};
