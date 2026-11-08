const HOUR_MS = 36e5;
const MAX_DELAY_MS = 2147483647;
const timerScheduler = {
  set: (callback, delayMs) => setTimeout(callback, delayMs),
  clear: (handle) => clearTimeout(handle)
};
class IdleTimer {
  #delayMs;
  #onIdle;
  #scheduler;
  #handle = null;
  /**
   * Calls a function when nothing touched the timer for a while.
   *
   * @param hours How long the window may stay untouched; zero or less turns the timer off.
   * @param onIdle Called once the time has passed.
   * @param scheduler Starts and cancels timeouts, replaceable in tests.
   */
  constructor(hours, onIdle, scheduler = timerScheduler) {
    this.#delayMs = Number.isFinite(hours) && hours > 0 ? Math.min(hours * HOUR_MS, MAX_DELAY_MS) : 0;
    this.#onIdle = onIdle;
    this.#scheduler = scheduler;
  }
  /**
   * Starts counting again from now.
   */
  touch() {
    this.stop();
    if (this.#delayMs > 0) {
      this.#handle = this.#scheduler.set(() => this.#onIdle(), this.#delayMs);
    }
  }
  /**
   * Stops counting.
   */
  stop() {
    if (this.#handle !== null) {
      this.#scheduler.clear(this.#handle);
      this.#handle = null;
    }
  }
}
export {
  IdleTimer
};
