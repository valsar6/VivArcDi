import type { BookmarkWriter } from './bookmarks/BookmarkWriter.js';
import type { BrowserBookmarks } from './bookmarks/BrowserBookmarks.js';
import type { BrowserPrefs } from './BrowserPrefs.js';
import type { BrowserRuntime } from './BrowserRuntime.js';
import type { BrowserTabs } from './BrowserTabs.js';
import type { Logger } from './Logger.js';
import type { KeyValueStorage } from './PersistentStorage.js';
import type { PayloadSource } from './ResourceLoader.js';
import type { SelectorCatalog } from './SelectorCatalog.js';
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
