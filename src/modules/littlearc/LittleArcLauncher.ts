import type { BrowserWindows, WindowDetails, WindowUpdate } from '../../core/browser/BrowserWindows.js';
import type { Logger } from '../../core/support/Logger.js';
import type { LittleArcRegistry } from './LittleArcRegistry.js';
import type { SidebarBox } from './SidebarBox.js';
import { SidebarPlacement } from './SidebarPlacement.js';
import { WindowBounds } from './WindowBounds.js';
import type { Bounds, ScreenArea, WindowBoundsSettings } from './WindowBounds.js';

const BLANK_PAGE = 'about:blank';

export interface LauncherDependencies {
  windows: Pick<BrowserWindows, 'create' | 'get' | 'update'>;
  registry: Pick<LittleArcRegistry, 'mark'>;
  screen: () => ScreenArea;
  size: WindowBoundsSettings;
  sidebar: () => SidebarBox | null;
  mainWindowId: number;
  logger: Logger;
}

function boundsOf(details: WindowDetails): Bounds | null {
  const { left, top, width, height } = details;
  if (left === undefined || top === undefined || width === undefined || height === undefined) {
    return null;
  }
  return { left, top, width, height };
}

export class LittleArcLauncher {
  #windows: Pick<BrowserWindows, 'create' | 'get' | 'update'>;
  #registry: Pick<LittleArcRegistry, 'mark'>;
  #screen: () => ScreenArea;
  #size: WindowBoundsSettings;
  #sidebar: () => SidebarBox | null;
  #mainWindowId: number;
  #logger: Logger;
  #placement = new SidebarPlacement();
  #warned = new Set<string>();

  /**
   * Opens Little Arc windows: a small popup window beside the sidebar when there is room.
   *
   * @param dependencies The windows API, registry, screen, size, sidebar, main window and logger.
   */
  constructor({ windows, registry, screen, size, sidebar, mainWindowId, logger }: LauncherDependencies) {
    this.#windows = windows;
    this.#registry = registry;
    this.#screen = screen;
    this.#size = size;
    this.#sidebar = sidebar;
    this.#mainWindowId = mainWindowId;
    this.#logger = logger;
  }

  /**
   * Opens an empty Little Arc window, where the user types an address.
   *
   * @returns Whether the window was opened.
   */
  public openBlank(): Promise<boolean> {
    return this.#opened({ url: BLANK_PAGE });
  }

  /**
   * Opens a Little Arc window that starts loading an address. A search is opened through the fallback
   * search address by the caller, because `chrome.search.query` is missing in the main window.
   *
   * @param url The address to load.
   * @returns Whether the window was opened.
   */
  public openAddress(url: string): Promise<boolean> {
    return this.#opened({ url });
  }

  /**
   * Opens a Little Arc window for a link of another page and keeps its id, so the row or tile the
   * link came from can be marked.
   *
   * @param url The address of the link.
   * @returns The id of the new window, or null when it could not be opened.
   */
  public async openAddressIn(url: string): Promise<number | null> {
    const details = await this.#open({ url });
    return details?.id ?? null;
  }

  /**
   * Moves a tab that Vivaldi opened in the main window into a new Little Arc window, so that the
   * page is not loaded twice. When the window cannot be created the tab stays where Vivaldi put it.
   *
   * @param tabId The tab to move.
   * @returns Whether the tab was moved.
   */
  public adopt(tabId: number): Promise<boolean> {
    return this.#opened({ tabId });
  }

  async #opened(source: { url: string } | { tabId: number }): Promise<boolean> {
    return (await this.#open(source)) !== null;
  }

  async #open(source: { url: string } | { tabId: number }): Promise<WindowDetails | null> {
    const sidebar = this.#sidebar();
    const placement = sidebar === null ? null : this.#placement.beside(sidebar, this.#screen(), this.#size);
    const bounds = placement?.bounds ?? WindowBounds.centred(this.#screen(), this.#size);
    try {
      const details = await this.#windows.create({ ...source, type: 'popup', focused: true, ...bounds });
      if (details.id !== undefined) {
        this.#registry.mark(details.id);
        this.#warnAboutPlacement(sidebar, placement);
        await this.#keepClear(details.id, bounds, sidebar);
      }
      return details;
    } catch (error) {
      this.#logger.error('could not open a Little Arc window, leaving the link to Vivaldi', error);
      return null;
    }
  }

  #warnAboutPlacement(sidebar: SidebarBox | null, placement: { shrunk: boolean } | null): void {
    if (sidebar === null) {
      this.#warnOnce('could not read the sidebar: centring the Little Arc window');
    } else if (placement === null) {
      this.#warnOnce('no room beside the sidebar: centring the Little Arc window');
    } else if (placement.shrunk) {
      this.#warnOnce('the sidebar leaves no room: the Little Arc window was shrunk');
    }
  }

  async #keepClear(popupId: number, bounds: Bounds, sidebar: SidebarBox | null): Promise<void> {
    if (sidebar === null) {
      return;
    }
    try {
      const actual = boundsOf(await this.#windows.get(popupId));
      if (actual === null || !this.#placement.overlaps(sidebar, actual)) {
        return;
      }
      await this.#windows.update(popupId, bounds);
      const after = boundsOf(await this.#windows.get(popupId));
      if (after !== null && this.#placement.overlaps(sidebar, after)) {
        await this.#windows.update(this.#mainWindowId, { focused: true } satisfies WindowUpdate);
        this.#warnOnce('the Little Arc window still covers the sidebar: the main window stays in front');
      }
    } catch (error) {
      this.#logger.warn('could not check the Little Arc window position', error);
    }
  }

  #warnOnce(message: string): void {
    if (this.#warned.has(message)) {
      return;
    }
    this.#warned.add(message);
    this.#logger.warn(message);
  }
}
