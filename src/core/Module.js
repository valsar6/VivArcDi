/**
 * @typedef {object} ModuleContext
 * @property {Document} document The document of Vivaldi's browser window.
 * @property {import('./SelectorCatalog.js').SelectorCatalog} selectors Selectors for the running Vivaldi.
 * @property {import('./Logger.js').Logger} logger Logger tagged with the module id.
 * @property {Record<string, unknown>} options The module's options from `config.json`.
 * @property {import('./BrowserTabs.js').BrowserTabs} tabs The `chrome.tabs` API; check `tabs.available` first.
 * @property {{ vivarcdiVersion: string, vivaldiVersion: string }} build Versions written by the installer.
 */

export class Module {
  /**
   * Unique id used in `config.json` to enable and configure the module.
   * Every subclass must override it.
   *
   * @type {string}
   */
  static id = '';

  /**
   * Starts the module. Called once, after Vivaldi's interface is ready.
   *
   * @param {ModuleContext} context What the module may use.
   * @returns {Promise<void> | void}
   */
  start(context) {
    throw new Error(`${this.constructor.name} must implement start()`);
  }

  /**
   * Undoes everything `start` did. Called when VivArcDi shuts down.
   *
   * @returns {Promise<void> | void}
   */
  stop() {}
}
