interface FocusEvent {
  windowId: number;
  at: number;
}

const NO_WINDOW = -1;

export class FocusHistory {
  #clock: () => number;
  #events: FocusEvent[] = [];

  /**
   * Remembers the last two window focus events. Vivaldi reports "no window" when the application goes
   * to the background, so a window that gets the focus right after it means the application was
   * brought forward, which is what happens when another app opens a link.
   *
   * @param clock Gives the time in milliseconds, replaceable in tests.
   */
  constructor(clock: () => number = Date.now) {
    this.#clock = clock;
  }

  /**
   * Records a focus event now.
   *
   * @param windowId The window that got the focus, or -1 when none did.
   */
  public record(windowId: number): void {
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
  public broughtForwardNear(at: number, withinMs: number): boolean {
    const [before, last] = this.#events;
    if (before === undefined || last === undefined) {
      return false;
    }
    return before.windowId === NO_WINDOW && last.windowId !== NO_WINDOW && Math.abs(last.at - at) <= withinMs;
  }
}
