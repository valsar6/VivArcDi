import type { BrowserTabs } from '../../core/BrowserTabs.js';
import type { Logger } from '../../core/Logger.js';
import { TabData } from '../../core/TabData.js';
import { UnloadedTabs } from '../favorites/UnloadedTabs.js';
import type { OpenLinks } from './OpenLinks.js';

export type ActivatorTabs = Pick<BrowserTabs, 'query' | 'activate' | 'reload' | 'create' | 'update'>;

export class LinkActivator {
  #tabs: ActivatorTabs;
  #openLinks: Pick<OpenLinks, 'tabFor'>;
  #logger: Logger;

  /**
   * What a click on a link does: bring its tab forward, or open one.
   *
   * @param tabs Tabs API.
   * @param openLinks Which addresses are open.
   * @param logger Logger for failures.
   */
  constructor(tabs: ActivatorTabs, openLinks: Pick<OpenLinks, 'tabFor'>, logger: Logger) {
    this.#tabs = tabs;
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
  public async activate({ url, key }: { url: string; key: string }): Promise<void> {
    try {
      const open = this.#openLinks.tabFor(key);
      if (open === undefined) {
        await this.#open(url);
        return;
      }
      const tab = await this.#tabs.activate(open.tabId);
      if (UnloadedTabs.isUnloaded(tab)) {
        await this.#tabs.reload(open.tabId);
      }
    } catch (error) {
      this.#logger.warn('could not open the link', error);
    }
  }

  async #open(url: string): Promise<void> {
    const [active] = await this.#tabs.query({ active: true, currentWindow: true });
    const created = await this.#tabs.create({ url, active: true });
    const workspace = active === undefined ? null : TabData.of(active);
    if (workspace !== null && created.id !== undefined) {
      try {
        await this.#tabs.update(created.id, { vivExtData: TabData.withWorkspace(TabData.dataOf(created), workspace) });
      } catch (error) {
        this.#logger.warn('could not put the new tab in the current workspace', error);
      }
    }
  }
}
