import type { AddressField } from '../../shared/newtab/AddressField.js';
import type { BrowserRuntime } from '../../core/browser/BrowserRuntime.js';
import type { BrowserTabs } from '../../core/browser/BrowserTabs.js';
import { NewTabOpener } from '../../shared/newtab/NewTabOpener.js';
import type { DownloadsButton } from './DownloadsButton.js';

export class CommandLauncher {
  #opener: NewTabOpener;
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
    this.#opener = new NewTabOpener(tabs, runtime, address);
    this.#downloads = downloads;
  }

  /**
   * Opens a blank tab in this window and puts the cursor in the address field with its text selected.
   *
   * @returns Resolves once the tab exists.
   * @throws {Error} When the window or the tab cannot be reached.
   */
  public async newTab(): Promise<void> {
    await this.#opener.open();
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
