import type { BrowserTabs } from '../../core/BrowserTabs.js';
import { TabData } from '../../core/TabData.js';

export class TabTiler {
  #tabs: Pick<BrowserTabs, 'get' | 'update'>;
  #newId: () => string;

  /**
   * Tiles tabs side by side the way Vivaldi's own "Tile tabs" command does: by
   * writing a shared tiling group into each tab's `vivExtData`.
   *
   * @param tabs The tabs API.
   * @param newId Creates the id of a tiling group.
   */
  constructor(tabs: Pick<BrowserTabs, 'get' | 'update'>, newId: () => string = () => crypto.randomUUID()) {
    this.#tabs = tabs;
    this.#newId = newId;
  }

  /**
   * @param tabIds Tabs to show side by side, from left to right.
   * @returns Resolves once every tab is marked.
   */
  public async tile(tabIds: number[]): Promise<void> {
    const id = this.#newId();
    await Promise.all(
      tabIds.map((tabId, index) => this.#mark(tabId, { id, index, layout: 'row', type: 'selection' })),
    );
  }

  async #mark(tabId: number, tiling: Record<string, unknown>): Promise<void> {
    const tab = await this.#tabs.get(tabId);
    await this.#tabs.update(tabId, { vivExtData: TabData.with(tab, 'tiling', tiling) });
  }
}
