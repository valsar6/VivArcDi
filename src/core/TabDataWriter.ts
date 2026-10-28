import type { BrowserTabs } from './BrowserTabs.js';

export type TabDataTabs = Pick<BrowserTabs, 'get' | 'update'>;

export type TabDataChange = (tab: chrome.tabs.Tab) => string | null;

export class TabDataWriter {
  static #instances = new WeakMap<object, TabDataWriter>();

  #tabs: TabDataTabs;
  #queues = new Map<number, Promise<void>>();

  /**
   * Writes the `vivExtData` of tabs one write at a time for each tab, so that two modules never
   * overwrite each other's keys with a copy of the tab that went stale while they waited.
   *
   * @param tabs Tabs API.
   */
  constructor(tabs: TabDataTabs) {
    this.#tabs = tabs;
  }

  /**
   * @param tabs The tabs API of a window; the same object gives the same writer.
   * @returns The writer shared by every module that uses that tabs API.
   */
  public static of(tabs: TabDataTabs): TabDataWriter {
    const existing = TabDataWriter.#instances.get(tabs);
    if (existing !== undefined) {
      return existing;
    }
    const created = new TabDataWriter(tabs);
    TabDataWriter.#instances.set(tabs, created);
    return created;
  }

  /**
   * Queues a change of a tab's `vivExtData`. When its turn comes, the tab is read again, the
   * change builds the new text from that fresh copy, and the text is written.
   *
   * @param tabId The tab.
   * @param change Builds the new `vivExtData` text from the tab as just read; null writes nothing.
   * @returns Resolves once the write is done; rejects when it fails, without blocking later writes.
   */
  public write(tabId: number, change: TabDataChange): Promise<void> {
    const previous = this.#queues.get(tabId) ?? Promise.resolve();
    const run = previous.then(() => this.#apply(tabId, change));
    const settled = run.catch(() => undefined);
    this.#queues.set(tabId, settled);
    void settled.then(() => {
      if (this.#queues.get(tabId) === settled) {
        this.#queues.delete(tabId);
      }
    });
    return run;
  }

  async #apply(tabId: number, change: TabDataChange): Promise<void> {
    const tab = await this.#tabs.get(tabId);
    const data = change(tab);
    if (data !== null) {
      await this.#tabs.update(tabId, { vivExtData: data });
    }
  }
}
