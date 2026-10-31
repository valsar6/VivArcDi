import type { BrowserRuntime } from '../../core/BrowserRuntime.js';
import type { BrowserTabs } from '../../core/BrowserTabs.js';
import type { AddressField } from './AddressField.js';
import type { DownloadsButton } from './DownloadsButton.js';

export class CommandLauncher {
  #tabs: BrowserTabs;
  #runtime: BrowserRuntime;
  #address: AddressField;
  #downloads: DownloadsButton;

  /**
   * What the three buttons of a private window do. A mod cannot run Vivaldi commands or press
   * keys, so each action uses the interface itself.
   *
   * @param tabs The `chrome.tabs` API.
   * @param runtime Tells which window this is.
   * @param address Vivaldi's address field.
   * @param downloads Vivaldi's Downloads button.
   */
  constructor(tabs: BrowserTabs, runtime: BrowserRuntime, address: AddressField, downloads: DownloadsButton) {
    this.#tabs = tabs;
    this.#runtime = runtime;
    this.#address = address;
    this.#downloads = downloads;
  }

  /**
   * Opens a blank tab in this window and puts the cursor in the address field with its text selected.
   *
   * @returns Resolves once the tab exists.
   * @throws {Error} When the window or the tab cannot be reached.
   */
  public async newTab(): Promise<void> {
    const windowId = await this.#runtime.currentWindowId();
    await this.#tabs.create({ windowId });
    this.#address.focus();
  }

  /**
   * Opens the Downloads panel.
   *
   * @returns Whether Vivaldi's Downloads button was found.
   */
  public openLibrary(): boolean {
    return this.#downloads.click();
  }
}
