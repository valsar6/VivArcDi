const NO_WINDOW = -1;
class FocusHistory {
  #clock;
  #events = [];
  /**
   * Remembers the last two window focus events. Vivaldi reports "no window" when the application goes
   * to the background, so a window that gets the focus right after it means the application was
   * brought forward, which is what happens when another app opens a link.
   *
   * @param clock Gives the time in milliseconds, replaceable in tests.
   */
  constructor(clock = Date.now) {
    this.#clock = clock;
  }
  /**
   * Records a focus event now.
   *
   * @param windowId The window that got the focus, or -1 when none did.
   */
  record(windowId) {
    this.#events.push({ windowId, at: this.#clock() });
    if (this.#events.length > 2) {
      this.#events.shift();
    }
  }
  /**
   * @param at A time in milliseconds.
   * @param withinMs How far from `at` the focus event may be.
   * @returns Whether the application came to the foreground close to that time: a window got the
   * focus right after "no window".
   */
  broughtForwardNear(at, withinMs) {
    const [before, last] = this.#events;
    if (before === void 0 || last === void 0) {
      return false;
    }
    return before.windowId === NO_WINDOW && last.windowId !== NO_WINDOW && Math.abs(last.at - at) <= withinMs;
  }
}
export {
  FocusHistory
};
