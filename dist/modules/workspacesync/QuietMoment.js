const TYPING_TAGS = /* @__PURE__ */ new Set(["INPUT", "TEXTAREA"]);
class QuietMoment {
  #document;
  /**
   * Tells when the interface may be driven without disturbing the user: the window has the focus
   * and no text field, nor editable element, holds the cursor.
   *
   * @param document The document of Vivaldi's browser window.
   */
  constructor(document) {
    this.#document = document;
  }
  /**
   * @returns Whether it is a quiet moment now.
   */
  get now() {
    const active = this.#document.activeElement;
    return this.#document.hasFocus() && !(active !== null && (TYPING_TAGS.has(active.tagName) || active.isContentEditable));
  }
}
export {
  QuietMoment
};
