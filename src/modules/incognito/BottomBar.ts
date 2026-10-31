import { KeptElement } from '../../core/KeptElement.js';
import type { KeptElementPlacement } from '../../core/KeptElement.js';
import type { BarButton } from './BarButton.js';

export const BOTTOM_BAR_ATTRIBUTE = 'data-vivarcdi-bottom-bar';

export class BottomBar {
  #kept: KeptElement;

  /**
   * A footer owned by VivArcDi at the bottom of the tab bar, after the tab list, with buttons in a
   * row: the first at the left edge and the last at the right edge. It is put back at the end when
   * Vivaldi rebuilds the tab bar.
   *
   * @param document The browser window document.
   * @param containerSelector Selector of the element the footer ends, `#tabs-container`.
   * @param buttons The buttons, from left to right.
   * @param placement The watched root, and the watcher and frame scheduling replaceable in tests.
   */
  constructor(document: Document, containerSelector: string, buttons: BarButton[], placement: Omit<KeptElementPlacement, 'parent'>) {
    const footer = document.createElement('div');
    footer.setAttribute(BOTTOM_BAR_ATTRIBUTE, '');
    footer.append(...buttons.map(({ element }) => element));
    this.#kept = new KeptElement(footer, { ...placement, parent: (): Element | null => document.querySelector(containerSelector) });
  }

  /**
   * Shows the footer.
   */
  public start(): void {
    this.#kept.start();
  }

  /**
   * Removes the footer.
   */
  public stop(): void {
    this.#kept.stop();
  }
}
