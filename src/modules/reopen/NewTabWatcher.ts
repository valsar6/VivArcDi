import type { TabCreatedListener, TabUpdateListener } from '../../core/BrowserTabs.js';
import { AddressKey } from './AddressKey.js';

export interface NewTabEvents {
  onCreated(listener: TabCreatedListener): () => void;
  onUpdated(listener: TabUpdateListener): () => void;
}

export interface NewTabNavigation {
  /** The new tab, as it is after its first navigation started. */
  tab: chrome.tabs.Tab;
  /** The address it navigates to. */
  url: string;
}

const START_PAGES = ['chrome://vivaldi-webui/startpage', 'vivaldi://startpage', 'chrome://newtab', 'about:blank'];

export class NewTabWatcher {
  #events: NewTabEvents;
  #onNavigate: (navigation: NewTabNavigation) => void;
  #watched = new Set<number>();
  #unsubscribe: Array<() => void> = [];

  /**
   * Watches tabs that the user opens empty, with Cmd/Ctrl+T or the "+" button,
   * and reports their first navigation to a web address, once per tab.
   * Tabs opened from links, by extensions or by session restore carry an opener or an address
   * and are never watched.
   *
   * @param events Tab events.
   * @param onNavigate Called with the first web navigation of a watched tab.
   */
  constructor(events: NewTabEvents, onNavigate: (navigation: NewTabNavigation) => void) {
    this.#events = events;
    this.#onNavigate = onNavigate;
  }

  /**
   * @param tab A tab just created.
   * @returns Whether it is an empty tab opened by the user.
   */
  public static isEmptyNewTab(tab: chrome.tabs.Tab): boolean {
    return tab.openerTabId === undefined && NewTabWatcher.#isStartPage(tab.pendingUrl ?? tab.url);
  }

  /**
   * Starts listening. Throws when an event is not available.
   */
  public start(): void {
    this.#unsubscribe = [
      this.#events.onCreated((tab) => this.#watch(tab)),
      this.#events.onUpdated((tabId, change, tab) => this.#check(tabId, change, tab)),
    ];
  }

  /**
   * Stops listening and forgets every watched tab.
   */
  public stop(): void {
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
    this.#watched.clear();
  }

  static #isStartPage(url: string | undefined): boolean {
    return url === undefined || url === '' || START_PAGES.some((page) => url.startsWith(page));
  }

  #watch(tab: chrome.tabs.Tab): void {
    if (tab.id !== undefined && NewTabWatcher.isEmptyNewTab(tab)) {
      this.#watched.add(tab.id);
    }
  }

  #check(tabId: number, change: chrome.tabs.OnUpdatedInfo, tab: chrome.tabs.Tab): void {
    const { url } = change;
    if (url === undefined || !this.#watched.has(tabId) || NewTabWatcher.#isStartPage(url)) {
      return;
    }
    this.#watched.delete(tabId);
    if (AddressKey.from(url) !== null) {
      this.#onNavigate({ tab, url });
    }
  }
}
