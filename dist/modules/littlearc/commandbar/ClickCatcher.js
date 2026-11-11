const SWALLOWED = ["pointerdown", "mousedown", "click"];
class ClickCatcher {
  #layer;
  #inside;
  #onOutside;
  #listener = (event) => this.#handle(event);
  /**
   * Makes a layer that covers the window catch every click outside a card. A click outside is
   * swallowed: `pointerdown`, `mousedown` and `click` get `preventDefault` and `stopPropagation` in the
   * capture phase, so nothing under the layer reacts, and the `pointerdown` calls `onOutside`. A press
   * inside the card goes on untouched.
   *
   * @param layer The layer.
   * @param inside The card on top of the layer.
   * @param onOutside Called once for every press outside the card.
   */
  constructor(layer, inside, onOutside) {
    this.#layer = layer;
    this.#inside = inside;
    this.#onOutside = onOutside;
  }
  /**
   * Starts catching.
   */
  attach() {
    SWALLOWED.forEach((type) => this.#layer.addEventListener(type, this.#listener, true));
  }
  /**
   * Stops catching.
   */
  detach() {
    SWALLOWED.forEach((type) => this.#layer.removeEventListener(type, this.#listener, true));
  }
  #handle(event) {
    const target = event.target;
    if (target !== null && this.#inside.contains(target)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.type === "pointerdown") {
      this.#onOutside();
    }
  }
}
export {
  ClickCatcher
};
