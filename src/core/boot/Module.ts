import type { BookmarkWriter } from '../browser/bookmarks/BookmarkWriter.js';
import type { BrowserBookmarks } from '../browser/bookmarks/BrowserBookmarks.js';
import type { BrowserHistory } from '../browser/BrowserHistory.js';
import type { BrowserPrefs } from '../browser/BrowserPrefs.js';
import type { BrowserRuntime } from '../browser/BrowserRuntime.js';
import type { BrowserSearch } from '../browser/BrowserSearch.js';
import type { BrowserTabs } from '../browser/BrowserTabs.js';
import type { BrowserWindows } from '../browser/BrowserWindows.js';
import type { Logger } from '../support/Logger.js';
import type { KeyValueStorage } from '../browser/PersistentStorage.js';
import type { PayloadSource } from './ResourceLoader.js';
import type { SelectorCatalog } from '../dom/SelectorCatalog.js';
import type { BuildInfo, ModuleOptions } from './types.js';

export interface ModuleContext {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** Selectors for the running Vivaldi. */
  selectors: SelectorCatalog;
  /** Logger tagged with the module id. */
  logger: Logger;
  /** The module's options from `config.json`. */
  options: Record<string, unknown>;
  /** The `chrome.tabs` API; check `tabs.available` first. */
  tabs: BrowserTabs;
  /** The `chrome.bookmarks` API, read-only; check `bookmarks.available` first. */
  bookmarks: BrowserBookmarks;
  /** The only way to create, rename and delete bookmarks; check `bookmarkWriter.available` first. */
  bookmarkWriter: BookmarkWriter;
  /** The options of every module in `config.json`, for modules that follow another one. */
  modules: Readonly<Record<string, ModuleOptions>>;
  /** `chrome.runtime` messages and `chrome.windows`; check before use. */
  runtime: BrowserRuntime;
  /** `chrome.windows`, for modules that open and watch windows; check `windows.available` first. */
  windows: BrowserWindows;
  /** Web search with Vivaldi's default engine; check `search.available` first. */
  search: BrowserSearch;
  /** Visited pages, read-only; check `history.available` first. */
  history: BrowserHistory;
  /** Vivaldi's preferences, read-only; check `prefs.available` first. */
  prefs: BrowserPrefs;
  /** Strings that survive a restart, shared by all modules. */
  storage: KeyValueStorage;
  /** Loads files that ship with VivArcDi. */
  payload: PayloadSource;
  /** Versions written by the installer. */
  build: BuildInfo;
}

export type PrivateWindowPolicy = 'never' | 'allowed' | 'only';

export class Module {
  /**
   * Unique id used in `config.json` to enable and configure the module.
   * Every subclass must override it.
   */
  public static id = '';

  /**
   * Whether the module may start in a private window: `never` (the default, for modules that store
   * anything or draw the normal tab bar), `allowed` (acts the same in both kinds of window) or
   * `only` (private windows alone). A module that stores data must keep `never`.
   */
  public static privateWindows: PrivateWindowPolicy = 'never';

  /**
   * Starts the module. Called once, after Vivaldi's interface is ready.
   *
   * @param _context What the module may use.
   */
  public start(_context: ModuleContext): Promise<void> | void {
    throw new Error(`${this.constructor.name} must implement start()`);
  }

  /**
   * Undoes everything `start` did. Called when VivArcDi shuts down.
   */
  public stop(): Promise<void> | void {}
}
