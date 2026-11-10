const defaultTimers = {
  set: (run, delayMs) => setTimeout(run, delayMs),
  clear: (handle) => clearTimeout(handle)
};
class Debounce {
  #run;
  #delayMs;
  #timers;
  #pending = null;
  /**
   * Turns a burst of requests into one run, a delay after the last request.
   *
   * @param run The job.
   * @param delayMs How long to wait after the last request, in milliseconds.
   * @param timers Timers, replaceable in tests.
   */
  constructor(run, delayMs, timers = defaultTimers) {
    this.#run = run;
    this.#delayMs = delayMs;
    this.#timers = timers;
  }
  /**
   * Starts the delay again.
   */
  request() {
    this.cancel();
    this.#pending = this.#timers.set(() => {
      this.#pending = null;
      this.#run();
    }, this.#delayMs);
  }
  /**
   * Drops the run that is waiting, if any.
   */
  cancel() {
    if (this.#pending !== null) {
      this.#timers.clear(this.#pending);
      this.#pending = null;
    }
  }
}
export {
  Debounce
};
