class FrameTask {
  #callback;
  #schedule;
  #cancel;
  #handle = null;
  /**
   * Runs a callback at most once per animation frame, however often it is requested.
   * Lets modules react to bursts of DOM mutations with a single update.
   *
   * @param callback Work to run.
   * @param timing Frame scheduling functions, replaceable in tests. Default to
   *   `requestAnimationFrame` and `cancelAnimationFrame`.
   */
  constructor(callback, {
    schedule = (run) => globalThis.requestAnimationFrame(run),
    cancel = (handle) => globalThis.cancelAnimationFrame(handle)
  } = {}) {
    this.#callback = callback;
    this.#schedule = schedule;
    this.#cancel = cancel;
  }
  /**
   * @returns Whether a run is waiting for the next frame.
   */
  get pending() {
    return this.#handle !== null;
  }
  /**
   * Asks for a run on the next frame. Extra requests before then are merged.
   */
  request() {
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
  cancel() {
    if (this.pending) {
      this.#cancel(this.#handle);
      this.#handle = null;
    }
  }
}
export {
  FrameTask
};
