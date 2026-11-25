import { BookmarkWriter } from '../browser/bookmarks/BookmarkWriter.js';
import { BrowserBookmarks } from '../browser/bookmarks/BrowserBookmarks.js';
import { BrowserPrefs } from '../browser/BrowserPrefs.js';
import type { PrefsApi } from '../browser/BrowserPrefs.js';
import { BrowserRuntime } from '../browser/BrowserRuntime.js';
import { BrowserHistory } from '../browser/BrowserHistory.js';
import { BrowserSearch } from '../browser/BrowserSearch.js';
import { BrowserTabs } from '../browser/BrowserTabs.js';
import type { ChromeApi } from '../browser/BrowserTabs.js';
import { BrowserWindows } from '../browser/BrowserWindows.js';
import { ActiveWorkspace } from '../workspaces/ActiveWorkspace.js';
import { WorkspaceNames } from '../workspaces/WorkspaceNames.js';
import { BootReport } from './BootReport.js';
import type { BootOutcome } from './BootReport.js';
import { Logger } from '../support/Logger.js';
import type { ModuleRegistry, EnabledModule } from './ModuleRegistry.js';
import { ModuleStarter } from './ModuleStarter.js';
import { ModuleSettings } from './ModuleSettings.js';
import { PersistentStorage } from '../browser/PersistentStorage.js';
import type { SavingStorage } from '../browser/SavingStorage.js';
import type { Notices } from '../dom/Notices.js';
import { WindowServices } from './WindowServices.js';
import { ResourceLoader } from './ResourceLoader.js';
import type { PayloadSource } from './ResourceLoader.js';
import { SelectorCatalog } from '../dom/SelectorCatalog.js';
import { StyleInjector } from './StyleInjector.js';
import type { BuildInfo, Config } from './types.js';
import { UiReadiness } from './UiReadiness.js';

const WORKSPACE_TABS = 'the workspace cannot follow the tabs';

export interface VivArcDiDependencies {
  /** Loads payload files. */
  loader: PayloadSource;
  /** Available modules. */
  registry: ModuleRegistry;
  /** Logger for the application. */
  logger: Logger;
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** The tabs API given to modules. */
  tabs?: BrowserTabs;
  /** The bookmarks API given to modules. */
  bookmarks?: BrowserBookmarks;
  /** The bookmark writer given to modules. */
  bookmarkWriter?: BookmarkWriter;
  /** The runtime API given to modules. */
  runtime?: BrowserRuntime;
  /** The windows API given to modules. */
  windows?: BrowserWindows;
  /** The web search given to modules. */
  search?: BrowserSearch;
  /** The history given to modules. */
  history?: BrowserHistory;
  /** Vivaldi's preferences given to modules. */
  prefs?: BrowserPrefs;
  /** The persistent storage given to modules. */
  storage?: SavingStorage;
}

export class VivArcDi {
  #loader: PayloadSource;
  #registry: ModuleRegistry;
  #logger: Logger;
  #document: Document;
  #runtime: BrowserRuntime;
  #storage: SavingStorage;
  #tabs: BrowserTabs;
  #notices: Notices | null = null;
  #styles: StyleInjector;
  #starter: ModuleStarter;
  #workspaces: WorkspaceNames;
  #activeWorkspace: ActiveWorkspace;
  #started: EnabledModule[] = [];

