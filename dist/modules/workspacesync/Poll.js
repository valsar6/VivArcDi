const realClock = { now: () => Date.now(), sleep: (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)) };
const STEP_MS = 50;
class Poll {
  #clock;
  /**
   * Waits for something the interface does on its own time.
   *
   * @param clock Time, replaceable in tests.
   */
  constructor(clock = realClock) {
    this.#clock = clock;
  }
  /**
   * @param probe Returns a value when ready, otherwise null.
   * @param timeoutMs How long to wait, in milliseconds.
   * @returns What the probe returned, or null when the time ran out.
   */
  async until(probe, timeoutMs) {
    const end = this.#clock.now() + timeoutMs;
    let found = await probe();
    while (found === null && this.#clock.now() < end) {
      await this.#clock.sleep(STEP_MS);
      found = await probe();
    }
    return found;
  }
}
export {
  Poll
};
