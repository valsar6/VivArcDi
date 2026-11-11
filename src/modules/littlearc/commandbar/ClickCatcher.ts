const SWALLOWED = ['pointerdown', 'mousedown', 'click'] as const;

export class ClickCatcher {
  #layer: HTMLElement;
  #inside: HTMLElement;
  #onOutside: () => void;
  #listener = (event: Event): void => this.#handle(event);

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
  constructor(layer: HTMLElement, inside: HTMLElement, onOutside: () => void) {
    this.#layer = layer;
    this.#inside = inside;
    this.#onOutside = onOutside;
  }

  /**
   * Starts catching.
   */
  public attach(): void {
    SWALLOWED.forEach((type) => this.#layer.addEventListener(type, this.#listener, true));
  }

  /**
   * Stops catching.
   */
  public detach(): void {
    SWALLOWED.forEach((type) => this.#layer.removeEventListener(type, this.#listener, true));
  }

  #handle(event: Event): void {
    const target = event.target as Node | null;
    if (target !== null && this.#inside.contains(target)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'pointerdown') {
      this.#onOutside();
    }
  }
}
