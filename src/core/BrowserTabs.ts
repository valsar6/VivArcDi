export type TabsMethod = 'get' | 'query' | 'update' | 'discard';

export type TabUpdateListener = (
  tabId: number,
  change: chrome.tabs.OnUpdatedInfo,
  tab: chrome.tabs.Tab,
) => void;

export interface TabsEvent {
  addListener(listener: TabUpdateListener): void;
  removeListener(listener: TabUpdateListener): void;
}

export type TabsApi = Record<TabsMethod, (...args: unknown[]) => void> & { onUpdated: TabsEvent };

export interface ChromeApi {
  tabs?: TabsApi | undefined;
  runtime?: { lastError?: { message?: string } | undefined } | undefined;
}

export class BrowserTabs {
  #chrome: ChromeApi | null;

  /**
   * Promise-based access to the `chrome.tabs` API of Vivaldi's interface.
   * Uses callbacks underneath, so it works whether or not the API returns promises.
   *
   * @param chromeApi The global `chrome` object, or undefined where it does not exist.
   */
  constructor(chromeApi: ChromeApi | undefined) {
    this.#chrome = chromeApi?.tabs ? chromeApi : null;
  }

  /**
   * @returns Whether `chrome.tabs` exists in this document.
   */
  public get available(): boolean {
    return this.#chrome !== null;
  }

  /**
   * @param tabId Tab id.
   * @returns The tab.
   */
  public get(tabId: number): Promise<chrome.tabs.Tab> {
    return this.#call('get', tabId);
  }

  /**
   * @param queryInfo Filter, as accepted by `chrome.tabs.query`.
   * @returns The matching tabs.
   */
  public query(queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> {
    return this.#call('query', queryInfo);
  }

  /**
   * Makes a tab the active one of its window.
   *
   * @param tabId Tab id.
   * @returns The updated tab.
   */
  public activate(tabId: number): Promise<chrome.tabs.Tab> {
    return this.#call('update', tabId, { active: true });
  }

  /**
   * Unloads a tab from memory while keeping it in the tab bar.
   *
   * @param tabId Tab id. Chromium refuses to unload the active tab.
   * @returns The unloaded tab.
   */
  public discard(tabId: number): Promise<chrome.tabs.Tab> {
    return this.#call('discard', tabId);
  }

  /**
   * Listens to `chrome.tabs.onUpdated`.
   *
   * @param listener Called on every update.
   * @returns A function that removes the listener.
   */
  public onUpdated(listener: TabUpdateListener): () => void {
    const { onUpdated } = this.#requireTabs();
    onUpdated.addListener(listener);
    return () => onUpdated.removeListener(listener);
  }

  #call<T>(method: TabsMethod, ...args: unknown[]): Promise<T> {
    const chromeApi = this.#require();
    const tabs = this.#requireTabs();
    return new Promise<T>((resolve, reject) => {
      tabs[method](...args, (result: T) => {
        const error = chromeApi.runtime?.lastError;
        if (error) {
          reject(new Error(error.message));
        } else {
          resolve(result);
        }
      });
    });
  }

  #require(): ChromeApi {
    if (this.#chrome === null) {
      throw new Error('chrome.tabs is not available');
    }
    return this.#chrome;
  }

  #requireTabs(): TabsApi {
    const { tabs } = this.#require();
    if (tabs === undefined) {
      throw new Error('chrome.tabs is not available');
    }
    return tabs;
  }
}
