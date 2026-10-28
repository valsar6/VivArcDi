import { ARCHIVE_FOOTER_ATTRIBUTE } from './ArchivePanelView.js';
import { KeptElement } from './KeptElement.js';
import type { KeptElementPlacement } from './KeptElement.js';

export class ArchiveButton {
  #kept: KeptElement;

  /**
   * A footer owned by VivArcDi at the bottom of the tab bar, after the tab list, with a button that
   * opens the archive. It is put back at the end when Vivaldi rebuilds the tab bar.
   *
   * @param document The browser window document.
   * @param containerSelector Selector of the element the footer ends, `#tabs-container`.
   * @param onOpen What a click does.
   * @param placement The watched root, and the watcher and frame scheduling replaceable in tests.
   */
  constructor(document: Document, containerSelector: string, onOpen: () => void, placement: Omit<KeptElementPlacement, 'parent'>) {
    const footer = document.createElement('div');
    footer.setAttribute(ARCHIVE_FOOTER_ATTRIBUTE, '');
    const button = document.createElement('button');
    button.setAttribute('type', 'button');
    button.setAttribute('title', 'Archive (Cmd/Ctrl+Shift+A)');
    button.textContent = 'Archive';
    button.addEventListener('click', () => onOpen());
    footer.append(button);
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
