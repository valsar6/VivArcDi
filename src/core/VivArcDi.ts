import { createDefaultRegistry } from '../modules/index.js';
import { BrowserBookmarks } from './bookmarks/BrowserBookmarks.js';
import { BrowserPrefs } from './BrowserPrefs.js';
import type { PrefsApi } from './BrowserPrefs.js';
import { BrowserRuntime } from './BrowserRuntime.js';
import { BrowserTabs } from './BrowserTabs.js';
import type { ChromeApi } from './BrowserTabs.js';
import { Logger } from './Logger.js';
import type { ModuleRegistry, EnabledModule } from './ModuleRegistry.js';
import { PersistentStorage } from './PersistentStorage.js';
import type { KeyValueStorage } from './PersistentStorage.js';
import { ResourceLoader } from './ResourceLoader.js';
import type { PayloadSource } from './ResourceLoader.js';
import { SelectorCatalog } from './SelectorCatalog.js';
import { StyleInjector } from './StyleInjector.js';
import type { BuildInfo, Config, ModuleOptions } from './types.js';
import { UiReadiness } from './UiReadiness.js';

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
  /** The runtime API given to modules. */
  runtime?: BrowserRuntime;
  /** Vivaldi's preferences given to modules. */
  prefs?: BrowserPrefs;
  /** The persistent storage given to modules. */
  storage?: KeyValueStorage;
}

export class VivArcDi {
  #loader: PayloadSource;
  #registry: ModuleRegistry;
  #logger: Logger;
  #document: Document;
  #tabs: BrowserTabs;
  #bookmarks: BrowserBookmarks;
  #runtime: BrowserRuntime;
  #prefs: BrowserPrefs;
  #storage: KeyValueStorage;
  #styles: StyleInjector;
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
    runtime = new BrowserRuntime(undefined),
    prefs = new BrowserPrefs(undefined),
    storage = new PersistentStorage(new Map(), null, undefined, logger),
  }: VivArcDiDependencies) {
    this.#loader = loader;
    this.#registry = registry;
    this.#logger = logger;
    this.#document = document;
    this.#tabs = tabs;
    this.#bookmarks = bookmarks;
    this.#runtime = runtime;
    this.#prefs = prefs;
    this.#storage = storage;
    this.#styles = new StyleInjector(document, loader);
  }

  /**
   * Creates the application with its default dependencies and starts it.
   * Startup errors are logged, never thrown, so Vivaldi keeps working.
   *
   * @param baseUrl URL of the payload folder, ending with a slash.
   * @param document The browser window document.
   * @returns The application, started or failed.
   */
  public static async boot(baseUrl: string | URL, document: Document = globalThis.document): Promise<VivArcDi> {
    const chromeApi = globalThis.chrome as unknown as ChromeApi | undefined;
    const logger = new Logger();
    const app = new VivArcDi({
      loader: new ResourceLoader(baseUrl),
      registry: createDefaultRegistry(),
      logger,
      document,
      tabs: new BrowserTabs(chromeApi),
      bookmarks: new BrowserBookmarks(chromeApi),
      runtime: new BrowserRuntime(chromeApi),
      prefs: new BrowserPrefs(VivArcDi.#prefsApi(chromeApi)),
      storage: await PersistentStorage.open(document, chromeApi, logger),
    });
    try {
      await app.start();
    } catch (error) {
      app.#logger.error('Startup failed', error);
    }
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
   * Starts VivArcDi. Does nothing beyond a warning when no selector catalog
   * fits the running Vivaldi, so an unsupported version is left untouched.
   */
  public async start(): Promise<void> {
    const [config, build] = await Promise.all([
      this.#loader.json<Config>('config.json'),
      this.#loader.json<BuildInfo>('build.json'),
    ]);
    const selectors = await SelectorCatalog.load(this.#loader, build.vivaldiVersion);
    if (selectors.version === null) {
      this.#logger.warn(`No selectors for Vivaldi ${build.vivaldiVersion}, staying inactive`);
      return;
    }

    await new UiReadiness(this.#document).waitFor(selectors.get('browser'));
    config.styles.forEach((path) => this.#styles.inject(path));

    const { modules, unknown } = this.#registry.createEnabled(config.modules);
    unknown.forEach((id) => this.#logger.warn(`Unknown module "${id}" in config.json`));
    for (const entry of modules) {
      await this.#startModule(entry, selectors, build, config.modules);
    }

    this.#logger.info(
      `${build.vivarcdiVersion} active on Vivaldi ${build.vivaldiVersion}`,
      `(selectors ${selectors.version}, modules: ${this.startedModules.join(', ') || 'none'})`,
    );
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
    this.#styles.removeAll();
  }

  async #startModule(entry: EnabledModule, selectors: SelectorCatalog, build: BuildInfo,
    modules: Readonly<Record<string, ModuleOptions>>,
  ): Promise<void> {
    const logger = this.#logger.child(entry.id);
    try {
      await entry.module.start({
        document: this.#document,
        selectors,
        logger,
        options: entry.options,
        build,
        tabs: this.#tabs,
        bookmarks: this.#bookmarks,
        modules,
        runtime: this.#runtime,
        prefs: this.#prefs,
        storage: this.#storage,
        payload: this.#loader,
      });
      this.#started.push(entry);
    } catch (error) {
      logger.error('Failed to start', error);
    }
  }
}
