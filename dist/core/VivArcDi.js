import { createDefaultRegistry } from "../modules/index.js";
import { BrowserBookmarks } from "./bookmarks/BrowserBookmarks.js";
import { BrowserPrefs } from "./BrowserPrefs.js";
import { BrowserRuntime } from "./BrowserRuntime.js";
import { BrowserTabs } from "./BrowserTabs.js";
import { Logger } from "./Logger.js";
import { PersistentStorage } from "./PersistentStorage.js";
import { ResourceLoader } from "./ResourceLoader.js";
import { SelectorCatalog } from "./SelectorCatalog.js";
import { StyleInjector } from "./StyleInjector.js";
import { UiReadiness } from "./UiReadiness.js";
class VivArcDi {
  #loader;
  #registry;
  #logger;
  #document;
  #tabs;
  #bookmarks;
  #runtime;
  #prefs;
  #storage;
  #styles;
  #started = [];
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
    tabs = new BrowserTabs(void 0),
    bookmarks = new BrowserBookmarks(void 0),
    runtime = new BrowserRuntime(void 0),
    prefs = new BrowserPrefs(void 0),
    storage = new PersistentStorage(/* @__PURE__ */ new Map(), null, void 0, logger)
  }) {
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
  static async boot(baseUrl, document = globalThis.document) {
    const chromeApi = globalThis.chrome;
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
      storage: await PersistentStorage.open(document, chromeApi, logger)
    });
    try {
      await app.start();
    } catch (error) {
      app.#logger.error("Startup failed", error);
    }
    return app;
  }
  static #prefsApi(chromeApi) {
    const vivaldi = globalThis.vivaldi;
    return vivaldi?.prefs ?? chromeApi?.vivaldiPrivate?.prefs;
  }
  /**
   * @returns Ids of the modules that started successfully.
   */
  get startedModules() {
    return this.#started.map(({ id }) => id);
  }
  /**
   * Starts VivArcDi. Does nothing beyond a warning when no selector catalog
   * fits the running Vivaldi, so an unsupported version is left untouched.
   */
  async start() {
    const [config, build] = await Promise.all([
      this.#loader.json("config.json"),
      this.#loader.json("build.json")
    ]);
    const selectors = await SelectorCatalog.load(this.#loader, build.vivaldiVersion);
    if (selectors.version === null) {
      this.#logger.warn(`No selectors for Vivaldi ${build.vivaldiVersion}, staying inactive`);
      return;
    }
    await new UiReadiness(this.#document).waitFor(selectors.get("browser"));
    config.styles.forEach((path) => this.#styles.inject(path));
    const { modules, unknown } = this.#registry.createEnabled(config.modules, await this.#isPrivateWindow());
    unknown.forEach((id) => this.#logger.warn(`Unknown module "${id}" in config.json`));
    for (const entry of modules) {
      await this.#startModule(entry, selectors, build, config.modules);
    }
    this.#logger.info(
      `${build.vivarcdiVersion} active on Vivaldi ${build.vivaldiVersion}`,
      `(selectors ${selectors.version}, modules: ${this.startedModules.join(", ") || "none"})`
    );
  }
  /**
   * Stops the started modules in reverse order and removes the stylesheets.
   */
  async stop() {
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
  async #isPrivateWindow() {
    try {
      return await this.#runtime.isPrivateWindow();
    } catch (error) {
      this.#logger.warn("Cannot tell if this is a private window, treating it as a normal window", error);
      return false;
    }
  }
  async #startModule(entry, selectors, build, modules) {
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
        payload: this.#loader
      });
      this.#started.push(entry);
    } catch (error) {
      logger.error("Failed to start", error);
    }
  }
}
export {
  VivArcDi
};
