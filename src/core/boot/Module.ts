import type { BookmarkWriter } from '../browser/bookmarks/BookmarkWriter.js';
import type { BrowserBookmarks } from '../browser/bookmarks/BrowserBookmarks.js';
import type { BrowserHistory } from '../browser/BrowserHistory.js';
import type { BrowserPrefs } from '../browser/BrowserPrefs.js';
import type { BrowserRuntime } from '../browser/BrowserRuntime.js';
import type { BrowserSearch } from '../browser/BrowserSearch.js';
import type { BrowserTabs } from '../browser/BrowserTabs.js';
import type { BrowserWindows } from '../browser/BrowserWindows.js';
import type { Logger } from '../support/Logger.js';
import type { VersionedStorage } from '../browser/StoredFormat.js';
import type { ActiveWorkspace } from '../workspaces/ActiveWorkspace.js';
import type { NoticeBoard } from '../dom/Notices.js';
import type { PayloadSource } from './ResourceLoader.js';
import type { SelectorCatalog } from '../dom/SelectorCatalog.js';
import type { BuildInfo, ModuleOptions } from './types.js';
import { OptionSchema } from './options/OptionSchema.js';

type RawOptions = Readonly<Record<string, unknown>>;

export interface ModuleContext<O extends object = RawOptions> {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** Selectors for the running Vivaldi. */
  selectors: SelectorCatalog;
  /** Logger tagged with the module id. */
  logger: Logger;
  /** The module's options from `config.json`, checked against its schema. */
  options: Readonly<O>;
  /** The `chrome.tabs` API; check `tabs.available` first. */
  tabs: BrowserTabs;
  /** The one workspace state of this window: which workspace every surface shows. */
  activeWorkspace: ActiveWorkspace;
  /** The `chrome.bookmarks` API, read-only; check `bookmarks.available` first. */
  bookmarks: BrowserBookmarks;
  /** The only way to create, rename and delete bookmarks; check `bookmarkWriter.available` first. */
  bookmarkWriter: BookmarkWriter;
  /** The checked options of every module in `config.json`, for modules that follow another one. */
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
  /** Strings that survive a restart, shared by all modules; `read` loads JSON values (spec 037). */
  storage: VersionedStorage;
  /** Tells the user something through the window's one shared toast. */
  notices: NoticeBoard;
  /** Loads files that ship with VivArcDi. */
  payload: PayloadSource;
  /** Versions written by the installer. */
  build: BuildInfo;
}

export type PrivateWindowPolicy = 'never' | 'allowed' | 'only';

export class Module<O extends object = RawOptions> {
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
   * The options the module reads from `config.json`, with their defaults. The boot checks them
   * before `start`, so the module receives complete, valid values.
   */
  public static options: OptionSchema<object> = OptionSchema.none;

  /**
   * Starts the module. Called once, after Vivaldi's interface is ready.
   *
   * @param _context What the module may use.
   */
  public start(_context: ModuleContext<O>): Promise<void> | void {
    throw new Error(`${this.constructor.name} must implement start()`);
  }

  /**
   * Undoes everything `start` did. Called when VivArcDi shuts down.
   */
  public stop(): Promise<void> | void {}
}
