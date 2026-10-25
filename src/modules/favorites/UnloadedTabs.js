export class UnloadedTabs {
  #tabs;
  #onChange;
  #ids = new Set();
  #unsubscribe = null;

  /**
   * Keeps the set of pinned tabs that are unloaded from memory (discarded or hibernated),
   * so their tiles can look dimmed like in Arc.
   *
   * @param {import('../../core/BrowserTabs.js').BrowserTabs} tabs Tabs API.
   * @param {() => void} onChange Called whenever the set changes.
   */
  constructor(tabs, onChange) {
    this.#tabs = tabs;
    this.#onChange = onChange;
  }

  /**
   * @param {{ discarded?: boolean, status?: string }} tab A tab or a tab change.
   * @returns {boolean} Whether the tab is not loaded in memory.
   */
  static isUnloaded(tab) {
    return tab.discarded === true || tab.status === 'unloaded';
  }

  /**
   * Reads the current pinned tabs and starts listening to their updates.
   *
   * @returns {Promise<void>}
   */
  async start() {
    this.#unsubscribe = this.#tabs.onUpdated((tabId, change, tab) => this.#update(tabId, change, tab));
    const pinned = await this.#tabs.query({ pinned: true });
    pinned.filter(UnloadedTabs.isUnloaded).forEach(({ id }) => this.#ids.add(id));
    this.#onChange();
  }

  /**
   * Stops listening and forgets every tab.
   */
  stop() {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#ids.clear();
  }

  /**
   * @param {number} tabId Tab id.
   * @returns {boolean} Whether that tab is unloaded.
   */
  has(tabId) {
    return this.#ids.has(tabId);
  }

  #update(tabId, change, tab) {
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
