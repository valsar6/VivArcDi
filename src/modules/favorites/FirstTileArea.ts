import { TabBarAnchor } from '../../core/dom/TabBarAnchor.js';
import { GRID_ORDER } from './BookmarkFavorites.js';

export const FIRST_TILE_ATTRIBUTE = 'data-vivarcdi-first-tile';
export const OPEN_ATTRIBUTE = 'data-vivarcdi-open';

export interface FirstTileAreaDependencies {
  document: Document;
  /** Selector of the tab list's container, where the anchor puts the area. */
  hostSelector: string;
  /** Where sections are put above the tab list; the shared one of the document by default. */
  anchor?: Pick<TabBarAnchor, 'add'>;
}

export class FirstTileArea {
  #element: HTMLElement;
  #anchor: Pick<TabBarAnchor, 'add'>;
  #detach: (() => void) | null = null;

  /**
   * The place of the first tile: while no tile is shown, a thin invisible strip sits where the grid
   * will appear, above the space header, and a dragged page released on it becomes the first tile.
   * It opens to one tile height while a page is dragged over it.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor({ document, hostSelector, anchor }: FirstTileAreaDependencies) {
    this.#element = document.createElement('div');
    this.#element.setAttribute(FIRST_TILE_ATTRIBUTE, '');
    this.#anchor = anchor ?? TabBarAnchor.of(document, hostSelector);
  }

  /**
   * @returns The area when it is in the window, otherwise null.
   */
  public get element(): HTMLElement | null {
    return this.#element.parentElement === null ? null : this.#element;
  }

  /**
   * Shows or removes the area.
   *
   * @param visible Whether the tab bar is shown and has no tiles.
   */
  public place(visible: boolean): void {
    if (!visible) {
      this.#element.removeAttribute(OPEN_ATTRIBUTE);
      this.#detach?.();
      this.#detach = null;
      return;
    }
    try {
      this.#detach ??= this.#anchor.add(this.#element, GRID_ORDER);
    } catch {
      this.#detach = null;
    }
  }

  /**
   * Removes the area for good.
   */
  public destroy(): void {
    this.place(false);
  }
}