  /**
   * The application: reads the configuration, waits for Vivaldi's interface,
   * then injects stylesheets and starts the enabled modules.
   *
   * @param dependencies Everything the application collaborates with.
   */
  constructor({
    loader,
    registry,
    logger,
    document,
    tabs = new BrowserTabs(undefined),
    bookmarks = new BrowserBookmarks(undefined),
    bookmarkWriter = new BookmarkWriter(undefined),
    runtime = new BrowserRuntime(undefined),
    windows,
    search,
    history = new BrowserHistory(undefined),
    prefs = new BrowserPrefs(undefined),
    storage = new PersistentStorage(new Map(), null, undefined, logger),
  }: VivArcDiDependencies) {
    this.#loader = loader;
    this.#registry = registry;
    this.#logger = logger;
    this.#document = document;
    this.#runtime = runtime;
    this.#storage = storage;
    this.#tabs = tabs;
    const workspaceLogger = logger.child('workspaces');
    this.#workspaces = new WorkspaceNames(prefs, (): void => undefined, workspaceLogger);
    this.#activeWorkspace = new ActiveWorkspace(tabs, workspaceLogger, (workspaceId): boolean =>
      !this.#workspaces.listed || this.#workspaces.has(workspaceId));
    this.#starter = ModuleStarter.of(
      { document, tabs, bookmarks, bookmarkWriter, runtime, history, prefs, payload: loader }, windows, search, logger);
    this.#styles = new StyleInjector(document, loader);
  }

  /**
   * Creates the application with its default dependencies and starts it.
   * Startup errors are logged, never thrown, so Vivaldi keeps working.
   *
   * @param baseUrl URL of the payload folder, ending with a slash.
   * @param registry The modules the payload knows, built by the loader.
   * @param document The browser window document.
   * @returns The application, started or failed.
   */
  public static async boot(
    baseUrl: string | URL,
    registry: ModuleRegistry,
    document: Document = globalThis.document,
  ): Promise<VivArcDi> {
    const chromeApi = globalThis.chrome as unknown as ChromeApi | undefined;
    const logger = new Logger();
    const app = new VivArcDi({
      loader: new ResourceLoader(baseUrl),
      registry,
      logger,
      document,
      tabs: new BrowserTabs(chromeApi),
      bookmarks: new BrowserBookmarks(chromeApi),
      bookmarkWriter: new BookmarkWriter(chromeApi),
      runtime: new BrowserRuntime(chromeApi),
      windows: new BrowserWindows(chromeApi),
      search: new BrowserSearch(chromeApi),
      history: new BrowserHistory(chromeApi),
      prefs: new BrowserPrefs(VivArcDi.#prefsApi(chromeApi)),
      storage: await PersistentStorage.open(document, chromeApi, logger),
    });
    await app.start();
    return app;
  }

  static #prefsApi(chromeApi: ChromeApi | undefined): PrefsApi | undefined {
    const vivaldi = (globalThis as { vivaldi?: { prefs?: PrefsApi } }).vivaldi;
    return vivaldi?.prefs ?? chromeApi?.vivaldiPrivate?.prefs;
  }

  /**
   * @returns Ids of the modules that started successfully.
   */
  public get startedModules(): string[] {
    return this.#started.map(({ id }) => id);
  }

  /**
   * Starts VivArcDi and logs one self-check summary. Never rejects: a failure is
   * logged as `Startup failed` and named in the summary, and a severe start shows one
   * notice. Does nothing beyond a
   * warning when no selector catalog fits the running Vivaldi.
   */
  public async start(): Promise<void> {
    const report = new BootReport(this.#logger.child('boot'));
    let outcome: BootOutcome;
    try {
      outcome = await this.#run(report);
    } catch (error) {
      this.#logger.error('Startup failed', error);
      outcome = 'failed';
    }
    report.summarize(outcome);
    report.notify(outcome, this.#notices);
  }

  async #run(report: BootReport): Promise<'active' | 'inactive'> {
    const [config, build] = await Promise.all([
      this.#loader.json<Config>('config.json'),
      this.#loader.json<BuildInfo>('build.json'),
    ]);
    report.useBuild(build);
    report.enter('selectors');
    const selectors = await SelectorCatalog.load(this.#loader, build.vivaldiVersion);
    report.useCatalog(selectors);
    if (selectors.version === null) {
      this.#logger.warn(`No selectors for Vivaldi ${build.vivaldiVersion}, staying inactive`);
      return 'inactive';
    }

    report.enter('interface');
    await new UiReadiness(this.#document).waitFor(selectors.get('browser'));
    config.styles.forEach((path) => this.#styles.inject(path));
    const services = WindowServices.open(this.#document, selectors, this.#storage, this.#logger);
    this.#notices = services.notices;
    if (this.#tabs.available) {
      await this.#workspaces.start();
      await this.#activeWorkspace.start().catch((error: unknown) => this.#logger.warn(WORKSPACE_TABS, error));
    }

    report.enter('modules');
    const settings = ModuleSettings.check(config.modules, this.#registry, this.#logger);
    const { modules, unknown, skipped } = this.#registry.createEnabled(config.modules, await this.#isPrivateWindow());
    report.skip(skipped.config, skipped.window);
    unknown.forEach((id) => this.#logger.warn(`Unknown module "${id}" in config.json`));
    for (const entry of modules) {
      const outcome = await this.#starter.start(entry, { settings, selectors, build, ...services, activeWorkspace: this.#activeWorkspace });
      report.record(entry.id, outcome);
      if (outcome === 'started') {
        this.#started.push(entry);
      }
    }

    this.#logger.info(
      `${build.vivarcdiVersion} active on Vivaldi ${build.vivaldiVersion}`,
      `(selectors ${selectors.version}, modules: ${this.startedModules.join(', ') || 'none'})`,
    );
    return 'active';
  }

  /**
   * Stops the started modules in reverse order and removes the stylesheets.
   */
  public async stop(): Promise<void> {
    for (const { id, module } of [...this.#started].reverse()) {
      try {
        await module.stop();
      } catch (error) {
        this.#logger.error(`Module "${id}" failed to stop`, error);
      }
    }
    this.#started = [];
    this.#activeWorkspace.stop();
    this.#workspaces.stop();
    this.#notices?.remove();
    this.#styles.removeAll();
  }

  async #isPrivateWindow(): Promise<boolean> {
    try {
      return await this.#runtime.isPrivateWindow();
    } catch (error) {
      this.#logger.warn('Cannot tell if this is a private window, treating it as a normal window', error);
      return false;
    }
  }
}
