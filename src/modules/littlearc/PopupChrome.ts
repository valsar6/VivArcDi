import type { Logger } from '../../core/support/Logger.js';
import type { SelectorCatalog } from '../../core/dom/SelectorCatalog.js';

export const HEADER_ATTRIBUTE = 'data-vivarcdi-popup-header';
export const PAGE_ATTRIBUTE = 'data-vivarcdi-popup-page';

const MARKS: ReadonlyArray<readonly [string, string]> = [
  ['popupHeader', HEADER_ATTRIBUTE],
  ['webviewContainer', PAGE_ATTRIBUTE],
];

export class PopupChrome {
  #document: Pick<Document, 'querySelectorAll'>;
  #selectors: Pick<SelectorCatalog, 'has' | 'get'>;
  #logger: Logger;
  #warned = false;

  /**
   * Marks the parts of Vivaldi's popup that `little-arc.css` styles: its own header (title and
   * extension row), which is hidden, and the container of the page, which gets the frame. The
   * selectors come from the catalog (`popupHeader`, `webviewContainer`); when they match nothing the
   * marks are simply absent and the bar works without them.
   *
   * @param document The document of the popup.
   * @param selectors The selector catalog.
   * @param logger Logger for selectors that are not valid.
   */
  constructor(document: Pick<Document, 'querySelectorAll'>, selectors: Pick<SelectorCatalog, 'has' | 'get'>, logger: Logger) {
    this.#document = document;
    this.#selectors = selectors;
    this.#logger = logger;
  }

  /**
   * Marks what matches now; safe to call again when the interface changes.
   *
   * @param bar The bar of Little Arc, which is never marked nor any element that holds it.
   */
  public mark(bar: Element): void {
    for (const [name, attribute] of MARKS) {
      this.#matches(name)
        .filter((element) => !element.contains(bar))
        .forEach((element) => element.setAttribute(attribute, ''));
    }
  }

  /**
   * Removes every mark.
   */
  public unmark(): void {
    for (const [, attribute] of MARKS) {
      this.#document.querySelectorAll(`[${attribute}]`).forEach((element) => element.removeAttribute(attribute));
    }
  }

  #matches(name: string): Element[] {
    if (!this.#selectors.has(name)) {
      return [];
    }
    try {
      return [...this.#document.querySelectorAll(this.#selectors.get(name))];
    } catch (error) {
      if (!this.#warned) {
        this.#warned = true;
        this.#logger.warn(`the selector "${name}" is not valid, that part of the popup is left as it is`, error);
      }
      return [];
    }
  }
}
