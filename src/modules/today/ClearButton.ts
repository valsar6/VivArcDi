import { PINNED_LAST_ATTRIBUTE } from '../pinned/TabBarMarker.js';
import { KeptElement, watchSubtree } from './KeptElement.js';
import type { KeptElementPlacement } from './KeptElement.js';

export const CLEAR_ATTRIBUTE = 'data-vivarcdi-clear';

const CLEAR_TARGET = `[${CLEAR_ATTRIBUTE}]`;
const SWALLOWED_EVENTS = ['pointerdown', 'mousedown', 'click'] as const;

export class ClearButton {
  #document: Document;
  #onClear: () => void;
  #kept: KeptElement;
  #listener = (event: Event): void => this.#handle(event);

  /**
   * The "Clear" button on the separator that 003 draws under the last pinned row. It lives inside
   * that row, so it is put back whenever Vivaldi rebuilds the row or the mark moves. One listener
   * on the document, in the capture phase, takes its clicks before Vivaldi's tab row sees them.
   *
   * @param document The browser window document.
   * @param root The element below which the separator row is rebuilt, such as `#browser`.
   * @param onClear What a click does.
   * @param placement Watcher and frame scheduling, replaceable in tests.
   */
  constructor(document: Document, root: Node, onClear: () => void, placement: Pick<KeptElementPlacement, 'watch' | 'timing'> = {}) {
    this.#document = document;
    this.#onClear = onClear;
    const button = document.createElement('button');
    button.setAttribute('type', 'button');
    button.setAttribute(CLEAR_ATTRIBUTE, '');
    button.setAttribute('title', 'Archive the Today tabs of this workspace');
    button.textContent = 'Clear';
    this.#kept = new KeptElement(button, {
      parent: (): Element | null => document.querySelector(`[${PINNED_LAST_ATTRIBUTE}]`),
      root,
      watch: placement.watch ?? watchSubtree([PINNED_LAST_ATTRIBUTE]),
      ...(placement.timing === undefined ? {} : { timing: placement.timing }),
    });
  }

  /**
   * Shows the button and starts listening.
   */
  public start(): void {
    SWALLOWED_EVENTS.forEach((type) => this.#document.addEventListener(type, this.#listener, true));
    this.#kept.start();
  }

  /**
   * Removes the button and every listener.
   */
  public stop(): void {
    SWALLOWED_EVENTS.forEach((type) => this.#document.removeEventListener(type, this.#listener, true));
    this.#kept.stop();
  }

  #handle(event: Event): void {
    if ((event.target as Element | null)?.closest?.(CLEAR_TARGET) == null) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.type === 'click') {
      this.#onClear();
    }
  }
}
