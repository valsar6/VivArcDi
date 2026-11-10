export interface DebounceTimers {
  set: (run: () => void, delayMs: number) => unknown;
  clear: (handle: unknown) => void;
}

const defaultTimers: DebounceTimers = {
  set: (run, delayMs) => setTimeout(run, delayMs),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export class Debounce {
  #run: () => void;
  #delayMs: number;
  #timers: DebounceTimers;
  #pending: unknown = null;

  /**
   * Turns a burst of requests into one run, a delay after the last request.
   *
   * @param run The job.
   * @param delayMs How long to wait after the last request, in milliseconds.
   * @param timers Timers, replaceable in tests.
   */
  constructor(run: () => void, delayMs: number, timers: DebounceTimers = defaultTimers) {
    this.#run = run;
    this.#delayMs = delayMs;
    this.#timers = timers;
  }

  /**
   * Starts the delay again.
   */
  public request(): void {
    this.cancel();
    this.#pending = this.#timers.set(() => {
      this.#pending = null;
      this.#run();
    }, this.#delayMs);
  }

  /**
   * Drops the run that is waiting, if any.
   */
  public cancel(): void {
    if (this.#pending !== null) {
      this.#timers.clear(this.#pending);
      this.#pending = null;
    }
  }
}
