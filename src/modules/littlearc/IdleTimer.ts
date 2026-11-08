export interface Scheduler {
  set(callback: () => void, delayMs: number): unknown;
  clear(handle: unknown): void;
}

const HOUR_MS = 3_600_000;
const MAX_DELAY_MS = 2_147_483_647;

const timerScheduler: Scheduler = {
  set: (callback, delayMs) => setTimeout(callback, delayMs),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export class IdleTimer {
  #delayMs: number;
  #onIdle: () => void;
  #scheduler: Scheduler;
  #handle: unknown = null;

  /**
   * Calls a function when nothing touched the timer for a while.
   *
   * @param hours How long the window may stay untouched; zero or less turns the timer off.
   * @param onIdle Called once the time has passed.
   * @param scheduler Starts and cancels timeouts, replaceable in tests.
   */
  constructor(hours: number, onIdle: () => void, scheduler: Scheduler = timerScheduler) {
    this.#delayMs = Number.isFinite(hours) && hours > 0 ? Math.min(hours * HOUR_MS, MAX_DELAY_MS) : 0;
    this.#onIdle = onIdle;
    this.#scheduler = scheduler;
  }

  /**
   * Starts counting again from now.
   */
  public touch(): void {
    this.stop();
    if (this.#delayMs > 0) {
      this.#handle = this.#scheduler.set(() => this.#onIdle(), this.#delayMs);
    }
  }

  /**
   * Stops counting.
   */
  public stop(): void {
    if (this.#handle !== null) {
      this.#scheduler.clear(this.#handle);
      this.#handle = null;
    }
  }
}
