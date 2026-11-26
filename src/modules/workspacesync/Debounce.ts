import type { Timers } from '../../core/support/Timers.js';
import { systemTimers } from '../../core/support/Timers.js';
export class Debounce {
  #run: () => void;
  #delayMs: number;
  #timers: Timers;
  #pending: unknown = null;

  /**
   * Turns a burst of requests into one run, a delay after the last request.
   *
   * @param run The job.
   * @param delayMs How long to wait after the last request, in milliseconds.
   * @param timers Timers, replaceable in tests.
   */
  constructor(run: () => void, delayMs: number, timers: Timers = systemTimers) {
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
