export interface FrameTiming {
  schedule?: (run: () => void) => unknown;
  cancel?: (handle: unknown) => void;
}

export class FrameTask {
  #callback: () => void;
  #schedule: (run: () => void) => unknown;
  #cancel: (handle: unknown) => void;
  #handle: unknown = null;

  /**
   * Runs a callback at most once per animation frame, however often it is requested.
   * Lets modules react to bursts of DOM mutations with a single update.
   *
   * @param callback Work to run.
   * @param timing Frame scheduling functions, replaceable in tests. Default to
   *   `requestAnimationFrame` and `cancelAnimationFrame`.
   */
  constructor(
    callback: () => void,
    {
      schedule = (run): number => globalThis.requestAnimationFrame(run),
      cancel = (handle): void => globalThis.cancelAnimationFrame(handle as number),
    }: FrameTiming = {},
  ) {
    this.#callback = callback;
    this.#schedule = schedule;
    this.#cancel = cancel;
  }

  /**
   * @returns Whether a run is waiting for the next frame.
   */
  public get pending(): boolean {
    return this.#handle !== null;
  }

  /**
   * Asks for a run on the next frame. Extra requests before then are merged.
   */
  public request(): void {
    if (this.pending) {
      return;
    }
    this.#handle = this.#schedule(() => {
      this.#handle = null;
      this.#callback();
    });
  }

  /**
   * Drops the waiting run, if any.
   */
  public cancel(): void {
    if (this.pending) {
      this.#cancel(this.#handle);
      this.#handle = null;
    }
  }
}
