import type { BrowserTabs } from '../../core/BrowserTabs.js';
import { SerialTask } from '../../core/SerialTask.js';

export class ActiveTab {
  #tabs: Pick<BrowserTabs, 'query' | 'onActivated' | 'onUpdated'>;
  #tab: chrome.tabs.Tab | null = null;
  #read: SerialTask;
  #unsubscribe: Array<() => void> = [];

  /**
   * Keeps the active tab of the window at hand, so a key press can be judged synchronously.
   *
   * @param tabs Tabs API.
   * @param onError Called when reading the active tab fails.
   */
  constructor(tabs: Pick<BrowserTabs, 'query' | 'onActivated' | 'onUpdated'>, onError: (error: unknown) => void) {
    this.#tabs = tabs;
    this.#read = new SerialTask(async () => {
      const [tab] = await this.#tabs.query({ active: true, currentWindow: true });
      this.#tab = tab ?? null;
    }, onError);
  }

  /**
   * @returns The id of the active tab when it is pinned, otherwise null.
   */
  public get pinnedId(): number | null {
    return this.#tab?.pinned === true ? (this.#tab.id ?? null) : null;
  }

  /**
   * Reads the active tab and follows activations and pins.
   */
  public async start(): Promise<void> {
    this.#unsubscribe.push(this.#tabs.onActivated(() => this.#read.request()));
    this.#unsubscribe.push(
      this.#tabs.onUpdated((tabId, change) => {
        if (tabId === this.#tab?.id && change.pinned !== undefined) {
          this.#read.request();
        }
      }),
    );
    this.#read.request();
    await this.#read.idle();
  }

  /**
   * Stops following the tabs.
   */
  public stop(): void {
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
  }
}
