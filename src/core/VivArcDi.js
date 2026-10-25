import { Logger } from './Logger.js';
import { ResourceLoader } from './ResourceLoader.js';
import { SelectorCatalog } from './SelectorCatalog.js';
import { StyleInjector } from './StyleInjector.js';
import { UiReadiness } from './UiReadiness.js';
import { createDefaultRegistry } from '../modules/index.js';

export class VivArcDi {
  #loader;
  #registry;
  #logger;
  #document;
  #styles;
  #started = [];

  /**
   * The application: reads the configuration, waits for Vivaldi's interface,
   * then injects stylesheets and starts the enabled modules.
   *
   * @param {object} dependencies
   * @param {ResourceLoader} dependencies.loader Loads payload files.
   * @param {import('./ModuleRegistry.js').ModuleRegistry} dependencies.registry Available modules.
   * @param {Logger} dependencies.logger Logger for the application.
   * @param {Document} dependencies.document The document of Vivaldi's browser window.
   */
  constructor({ loader, registry, logger, document }) {
    this.#loader = loader;
    this.#registry = registry;
    this.#logger = logger;
    this.#document = document;
    this.#styles = new StyleInjector(document, loader);
  }

  /**
   * Creates the application with its default dependencies and starts it.
   * Startup errors are logged, never thrown, so Vivaldi keeps working.
   *
   * @param {string | URL} baseUrl URL of the payload folder, ending with a slash.
   * @param {Document} [document=globalThis.document] The browser window document.
   * @returns {Promise<VivArcDi>} The application, started or failed.
   */
  static async boot(baseUrl, document = globalThis.document) {
    const app = new VivArcDi({
      loader: new ResourceLoader(baseUrl),
      registry: createDefaultRegistry(),
      logger: new Logger(),
      document,
    });
    try {
      await app.start();
    } catch (error) {
      app.#logger.error('Startup failed', error);
    }
    return app;
  }

  /**
   * @returns {string[]} Ids of the modules that started successfully.
   */
  get startedModules() {
    return this.#started.map(({ id }) => id);
  }

  /**
   * Starts VivArcDi. Does nothing beyond a warning when no selector catalog
   * fits the running Vivaldi, so an unsupported version is left untouched.
   *
   * @returns {Promise<void>}
   */
  async start() {
    const [config, build] = await Promise.all([
      this.#loader.json('config.json'),
      this.#loader.json('build.json'),
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
      await this.#startModule(entry, selectors, build);
    }

    this.#logger.info(
      `${build.vivarcdiVersion} active on Vivaldi ${build.vivaldiVersion}`,
      `(selectors ${selectors.version}, modules: ${this.startedModules.join(', ') || 'none'})`,
    );
  }

  /**
   * Stops the started modules in reverse order and removes the stylesheets.
   *
   * @returns {Promise<void>}
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

  async #startModule(entry, selectors, build) {
    const logger = this.#logger.child(entry.id);
    try {
      await entry.module.start({
        document: this.#document,
        selectors,
        logger,
        options: entry.options,
        build,
      });
      this.#started.push(entry);
    } catch (error) {
      logger.error('Failed to start', error);
    }
  }
}
