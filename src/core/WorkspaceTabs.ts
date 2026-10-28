import type { BrowserTabs } from './BrowserTabs.js';
import type { Logger } from './Logger.js';
import { TabData } from './TabData.js';

export type WorkspaceTabsApi = Pick<BrowserTabs, 'create' | 'update'>;

export class WorkspaceTabs {
  #tabs: WorkspaceTabsApi;
  #logger: Logger;

  /**
   * Opens tabs inside a chosen workspace, which `chrome.tabs.create` cannot do by itself.
   *
   * @param tabs Tabs API.
   * @param logger Logger for failures.
   */
  constructor(tabs: WorkspaceTabsApi, logger: Logger) {
    this.#tabs = tabs;
    this.#logger = logger;
  }

  /**
   * Opens an address in a new active tab, then writes the workspace into its `vivExtData`. When
   * the workspace cannot be written, the tab stays where Vivaldi put it.
   *
   * @param url The address to open.
   * @param workspace The workspace id, or null to leave the tab where Vivaldi puts it.
   * @returns The new tab.
   */
  public async open(url: string, workspace: string | null): Promise<chrome.tabs.Tab> {
    const created = await this.#tabs.create({ url, active: true });
    if (workspace !== null && created.id !== undefined) {
      try {
        await this.#tabs.update(created.id, { vivExtData: TabData.withWorkspace(TabData.dataOf(created), workspace) });
      } catch (error) {
        this.#logger.warn('could not put the new tab in its workspace', error);
      }
    }
    return created;
  }
}
