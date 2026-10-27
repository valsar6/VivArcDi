import { TabSlot } from '../../core/TabSlot.js';

export type CloseKey = Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>;

export interface CloseShortcutDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** Selector of the close button of a tab row. */
  closeSelector: string;
  /** Selector of a pinned tab slot. */
  pinnedSelector: string;
  /** Selector of Vivaldi's tab wrapper. */
  wrapperSelector: string;
  /** Id of the active tab when it is pinned, otherwise null. */
  activePinned: () => number | null;
  /** Unloads a tab. */
  unload: (tabId: number) => void;
}

export class CloseShortcut {
  #deps: CloseShortcutDependencies;
  #onKey = (event: Event): void => this.#handleKey(event as KeyboardEvent);
  #onClick = (event: Event): void => this.#handleClick(event);

  /**
   * Makes Cmd/Ctrl+W and the close button unload Favorites and pinned tabs instead of closing
   * them. Ordinary tabs are left to Vivaldi, and so is a shortcut another module already took.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: CloseShortcutDependencies) {
    this.#deps = dependencies;
  }

  /**
   * @param event A key press.
   * @returns Whether it is Cmd/Ctrl+W without other modifiers.
   */
  public static isCloseKey(event: CloseKey): boolean {
    return (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'w';
  }

  /**
   * Starts listening, in the capture phase.
   */
  public attach(): void {
    this.#deps.document.addEventListener('keydown', this.#onKey, true);
    this.#deps.document.addEventListener('click', this.#onClick, true);
  }

  /**
   * Stops listening.
   */
  public detach(): void {
    this.#deps.document.removeEventListener('keydown', this.#onKey, true);
    this.#deps.document.removeEventListener('click', this.#onClick, true);
  }

  #handleKey(event: KeyboardEvent): void {
    const tabId = event.defaultPrevented || !CloseShortcut.isCloseKey(event) ? null : this.#deps.activePinned();
    if (tabId !== null) {
      CloseShortcut.#take(event);
      this.#deps.unload(tabId);
    }
  }

  #handleClick(event: Event): void {
    const button = (event.target as Element | null)?.closest?.(this.#deps.closeSelector) ?? null;
    if (button?.closest(this.#deps.pinnedSelector) == null) {
      return;
    }
    const tabId = TabSlot.idOf(button, this.#deps.wrapperSelector);
    if (tabId !== null) {
      CloseShortcut.#take(event);
      this.#deps.unload(tabId);
    }
  }

  static #take(event: Event): void {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}
