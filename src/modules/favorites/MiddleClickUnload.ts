import type { Logger } from '../../core/Logger.js';
import { FAVORITE_ATTRIBUTE, FavoriteTagger } from './FavoriteTagger.js';
import type { TileUnloader } from './TileUnloader.js';

const MIDDLE_BUTTON = 1;
const BLOCKED_EVENTS = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'auxclick'];

export interface MiddleClickDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** Unloads tabs. */
  unloader: Pick<TileUnloader, 'unload'>;
  /** Selector of the tab wrapper holding the tab id. */
  wrapperSelector: string;
  /** Reports failed unloads. */
  logger: Logger;
}

export class MiddleClickUnload {
  #document: Document;
  #unloader: Pick<TileUnloader, 'unload'>;
  #wrapperSelector: string;
  #logger: Logger;
  #listener = (event: Event): void => this.#handle(event as MouseEvent);

  /**
   * Turns a middle click on a tile, which Vivaldi treats as close, into an unload.
   * Listens in the capture phase so Vivaldi never sees the click.
   *
   * @param dependencies Everything the interceptor collaborates with.
   */
  constructor({ document, unloader, wrapperSelector, logger }: MiddleClickDependencies) {
    this.#document = document;
    this.#unloader = unloader;
    this.#wrapperSelector = wrapperSelector;
    this.#logger = logger;
  }

  /**
   * Starts intercepting middle clicks on tiles.
   */
  public attach(): void {
    BLOCKED_EVENTS.forEach((type) => this.#document.addEventListener(type, this.#listener, true));
  }

  /**
   * Gives middle clicks back to Vivaldi.
   */
  public detach(): void {
    BLOCKED_EVENTS.forEach((type) => this.#document.removeEventListener(type, this.#listener, true));
  }

  #handle(event: MouseEvent): void {
    if (event.button !== MIDDLE_BUTTON) {
      return;
    }
    const tile = (event.target as Element | null)?.closest?.(`[${FAVORITE_ATTRIBUTE}]`);
    if (!tile) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.type !== 'auxclick') {
      return;
    }
    const tabId = FavoriteTagger.tabIdOf(tile, this.#wrapperSelector);
    if (tabId !== null) {
      this.#unloader.unload(tabId).catch((error: unknown) => this.#logger.error(`Could not unload tab ${tabId}`, error));
    }
  }
}
