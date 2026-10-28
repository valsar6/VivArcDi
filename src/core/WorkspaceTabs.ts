import type { BrowserTabs } from './BrowserTabs.js';
import type { Logger } from './Logger.js';
import { TabData } from './TabData.js';
import type { OwnTabChanges } from './TabData.js';

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
   * Opens an address in a new active tab, then writes the workspace and VivArcDi's own values into
   * its `vivExtData` with one update. When they cannot be written, the tab stays where Vivaldi
   * put it.
   *
   * @param url The address to open.
   * @param workspace The workspace id, or null to leave the tab where Vivaldi puts it.
   * @param own Values to store under VivArcDi's own key, such as the bookmark the tab stands for.
   * @returns The new tab.
   */
  public async open(url: string, workspace: string | null, own: OwnTabChanges = {}): Promise<chrome.tabs.Tab> {
    const created = await this.#tabs.create({ url, active: true });
    if ((workspace !== null || Object.keys(own).length > 0) && created.id !== undefined) {
      try {
        const extra = workspace === null ? {} : { workspaceId: TabData.rawWorkspace(workspace) };
        await this.#tabs.update(created.id, { vivExtData: TabData.withOwn(created, own, extra) });
      } catch (error) {
        this.#logger.warn('could not store the workspace and link of the new tab', error);
      }
    }
    return created;
  }
}
