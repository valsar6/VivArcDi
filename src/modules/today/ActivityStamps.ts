import type { BrowserTabs } from '../../core/BrowserTabs.js';
import type { Logger } from '../../core/Logger.js';
import { TabDataWriter } from '../../core/TabDataWriter.js';
import { TabData } from '../../core/TabData.js';

export type StampTabs = Pick<BrowserTabs, 'get' | 'query' | 'update' | 'onActivated' | 'onCreated' | 'onRemoved'>;

export class ActivityStamps {
  #tabs: StampTabs;
  #writer: TabDataWriter;
  #now: () => number;
  #logger: Logger;
  #active = new Map<number, number>();
  #windowId: number | null = null;
  #unsubscribe: Array<() => void> = [];

  /**
   * Writes into each tab of this window the time it was last active, under VivArcDi's own key of
   * `vivExtData`, which Vivaldi saves with the session: when a tab stops being the active one,
   * when it is created, and at start for the active tab.
   *
   * @param tabs Tabs API.
   * @param now The current time in milliseconds, replaceable in tests.
   * @param logger Logger for failed writes.
   */
  constructor(tabs: StampTabs, now: () => number, logger: Logger) {
    this.#tabs = tabs;
    this.#writer = TabDataWriter.of(tabs);
    this.#now = now;
    this.#logger = logger;
  }

  /**
   * Stamps the active tab of this window and starts following activations and new tabs.
   */
  public async start(): Promise<void> {
    const [active] = await this.#tabs.query({ active: true, currentWindow: true });
    if (active?.id !== undefined) {
      this.#windowId = active.windowId;
      this.#active.set(active.windowId, active.id);
      await this.stamp(active.id);
    }
    this.#unsubscribe = [
      this.#tabs.onActivated((info) => this.#activated(info)),
      this.#tabs.onCreated((tab) => this.#created(tab)),
      this.#tabs.onRemoved((tabId) => this.#removed(tabId)),
    ];
  }

  /**
   * Stops following the tabs. The stamps stay in the tabs.
   */
  public stop(): void {
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
    this.#active.clear();
  }

  /**
   * Records now as the last active time of a tab.
   *
   * @param tabId Tab id.
   */
  public async stamp(tabId: number): Promise<void> {
    try {
      await this.#writer.write(tabId, (tab) => TabData.withOwn(tab, { lastActive: this.#now() }));
    } catch (error) {
      this.#logger.warn(`could not record when tab ${tabId} was last active`, error);
    }
  }

  #activated({ tabId, windowId }: chrome.tabs.OnActivatedInfo): void {
    if (!this.#isOwnWindow(windowId)) {
      return;
    }
    const left = this.#active.get(windowId);
    this.#active.set(windowId, tabId);
    if (left !== undefined && left !== tabId) {
      void this.stamp(left);
    }
  }

  #created(tab: chrome.tabs.Tab): void {
    if (tab.id !== undefined && this.#isOwnWindow(tab.windowId)) {
      void this.stamp(tab.id);
    }
  }

  #removed(tabId: number): void {
    for (const [windowId, active] of this.#active) {
      if (active === tabId) {
        this.#active.delete(windowId);
      }
    }
  }

  #isOwnWindow(windowId: number): boolean {
    return this.#windowId === null || this.#windowId === windowId;
  }
}
