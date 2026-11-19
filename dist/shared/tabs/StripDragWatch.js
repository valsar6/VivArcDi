const LEFT_BUTTON = 0;
const CAPTURE = { capture: true };
const RELEASES = ["mouseup", "dragend"];
class StripDragWatch {
  #root;
  #isSlot;
  #onChange;
  #pressed = false;
  #dragging = false;
  #stops = [];
  /**
   * Tells when a tab of the strip is being dragged. Vivaldi sets no state for it: a drag is a left
   * press on a slot, then pointer moves, until the release.
   *
   * @param root Where the pointer events are heard, the browser root or the document.
   * @param isSlot Tells whether an event target is, or is inside, a slot of the strip.
   * @param onChange Called with true when a drag starts and false when it ends.
   */
  constructor(root, isSlot, onChange) {
    this.#root = root;
    this.#isSlot = isSlot;
    this.#onChange = onChange;
  }
  /**
   * @returns Whether a drag is in progress.
   */
  get dragging() {
    return this.#dragging;
  }
  /**
   * Starts listening.
   */
  start() {
    this.#listen("mousedown", (event) => this.#press(event));
    this.#listen("mousemove", () => this.#move());
    RELEASES.forEach((type) => this.#listen(type, () => this.#release()));
    this.#listen("keydown", (event) => {
      if (event.key === "Escape") {
        this.#release();
      }
    });
  }
  /**
   * Stops listening and ends a drag in progress.
   */
  stop() {
    this.#stops.forEach((stop) => stop());
    this.#stops = [];
    this.#release();
  }
  #listen(type, handler) {
    this.#root.addEventListener(type, handler, CAPTURE);
    this.#stops.push(() => this.#root.removeEventListener(type, handler, CAPTURE));
  }
  #press(event) {
    this.#pressed = event.button === LEFT_BUTTON && this.#isSlot(event.target);
  }
  #move() {
    if (this.#pressed && !this.#dragging) {
      this.#dragging = true;
      this.#onChange(true);
    }
  }
  #release() {
    this.#pressed = false;
    if (this.#dragging) {
      this.#dragging = false;
      this.#onChange(false);
    }
  }
}
export {
  StripDragWatch
};
