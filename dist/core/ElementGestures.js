const PRIMARY_BUTTON = 0;
const PRIMARY_BUTTONS = 1;
const KEY_CODES = { Escape: 27 };
class ElementGestures {
  #view;
  /**
   * Drives Vivaldi's interface the way a hand does. A plain `click()` does nothing in Vivaldi: its
   * buttons answer a full pointer sequence at the centre of the element.
   *
   * @param view The window of the document that holds the elements.
   */
  constructor(view) {
    this.#view = view;
  }
  /**
   * Sends pointerdown, mousedown, pointerup, mouseup and click at the centre of the element.
   *
   * @param element The element to press.
   */
  click(element) {
    const { left, top, width, height } = element.getBoundingClientRect();
    const at = { clientX: left + width / 2, clientY: top + height / 2 };
    element.dispatchEvent(this.#pointer("pointerdown", at, PRIMARY_BUTTONS));
    element.dispatchEvent(this.#mouse("mousedown", at, PRIMARY_BUTTONS));
    element.dispatchEvent(this.#pointer("pointerup", at, 0));
    element.dispatchEvent(this.#mouse("mouseup", at, 0));
    element.dispatchEvent(this.#mouse("click", at, 0));
  }
  /**
   * Sends a double click at the centre of the element.
   *
   * @param element The element to double click.
   */
  doubleClick(element) {
    const { left, top, width, height } = element.getBoundingClientRect();
    element.dispatchEvent(this.#mouse("dblclick", { clientX: left + width / 2, clientY: top + height / 2, detail: 2 }, 0));
  }
  /**
   * Sets the text of a field through the native setter, so the interface framework sees the change.
   *
   * @param input The text field.
   * @param text The new text.
   */
  write(input, text) {
    const descriptor = Object.getOwnPropertyDescriptor(this.#view.HTMLInputElement.prototype, "value");
    if (descriptor?.set === void 0) {
      throw new Error("the native value setter is missing");
    }
    descriptor.set.call(input, text);
    input.dispatchEvent(new this.#view.Event("input", { bubbles: true }));
  }
  /**
   * Sends a key press.
   *
   * @param target Where the key goes; it bubbles from there.
   * @param key The `key` and `code` of the event, such as `Escape` or `F2`.
   */
  press(target, key) {
    target.dispatchEvent(new this.#view.KeyboardEvent("keydown", { key, code: key, keyCode: KEY_CODES[key] ?? 0, bubbles: true, cancelable: true }));
  }
  #pointer(type, at, buttons) {
    return new this.#view.PointerEvent(type, { ...at, buttons, button: PRIMARY_BUTTON, pointerId: 1, isPrimary: true, bubbles: true, cancelable: true, view: this.#view });
  }
  #mouse(type, at, buttons) {
    return new this.#view.MouseEvent(type, { ...at, buttons, button: PRIMARY_BUTTON, bubbles: true, cancelable: true, view: this.#view });
  }
}
export {
  ElementGestures
};
