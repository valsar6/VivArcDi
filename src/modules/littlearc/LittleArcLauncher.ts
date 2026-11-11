import type { BrowserWindows } from '../../core/BrowserWindows.js';
import type { Logger } from '../../core/Logger.js';
import type { LittleArcRegistry } from './LittleArcRegistry.js';
import { WindowBounds } from './WindowBounds.js';
import type { ScreenArea, WindowBoundsSettings } from './WindowBounds.js';

const BLANK_PAGE = 'about:blank';

export interface LauncherDependencies {
  windows: Pick<BrowserWindows, 'create'>;
  registry: Pick<LittleArcRegistry, 'mark'>;
  screen: () => ScreenArea;
  size: WindowBoundsSettings;
  logger: Logger;
}

export class LittleArcLauncher {
  #windows: Pick<BrowserWindows, 'create'>;
  #registry: Pick<LittleArcRegistry, 'mark'>;
  #screen: () => ScreenArea;
  #size: WindowBoundsSettings;
  #logger: Logger;

  /**
   * Opens Little Arc windows: a small popup window, centred on the screen.
   *
   * @param dependencies The windows API, the registry of Little Arc windows, the screen, the share
   * of the screen the window takes and a logger.
   */
  constructor({ windows, registry, screen, size, logger }: LauncherDependencies) {
    this.#windows = windows;
    this.#registry = registry;
    this.#screen = screen;
    this.#size = size;
    this.#logger = logger;
  }

  /**
   * Opens an empty Little Arc window, where the user types an address.
   *
   * @returns Whether the window was opened.
   */
  public openBlank(): Promise<boolean> {
    return this.#open({ url: BLANK_PAGE });
  }

  /**
   * Opens a Little Arc window that starts loading an address. A search is opened through the fallback
   * search address by the caller, because `chrome.search.query` is missing in the main window.
   *
   * @param url The address to load.
   * @returns Whether the window was opened.
   */
  public openAddress(url: string): Promise<boolean> {
    return this.#open({ url });
  }

  /**
   * Moves a tab that Vivaldi opened in the main window into a new Little Arc window, so that the
   * page is not loaded twice. When the window cannot be created the tab stays where Vivaldi put it.
   *
   * @param tabId The tab to move.
   * @returns Whether the tab was moved.
   */
  public adopt(tabId: number): Promise<boolean> {
    return this.#open({ tabId });
  }

  async #open(source: { url: string } | { tabId: number }): Promise<boolean> {
    try {
      const details = await this.#windows.create({ ...source, type: 'popup', focused: true, ...WindowBounds.centred(this.#screen(), this.#size) });
      if (details.id !== undefined) {
        this.#registry.mark(details.id);
      }
      return true;
    } catch (error) {
      this.#logger.error('could not open a Little Arc window, leaving the link to Vivaldi', error);
      return false;
    }
  }
}
