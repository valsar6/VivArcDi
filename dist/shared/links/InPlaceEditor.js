const EDITOR_ATTRIBUTE = "data-vivarcdi-inline-editor";
const ROWS_DRAWN_EVENT = "vivarcdi:rows-drawn";
function notifyRowsDrawn(document) {
  document.dispatchEvent(new Event(ROWS_DRAWN_EVENT));
}
const TILE_FIELD_WIDTH = 160;
const TILE_FIELD_GAP = 4;
const TILE_FIELD_HEIGHT = 24;
class InPlaceEditor {
  #document;
  #parent;
  #open = null;
  #onRowsDrawn = () => this.reposition();
  /**
   * A small floating text field over a row title or under a tile. It lives in the browser window, not
   * in the rows, so drawing the rows again does not remove it.
   *
   * @param deps The window document and the element the field is added to.
   */
  constructor(deps) {
    this.#document = deps.document;
    this.#parent = deps.parent;
  }
  /**
   * Opens the field, focused with its text selected. A field that is already open is cancelled.
   *
   * @param options Where the field goes, the text it starts with and its accessible name.
   * @returns The trimmed text on Enter or a click elsewhere ('' when emptied), null on Escape or cancel.
   */
  edit(options) {
    this.cancel();
    return new Promise((resolve) => {
      const input = this.#document.createElement("input");
      input.setAttribute("type", "text");
      input.setAttribute("aria-label", options.label);
      input.setAttribute(EDITOR_ATTRIBUTE, options.target.covers ? "covers" : "below");
      input.style.setProperty("-webkit-app-region", "no-drag");
      input.value = options.value;
      const open = {
        input,
        target: options.target,
        settle: (text) => {
          if (this.#open !== open) {
            return;
          }
          this.#open = null;
          this.#document.removeEventListener(ROWS_DRAWN_EVENT, this.#onRowsDrawn);
          input.remove();
          resolve(text);
        }
      };
      input.addEventListener("keydown", (event) => this.#key(event, open));
      input.addEventListener("blur", () => open.settle(input.value.trim()));
      this.#open = open;
      this.#document.addEventListener(ROWS_DRAWN_EVENT, this.#onRowsDrawn);
      this.#place(open);
      this.#parent().append(input);
      input.focus();
      input.select();
    });
  }
  /**
   * Puts the field back on its anchor after the rows were drawn again; cancels when the anchor is gone.
   */
  reposition() {
    if (this.#open === null) {
      return;
    }
    if (!this.#open.target.anchor.isConnected) {
      this.cancel();
      return;
    }
    this.#place(this.#open);
  }
  /**
   * Closes the field, if any, without a text.
   */
  cancel() {
    this.#open?.settle(null);
  }
  #key(event, open) {
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      open.settle(open.input.value.trim());
    } else if (event.key === "Escape") {
      event.preventDefault();
      open.settle(null);
    }
  }
  #place(open) {
    const { anchor, covers } = open.target;
    const rect = anchor.getBoundingClientRect();
    const style = open.input.style;
    const box = covers ? this.#coverBox(rect) : this.#tileBox(rect);
    style.setProperty("left", `${box.left}px`);
    style.setProperty("top", `${box.top}px`);
    style.setProperty("width", `${box.width}px`);
    style.setProperty("height", `${box.height}px`);
    if (covers) {
      style.setProperty("font", this.#document.defaultView?.getComputedStyle(anchor).font ?? "inherit");
    }
  }
  #coverBox(rect) {
    return { left: rect.left, top: rect.top, width: rect.right - rect.left, height: rect.bottom - rect.top };
  }
  #tileBox(rect) {
    const middle = rect.left + (rect.right - rect.left) / 2;
    return { left: Math.max(0, middle - TILE_FIELD_WIDTH / 2), top: rect.bottom + TILE_FIELD_GAP, width: TILE_FIELD_WIDTH, height: TILE_FIELD_HEIGHT };
  }
}
export {
  EDITOR_ATTRIBUTE,
  InPlaceEditor,
  ROWS_DRAWN_EVENT,
  notifyRowsDrawn
};
