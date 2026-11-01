import { AddressKey } from '../../core/AddressKey.js';
import { KeptTab } from '../../core/KeptTab.js';
import type { Logger } from '../../core/Logger.js';
import { TabData } from '../../core/TabData.js';
import type { WorkspaceFavorites } from './WorkspaceFavorites.js';

export type FavoriteKey = Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'defaultPrevented'>;

export interface FavoriteShortcutDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** Reads the active tab of the window. */
  activeTab: () => Promise<chrome.tabs.Tab | undefined>;
  /** Adds a tab to the workspace favorites and takes it back. */
  favorites: Pick<WorkspaceFavorites, 'add' | 'take'>;
  /** Shows a short message to the user. */
  notify: (text: string) => void;
  logger: Logger;
}

export const NOT_A_PAGE_TEXT = 'Only web pages can go to the favorites';
export const KEPT_TEXT = 'This link was already a bookmark: it stays';
export const FAILED_TEXT = 'Could not change the favorites';

export class FavoriteShortcut {
  #deps: FavoriteShortcutDependencies;
  #onKey = (event: Event): void => this.#handleKey(event as KeyboardEvent);

  /**
   * Makes Cmd/Ctrl+D add the page of the active tab to the favorites of the workspace, as Arc does,
   * and the same keys take it back to the open tabs. It listens in the capture phase, like
   * `CloseShortcut`, and takes the key press so that Vivaldi does not also handle it. A page that
   * is not `http` or `https` gets a message, and a pinned tab or a Favorite is left alone.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: FavoriteShortcutDependencies) {
    this.#deps = dependencies;
  }

  /**
   * @param event A key press.
   * @returns Whether it is Cmd/Ctrl+D without other modifiers.
   */
  public static isFavoriteKey(event: FavoriteKey): boolean {
    return (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'd';
  }

  /**
   * Starts listening, in the capture phase.
   */
  public attach(): void {
    this.#deps.document.addEventListener('keydown', this.#onKey, true);
  }

  /**
   * Stops listening.
   */
  public detach(): void {
    this.#deps.document.removeEventListener('keydown', this.#onKey, true);
  }

  #handleKey(event: KeyboardEvent): void {
    if (event.defaultPrevented || !FavoriteShortcut.isFavoriteKey(event)) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    this.#press().catch((error: unknown) => this.#deps.logger.warn('could not handle the favorites shortcut', error));
  }

  async #press(): Promise<void> {
    const tab = await this.#deps.activeTab();
    if (tab === undefined) {
      return;
    }
    if (TabData.ownOf(tab).bookmarkId !== undefined) {
      await this.#takeBack(tab);
    } else if (!KeptTab.is(tab)) {
      await this.#add(tab);
    }
  }

  async #takeBack(tab: chrome.tabs.Tab): Promise<void> {
    const result = await this.#deps.favorites.take(tab);
    if (result === 'kept') {
      this.#deps.notify(KEPT_TEXT);
    } else if (result === 'failed') {
      this.#deps.notify(FAILED_TEXT);
    }
  }

  async #add(tab: chrome.tabs.Tab): Promise<void> {
    if (AddressKey.from(tab.url) === null) {
      this.#deps.notify(NOT_A_PAGE_TEXT);
    } else if ((await this.#deps.favorites.add(tab)) === 'failed') {
      this.#deps.notify(FAILED_TEXT);
    }
  }
}
