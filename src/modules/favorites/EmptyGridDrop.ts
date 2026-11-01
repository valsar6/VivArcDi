import { AddressKey } from '../../core/AddressKey.js';
import type { BrowserTabs } from '../../core/BrowserTabs.js';
import { KeptTab } from '../../core/KeptTab.js';
import type { Logger } from '../../core/Logger.js';
import type { TabBarAnchor } from '../../core/TabBarAnchor.js';
import { TabPointerDrag } from '../../core/TabPointerDrag.js';
import { GRID_ORDER } from './BookmarkFavorites.js';

export interface EmptyGridDropDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** Selector of Vivaldi's tab wrapper. */
  wrapperSelector: string;
  /** Where the grid goes. */
  anchor: Pick<TabBarAnchor, 'add'>;
  tabs: Pick<BrowserTabs, 'get' | 'update'>;
  /** Text of the placeholder. */
  hint: string;
  logger: Logger;
}

export const EMPTY_GRID_ATTRIBUTE = 'data-vivarcdi-empty-grid';
export const DROP_OVER_ATTRIBUTE = 'data-vivarcdi-drop-over';

export class EmptyGridDrop {
  #deps: EmptyGridDropDependencies;
  #drag: TabPointerDrag;
  #element: HTMLElement | null = null;
  #detach: (() => void) | null = null;

  /**
   * The place to drop a tab when the Favorites grid is empty and Vivaldi has no pinned strip: a
   * placeholder with a hint where the grid goes. A tab of today's list released on it is pinned.
   * With tiles the placeholder is gone and Vivaldi's own drag pins.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: EmptyGridDropDependencies) {
    this.#deps = dependencies;
    this.#drag = new TabPointerDrag({
      document: dependencies.document,
      wrapperSelector: dependencies.wrapperSelector,
      onMove: (x, y): void => this.#highlight(this.#isOver(x, y)),
      onDrop: (tabId, x, y): void => {
        if (this.#isOver(x, y)) {
          void this.#pin(tabId);
        }
      },
      onEnd: (): void => this.#highlight(false),
    });
  }

  /**
   * Starts following the mouse.
   */
  public start(): void {
    this.#drag.attach();
  }

  /**
   * Shows the placeholder while the grid is empty and removes it as soon as it is not.
   *
   * @param empty Whether the grid should show the placeholder.
   */
  public show(empty: boolean): void {
    if (!empty) {
      this.#remove();
      return;
    }
    if (this.#detach !== null) {
      return;
    }
    const element = this.#element ?? this.#create();
    try {
      this.#detach = this.#deps.anchor.add(element, GRID_ORDER);
    } catch {
      this.#detach = null;
    }
  }

  /**
   * Removes the placeholder and stops following the mouse.
   */
  public stop(): void {
    this.#drag.detach();
    this.#remove();
    this.#element = null;
  }

  #create(): HTMLElement {
    const element = this.#deps.document.createElement('div');
    element.setAttribute(EMPTY_GRID_ATTRIBUTE, '');
    element.textContent = this.#deps.hint;
    this.#element = element;
    return element;
  }

  #remove(): void {
    this.#detach?.();
    this.#detach = null;
    this.#highlight(false);
  }

  #highlight(over: boolean): void {
    this.#element?.toggleAttribute(DROP_OVER_ATTRIBUTE, over && this.#detach !== null);
  }

  #isOver(x: number, y: number): boolean {
    if (this.#detach === null || this.#element === null) {
      return false;
    }
    const { left, right, top, bottom } = this.#element.getBoundingClientRect();
    return x >= left && x <= right && y >= top && y <= bottom;
  }

  async #pin(tabId: number): Promise<void> {
    try {
      const tab = await this.#deps.tabs.get(tabId);
      if (AddressKey.from(tab.url) === null || KeptTab.is(tab)) {
        return;
      }
      await this.#deps.tabs.update(tabId, { pinned: true });
    } catch (error) {
      this.#deps.logger.warn('could not pin the dropped tab', error);
    }
  }
}
