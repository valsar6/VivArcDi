import { OwnPage } from "../../core/OwnPage.js";
import { UnloadedTabs } from "./UnloadedTabs.js";
class FavoriteOpener {
  #tabs;
  #links;
  #unloader;
  #logger;
  /**
   * Carries out clicks on Favorites tiles, as in Arc: a click brings the user to the Favorite's
   * tab of the current workspace, opening it when there is none yet; a click on the tile that is
   * already active brings the tab back to its own page.
   *
   * @param tabs Tabs API.
   * @param links Linked tabs.
   * @param unloader Unloads a tab and hands focus to the last used one.
   * @param logger Reports failures.
   */
  constructor(tabs, links, unloader, logger) {
    this.#tabs = tabs;
    this.#links = links;
    this.#unloader = unloader;
    this.#logger = logger;
  }
  /**
   * Opens a Favorite.
   *
   * @param favorite The clicked Favorite.
   */
  async open(favorite) {
    try {
      const { linked, workspaceId } = await this.#links.snapshot();
      const tab = linked.get(favorite.id);
      if (tab?.id === void 0) {
        await this.#openNew(favorite, workspaceId);
      } else if (tab.active) {
        await this.#reset(tab.id, tab);
      } else {
        await this.#activate(tab.id, tab);
      }
    } catch (error) {
      this.#logger.error(`Could not open the Favorite "${favorite.title}"`, error);
    }
  }
  /**
   * Unloads the Favorite's tab of the current workspace, if it has one.
   *
   * @param favorite The Favorite.
   */
  async unload(favorite) {
    try {
      const tabId = (await this.#links.snapshot()).linked.get(favorite.id)?.id;
      if (tabId !== void 0) {
        await this.#unloader.unload(tabId);
      }
    } catch (error) {
      this.#logger.error(`Could not unload the Favorite "${favorite.title}"`, error);
    }
  }
  async #openNew(favorite, workspaceId) {
    const created = await this.#tabs.create({ url: favorite.url, pinned: true, active: true });
    if (created.id !== void 0) {
      await this.#links.link(created.id, favorite, workspaceId);
    }
  }
  async #reset(tabId, tab) {
    const own = OwnPage.resetTarget(tab);
    if (own !== null) {
      await this.#tabs.update(tabId, { url: own });
    }
  }
  async #activate(tabId, tab) {
    await this.#tabs.activate(tabId);
    if (UnloadedTabs.isUnloaded(tab)) {
      await this.#tabs.reload(tabId);
    }
  }
}
export {
  FavoriteOpener
};
