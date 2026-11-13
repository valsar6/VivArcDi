import type { BrowserTabs } from '../../core/browser/BrowserTabs.js';
import type { DragPill } from './DragPill.js';
import { DRAGGING_ATTRIBUTE } from './RowDrag.js';
import type { Logger } from '../../core/support/Logger.js';

export interface TabDragPillDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** Selector of Vivaldi's tab wrapper, which carries `data-id="tab-<id>"`. */
  wrapperSelector: string;
  tabs: Pick<BrowserTabs, 'get'>;
  pill: Pick<DragPill, 'show' | 'move' | 'hide'>;
  logger: Logger;
}

export class TabDragPill {
  #deps: TabDragPillDependencies;
  #tabId: number | null = null;

  /**
   * Shows the pill for a tab of Vivaldi's list while it is dragged, and fades the slot it came
   * from with `data-vivarcdi-dragging`. The title and the icon come from the tab, read on the
   * first move. Meant for the `onDrag` and `onEnd` hooks of `TabDragRelease`.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: TabDragPillDependencies) {
    this.#deps = dependencies;
  }

  /**
   * @returns The `onDrag` and `onEnd` hooks of `TabDragRelease` that feed this pill.
   */
  public hooks(): { onDrag: (tabId: number, x: number, y: number) => void; onEnd: () => void } {
    return { onDrag: (tabId, x, y): void => this.drag(tabId, x, y), onEnd: (): void => this.end() };
  }

  /**
   * @param tabId The dragged tab.
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  public drag(tabId: number, x: number, y: number): void {
    if (this.#tabId === tabId) {
      this.#deps.pill.move(x, y);
      return;
    }
    this.end();
    this.#tabId = tabId;
    this.#slot(tabId)?.setAttribute(DRAGGING_ATTRIBUTE, '');
    this.#deps.tabs
      .get(tabId)
      .then((tab) => this.#show(tabId, tab, x, y))
      .catch((error: unknown) => this.#deps.logger.warn('could not read the dragged tab for the pill', error));
  }

  /**
   * Removes the pill and restores the slot.
   */
  public end(): void {
    if (this.#tabId !== null) {
      this.#slot(this.#tabId)?.removeAttribute(DRAGGING_ATTRIBUTE);
    }
    this.#tabId = null;
    this.#deps.pill.hide();
  }

  #show(tabId: number, tab: chrome.tabs.Tab, x: number, y: number): void {
    if (this.#tabId === tabId) {
      this.#deps.pill.show({ title: tab.title ?? tab.url ?? '', iconUrl: tab.favIconUrl ?? null }, x, y);
    }
  }

  #slot(tabId: number): Element | null {
    return this.#deps.document.querySelector(`${this.#deps.wrapperSelector}[data-id="tab-${tabId}"]`);
  }
}
