import type { StorageHost } from './PersistentStorage.js';
import type { BookmarksHost } from './bookmarks/BrowserBookmarks.js';

export type TabsMethod = 'get' | 'query' | 'create' | 'update' | 'discard' | 'reload' | 'remove';

export type TabUpdateListener = (
  tabId: number,
  change: chrome.tabs.OnUpdatedInfo,
  tab: chrome.tabs.Tab,
) => void;

export interface TabsEvent {
  addListener(listener: TabUpdateListener): void;
  removeListener(listener: TabUpdateListener): void;
}

export type TabActivatedListener = (info: chrome.tabs.OnActivatedInfo) => void;

export type TabCreatedListener = (tab: chrome.tabs.Tab) => void;

export type TabRemovedListener = (tabId: number) => void;

export interface ChromeEvent<Listener> {
  addListener(listener: Listener): void;
  removeListener(listener: Listener): void;
}

export type TabsApi = Record<TabsMethod, (...args: unknown[]) => void> & {
  onUpdated: TabsEvent;
  onActivated?: ChromeEvent<TabActivatedListener> | undefined;
  onCreated?: ChromeEvent<TabCreatedListener> | undefined;
  onRemoved?: ChromeEvent<TabRemovedListener> | undefined;
};

export type RuntimeMessageListener = (message: unknown) => void;

export interface ChromeApi extends BookmarksHost, StorageHost {
  tabs?: TabsApi | undefined;
  runtime?:
    | {
        lastError?: { message?: string } | undefined;
        onMessage?: ChromeEvent<RuntimeMessageListener> | undefined;
      }
    | undefined;
  windows?: { create: (...args: unknown[]) => void } | undefined;
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
   * Creates a tab.
   *
   * @param properties As accepted by `chrome.tabs.create`.
   * @returns The new tab.
   */
  public create(properties: chrome.tabs.CreateProperties): Promise<chrome.tabs.Tab> {
    return this.#call('create', properties);
  }

  /**
   * Changes a tab, including Vivaldi's own properties such as `vivExtData`.
   *
   * @param tabId Tab id.
   * @param properties Properties to change.
   * @returns The updated tab.
   */
  public update(tabId: number, properties: Record<string, unknown>): Promise<chrome.tabs.Tab> {
    return this.#call('update', tabId, properties);
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
   * Loads a tab's page again, which also brings an unloaded tab back into memory.
   *
   * @param tabId Tab id.
   */
  public async reload(tabId: number): Promise<void> {
    await this.#call('reload', tabId);
  }

  /**
   * Closes a tab.
   *
   * @param tabId Tab id.
   */
  public async remove(tabId: number): Promise<void> {
    await this.#call('remove', tabId);
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

  /**
   * Listens to `chrome.tabs.onActivated`.
   *
   * @param listener Called when the active tab of a window changes.
   * @returns A function that removes the listener.
   */
  public onActivated(listener: TabActivatedListener): () => void {
    const { onActivated } = this.#requireTabs();
    if (onActivated === undefined) {
      throw new Error('chrome.tabs.onActivated is not available');
    }
    onActivated.addListener(listener);
    return () => onActivated.removeListener(listener);
  }

  /**
   * Listens to `chrome.tabs.onCreated`.
   *
   * @param listener Called with every new tab.
   * @returns A function that removes the listener.
   */
  public onCreated(listener: TabCreatedListener): () => void {
    const { onCreated } = this.#requireTabs();
    if (onCreated === undefined) {
      throw new Error('chrome.tabs.onCreated is not available');
    }
    onCreated.addListener(listener);
    return () => onCreated.removeListener(listener);
  }

  /**
   * Listens to `chrome.tabs.onRemoved`.
   *
   * @param listener Called with the id of every closed tab.
   * @returns A function that removes the listener.
   */
  public onRemoved(listener: TabRemovedListener): () => void {
    const { onRemoved } = this.#requireTabs();
    if (onRemoved === undefined) {
      throw new Error('chrome.tabs.onRemoved is not available');
    }
    onRemoved.addListener(listener);
    return () => onRemoved.removeListener(listener);
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
