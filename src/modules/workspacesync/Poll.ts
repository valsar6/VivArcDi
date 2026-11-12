export interface PollClock {
  now: () => number;
  sleep: (delayMs: number) => Promise<void>;
}

const realClock: PollClock = { now: () => Date.now(), sleep: (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)) };

const STEP_MS = 50;

export class Poll {
  #clock: PollClock;

  /**
   * Waits for something the interface does on its own time.
   *
   * @param clock Time, replaceable in tests.
   */
  constructor(clock: PollClock = realClock) {
    this.#clock = clock;
  }

  /**
   * @param probe Returns a value when ready, otherwise null.
   * @param timeoutMs How long to wait, in milliseconds.
   * @returns What the probe returned, or null when the time ran out.
   */
  public async until<T>(probe: () => T | null | Promise<T | null>, timeoutMs: number): Promise<T | null> {
    const end = this.#clock.now() + timeoutMs;
    let found = await probe();
    while (found === null && this.#clock.now() < end) {
      await this.#clock.sleep(STEP_MS);
      found = await probe();
    }
    return found;
  }
}
