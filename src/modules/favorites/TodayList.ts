import { TabSlot } from '../../core/TabSlot.js';

export const TODAY_ATTRIBUTE = 'data-vivarcdi-drop-today';

/** Where a tile was released over the tab list: on the row of this tab, or on no row when null. */
export interface TodayTarget {
  rowTabId: number | null;
}

export interface TodayListDependencies {
  document: Pick<Document, 'elementFromPoint'>;
  /** Selector of Vivaldi's tab list. */
  stripSelector: string;
  /** Selector of Vivaldi's tab wrapper. */
  wrapperSelector: string;
}

export class TodayList {
  #deps: TodayListDependencies;
  #marked: Element | null = null;

  /**
   * The tab list under the separator as a place to drop a tile: it finds the row under a point and
   * marks the list while a tile is over it.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: TodayListDependencies) {
    this.#deps = dependencies;
  }

  /**
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   * @returns The place under the point, or null when the point is not over the tab list.
   */
  public at(x: number, y: number): TodayTarget | null {
    const element = this.#deps.document.elementFromPoint(x, y);
    if (element?.closest(this.#deps.stripSelector) == null) {
      return null;
    }
    const onRow = element.closest(this.#deps.wrapperSelector) !== null;
    return { rowTabId: onRow ? TabSlot.idOf(element, this.#deps.wrapperSelector) : null };
  }

  /**
   * Marks the tab list with `data-vivarcdi-drop-today`.
   *
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  public mark(x: number, y: number): void {
    const strip = this.#deps.document.elementFromPoint(x, y)?.closest(this.#deps.stripSelector) ?? null;
    if (strip === this.#marked) {
      return;
    }
    this.clear();
    strip?.setAttribute(TODAY_ATTRIBUTE, '');
    this.#marked = strip;
  }

  /**
   * Removes the mark.
   */
  public clear(): void {
    this.#marked?.removeAttribute(TODAY_ATTRIBUTE);
    this.#marked = null;
  }
}
