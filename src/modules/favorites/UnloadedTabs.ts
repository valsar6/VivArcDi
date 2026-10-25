import type { BrowserTabs } from '../../core/BrowserTabs.js';

export type UnloadedTabsApi = Pick<BrowserTabs, 'query' | 'onUpdated'>;

export class UnloadedTabs {
  #tabs: UnloadedTabsApi;
  #onChange: () => void;
  #ids = new Set<number>();
  #unsubscribe: (() => void) | null = null;

  /**
   * Keeps the set of pinned tabs that are unloaded from memory (discarded or hibernated),
   * so their tiles can look dimmed like in Arc.
   *
   * @param tabs Tabs API.
   * @param onChange Called whenever the set changes.
   */
  constructor(tabs: UnloadedTabsApi, onChange: () => void) {
    this.#tabs = tabs;
    this.#onChange = onChange;
  }

  /**
   * @param tab A tab or a tab change.
   * @returns Whether the tab is not loaded in memory.
   */
  public static isUnloaded(tab: { discarded?: boolean | undefined; status?: string | undefined }): boolean {
    return tab.discarded === true || tab.status === 'unloaded';
  }

  /**
   * Reads the current pinned tabs and starts listening to their updates.
   */
  public async start(): Promise<void> {
    this.#unsubscribe = this.#tabs.onUpdated((tabId, change, tab) => this.#update(tabId, change, tab));
    const pinned = await this.#tabs.query({ pinned: true });
    for (const { id } of pinned.filter((tab) => UnloadedTabs.isUnloaded(tab))) {
      if (id !== undefined) {
        this.#ids.add(id);
      }
    }
    this.#onChange();
  }

  /**
   * Stops listening and forgets every tab.
   */
  public stop(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#ids.clear();
  }

  /**
   * @param tabId Tab id.
   * @returns Whether that tab is unloaded.
   */
  public has(tabId: number): boolean {
    return this.#ids.has(tabId);
  }

  #update(tabId: number, change: chrome.tabs.OnUpdatedInfo, tab: chrome.tabs.Tab | undefined): void {
    if (!('discarded' in change) && !('status' in change)) {
      return;
    }
    const unloaded = UnloadedTabs.isUnloaded(tab ?? change);
    if (unloaded === this.#ids.has(tabId)) {
      return;
    }
    if (unloaded) {
      this.#ids.add(tabId);
    } else {
      this.#ids.delete(tabId);
    }
    this.#onChange();
  }
}
