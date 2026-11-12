export type ViewWindow = Window & typeof globalThis;

const PRIMARY_BUTTON = 0;
const PRIMARY_BUTTONS = 1;
const KEY_CODES: Record<string, number> = { Escape: 27 };

export class ElementGestures {
  #view: ViewWindow;

  /**
   * Drives Vivaldi's interface the way a hand does. A plain `click()` does nothing in Vivaldi: its
   * buttons answer a full pointer sequence at the centre of the element.
   *
   * @param view The window of the document that holds the elements.
   */
  constructor(view: ViewWindow) {
    this.#view = view;
  }

  /**
   * Sends pointerdown, mousedown, pointerup, mouseup and click at the centre of the element.
   *
   * @param element The element to press.
   */
  public click(element: Element): void {
    const { left, top, width, height } = element.getBoundingClientRect();
    const at = { clientX: left + width / 2, clientY: top + height / 2 };
    element.dispatchEvent(this.#pointer('pointerdown', at, PRIMARY_BUTTONS));
    element.dispatchEvent(this.#mouse('mousedown', at, PRIMARY_BUTTONS));
    element.dispatchEvent(this.#pointer('pointerup', at, 0));
    element.dispatchEvent(this.#mouse('mouseup', at, 0));
    element.dispatchEvent(this.#mouse('click', at, 0));
  }

  /**
   * Sends a double click at the centre of the element.
   *
   * @param element The element to double click.
   */
  public doubleClick(element: Element): void {
    const { left, top, width, height } = element.getBoundingClientRect();
    element.dispatchEvent(this.#mouse('dblclick', { clientX: left + width / 2, clientY: top + height / 2, detail: 2 }, 0));
  }

  /**
   * Sets the text of a field through the native setter, so the interface framework sees the change.
   *
   * @param input The text field.
   * @param text The new text.
   */
  public write(input: HTMLInputElement, text: string): void {
    const descriptor = Object.getOwnPropertyDescriptor(this.#view.HTMLInputElement.prototype, 'value');
    if (descriptor?.set === undefined) {
      throw new Error('the native value setter is missing');
    }
    descriptor.set.call(input, text);
    input.dispatchEvent(new this.#view.Event('input', { bubbles: true }));
  }

  /**
   * Sends a key press.
   *
   * @param target Where the key goes; it bubbles from there.
   * @param key The `key` and `code` of the event, such as `Escape` or `F2`.
   */
  public press(target: EventTarget, key: string): void {
    target.dispatchEvent(new this.#view.KeyboardEvent('keydown', { key, code: key, keyCode: KEY_CODES[key] ?? 0, bubbles: true, cancelable: true }));
  }

  #pointer(type: string, at: { clientX: number; clientY: number }, buttons: number): Event {
    return new this.#view.PointerEvent(type, { ...at, buttons, button: PRIMARY_BUTTON, pointerId: 1, isPrimary: true, bubbles: true, cancelable: true, view: this.#view });
  }

  #mouse(type: string, at: { clientX: number; clientY: number; detail?: number }, buttons: number): Event {
    return new this.#view.MouseEvent(type, { ...at, buttons, button: PRIMARY_BUTTON, bubbles: true, cancelable: true, view: this.#view });
  }
}
