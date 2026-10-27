import type { BrowserTabs } from '../../core/BrowserTabs.js';
import type { Logger } from '../../core/Logger.js';
import { OwnPage } from '../../core/OwnPage.js';
import type { TabUnloader } from '../../core/TabUnloader.js';
import type { Favorite } from './FavoritesFolder.js';
import type { LinkedTabs } from './LinkedTabs.js';
import { UnloadedTabs } from './UnloadedTabs.js';

export type OpenerTabs = Pick<BrowserTabs, 'activate' | 'reload' | 'create' | 'update'>;

export class FavoriteOpener {
  #tabs: OpenerTabs;
  #links: Pick<LinkedTabs, 'snapshot' | 'link'>;
  #unloader: Pick<TabUnloader, 'unload'>;
  #logger: Logger;

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
  constructor(tabs: OpenerTabs, links: Pick<LinkedTabs, 'snapshot' | 'link'>, unloader: Pick<TabUnloader, 'unload'>, logger: Logger) {
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
  public async open(favorite: Favorite): Promise<void> {
    try {
      const { linked, workspaceId } = await this.#links.snapshot();
      const tab = linked.get(favorite.id);
      if (tab?.id === undefined) {
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
  public async unload(favorite: Favorite): Promise<void> {
    try {
      const tabId = (await this.#links.snapshot()).linked.get(favorite.id)?.id;
      if (tabId !== undefined) {
        await this.#unloader.unload(tabId);
      }
    } catch (error) {
      this.#logger.error(`Could not unload the Favorite "${favorite.title}"`, error);
    }
  }

  async #openNew(favorite: Favorite, workspaceId: unknown): Promise<void> {
    const created = await this.#tabs.create({ url: favorite.url, pinned: true, active: true });
    if (created.id !== undefined) {
      await this.#links.link(created.id, favorite, workspaceId);
    }
  }

  async #reset(tabId: number, tab: chrome.tabs.Tab): Promise<void> {
    const own = OwnPage.of(tab);
    if (own !== null && OwnPage.isAway(tab)) {
      await this.#tabs.update(tabId, { url: own });
    }
  }

  async #activate(tabId: number, tab: chrome.tabs.Tab): Promise<void> {
    await this.#tabs.activate(tabId);
    if (UnloadedTabs.isUnloaded(tab)) {
      await this.#tabs.reload(tabId);
    }
  }
}
