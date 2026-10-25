import type { BrowserTabs } from './BrowserTabs.js';
import type { Logger } from './Logger.js';
import type { SelectorCatalog } from './SelectorCatalog.js';
import type { BuildInfo } from './types.js';

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
  /** Versions written by the installer. */
  build: BuildInfo;
}

export class Module {
  /**
   * Unique id used in `config.json` to enable and configure the module.
   * Every subclass must override it.
   */
  public static id = '';

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
