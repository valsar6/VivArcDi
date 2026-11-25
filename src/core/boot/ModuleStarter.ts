import type { BookmarkWriter } from '../browser/bookmarks/BookmarkWriter.js';
import type { BrowserBookmarks } from '../browser/bookmarks/BrowserBookmarks.js';
import type { BrowserPrefs } from '../browser/BrowserPrefs.js';
import type { BrowserRuntime } from '../browser/BrowserRuntime.js';
import type { BrowserHistory } from '../browser/BrowserHistory.js';
import { BrowserSearch } from '../browser/BrowserSearch.js';
import type { BrowserTabs } from '../browser/BrowserTabs.js';
import { BrowserWindows } from '../browser/BrowserWindows.js';
import type { Logger } from '../support/Logger.js';
import type { ModuleOutcome } from './BootReport.js';
import type { EnabledModule } from './ModuleRegistry.js';
import type { PayloadSource } from './ResourceLoader.js';
import type { StartServices } from './WindowServices.js';

export interface ModuleServices {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** The tabs API given to modules. */
  tabs: BrowserTabs;
  /** The bookmarks API given to modules. */
  bookmarks: BrowserBookmarks;
  /** The bookmark writer given to modules. */
  bookmarkWriter: BookmarkWriter;
  /** The runtime API given to modules. */
  runtime: BrowserRuntime;
  /** The windows API given to modules. */
  windows: BrowserWindows;
  /** The web search given to modules. */
  search: BrowserSearch;
  /** The history given to modules. */
  history: BrowserHistory;
  /** Vivaldi's preferences given to modules. */
  prefs: BrowserPrefs;
  /** Loads payload files. */
  payload: PayloadSource;
}

export class ModuleStarter {
  #services: ModuleServices;
  #logger: Logger;

  /**
   * Builds a starter from the services of a window, filling in the APIs that were not given.
   *
   * @param services The services shared by the modules.
   * @param windows The windows API, or undefined for none.
   * @param search The search API, or undefined for none.
   * @param logger The application logger.
   * @returns The starter.
   */
  public static of(
    services: Omit<ModuleServices, 'windows' | 'search'>,
    windows: BrowserWindows | undefined,
    search: BrowserSearch | undefined,
    logger: Logger,
  ): ModuleStarter {
    return new ModuleStarter(
      { ...services, windows: windows ?? new BrowserWindows(undefined), search: search ?? new BrowserSearch(undefined) },
      logger,
    );
  }

  /**
   * Starts one module with a context built from the injected services.
   *
   * @param services The services every module receives.
   * @param logger Logger of the application; each module gets a child.
   */
  constructor(services: ModuleServices, logger: Logger) {
    this.#services = services;
    this.#logger = logger;
  }

  /**
   * Starts a module. A failure is logged, never thrown.
   *
   * @param entry The module to start.
   * @param start The services of this window and the checked settings.
   * @returns How the module ended: started, failed, or off by invalid options.
   */
  public async start(entry: EnabledModule, start: StartServices): Promise<ModuleOutcome> {
    const { settings, selectors, build, storage, notices, activeWorkspace } = start;
    const options = settings.optionsOf(entry.id);
    const logger = this.#logger.child(entry.id);
    if (options === null) {
      logger.warn('stays off: invalid options');
      return 'invalid-options';
    }
    try {
      await entry.module.start({
        ...this.#services,
        selectors,
        logger,
        options,
        build,
        modules: settings.all,
        storage,
        notices,
        activeWorkspace,
      });
      return 'started';
    } catch (error) {
      logger.error('Failed to start', error);
      return 'failed';
    }
  }
}
