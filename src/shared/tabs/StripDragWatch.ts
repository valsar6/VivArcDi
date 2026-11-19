const LEFT_BUTTON = 0;
const CAPTURE = { capture: true };
const RELEASES = ['mouseup', 'dragend'];

export class StripDragWatch {
  #root: EventTarget;
  #isSlot: (target: EventTarget | null) => boolean;
  #onChange: (dragging: boolean) => void;
  #pressed = false;
  #dragging = false;
  #stops: Array<() => void> = [];

  /**
   * Tells when a tab of the strip is being dragged. Vivaldi sets no state for it: a drag is a left
   * press on a slot, then pointer moves, until the release.
   *
   * @param root Where the pointer events are heard, the browser root or the document.
   * @param isSlot Tells whether an event target is, or is inside, a slot of the strip.
   * @param onChange Called with true when a drag starts and false when it ends.
   */
  constructor(root: EventTarget, isSlot: (target: EventTarget | null) => boolean, onChange: (dragging: boolean) => void) {
    this.#root = root;
    this.#isSlot = isSlot;
    this.#onChange = onChange;
  }

  /**
   * @returns Whether a drag is in progress.
   */
  public get dragging(): boolean {
    return this.#dragging;
  }

  /**
   * Starts listening.
   */
  public start(): void {
    this.#listen('mousedown', (event) => this.#press(event));
    this.#listen('mousemove', () => this.#move());
    RELEASES.forEach((type) => this.#listen(type, () => this.#release()));
    this.#listen('keydown', (event) => {
      if ((event as KeyboardEvent).key === 'Escape') {
        this.#release();
      }
    });
  }

  /**
   * Stops listening and ends a drag in progress.
   */
  public stop(): void {
    this.#stops.forEach((stop) => stop());
    this.#stops = [];
    this.#release();
  }

  #listen(type: string, handler: (event: Event) => void): void {
    this.#root.addEventListener(type, handler, CAPTURE);
    this.#stops.push(() => this.#root.removeEventListener(type, handler, CAPTURE));
  }

  #press(event: Event): void {
    this.#pressed = (event as MouseEvent).button === LEFT_BUTTON && this.#isSlot(event.target);
  }

  #move(): void {
    if (this.#pressed && !this.#dragging) {
      this.#dragging = true;
      this.#onChange(true);
    }
  }

  #release(): void {
    this.#pressed = false;
    if (this.#dragging) {
      this.#dragging = false;
      this.#onChange(false);
    }
  }
}
