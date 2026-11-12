const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA']);

export class QuietMoment {
  #document: Document;

  /**
   * Tells when the interface may be driven without disturbing the user: the window has the focus
   * and no text field, nor editable element, holds the cursor.
   *
   * @param document The document of Vivaldi's browser window.
   */
  constructor(document: Document) {
    this.#document = document;
  }

  /**
   * @returns Whether it is a quiet moment now.
   */
  public get now(): boolean {
    const active = this.#document.activeElement;
    return this.#document.hasFocus() && !(active !== null && (TYPING_TAGS.has(active.tagName) || (active as HTMLElement).isContentEditable));
  }
}
