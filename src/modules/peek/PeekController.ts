import type { Logger } from '../../core/Logger.js';
import type { LinkOpener, LinkRequest } from './LinkOpener.js';
import type { TabTiler } from './TabTiler.js';

export interface PanelHandle {
  /** The address the panel shows now. */
  readonly url: string;
  /** Removes the panel. */
  remove(): void;
}

export interface ControllerDependencies {
  /** Draws a panel; throws when it cannot. */
  createPanel: (request: LinkRequest) => PanelHandle;
  /** Opens tabs and windows. */
  opener: Pick<LinkOpener, 'openAfter' | 'openAsVivaldi'>;
  /** Tiles tabs for Split. */
  tiler: Pick<TabTiler, 'tile'>;
  /** Reports failures. */
  logger: Logger;
  /** Called whenever a Peek opens or closes. */
  onChange?: (open: boolean) => void;
}

interface OpenPeek {
  request: LinkRequest;
  panel: PanelHandle;
}

export class PeekController {
  #deps: ControllerDependencies;
  #current: OpenPeek | null = null;

  /**
   * Holds the single open Peek and carries out what the user asks of it.
   *
   * @param dependencies Everything the controller collaborates with.
   */
  constructor(dependencies: ControllerDependencies) {
    this.#deps = dependencies;
  }

  /**
   * @returns Whether a Peek is open.
   */
  public get isOpen(): boolean {
    return this.#current !== null;
  }

  /**
   * Opens a link in Peek, replacing the open one. When the panel cannot be drawn,
   * opens the link the way Vivaldi would have.
   *
   * @param request The link.
   */
  public open(request: LinkRequest): void {
    this.#discard();
    try {
      this.#current = { request, panel: this.#deps.createPanel(request) };
      this.#deps.onChange?.(true);
    } catch (error) {
      this.#deps.logger.error('Could not open Peek, opening the link normally', error);
      this.#deps.opener
        .openAsVivaldi(request)
        .catch((fallbackError: unknown) => this.#deps.logger.error('Could not open the link', fallbackError));
    }
  }

  /**
   * Closes the open Peek, if any.
   */
  public close(): void {
    if (this.#discard()) {
      this.#deps.onChange?.(false);
    }
  }

  /**
   * Turns the open Peek into a tab right after the tab it came from.
   *
   * @returns The id of the new tab, or null when nothing was open or the tab failed.
   */
  public async expand(): Promise<number | null> {
    const current = this.#current;
    if (current === null) {
      return null;
    }
    this.close();
    try {
      return await this.#deps.opener.openAfter(current.request.tabId, current.panel.url);
    } catch (error) {
      this.#deps.logger.error('Could not expand Peek', error);
      return null;
    }
  }

  /**
   * Turns the open Peek into a tab and tiles it with the tab it came from.
   * When tiling fails, the new tab stays as after Expand.
   */
  public async split(): Promise<void> {
    const sourceTabId = this.#current?.request.tabId;
    const tabId = await this.expand();
    if (sourceTabId === undefined || tabId === null) {
      return;
    }
    await this.#deps.tiler
      .tile([sourceTabId, tabId])
      .catch((error: unknown) => this.#deps.logger.error('Could not tile the tabs, kept as a tab', error));
  }

  #discard(): boolean {
    const current = this.#current;
    this.#current = null;
    current?.panel.remove();
    return current !== null;
  }
}
